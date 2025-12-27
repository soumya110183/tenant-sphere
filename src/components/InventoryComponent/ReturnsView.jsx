import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { normalizeItems } from "@/lib/utils";

export const ReturnsView = ({ salesReturns, purchaseReturns, openModal }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <RotateCcw className="h-5 w-5 text-primary" />
            Sales Returns ({salesReturns.length})
          </CardTitle>
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
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Return ID
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Original Sale
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Date
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Returned Items
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Refund Type
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Total Refund
                </th>
              </tr>
            </thead>
            <tbody>
              {salesReturns.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No sales returns yet.
                  </td>
                </tr>
              ) : (
                salesReturns.map((ret) => (
                  <tr key={ret.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                      SR-#{ret.id}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      #{ret.originalSaleId}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">{ret.date}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {normalizeItems(ret).length === 0
                        ? "No items"
                        : normalizeItems(ret)
                            .map(
                              (i) =>
                                `${i.name} (${i.qty})${
                                  i.reason ? ` - ${i.reason}` : ""
                                }`
                            )
                            .join(", ")}
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <Badge variant="outline">{ret.refundType}</Badge>
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-semibold text-red-600 text-sm">
                      ₹{ret.totalRefund}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <RotateCcw className="h-5 w-5 text-primary" />
            Purchase Returns ({purchaseReturns.length})
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
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Return ID
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Supplier
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Date
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Returned Items
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Amount Adjusted
                </th>
              </tr>
            </thead>
            <tbody>
              {purchaseReturns.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No purchase returns yet.
                  </td>
                </tr>
              ) : (
                purchaseReturns.map((ret) => (
                  <tr key={ret.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                      PR-#{ret.id}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {ret.supplierName || `Supplier-${ret.supplierId}`}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">{ret.date}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {normalizeItems(ret).length === 0
                        ? "No items"
                        : normalizeItems(ret)
                            .map(
                              (i) =>
                                `${i.name} (${i.qty})${
                                  i.reason ? ` - ${i.reason}` : ""
                                }`
                            )
                            .join(", ")}
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-semibold text-green-600 text-sm">
                      ₹{ret.amountAdjusted}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);
