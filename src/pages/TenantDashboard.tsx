import { useAuth } from "@/contexts/AuthContext";
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
import {
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  ShoppingCart,
  AlertTriangle,
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
  Legend,
  Pie,
  PieChart as RePieChart,
  Cell,
} from "recharts";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  invoiceService,
  inventoryService,
  purchaseService,
  pdfReportService,
} from "@/services/api";
import { useReports } from "@/hooks/useReports";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const TenantDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    totalProducts: 0,
    lowStockItems: 0,
    totalOrders: 0,
    revenueData: [],
    salesData: [],
    recentOrders: [],
    isLoading: true,
  });

  // Reports integration - last 7 days by default
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);

  // Use the reports hook for detailed analytics
  const {
    loading: reportsLoading,
    error: reportsError,
    summary,
    salesSeries,
    purchaseSeries,
    stockReport,
    paymentSummary,
    dailyMetrics,
  } = useReports({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    granularity: "daily",
  });

  // Combine sales and purchase series for analytics
  const combinedSeries = salesSeries.map((s, idx) => ({
    date: s.date,
    sales: s.sales || 0,
    purchase: purchaseSeries[idx]?.purchase || 0,
  }));

  // Calculate last 6 months for revenue chart
  const getLastSixMonths = () => {
    const months = [];
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

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        fullDate: date,
      });
    }
    return months;
  };

  // Calculate last 7 days for sales chart
  const getLastSevenDays = () => {
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        day: dayNames[date.getDay()],
        date: date.toISOString().split("T")[0],
        fullDate: date,
      });
    }
    return days;
  };

  const parseInventoryArray = (raw: any): any[] => {
    if (!raw) return [];
    // Accept shapes: { success, data }, { data: [...] }, direct array, nested inventory
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && Array.isArray(raw.data.data)) return raw.data.data;
    if (Array.isArray(raw.inventory)) return raw.inventory;
    if (raw.data && Array.isArray(raw.data.inventory))
      return raw.data.inventory;
    return [];
  };

  const parseInvoicesArray = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && Array.isArray(raw.data.data)) return raw.data.data;
    return [];
  };

  const loadDashboardData = async () => {
    try {
      setDashboardData((prev) => ({ ...prev, isLoading: true }));

      // Load invoices (sales)
      const invoicesResponse = await invoiceService.getAll();
      const invoices = parseInvoicesArray(invoicesResponse);

      // Load inventory
      const inventoryResponse = await inventoryService.getAll();
      const inventory = parseInventoryArray(inventoryResponse);

      // Load purchases for additional stats
      const purchasesResponse = await purchaseService.getAll();
      const purchases = parseInvoicesArray(purchasesResponse);

      console.log("Inventory raw response:", inventoryResponse);
      console.log("Dashboard data loaded:", {
        invoices: invoices.length,
        inventory: inventory.length,
        purchases: purchases.length,
      });

      // Calculate today's sales
      const today = new Date().toISOString().split("T")[0];
      const todaySales = invoices
        .filter((invoice) => invoice.created_at?.startsWith(today))
        .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

      // Calculate total products and low stock items
      const totalProducts = inventory.length;
      const lowStockItems = inventory.filter((item) => {
        const quantity = item.quantity ?? item.qty ?? 0;
        const reorderLevel = item.reorder_level ?? item.reorderLevel ?? 0;
        return reorderLevel > 0 && quantity <= reorderLevel;
      }).length;

      // Calculate revenue data for last 6 months
      const lastSixMonths = getLastSixMonths();
      const revenueData = lastSixMonths.map((monthData) => {
        const monthRevenue = invoices
          .filter((invoice) => {
            if (!invoice.created_at) return false;
            const invoiceDate = new Date(invoice.created_at);
            return (
              invoiceDate.getMonth() === monthData.fullDate.getMonth() &&
              invoiceDate.getFullYear() === monthData.fullDate.getFullYear()
            );
          })
          .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

        return {
          month: monthData.month,
          revenue: monthRevenue,
        };
      });

      // Calculate sales data for last 7 days
      const lastSevenDays = getLastSevenDays();
      const salesData = lastSevenDays.map((dayData) => {
        const daySales = invoices
          .filter((invoice) => {
            if (!invoice.created_at) return false;
            return invoice.created_at.startsWith(dayData.date);
          })
          .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

        return {
          day: dayData.day,
          sales: daySales,
        };
      });

      // Get recent orders (last 10 invoices)
      const recentOrders = invoices.slice(0, 10).map((invoice) => ({
        id: `#${invoice.invoice_number || invoice.id}`,
        customer: "Walk-in Customer", // You can add customer name to invoices if needed
        amount: invoice.total_amount || 0,
        status: "Completed", // All invoices are completed sales
        time: formatTimeAgo(invoice.created_at),
      }));

      // Calculate total orders (all invoices)
      const totalOrders = invoices.length;

      setDashboardData({
        todaySales,
        totalProducts,
        lowStockItems,
        totalOrders,
        revenueData,
        salesData,
        recentOrders,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
      setDashboardData((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Helper function to format time ago
  // Helper function to parse date with timezone awareness
  const parseDateSafely = (dateString) => {
    if (!dateString) return null;

    // If the date string already has timezone info, use it directly
    if (dateString.includes("Z") || dateString.includes("+")) {
      return new Date(dateString);
    }

    // If it's a naive datetime (no timezone), assume it's UTC
    // and convert to local time
    return new Date(dateString + "Z");
  };

  // Updated formatTimeAgo with better timezone handling
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Unknown time";

    const date = parseDateSafely(dateString);
    if (!date || isNaN(date.getTime())) return "Invalid date";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} ${diffMins === 1 ? "min" : "mins"} ago`;
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} ${
        Math.floor(diffDays / 7) === 1 ? "week" : "weeks"
      } ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  // Calculate percentage change (for demo - you can implement real comparison)
  const calculatePercentageChange = (current, previous = current * 0.85) => {
    if (!previous) return "+0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

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

  useEffect(() => {
    loadDashboardData();
    // Poll every 60s for dynamic updates
    const interval = setInterval(loadDashboardData, 60000);
    // Listen for inventory update events dispatched elsewhere
    const listener = () => loadDashboardData();
    window.addEventListener("inventory-updated", listener);
    return () => {
      clearInterval(interval);
      window.removeEventListener("inventory-updated", listener);
    };
  }, []);

  if (dashboardData.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.tenantName || user?.name || "Tenant"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your business today
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              AED {dashboardData.todaySales.toFixed(2)}
            </div>
            <p className="text-xs text-success mt-1">
              {calculatePercentageChange(dashboardData.todaySales)} from
              yesterday
            </p>
          </CardContent>
        </Card>
          <Card
  className="cursor-pointer transition-colors duration-200 ease-in-out hover:bg-gray-50"
  onClick={() => (window.location.href = "/stock")}
  title="Click to view low stock inventory"
>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {dashboardData.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Products in inventory
            </p>
          </CardContent>
        </Card>

        <Card
           className="cursor-pointer transition-colors duration-200 ease-in-out hover:bg-gray-50"
          onClick={() => (window.location.href = "/inventory")}
          title="Click to view low stock inventory"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-foreground">
                {dashboardData.lowStockItems}
              </div>
            </div>
            <p className="text-xs mt-1 flex items-center gap-1 text-warning">
              {dashboardData.lowStockItems === 0
                ? "All stock levels above reorder thresholds."
                : "Items are at or below reorder level."}
            </p>
          </CardContent>
        </Card>

        <Card
           className="cursor-pointer transition-colors duration-200 ease-in-out hover:bg-gray-50"
          onClick={() => (window.location.href = "/inventory?tab=sales")}
          title="Click to view sales in inventory"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {dashboardData.totalOrders}
            </div>
            <p className="text-xs text-success mt-1">
              {calculatePercentageChange(dashboardData.totalOrders)} from last
              week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Sales</TabsTrigger>
          {/* <TabsTrigger value="sales">Sales</TabsTrigger> */}
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* REVENUE */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [
                      `AED ${value.toFixed(2)}`,
                      "Revenue",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEEKLY SALES */}
        <TabsContent value="weekly">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Weekly Sales (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.salesData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`AED ${value.toFixed(2)}`, "Sales"]}
                  />
                  <Bar
                    dataKey="sales"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Report</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* PURCHASES */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase Report</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STOCK */}
        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
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
                    {stockReport.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          No stock data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockReport.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product}</TableCell>
                          <TableCell>{item.available}</TableCell>
                          <TableCell>AED {item.value.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.status === "Low"
                                  ? "destructive"
                                  : "default"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
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
              {reportsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : paymentSummary.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No payment data available for the selected period
                </p>
              ) : (
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
              )}
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
              {reportsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.recentOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent orders found
              </p>
            ) : (
              dashboardData.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {order.id} - {order.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.time}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold text-foreground">
                      AED {order.amount.toFixed(2)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        order.status === "Completed"
                          ? "bg-success/10 text-success"
                          : order.status === "Processing"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantDashboard;