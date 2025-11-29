import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const BillingTable = ({
  rows,
  onItemChange,
  onQtyChange,
  onAddRow,
  onDeleteRow,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Table</CardTitle>
      </CardHeader>

      <CardContent>
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input
              value={row.code}
              placeholder="Item Code"
              onChange={(e) => onItemChange(i, e.target.value)}
            />

            <Input
              type="number"
              value={row.qty}
              placeholder="Qty"
              onChange={(e) => onQtyChange(i, e.target.value)}
            />

            <div className="w-20 text-right">AED {row.price}</div>
            <div className="w-20 text-right">AED {row.total}</div>

            <Button variant="ghost" onClick={() => onDeleteRow(i)}>
              X
            </Button>
          </div>
        ))}

        <Button variant="outline" onClick={onAddRow} className="mt-3 w-full">
          + Add Row
        </Button>
      </CardContent>
    </Card>
  );
};

export default BillingTable;
