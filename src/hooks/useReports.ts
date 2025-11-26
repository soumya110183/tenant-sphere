import { useEffect, useState } from "react";
import { getTimeseries } from "@/services/api";

/* -----------------------------
   Types / Interfaces
   ----------------------------- */

export type Granularity = "daily" | "weekly" | "monthly";

export interface InventoryItem {
  id: string | number;
  product_id?: string | number;
  product_name?: string;
  quantity?: number | string;
  cost_price?: number | string;
  reorder_level?: number | string;
  [k: string]: any;
}

export interface Invoice {
  id: string | number;
  total_amount?: number | string;
  created_at?: string;
  invoice_items?: Array<{
    product_name?: string;
    product_id?: string | number;
    quantity?: number | string;
  }>;
  [k: string]: any;
}

export interface Purchase {
  id: string | number;
  total_amount?: number | string;
  created_at?: string;
  [k: string]: any;
}

export interface Payment {
  id?: string | number;
  mode?: string;
  amount?: number | string;
  total?: number | string;
  payment_mode?: string;
  created_at?: string;
  [k: string]: any;
}

export interface TimeSeriesPoint {
  period?: string;
  date?: string;
  sales?: number | string;
  purchases?: number | string;
  purchase?: number | string;
  sales_count?: number;
  purchases_count?: number;
  [k: string]: any;
}

export interface Summary {
  totalSales: number;
  totalPurchases: number;
  profit: number;
  lowStock: number;
  transactions: number;
}

export interface RechartsPoint {
  date: string;
  sales?: number;
  purchase?: number;
  sales_count?: number;
  purchase_count?: number;
}

/* -----------------------------
   Hook return type
   ----------------------------- */

export interface UseReportsReturn {
  loading: boolean;
  error: string | null;
  summary: Summary;
  salesSeries: RechartsPoint[];
  purchaseSeries: RechartsPoint[];
  stockReport: Array<{
    id: string | number;
    product: string | number;
    available: number;
    value: number;
    status: "Low" | "Good" | string;
  }>;
  paymentSummary: Array<{ mode: string; value: number }>;
  dailyMetrics: DailyMetricsRow[];
}

// Daily metrics row used for the consolidated table view
export interface DailyMetricsRow {
  date: string;
  salesAmount: number;
  invoiceCount: number;
  avgBill: number;
  topProduct: string;
  purchaseAmount: number;
  purchaseEntries: number;
  dailyProfit: number;
  marginPct: number; // profit / sales * 100
  prevDaySalesChangePct: number | null; // % change vs previous day
  vsWeeklyAvgSalesChangePct: number; // % change vs overall average
  soldItemsQty: number; // sum of invoice item quantities
  receivedItemsQty: number; // placeholder from purchase entries (count)
  cash: number;
  upi: number;
  card: number;
  credit: number;
  lowStock: number; // global low stock replicated per day
}

/* -----------------------------
   Hook Implementation
   ----------------------------- */

