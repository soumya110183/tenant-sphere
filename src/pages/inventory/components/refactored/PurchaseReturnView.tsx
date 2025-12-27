import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { normalizeItems } from "@/lib/utils";

export const PurchaseReturnView = ({
  purchaseReturns,
  openModal,
  purchaseReturnsTotalRecords,
  purchaseReturnsTotalItems,
  PURCHASE_RETURNS_PAGE_SIZE,
  loadPurchaseReturns,
  purchaseReturnsPage,
  purchaseReturnsTotalPages,
}) => {
  const totalRecords = purchaseReturnsTotalRecords ?? purchaseReturns.length;
  const totalItems =
    purchaseReturnsTotalItems ??
    purchaseReturns.reduce((acc, ret) => {
      const items = normalizeItems(ret) || [];
      return acc + items.reduce((s, it) => s + (it.qty || 0), 0);
    }, 0);
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <RotateCcw className="h-5 w-5 text-primary" />
              Purchase Returns ({totalRecords} Records)
            </CardTitle>
            <Button
              onClick={() => openModal("purchaseReturn")}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Return
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                    Date
                  </th>
                  {/* <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                        Supplier
                      </th> */}
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                    Products
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                    Refund Method
                  </th>
                  <th className="text-right py-3 px-2 sm:px-4 font-semibold text-sm">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseReturns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No purchase returns found
                    </td>
                  </tr>
                ) : (
                  purchaseReturns.map((ret) => (
                    <tr key={ret.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 text-sm">{ret.date}</td>
                      {/* <td className="py-3 px-2 sm:px-4 text-sm">
                            {ret.supplierName}
                          </td> */}
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {normalizeItems(ret).length === 0 ? (
                          <div className="text-muted-foreground">No items</div>
                        ) : (
                          normalizeItems(ret).map((item, idx) => (
                            <div key={idx}>
                              {item.name} (x{item.qty})
                            </div>
                          ))
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm capitalize">
                        {ret.refundMethod}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right text-sm font-medium">
                        AED {ret.amountAdjusted.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Purchase Returns Pagination */}
      {purchaseReturnsTotalRecords > PURCHASE_RETURNS_PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                loadPurchaseReturns(Math.max(1, purchaseReturnsPage - 1))
              }
              disabled={purchaseReturnsPage === 1}
            >
              Prev
            </Button>

            <span className="text-sm text-gray-500">
              Page {purchaseReturnsPage} of {purchaseReturnsTotalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                loadPurchaseReturns(
                  Math.min(purchaseReturnsPage + 1, purchaseReturnsTotalPages)
                )
              }
              disabled={purchaseReturnsPage >= purchaseReturnsTotalPages}
            >
              Next
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {Math.min(
              (purchaseReturnsPage - 1) * PURCHASE_RETURNS_PAGE_SIZE + 1,
              purchaseReturnsTotalRecords
            )}
            -
            {Math.min(
              purchaseReturnsPage * PURCHASE_RETURNS_PAGE_SIZE,
              purchaseReturnsTotalRecords
            )}{" "}
            of {purchaseReturnsTotalRecords}
          </div>
        </div>
      )}
    </>
  );
};
