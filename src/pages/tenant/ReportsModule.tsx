import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Download,
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  CreditCard,
  Loader2,
  FileDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  PieChart as RePieChart,
  Cell,
  Legend,
} from "recharts";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useReports } from "@/hooks/useReports";
import { pdfReportService } from "@/services/api";
import { tenantReportAPI } from "@/services/api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const ReportsModule = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [granularity, setGranularity] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [profitReport, setProfitReport] = useState<any[] | null>(null);

  // Use the custom hook to fetch all report data
  const {
    loading,
    error,
    summary,
    rawSummary,
    salesSeries,
    purchaseSeries,
    stockReport,
    paymentSummary,
    dailyMetrics,
  } = useReports({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    granularity,
  });

  // Combine sales and purchase series for analytics chart
  // Normalize backend shapes: support `date`/`sales` and `sale_date`/`total_sales` variants
  const combinedSeries = salesSeries.map((s: any, idx: number) => {
    const dateVal =
      s.date ?? s.day ?? s.period ?? s.sale_date ?? s.saleDate ?? "";
    const salesAmt = Number(
      s.sales ?? s.total ?? s.value ?? s.total_sales ?? s.totalSales ?? 0
    );
    return {
      date: dateVal,
      sales: salesAmt || 0,
      purchase: purchaseSeries[idx]?.purchase || 0,
    };
  });

  // derive today's sales from dailyMetrics or salesSeries
  const todayIso = new Date().toISOString().split("T")[0];
  let todaySales = 0;
  const todayMetric = dailyMetrics.find((d: any) => d.date === todayIso);
  if (todayMetric && typeof todayMetric.salesAmount === "number") {
    todaySales = todayMetric.salesAmount;
  } else {
    const todaySeries = salesSeries.find((s: any) =>
      (s.date || "").startsWith(todayIso)
    );
    todaySales = Number(todaySeries?.sales ?? todaySeries?.total ?? 0) || 0;
  }

  // Helper: calculate percentage change
  const calculatePercentageChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return "+0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  const isCurrencyKey = (k: string) =>
    /sale|sales|purchase|purchas|profit|revenue|amount|total|value/i.test(k);
  const formatSummaryValue = (k: string, v: any) => {
    if (v === null || v === undefined) return "-";
    if (typeof v === "number") {
      if (isCurrencyKey(k)) return `AED ${Number(v).toLocaleString()}`;
      return Number(v).toLocaleString();
    }
    return String(v);
  };

  // derive yesterday's sales from dailyMetrics for percentage change
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayIso = yesterdayDate.toISOString().split("T")[0];
  const yesterdayMetric = dailyMetrics.find(
    (d: any) => d.date === yesterdayIso
  );
  const yesterdaySales =
    yesterdayMetric && typeof yesterdayMetric.salesAmount === "number"
      ? yesterdayMetric.salesAmount
      : 0;
  const todaySalesChange = calculatePercentageChange(
    todaySales,
    yesterdaySales
  );
  const todaySalesChangeValue = yesterdaySales
    ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
    : 0;

  // derive other yesterday values for the other cards
  const yesterdayPurchases =
    yesterdayMetric && typeof yesterdayMetric.purchaseAmount === "number"
      ? yesterdayMetric.purchaseAmount
      : 0;
  const yesterdayProfit =
    yesterdayMetric && typeof yesterdayMetric.dailyProfit === "number"
      ? yesterdayMetric.dailyProfit
      : 0;
  const yesterdayTransactions =
    yesterdayMetric && typeof yesterdayMetric.invoiceCount === "number"
      ? yesterdayMetric.invoiceCount
      : 0;
  const yesterdayLowStock =
    yesterdayMetric && typeof yesterdayMetric.lowStock === "number"
      ? yesterdayMetric.lowStock
      : 0;

  const purchasesChange = calculatePercentageChange(
    summary.totalPurchases || 0,
    yesterdayPurchases
  );
  const purchasesChangeValue = yesterdayPurchases
    ? ((summary.totalPurchases - yesterdayPurchases) / yesterdayPurchases) * 100
    : 0;

  const profitChange = calculatePercentageChange(
    summary.profit || 0,
    yesterdayProfit
  );
  const profitChangeValue = yesterdayProfit
    ? ((summary.profit - yesterdayProfit) / yesterdayProfit) * 100
    : 0;

  const transactionsChange = calculatePercentageChange(
    summary.transactions || 0,
    yesterdayTransactions
  );
  const transactionsChangeValue = yesterdayTransactions
    ? ((summary.transactions - yesterdayTransactions) / yesterdayTransactions) *
      100
    : 0;

  const lowStockChange = calculatePercentageChange(
    summary.lowStock || 0,
    yesterdayLowStock
  );
  const lowStockChangeValue = yesterdayLowStock
    ? ((summary.lowStock - yesterdayLowStock) / yesterdayLowStock) * 100
    : 0;

  // When salesSeries updates, map daily points into month buckets for last 6 months
  useEffect(() => {
    try {
      if (!salesSeries || salesSeries.length === 0) return;

      const monthMap: Record<string, number> = {};
      salesSeries.forEach((p: any) => {
        const dateStr = p.date || p.day || p.period || "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;
        const key = `${d.getMonth()}-${d.getFullYear()}`;
        monthMap[key] =
          (monthMap[key] || 0) + Number(p.sales || p.total || p.value || 0);
      });

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const months = [] as Array<{
        month: string;
        year: number;
        fullDate: Date;
      }>;
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          fullDate: date,
        });
      }

      const mapped = months.map((m) => {
        const key = `${m.fullDate.getMonth()}-${m.fullDate.getFullYear()}`;
        return { month: m.month, revenue: monthMap[key] || 0 };
      });

      if (mapped.length > 0) setRevenueData(mapped);
    } catch (err) {
      console.warn("Failed to derive revenueData from salesSeries", err);
    }
  }, [salesSeries]);

  // Fetch profit report when dateRange changes
  useEffect(() => {
    let mounted = true;
    const fetchProfit = async () => {
      try {
        const tenantId = localStorage.getItem("tenant_id");

        // Compute range params matching backend controller expectations
        const today = new Date().toISOString().split("T")[0];
        const s7 = new Date();
        s7.setDate(new Date().getDate() - 6);
        const start7 = s7.toISOString().split("T")[0];
        const s30 = new Date();
        s30.setDate(new Date().getDate() - 29);
        const start30 = s30.toISOString().split("T")[0];

        let params: any = { ...(tenantId ? { tenant_id: tenantId } : {}) };

        if (dateRange.startDate === start7 && dateRange.endDate === today) {
          params.range = "7d";
        } else if (
          dateRange.startDate === start30 &&
          dateRange.endDate === today
        ) {
          params.range = "30d";
        } else {
          params.from = dateRange.startDate;
          params.to = dateRange.endDate;
        }

        const res = await tenantReportAPI.getProfitReport(params);
        const data = res?.data ?? res ?? [];
        if (mounted) setProfitReport(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Failed to load profit report:", err);
        if (mounted) setProfitReport([]);
      }
    };
    fetchProfit();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate]);

  // Router sync for tabs
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialTab = () => {
    const path = location.pathname || "";
    if (path.includes("/report/sales")) return "sales";
    if (path.includes("/report/profit")) return "profit-report";
    if (path.includes("/report/purchases")) return "purchases";
    if (path.includes("/report/stock")) return "stock";
    if (path.includes("/report/payments")) return "payments";
    if (path.includes("/report/analytics")) return "analytics";
    // default to summary
    return "summary";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  useEffect(() => {
    const tabRoutes: Record<string, string> = {
      summary: "/report",
      sales: "/report/sales",
      "profit-report": "/report/profit",
      purchases: "/report/purchases",
      stock: "/report/stock",
      payments: "/report/payments",
      analytics: "/report/analytics",
    };
    const currentRoute = tabRoutes[activeTab] || "/report";
    if (location.pathname !== currentRoute) {
      navigate(currentRoute, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Keep activeTab in sync when user navigates (back/forward)
  useEffect(() => {
    const path = location.pathname || "";
    if (path.includes("/report/sales") && activeTab !== "sales")
      setActiveTab("sales");
    else if (path.includes("/report/profit") && activeTab !== "profit-report")
      setActiveTab("profit-report");
    else if (path.includes("/report/purchases") && activeTab !== "purchases")
      setActiveTab("purchases");
    else if (path.includes("/report/stock") && activeTab !== "stock")
      setActiveTab("stock");
    else if (path.includes("/report/payments") && activeTab !== "payments")
      setActiveTab("payments");
    else if (path.includes("/report/analytics") && activeTab !== "analytics")
      setActiveTab("analytics");
    else if (
      (path === "/report" || path === "/report/") &&
      activeTab !== "summary"
    )
      setActiveTab("summary");
  }, [location.pathname]);

  // Handle PDF downloads
  const handleDownloadPDF = async (reportType: string) => {
    setDownloadingPDF(reportType);
    try {
      const tenantId = localStorage.getItem("tenant_id");
      const params = {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      };

      switch (reportType) {
        case "inventory":
          await pdfReportService.generateInventoryPDF(params);
          break;
        case "sales":
          await pdfReportService.generateSalesPDF(params);
          break;
        case "purchases":
          await pdfReportService.generatePurchasesPDF(params);
          break;
        case "salesReturns":
          await pdfReportService.generateSalesReturnPDF(params);
          break;
        case "purchaseReturns":
          await pdfReportService.generatePurchaseReturnPDF(params);
          break;
        case "all":
          // Download all reports sequentially
          await pdfReportService.generateInventoryPDF(params);
          await pdfReportService.generateSalesPDF(params);
          await pdfReportService.generatePurchasesPDF(params);
          await pdfReportService.generateSalesReturnPDF(params);
          await pdfReportService.generatePurchaseReturnPDF(params);
          break;
      }

      toast({
        title: "PDF Generated",
        description: `Your ${reportType} report has been downloaded successfully.`,
      });
    } catch (err) {
      console.error("PDF download error:", err);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">
            Error loading reports: {error}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            View business insights and export detailed reports
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="px-3 py-2 border rounded-md"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="px-3 py-2 border rounded-md"
            />
          </div>
          <Button
            onClick={() => handleDownloadPDF("all")}
            disabled={downloadingPDF === "all"}
          >
            {downloadingPDF === "all" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards (dynamic from backend `summary` object) */}
      <div className="grid gap-4 md:grid-cols-4">
        {summary && Object.keys(summary).length > 0 ? (
          Object.entries(summary)
            .filter(
              ([k, v]) =>
                v !== null &&
                v !== undefined &&
                k !== "table" &&
                k !== "transactions"
            )
            .slice(0, 8)
            .map(([k, v]) => (
              <Card
                key={k}
                className="transition-colors duration-150 ease-in-out"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground capitalize">
                    {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                  </CardTitle>
                  {isCurrencyKey(k) ? (
                    <DollarSign className="h-4 w-4 text-primary" />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatSummaryValue(k, v)}
                  </div>
                </CardContent>
              </Card>
            ))
        ) : (
          <div className="col-span-4 text-sm text-muted-foreground">
            No summary metrics available from backend.
          </div>
        )}
      </div>

      {/* Tabs (route-aware) */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(String(v))}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="profit-report">Profit Report</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* SUMMARY TABLE: prefer backend-provided `summary.table`, fallback to `dailyMetrics` */}
        <TabsContent value="summary">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Summary</CardTitle>
              <Button
                size="sm"
                onClick={async () => {
                  setDownloadingPDF("summary");
                  try {
                    const tenantId = localStorage.getItem("tenant_id");
                    const params = {
                      ...(tenantId ? { tenant_id: tenantId } : {}),
                      start_date: dateRange.startDate,
                      end_date: dateRange.endDate,
                    };
                    await pdfReportService.generateSummaryPDF(params);
                    toast({
                      title: "PDF Generated",
                      description: "Summary PDF downloaded.",
                    });
                  } catch (err) {
                    console.error("Summary PDF error:", err);
                    toast({
                      title: "Download Failed",
                      description: "Failed to generate Summary PDF.",
                      variant: "destructive",
                    });
                  } finally {
                    setDownloadingPDF(null);
                  }
                }}
                disabled={downloadingPDF === "summary"}
              >
                {downloadingPDF === "summary" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-auto">
              {Array.isArray(rawSummary?.table) &&
              rawSummary.table.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(rawSummary.table[0]).map((col) => (
                          <th key={col} className="text-left py-2 px-3 text-sm">
                            {col.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawSummary.table.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          {Object.keys(rawSummary.table[0]).map((col) => (
                            <td key={col} className="py-2 px-3 text-sm">
                              {formatSummaryValue(col, row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : rawSummary &&
                typeof rawSummary === "object" &&
                Object.keys(rawSummary).length > 0 ? (
                // Fallback: render key/value pairs when backend returns a flat summary object
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm">Metric</th>
                        <th className="text-right py-2 px-3 text-sm">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rawSummary)
                        .filter(([k]) => k !== "table")
                        .map(([k, v]) => (
                          <tr key={k} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3 text-sm">
                              {k.replace(/_/g, " ")}
                            </td>
                            <td className="py-2 px-3 text-sm text-right">
                              {formatSummaryValue(k, v)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No summary data available from backend for selected range.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFIT REPORT */}
        <TabsContent value="profit-report">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profit Report (Revenue vs Cost)</CardTitle>
              <Button
                size="sm"
                onClick={async () => {
                  setDownloadingPDF("profit");
                  try {
                    const tenantId = localStorage.getItem("tenant_id");
                    const params = {
                      ...(tenantId ? { tenant_id: tenantId } : {}),
                      start_date: dateRange.startDate,
                      end_date: dateRange.endDate,
                    };
                    await pdfReportService.generateProfitPDF(params);
                    toast({
                      title: "PDF Generated",
                      description: "Profit PDF downloaded.",
                    });
                  } catch (err) {
                    console.error("Profit PDF error:", err);
                    toast({
                      title: "Download Failed",
                      description: "Failed to generate Profit PDF.",
                      variant: "destructive",
                    });
                  } finally {
                    setDownloadingPDF(null);
                  }
                }}
                disabled={downloadingPDF === "profit"}
              >
                {downloadingPDF === "profit" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm">Product</th>
                      <th className="text-right py-2 px-3 text-sm">
                        Revenue (AED)
                      </th>
                      <th className="text-right py-2 px-3 text-sm">
                        Cost (AED)
                      </th>
                      <th className="text-right py-2 px-3 text-sm">
                        Profit (AED)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitReport && profitReport.length > 0 ? (
                      profitReport.map((p: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 text-sm">
                            {p.product ||
                              p.product_name ||
                              p.name ||
                              `Product #${p.product_id || idx}`}
                          </td>
                          <td className="py-2 px-3 text-sm text-right">
                            AED {Number(p.revenue || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-sm text-right">
                            AED {Number(p.cost || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-sm text-right">
                            AED{" "}
                            {Number(
                              (p.revenue || 0) - (p.cost || 0)
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No profit data available for selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <CardTitle>Sales Report</CardTitle>
                <div>
                  <label className="text-xs text-muted-foreground mr-2">
                    Granularity
                  </label>
                  <select
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value as any)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <Button
                  size="sm"
                  onClick={() => handleDownloadPDF("sales")}
                  disabled={downloadingPDF === "sales"}
                >
                  {downloadingPDF === "sales" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm">Date</th>
                      <th className="text-right py-2 px-3 text-sm">
                        Sales (AED)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesSeries && salesSeries.length > 0 ? (
                      salesSeries.map((s: any) => (
                        <tr key={s.date} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 text-sm">{s.date}</td>
                          <td className="py-2 px-3 text-sm text-right">
                            AED{" "}
                            {Number(s.sales ?? s.total ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No sales data available for selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PURCHASES (Table) */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase Report</CardTitle>
              <Button
                size="sm"
                onClick={() => handleDownloadPDF("purchases")}
                disabled={downloadingPDF === "purchases"}
              >
                {downloadingPDF === "purchases" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm">Date</th>
                      <th className="text-right py-2 px-3 text-sm">
                        Purchases (AED)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseSeries && purchaseSeries.length > 0 ? (
                      purchaseSeries.map((p: any) => (
                        <tr key={p.date} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 text-sm">{p.date}</td>
                          <td className="py-2 px-3 text-sm text-right">
                            AED{" "}
                            {Number(
                              p.purchase || p.purchases || 0
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No purchase data available for selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STOCK */}
        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Overview</CardTitle>
              <Button
                size="sm"
                onClick={async () => {
                  setDownloadingPDF("stock");
                  try {
                    const tenantId = localStorage.getItem("tenant_id");
                    const params = {
                      ...(tenantId ? { tenant_id: tenantId } : {}),
                      start_date: dateRange.startDate,
                      end_date: dateRange.endDate,
                    };
                    await pdfReportService.generateStockPDF(params);
                    toast({
                      title: "PDF Generated",
                      description: "Stock PDF downloaded.",
                    });
                  } catch (err) {
                    console.error("Stock PDF error:", err);
                    toast({
                      title: "Download Failed",
                      description: "Failed to generate Stock PDF.",
                      variant: "destructive",
                    });
                  } finally {
                    setDownloadingPDF(null);
                  }
                }}
                disabled={downloadingPDF === "stock"}
              >
                {downloadingPDF === "stock" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockReport.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product}</TableCell>
                      <TableCell>{item.available}</TableCell>
                      <TableCell>AED {item.value.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "Low" ? "destructive" : "default"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS (Table) */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm">
                        Payment Mode
                      </th>
                      <th className="text-right py-2 px-3 text-sm">
                        Amount (AED)
                      </th>
                      <th className="text-right py-2 px-3 text-sm">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSummary && paymentSummary.length > 0 ? (
                      (() => {
                        const total =
                          paymentSummary.reduce(
                            (s: number, p: any) => s + Number(p.value || 0),
                            0
                          ) || 1;
                        return paymentSummary.map((pm: any, idx: number) => (
                          <tr
                            key={pm.mode || idx}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="py-2 px-3 text-sm">{pm.mode}</td>
                            <td className="py-2 px-3 text-sm text-right">
                              AED {Number(pm.value || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-sm text-right">
                              {((Number(pm.value || 0) / total) * 100).toFixed(
                                1
                              )}
                              %
                            </td>
                          </tr>
                        ));
                      })()
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No payment data available for selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Overall Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={combinedSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#82ca9d"
                    name="Sales (AED)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchase"
                    stroke="#8884d8"
                    name="Purchases (AED)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsModule;
