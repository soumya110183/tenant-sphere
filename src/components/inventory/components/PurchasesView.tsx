import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, TrendingDown } from "lucide-react";

interface PurchasesViewProps {
  purchases: any[];
  openModal: (type: string) => void;
  handleDelete: (type: string, id: number) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  openModal,
  handleDelete,
}) => {
  const safePurchases = Array.isArray(purchases) ? purchases : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TrendingDown className="h-5 w-5 text-primary" />
            Purchase Records ({safePurchases.length})
          </CardTitle>
          <Button
            onClick={() => openModal("purchase")}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Purchase ID
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Invoice No
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Supplier ID
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Date
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Items
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Total Amount
                </th>
                {/* <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Actions
                </th> */}
              </tr>
            </thead>
            <tbody>
              {safePurchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No purchases recorded yet. Create your first purchase!
                  </td>
                </tr>
              ) : (
                safePurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                      #{purchase.id}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm font-mono">
                      {purchase.invoice_number}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      Supplier #{purchase.supplier_id}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      <div className="max-w-xs">
                        {purchase.items &&
                          purchase.items.slice(0, 2).map((item: any) => (
                            <div key={item.id} className="text-xs">
                              {item.product_name} ({item.quantity}{" "}
                              {item.product_unit})
                            </div>
                          ))}
                        {purchase.items_count > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{purchase.items_count - 2} more items
                          </div>
                        )}
                        {(!purchase.items || purchase.items.length === 0) && (
                          <div className="text-xs text-muted-foreground">
                            No items
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-semibold text-sm">
                      AED {purchase.total_amount?.toFixed(2)}
                    </td>
                    {/* <td className="py-3 px-2 sm:px-4">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete("purchase", purchase.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
