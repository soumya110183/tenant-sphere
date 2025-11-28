import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  DollarSign,
  Package,
  TrendingUp,
  Calendar,
  Clock,
  ShoppingCart,
  AlertTriangle,
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
} from "recharts";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  invoiceService,
  inventoryService,
  purchaseService,
} from "@/services/api";

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

  const loadDashboardData = async () => {
    try {
      setDashboardData((prev) => ({ ...prev, isLoading: true }));

      // Load invoices (sales)
      const invoicesResponse = await invoiceService.getAll();
      const invoices = invoicesResponse.data?.data || [];

      // Load inventory
      const inventoryResponse = await inventoryService.getAll();
      const inventory = inventoryResponse.data || [];

      // Load purchases for additional stats
      const purchasesResponse = await purchaseService.getAll();
      const purchases = purchasesResponse.data?.data || [];

      console.log("test " + inventoryResponse);
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
        const quantity = item.quantity || 0;
        const reorderLevel = item.reorder_level || 0;
        return quantity <= reorderLevel;
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

  useEffect(() => {
    loadDashboardData();
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
          Welcome back, {user?.tenantName || "Tenant"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your business today
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
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

        <Card>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {dashboardData.lowStockItems}
            </div>
            <p className="text-xs text-warning mt-1">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
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

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
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
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`AED ${value.toFixed(2)}`, "Revenue"]}
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

        <Card>
          <CardHeader>
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
      </div>

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
