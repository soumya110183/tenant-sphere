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
  BarChart3,
  CreditCard,
  Loader2,
  FileDown,
} from "lucide-react";

import { useState } from "react";
import { useReports } from "@/hooks/useReports";
import { pdfReportService } from "@/services/api";

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

  // Combine sales and purchase series for analytics
  const combinedSeries = salesSeries.map((s, idx) => ({
    date: s.date,
    sales: s.sales || 0,
    purchase: purchaseSeries[idx]?.purchase || 0,
    profit: (s.sales || 0) - (purchaseSeries[idx]?.purchase || 0),
  }));

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Sales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              AED {summary.totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-success mt-1">Period Total</p>
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
              AED {summary.totalPurchases.toLocaleString()}
            </div>
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
              AED {summary.profit.toLocaleString()}
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">Total Invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily-summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily-summary">Daily Summary</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

        {/* SALES - Converted from Chart to Table */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Report - Detailed Breakdown</CardTitle>
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
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sales Amount (AED)</TableHead>
                      <TableHead>Number of Invoices</TableHead>
                      <TableHead>Average Invoice Value</TableHead>
                      <TableHead>Growth Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesSeries.map((sale, index) => {
                      const prevSale = salesSeries[index - 1]?.sales || 0;
                      const growthRate = prevSale 
                        ? ((sale.sales - prevSale) / prevSale * 100)
                        : 0;
                      
                      return (
                        <TableRow key={sale.date}>
                          <TableCell className="font-medium">{sale.date}</TableCell>
                          <TableCell>AED {sale.sales?.toLocaleString() || '0'}</TableCell>
                          <TableCell>{sale.invoiceCount || 'N/A'}</TableCell>
                          <TableCell>
                            AED {sale.avgInvoiceValue?.toLocaleString() || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                growthRate >= 0 ? "default" : "destructive"
                              }
                            >
                              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sale.sales > (salesSeries[index - 1]?.sales || 0)
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {sale.sales > (salesSeries[index - 1]?.sales || 0)
                                ? "Increasing"
                                : "Decreasing"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {salesSeries.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No sales data available for the selected period.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PURCHASES - Converted from Chart to Table */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase Report - Detailed Breakdown</CardTitle>
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
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Purchase Amount (AED)</TableHead>
                      <TableHead>Number of Orders</TableHead>
                      <TableHead>Average Order Value</TableHead>
                      <TableHead>Vendor Count</TableHead>
                      <TableHead>Growth Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseSeries.map((purchase, index) => {
                      const prevPurchase = purchaseSeries[index - 1]?.purchase || 0;
                      const growthRate = prevPurchase 
                        ? ((purchase.purchase - prevPurchase) / prevPurchase * 100)
                        : 0;
                      
                      return (
                        <TableRow key={purchase.date}>
                          <TableCell className="font-medium">{purchase.date}</TableCell>
                          <TableCell>AED {purchase.purchase?.toLocaleString() || '0'}</TableCell>
                          <TableCell>{purchase.orderCount || 'N/A'}</TableCell>
                          <TableCell>
                            AED {purchase.avgOrderValue?.toLocaleString() || 'N/A'}
                          </TableCell>
                          <TableCell>{purchase.vendorCount || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                growthRate >= 0 ? "default" : "destructive"
                              }
                            >
                              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {purchaseSeries.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No purchase data available for the selected period.
                </p>
              )}
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
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Available Stock</TableHead>
                      <TableHead>Minimum Stock Level</TableHead>
                      <TableHead>Stock Value (AED)</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockReport.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product}</TableCell>
                        <TableCell>{item.sku || 'N/A'}</TableCell>
                        <TableCell>{item.available}</TableCell>
                        <TableCell>{item.minStockLevel || 'N/A'}</TableCell>
                        <TableCell>AED {item.value?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>AED {item.costPrice?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell>AED {item.sellingPrice?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "Low" 
                                ? "destructive" 
                                : item.status === "Out of Stock"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS - Converted from Chart to Table */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary - Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount (AED)</TableHead>
                      <TableHead>Percentage of Total</TableHead>
                      <TableHead>Transaction Count</TableHead>
                      <TableHead>Average Transaction</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentSummary.map((payment, index) => {
                      const total = paymentSummary.reduce((sum, pm) => sum + pm.value, 0);
                      const percentage = total > 0 ? (payment.value / total) * 100 : 0;
                      
                      return (
                        <TableRow key={payment.mode}>
                          <TableCell className="font-medium">{payment.mode}</TableCell>
                          <TableCell>AED {payment.value.toLocaleString()}</TableCell>
                          <TableCell>{percentage.toFixed(1)}%</TableCell>
                          <TableCell>{payment.transactionCount || 'N/A'}</TableCell>
                          <TableCell>
                            AED {payment.avgTransaction?.toLocaleString() || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                percentage > 30 ? "default" : "secondary"
                              }
                            >
                              {percentage > 30 ? "Primary" : "Secondary"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {paymentSummary.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No payment data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS - Converted from Chart to Table */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Overall Analytics - Comparative Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sales (AED)</TableHead>
                      <TableHead>Purchases (AED)</TableHead>
                      <TableHead>Profit (AED)</TableHead>
                      <TableHead>Profit Margin %</TableHead>
                      <TableHead>Sales vs Purchases</TableHead>
                      <TableHead>Efficiency Ratio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedSeries.map((item) => {
                      const profitMargin = item.sales > 0 ? (item.profit / item.sales) * 100 : 0;
                      const salesVsPurchases = item.purchase > 0 ? (item.sales / item.purchase) * 100 : 0;
                      const efficiency = item.purchase > 0 ? (item.profit / item.purchase) * 100 : 0;
                      
                      return (
                        <TableRow key={item.date}>
                          <TableCell className="font-medium">{item.date}</TableCell>
                          <TableCell>AED {item.sales.toLocaleString()}</TableCell>
                          <TableCell>AED {item.purchase.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={item.profit >= 0 ? "text-green-600" : "text-red-600"}>
                              AED {item.profit.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={profitMargin >= 20 ? "default" : "secondary"}
                            >
                              {profitMargin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={salesVsPurchases >= 100 ? "default" : "secondary"}
                            >
                              {salesVsPurchases.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={efficiency >= 15 ? "default" : efficiency >= 0 ? "secondary" : "destructive"}
                            >
                              {efficiency.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {combinedSeries.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No analytics data available for the selected period.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsModule;