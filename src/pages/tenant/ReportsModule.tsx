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

  // Use the custom hook to fetch all report data
  const {
    loading,
    error,
    summary,
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
  const combinedSeries = salesSeries.map((s, idx) => ({
    date: s.date,
    sales: s.sales || 0,
    purchase: purchaseSeries[idx]?.purchase || 0,
  }));

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

  // Router sync for tabs
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialTab = () => {
    const path = location.pathname || "";
    if (path.includes("/report/sales")) return "sales";
    if (path.includes("/report/purchases")) return "purchases";
    if (path.includes("/report/stock")) return "stock";
    if (path.includes("/report/payments")) return "payments";
    if (path.includes("/report/analytics")) return "analytics";
    // default to daily-summary
    return "daily-summary";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  useEffect(() => {
    const tabRoutes: Record<string, string> = {
      "daily-summary": "/report",
      sales: "/report/sales",
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
      activeTab !== "daily-summary"
    )
      setActiveTab("daily-summary");
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card
          className="cursor-pointer transition-colors duration-200 ease-in-out hover:bg-gray-50"
          onClick={() => (window.location.href = "/inventory")}
          title="Click to view low stock inventory"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Sales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              AED {Number(todaySales || 0).toFixed(2)}
            </div>
            <p
              className={`text-xs mt-1 ${
                todaySalesChangeValue >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {todaySalesChange} from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Purchases
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              AED {Number(summary.totalPurchases || 0).toLocaleString()}
            </div>
            <p
              className={`text-xs mt-1 ${
                purchasesChangeValue >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {purchasesChange} from yesterday
            </p>
            <p className="text-xs text-muted-foreground mt-1">Period Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Profit
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              AED {Number(summary.profit || 0).toLocaleString()}
            </div>
            <p
              className={`text-xs mt-1 ${
                profitChangeValue >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {profitChange} from yesterday
            </p>
            <p className="text-xs text-success mt-1">Net Profit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Low Stock
            </CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.lowStock}</div>
            <p
              className={`text-xs mt-1 ${
                lowStockChangeValue >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {lowStockChange} from yesterday
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Items below threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Transactions
            </CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.transactions}</div>
            <p
              className={`text-xs mt-1 ${
                transactionsChangeValue >= 0
                  ? "text-success"
                  : "text-destructive"
              }`}
            >
              {transactionsChange} from yesterday
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs (route-aware) */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(String(v))}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="daily-summary" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
  >Daily Summary</TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
  >Sales</TabsTrigger>
          <TabsTrigger value="purchases" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
  >Purchases</TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
  >Stock</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
  >Payments</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
  >Analytics</TabsTrigger>
        </TabsList>

        {/* DAILY SUMMARY TABLE */}
        <TabsContent value="daily-summary">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daily Metrics Table</CardTitle>
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
            </CardHeader>
            <CardContent className="space-y-4 overflow-auto">
              <Table className="min-w-[1200px] text-xs">
                <TableHeader>
                  <TableRow className="whitespace-nowrap">
                    <TableHead>Date</TableHead>
                    <TableHead>Sales (AED)</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Avg Bill (AED)</TableHead>
                    <TableHead>Top Product</TableHead>
                    <TableHead>Purchases (AED)</TableHead>
                    <TableHead>Purchase Entries</TableHead>
                    <TableHead>Profit (AED)</TableHead>
                    <TableHead>Margin %</TableHead>
                    <TableHead>Δ Prev Day %</TableHead>
                    <TableHead>Δ Weekly Avg %</TableHead>
                    <TableHead>Sold Qty</TableHead>
                    <TableHead>Received Qty</TableHead>
                    <TableHead>Cash (AED)</TableHead>
                    <TableHead>UPI (AED)</TableHead>
                    <TableHead>Card (AED)</TableHead>
                    <TableHead>Credit (AED)</TableHead>
                    <TableHead>Low Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyMetrics.map((row) => (
                    <TableRow key={row.date} className="whitespace-nowrap">
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.salesAmount.toLocaleString()}</TableCell>
                      <TableCell>{row.invoiceCount}</TableCell>
                      <TableCell>{row.avgBill.toLocaleString()}</TableCell>
                      <TableCell>{row.topProduct}</TableCell>
                      <TableCell>
                        {row.purchaseAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{row.purchaseEntries}</TableCell>
                      <TableCell>{row.dailyProfit.toLocaleString()}</TableCell>
                      <TableCell>{row.marginPct.toFixed(2)}</TableCell>
                      <TableCell>
                        {row.prevDaySalesChangePct === null
                          ? "-"
                          : row.prevDaySalesChangePct.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {row.vsWeeklyAvgSalesChangePct.toFixed(2)}
                      </TableCell>
                      <TableCell>{row.soldItemsQty}</TableCell>
                      <TableCell>{row.receivedItemsQty}</TableCell>
                      <TableCell>{row.cash.toLocaleString()}</TableCell>
                      <TableCell>{row.upi.toLocaleString()}</TableCell>
                      <TableCell>{row.card.toLocaleString()}</TableCell>
                      <TableCell>{row.credit.toLocaleString()}</TableCell>
                      <TableCell>{row.lowStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dailyMetrics.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No daily data available for selected range.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Report</CardTitle>
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
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    name="Sales (AED)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PURCHASES */}
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={purchaseSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="purchase"
                    fill="hsl(var(--primary))"
                    name="Purchases (AED)"
                  />
                </BarChart>
              </ResponsiveContainer>
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
                onClick={() => handleDownloadPDF("inventory")}
                disabled={downloadingPDF === "inventory"}
              >
                {downloadingPDF === "inventory" ? (
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

        {/* PAYMENTS */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={paymentSummary}
                      dataKey="value"
                      nameKey="mode"
                      outerRadius={100}
                      label
                    >
                      {paymentSummary.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {paymentSummary.map((pm, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="font-medium">{pm.mode}</span>
                      </div>
                      <span className="text-lg font-bold">
                        AED {pm.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
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
