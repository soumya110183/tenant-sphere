import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Trash2, Eye, EyeOff } from "lucide-react";

const SalesView = ({ sales = [], openModal, handleDelete }) => {
  console.log("SalesView rendered with sales:", sales);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (saleId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Sales Transactions ({sales.length})
          </CardTitle>
          <Button
            onClick={() => openModal("sale")}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Invoice No
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Date & Time
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Payment Method
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Items Count
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Total Amount
                </th>
                <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <>
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                        #{sale.invoice_number}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {new Date(sale.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <Badge variant="outline" className="capitalize">
                          {sale.payment_method}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {sale.invoice_items?.length || 0} items
                      </td>
                      <td className="py-3 px-2 sm:px-4 font-semibold text-sm">
                        AED {sale.total_amount?.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex gap-1 sm:gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRow(sale.id)}
                            title={
                              expandedRows.has(sale.id)
                                ? "Hide items"
                                : "View items"
                            }
                          >
                            {expandedRows.has(sale.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete("sale", sale.id)}
                            title="Delete sale"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(sale.id) && sale.invoice_items && (
                      <tr className="bg-muted/20">
                        <td colSpan="6" className="py-3 px-2 sm:px-4">
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              Items Sold:
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {sale.invoice_items.map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs p-2 bg-background rounded border"
                                >
                                  <div className="font-medium">
                                    {item.products?.name}
                                  </div>
                                  <div>
                                    Qty: {item.quantity} {item.products?.unit}
                                  </div>
                                  <div>
                                    Price: AED {item.price} × {item.quantity} =
                                    AED {item.total}
                                  </div>
                                  {item.tax > 0 && (
                                    <div>Tax: AED {item.tax}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesView;
