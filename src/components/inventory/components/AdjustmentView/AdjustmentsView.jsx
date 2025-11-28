import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Plus } from "lucide-react";

const AdjustmentsView = ({ stockAdjustments, openModal }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Edit className="h-5 w-5 text-primary" />
          Stock Adjustments ({stockAdjustments.length})
        </CardTitle>
        <Button
          onClick={() => openModal("adjustment")}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Adjustment
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Adjustment ID
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Product
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Type
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Quantity
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Reason
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {stockAdjustments.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  No stock adjustments yet.
                </td>
              </tr>
            ) : (
              stockAdjustments.map((adj) => (
                <tr key={adj.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                    ADJ-#{adj.id}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-sm">
                    {adj.productName}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <Badge
                      className={
                        adj.type === "Add"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }
                    >
                      {adj.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{adj.quantity}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{adj.reason}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{adj.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

export default AdjustmentsView;