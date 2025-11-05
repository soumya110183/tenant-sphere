import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reportsAPI, paymentsAPI } from "@/services/api";
import { Download, FileText, TrendingUp, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import DownloadReportButton from "@/components/DownloadReportButton";

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "excel">(
    "csv"
  );
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const { toast } = useToast();

  // Refs for chart containers (used for client-side capture)
  const revenueRef = useRef<HTMLDivElement | null>(null);
  const tenantRef = useRef<HTMLDivElement | null>(null);
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const fullReportRef = useRef<HTMLDivElement | null>(null);

  // Category colors for pie chart
  const CATEGORY_COLORS = {
    Restaurant: "#3b82f6",
    Grocery: "#10b981",
    Salon: "#8b5cf6",
    Retail: "#f59e0b",
    Other: "#6b7280",
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const data = await reportsAPI.getDashboardStats();

      console.log("Reports data loaded:", data);
      setDashboardData(data);

      // Fetch all payments and calculate real revenue
      try {
        const paymentsResponse = await paymentsAPI.getAllPayments();
        const payments = paymentsResponse?.payments || [];

        // Calculate total revenue from all payments
        const total = payments.reduce((sum: number, payment: any) => {
          return sum + (Number(payment.amount) || 0);
        }, 0);

        setTotalRevenue(total);
        console.log("Total revenue from payments:", total);

        // Calculate monthly revenue trend from payments
        const monthlyRevenue: Record<string, number> = {};

        payments.forEach((payment: any) => {
          if (payment.payment_date) {
            const date = new Date(payment.payment_date);
            const monthYear = date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });

            monthlyRevenue[monthYear] =
              (monthlyRevenue[monthYear] || 0) + (Number(payment.amount) || 0);
          }
        });

        // Convert to array and sort by date
        const revenueArray = Object.entries(monthlyRevenue)
          .map(([month, revenue]) => ({ month, revenue }))
          .sort((a, b) => {
            // Convert 'Mon YYYY' -> using Date by parsing first day
            const dateA = new Date(
              `${a.month.split(" ")[0]} 1, ${a.month.split(" ")[1]}`
            );
            const dateB = new Date(
              `${b.month.split(" ")[0]} 1, ${b.month.split(" ")[1]}`
            );
            return dateA.getTime() - dateB.getTime();
          })
          .slice(-6); // Get last 6 months

        setRevenueData(
          revenueArray.length > 0 ? revenueArray : data.revenueData || []
        );
        console.log("Monthly revenue trend:", revenueArray);
      } catch (paymentsError) {
        console.error("Failed to fetch payments:", paymentsError);
        setTotalRevenue(0);
        setRevenueData(data.revenueData || []);
      }
    } catch (error) {
      console.error("Failed to load report data:", error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType: string) => {
    try {
      setExporting(true);

      // Send the user-selected format directly to the backend.
      // If the user selected 'pdf' the backend will receive type=pdf and
      // can generate a PDF (as you observed when opening the direct link).
      await reportsAPI.exportReport(reportType, exportFormat);

      toast({
        title: "Export successful",
        description: `${reportType} report exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // -------------------------
  // Client-side capture helpers
  // -------------------------
  const captureElement = async (el: HTMLDivElement | null) => {
    if (!el) throw new Error("Element not found for capture");
    // html2canvas options: increase scale for higher DPI, useCORS to attempt cross-origin images
    return html2canvas(el, { scale: 2, useCORS: true, logging: false });
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportChartAsPng = async (
    ref: React.RefObject<HTMLDivElement>,
    filename = "chart.png"
  ) => {
    try {
      const canvas = await captureElement(ref.current);
      const dataUrl = canvas.toDataURL("image/png");
      downloadDataUrl(dataUrl, filename);
      toast({ title: "Downloaded", description: `${filename} saved.` });
    } catch (err) {
      console.error("PNG export failed:", err);
      toast({
        title: "Export failed",
        description: "Unable to export PNG.",
        variant: "destructive",
      });
    }
  };

  const exportChartAsJpg = async (
    ref: React.RefObject<HTMLDivElement>,
    filename = "chart.jpg"
  ) => {
    try {
      const canvas = await captureElement(ref.current);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      downloadDataUrl(dataUrl, filename);
      toast({ title: "Downloaded", description: `${filename} saved.` });
    } catch (err) {
      console.error("JPG export failed:", err);
      toast({
        title: "Export failed",
        description: "Unable to export JPG.",
        variant: "destructive",
      });
    }
  };

  const exportChartAsPdf = async (
    ref: React.RefObject<HTMLDivElement>,
    filename = "chart.pdf"
  ) => {
    try {
      const canvas = await captureElement(ref.current);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          let imgW = img.width;
          let imgH = img.height;
          const ratio = Math.min(pageWidth / imgW, pageHeight / imgH);
          imgW *= ratio;
          imgH *= ratio;
          const x = (pageWidth - imgW) / 2;
          const y = (pageHeight - imgH) / 2;
          pdf.addImage(img, "PNG", x, y, imgW, imgH);
          pdf.save(filename);
          resolve();
        };
        img.onerror = (e) => {
          reject(e);
        };
        img.src = imgData;
      });

      toast({ title: "Downloaded", description: `${filename} saved.` });
    } catch (err) {
      console.error("PDF export failed:", err);
      toast({
        title: "Export failed",
        description: "Unable to export PDF.",
        variant: "destructive",
      });
    }
  };

  // -------------------------
  // UI states
  // -------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Reports...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No data available</h3>
          <p className="text-muted-foreground">Unable to load report data</p>
        </div>
      </div>
    );
  }

  const tenantGrowth = dashboardData.tenantGrowth || [];
  const categoryData = (dashboardData.categoryDistribution || []).map(
    (cat: any) => ({
      ...cat,
      color:
        CATEGORY_COLORS[cat.name as keyof typeof CATEGORY_COLORS] ||
        CATEGORY_COLORS.Other,
    })
  );

  const avgRevenuePerTenant =
    dashboardData.stats?.totalTenants > 0
      ? Math.round(totalRevenue / dashboardData.stats.totalTenants)
      : 0;

  return (
    <div className="space-y-6" ref={fullReportRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into your business performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={exportFormat}
            onValueChange={(value: any) => setExportFormat(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>

          {/* Option to export the whole visible report as PDF / PNG */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportChartAsPng(fullReportRef, "full-report.png")}
            className="ml-2"
          >
            Download Page (PNG)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportChartAsPdf(fullReportRef, "full-report.pdf")}
          >
            Download Page (PDF)
          </Button>
        </div>
      </div>

      {/* Revenue Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Analysis</CardTitle>
              <CardDescription>Monthly revenue trends</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Client-side chart exports */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  exportChartAsPng(revenueRef, "revenue-chart.png")
                }
              >
                Download PNG
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  exportChartAsPdf(revenueRef, "revenue-chart.pdf")
                }
              >
                Download PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={revenueRef}>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: any) =>
                      new Intl.NumberFormat("en-AE", {
                        style: "currency",
                        currency: "AED",
                        maximumFractionDigits: 0,
                      }).format(Number(value))
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                No revenue data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Growth Metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tenant Growth */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tenant Growth</CardTitle>
                <CardDescription>New tenants per month</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    exportChartAsPng(tenantRef, "tenant-growth.png")
                  }
                >
                  Download PNG
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    exportChartAsPdf(tenantRef, "tenant-growth.pdf")
                  }
                >
                  Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={tenantRef}>
              {tenantGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={tenantGrowth}
                    barCategoryGap="20%"
                    barSize={tenantGrowth.length === 1 ? 60 : undefined}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="tenants"
                      fill="hsl(var(--primary))"
                      name="New Tenants"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={80}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No growth data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Tenants by business category</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    exportChartAsPng(categoryRef, "categories.png")
                  }
                >
                  Download PNG
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    exportChartAsPdf(categoryRef, "categories.pdf")
                  }
                >
                  Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={categoryRef}>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No category data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat("en-AE", {
                style: "currency",
                currency: "AED",
                maximumFractionDigits: 0,
              }).format(totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <TrendingUp className="h-4 w-4" />
              <span>From all payments</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Revenue per Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat("en-AE", {
                style: "currency",
                currency: "AED",
                maximumFractionDigits: 0,
              }).format(avgRevenuePerTenant)}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <TrendingUp className="h-4 w-4" />
              <span>
                Total tenants: {dashboardData.stats?.totalTenants || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData.stats?.activeTenants || 0}
            </div>
            <div className="flex items-center gap-1 text-sm text-success mt-2">
              <TrendingUp className="h-4 w-4" />
              <span>
                {dashboardData.stats?.totalTenants > 0
                  ? `${(
                      (dashboardData.stats.activeTenants /
                        dashboardData.stats.totalTenants) *
                      100
                    ).toFixed(1)}% of total`
                  : "No data"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export All Reports</CardTitle>
          <CardDescription>
            Download comprehensive reports in your preferred format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleExport("payments")}
              disabled={exporting}
            >
              <FileText className="mr-2 h-4 w-4" />
              Revenue Report
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleExport("tenants")}
              disabled={exporting}
            >
              <FileText className="mr-2 h-4 w-4" />
              Tenant Report
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleExport("users")}
              disabled={exporting}
            >
              <FileText className="mr-2 h-4 w-4" />
              User Report
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="mr-2 h-4 w-4" />
              <DownloadReportButton report="all-data" />
            </Button>
            {/* Server-side full PDF download */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