export function useReports({
  startDate,
  endDate,
  granularity = "daily",
}: {
  startDate: string;
  endDate: string;
  granularity?: Granularity;
}): UseReportsReturn {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary>({
    totalSales: 0,
    totalPurchases: 0,
    profit: 0,
    lowStock: 0,
    transactions: 0,
  });
  const [salesSeries, setSalesSeries] = useState<RechartsPoint[]>([]);
  const [purchaseSeries, setPurchaseSeries] = useState<RechartsPoint[]>([]);
  const [stockReport, setStockReport] = useState<
    Array<{
      id: string | number;
      product: string | number;
      available: number;
      value: number;
      status: "Low" | "Good" | string;
    }>
  >([]);
  const [paymentSummary, setPaymentSummary] = useState<
    Array<{ mode: string; value: number }>
  >([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetricsRow[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Fetch unified report data from backend (single call gets ALL data including payment_summary)
        const reportRes = await getTimeseries(startDate, endDate, granularity);

        if (!mounted) return;

        // --- Normalization helpers ---
        const normalizeList = <T>(res: any): T[] => {
          if (!res) return [];
          if (Array.isArray(res)) return res as T[];
          if (res.data && Array.isArray(res.data)) return res.data as T[];
          if (res.timeseries && Array.isArray(res.timeseries))
            return res.timeseries as unknown as T[];
          if (res.success && Array.isArray(res.data)) return res.data as T[];
          return [];
        };

        // Extract data from unified backend response
        // Backend returns: { timeseries, invoices_page, purchases_page, stock_page, payment_summary, *_meta }
        const inventory = normalizeList<InventoryItem>(
          reportRes?.stock_page || []
        );
        const invoices = normalizeList<Invoice>(reportRes?.invoices_page || []);
        const purchases = normalizeList<Purchase>(
          reportRes?.purchases_page || []
        );
        const timeseriesRaw = normalizeList<TimeSeriesPoint>(
          reportRes?.timeseries || []
        );

        // --- Summary calculations from timeseries (not paginated data) ---
        // Backend timeseries contains ALL data aggregated, not just the paginated subset
        const totalSales = timeseriesRaw.reduce(
          (s: number, t: TimeSeriesPoint) => s + (Number(t.sales) || 0),
          0
        );
        const totalPurchases = timeseriesRaw.reduce(
          (s: number, t: TimeSeriesPoint) =>
            s + (Number(t.purchase ?? t.purchases) || 0),
          0
        );
        const profit = totalSales - totalPurchases;

        // Total transactions from timeseries counts
        const transactions = timeseriesRaw.reduce(
          (s: number, t: TimeSeriesPoint) => s + (Number(t.sales_count) || 0),
          0
        );

        const lowStock = inventory.filter((it) => {
          const qty = Number(it.quantity ?? 0);
          const reorder = Number(it.reorder_level ?? 0);
          return reorder > 0 ? qty <= reorder : qty <= 5;
        }).length;

        // --- Stock report normalization ---
        const stockReportNormalized = inventory.map((it) => {
          const qty = Number(it.quantity ?? 0);
          const cp = Number(it.cost_price ?? 0);
          const reorder = Number(it.reorder_level ?? 0);
          return {
            id: it.id,
            product: it.product_name ?? it.product_id ?? it.id,
            available: qty,
            value: Number((qty * cp).toFixed(2)) || 0,
            status: qty <= (reorder > 0 ? reorder : 5) ? "Low" : "Good",
          };
        });

        // --- Payment summary from backend ---
        // Backend returns payment_summary in the main response: { total_amount, modes: [{ mode, total, count, share }], top_mode }
        const paymentSummaryFromBackend = reportRes?.payment_summary || {};
        const paymentSummaryNormalized = (
          paymentSummaryFromBackend?.modes || []
        ).map((m: any) => ({
          mode: m.mode || m.method || "Unknown",
          value: Number(m.total || 0),
        }));

        // --- Timeseries -> Recharts friendly ---
        const timeseriesNormalized: RechartsPoint[] = timeseriesRaw.map((t) => {
          const dateKey = (t.date ?? t.period) as string;
          const salesVal = Number(t.sales ?? 0) || 0;
          const purchaseVal = Number(t.purchase ?? t.purchases ?? 0) || 0;
          const sales_count = Number(t.sales_count ?? 0) || 0;
          const purchase_count = Number(t.purchases_count ?? 0) || 0;
          return {
            date: dateKey,
            sales: Number(salesVal.toFixed(2)),
            purchase: Number(purchaseVal.toFixed(2)),
            sales_count,
            purchase_count,
          };
        });

        // Frontend originally had separate arrays for sales and purchases
        const salesData = timeseriesNormalized.map((t) => ({
          date: t.date,
          sales: t.sales,
          sales_count: t.sales_count,
        }));
        const purchaseData = timeseriesNormalized.map((t) => ({
          date: t.date,
          purchase: t.purchase,
          purchase_count: t.purchase_count,
        }));

        // --- Commit to state ---
        setSummary({
          totalSales: Number(totalSales.toFixed(2)),
          totalPurchases: Number(totalPurchases.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          lowStock,
          transactions,
        });

        setSalesSeries(salesData);
        setPurchaseSeries(purchaseData);
        setStockReport(stockReportNormalized);
        setPaymentSummary(paymentSummaryNormalized);

        // --- Daily metrics table construction ---
        const weeklyAvgSales = timeseriesNormalized.length
          ? timeseriesNormalized.reduce((acc, d) => acc + (d.sales || 0), 0) /
            timeseriesNormalized.length
          : 0;

        // Group invoices and purchases by date for additional metrics
        const invoiceByDate: Record<string, Invoice[]> = {};
        invoices.forEach((inv) => {
          const d = (inv.created_at || "").slice(0, 10);
          if (!d) return;
          (invoiceByDate[d] = invoiceByDate[d] || []).push(inv);
        });
        const purchaseByDate: Record<string, Purchase[]> = {};
        purchases.forEach((pur) => {
          const d = (pur.created_at || "").slice(0, 10);
          if (!d) return;
          (purchaseByDate[d] = purchaseByDate[d] || []).push(pur);
        });

        // For daily payment breakdown, distribute backend payment summary proportionally
        const totalPaymentAmount = paymentSummaryFromBackend?.total_amount || 0;
        const paymentModes = paymentSummaryNormalized;

        const dailyRows: DailyMetricsRow[] = timeseriesNormalized.map(
          (ts, idx) => {
            const date = ts.date;
            const dayInvoices = invoiceByDate[date] || [];
            const dayPurchases = purchaseByDate[date] || [];

            const salesAmount = ts.sales || 0;
            const invoiceCount = dayInvoices.length || ts.sales_count || 0;
            const purchaseAmount = ts.purchase || 0;
            const purchaseEntries =
              dayPurchases.length || ts.purchase_count || 0;
            const dailyProfit = salesAmount - purchaseAmount;
            const avgBill = invoiceCount > 0 ? salesAmount / invoiceCount : 0;
            const marginPct =
              salesAmount > 0 ? (dailyProfit / salesAmount) * 100 : 0;
            const prevDaySales =
              idx > 0 ? timeseriesNormalized[idx - 1].sales || 0 : null;
            const prevDaySalesChangePct =
              prevDaySales && prevDaySales > 0
                ? ((salesAmount - prevDaySales) / prevDaySales) * 100
                : prevDaySales === 0
                ? null
                : null;
            const vsWeeklyAvgSalesChangePct =
              weeklyAvgSales > 0
                ? ((salesAmount - weeklyAvgSales) / weeklyAvgSales) * 100
                : 0;

            // Top-selling product computation
            const productQtyMap: Record<string, number> = {};
            dayInvoices.forEach((inv) => {
              (inv.invoice_items || []).forEach((item) => {
                const name = String(
                  item.product_name || item.product_id || "Unknown"
                );
                const qty = Number(item.quantity || 0) || 0;
                productQtyMap[name] = (productQtyMap[name] || 0) + qty;
              });
            });
            const topProduct =
              Object.entries(productQtyMap).sort(
                (a, b) => b[1] - a[1]
              )[0]?.[0] || "-";

            // Payment mode breakdown per day - distribute proportionally from backend summary
            const totalSalesAllDays = timeseriesNormalized.reduce(
              (acc, d) => acc + (d.sales || 0),
              0
            );
            const dayShareOfSales =
              totalSalesAllDays > 0 ? salesAmount / totalSalesAllDays : 0;

            let cash = 0,
              upi = 0,
              card = 0,
              credit = 0;
            paymentModes.forEach((pm) => {
              const mode = String(pm.mode || "Unknown").toLowerCase();
              const dayAmt = pm.value * dayShareOfSales;
              if (mode.includes("cash")) cash += dayAmt;
              else if (mode.includes("upi")) upi += dayAmt;
              else if (mode.includes("card")) card += dayAmt;
              else if (mode.includes("credit") || mode.includes("due"))
                credit += dayAmt;
            });

            // Sold items qty from invoice items, received items qty from purchase entries (placeholder: count of purchases)
            const soldItemsQty = Object.values(productQtyMap).reduce(
              (a, b) => a + b,
              0
            );
            const receivedItemsQty = purchaseEntries; // Without line items we approximate by entry count

            return {
              date,
              salesAmount: Number(salesAmount.toFixed(2)),
              invoiceCount,
              avgBill: Number(avgBill.toFixed(2)),
              topProduct,
              purchaseAmount: Number(purchaseAmount.toFixed(2)),
              purchaseEntries,
              dailyProfit: Number(dailyProfit.toFixed(2)),
              marginPct: Number(marginPct.toFixed(2)),
              prevDaySalesChangePct:
                prevDaySalesChangePct !== null &&
                prevDaySalesChangePct !== undefined
                  ? Number(prevDaySalesChangePct.toFixed(2))
                  : null,
              vsWeeklyAvgSalesChangePct: Number(
                vsWeeklyAvgSalesChangePct.toFixed(2)
              ),
              soldItemsQty,
              receivedItemsQty,
              cash: Number(cash.toFixed(2)),
              upi: Number(upi.toFixed(2)),
              card: Number(card.toFixed(2)),
              credit: Number(credit.toFixed(2)),
              lowStock,
            };
          }
        );

        setDailyMetrics(dailyRows);

        setLoading(false);
      } catch (err: unknown) {
        console.error("Reports fetch error", err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [startDate, endDate, granularity]);

  return {
    loading,
    error,
    summary,
    salesSeries,
    purchaseSeries,
    stockReport,
    paymentSummary,
    dailyMetrics,
  };
}

export default useReports;
