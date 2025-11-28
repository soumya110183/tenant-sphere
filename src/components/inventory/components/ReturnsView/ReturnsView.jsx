import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus } from "lucide-react";

const ReturnsView = ({ salesReturns, purchaseReturns, openModal }) => {
  return (
    <div className="space-y-6">
      {/* SALES RETURNS */}
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
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Return ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Sale ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Returned Item
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Refund Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
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
                      <td className="px-4 py-3 font-medium text-sm">
                        SR-#{ret.id}
                      </td>

                      <td className="px-4 py-3 text-sm">#{ret.sales_id}</td>

                      <td className="px-4 py-3 text-sm">
                        {new Date(ret.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {ret.products?.name || "Unknown"} ({ret.quantity}) -{" "}
                        {ret.reason}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline">{ret.refund_type}</Badge>
                      </td>

                      <td className="px-4 py-3 text-red-600 font-semibold text-sm">
                        AED {ret.total_refund?.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PURCHASE RETURNS */}
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
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Return ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Purchase ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Returned Item
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Refund Method
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
                      <td className="px-4 py-3 font-medium text-sm">
                        PR-#{ret.id}
                      </td>

                      <td className="px-4 py-3 text-sm">#{ret.purchase_id}</td>

                      <td className="px-4 py-3 text-sm">
                        {new Date(ret.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {ret.products?.name || "Unknown"} ({ret.quantity}) -{" "}
                        {ret.reason}
                      </td>

                      <td className="px-4 py-3 font-semibold text-green-600 text-sm">
                        {ret.refund_method}
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
};

export default ReturnsView;
