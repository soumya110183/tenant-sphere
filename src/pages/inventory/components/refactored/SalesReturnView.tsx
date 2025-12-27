import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { normalizeItems } from "@/lib/utils";

export const SalesReturnView = ({
  salesReturns,
  openModal,
  salesReturnsTotalRecords,
  SALES_RETURNS_PAGE_SIZE,
  loadSalesReturns,
  salesReturnsPage,
  salesReturnsTotalPages,
}) => {
  const totalRecords =
    typeof salesReturnsTotalRecords === "number" && salesReturnsTotalRecords > 0
      ? salesReturnsTotalRecords
      : salesReturns?.length ?? 0;
  const totalItems = (salesReturns || []).reduce((acc, ret) => {
    const items = normalizeItems(ret) || [];
    return (
      acc + items.reduce((s, it) => s + (Number(it.qty ?? it.quantity) || 0), 0)
    );
  }, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <RotateCcw className="h-5 w-5 text-primary" />
              Sales Returns ({totalRecords} items)
            </CardTitle>
            {/* <div className="text-sm text-muted-foreground">
              Total records: {totalRecords}
            </div> */}
            <Button
              onClick={() => openModal("salesReturn")}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Sales Return
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
                        Invoice ID
                      </th> */}
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                    Products
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                    Refund Type
                  </th>
                  <th className="text-right py-3 px-2 sm:px-4 font-semibold text-sm">
                    Total Refund
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesReturns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No sales returns found
                    </td>
                  </tr>
                ) : (
                  salesReturns.map((ret) => (
                    <tr key={ret.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 text-sm">{ret.date}</td>
                      {/* <td className="py-3 px-2 sm:px-4 text-sm">
                            #{ret.originalSaleId}
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
                        {ret.refundType}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right text-sm font-medium">
                        AED {ret.totalRefund.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Sales Returns Pagination */}
      {salesReturnsTotalRecords > SALES_RETURNS_PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                loadSalesReturns(Math.max(1, salesReturnsPage - 1))
              }
              disabled={salesReturnsPage === 1}
            >
              Prev
            </Button>

            <span className="text-sm text-gray-500">
              Page {salesReturnsPage} of {salesReturnsTotalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                loadSalesReturns(
                  Math.min(salesReturnsPage + 1, salesReturnsTotalPages)
                )
              }
              disabled={salesReturnsPage >= salesReturnsTotalPages}
            >
              Next
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {Math.min(
              (salesReturnsPage - 1) * SALES_RETURNS_PAGE_SIZE + 1,
              salesReturnsTotalRecords
            )}
            -
            {Math.min(
              salesReturnsPage * SALES_RETURNS_PAGE_SIZE,
              salesReturnsTotalRecords
            )}{" "}
            of {salesReturnsTotalRecords}
          </div>
        </div>
      )}
    </>
  );
};
