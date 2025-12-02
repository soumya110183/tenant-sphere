import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, Clock } from "lucide-react";
import { useState } from "react";

type BillRow = {
  code: string;
  name: string;
  qty: number | "";
  price: number;
  tax: number;
  total: number;
  product_id?: number | null;
};

export const HoldBillSection = ({
  rows,
  billName,
  onBillNameChange,
  onHoldBill,
  heldBillsCount,
  onShowHeldBills
}: {
  rows: BillRow[];
  billName: string;
  onBillNameChange: (name: string) => void;
  onHoldBill: () => void;
  heldBillsCount: number;
  onShowHeldBills: () => void;
}) => {
  const hasItems = rows.some(row => row.name && row.qty);
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* --- Action Buttons Row (next to Print Bill) --- */}
      <div className="flex gap-2">

        {/* Hold Bill Button (opens small popup) */}
        {hasItems && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Hold Bill
          </Button>
        )}

        {/* Held Bills Button (always visible) */}
        <Button
          variant="outline"
          onClick={onShowHeldBills}
        >
          <Clock className="h-4 w-4 mr-2" />
          Held Bills ({heldBillsCount})
        </Button>
      </div>

      {/* --- Hold Bill Popup --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Bill</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={billName}
              onChange={(e) => onBillNameChange(e.target.value)}
              placeholder="Enter bill name"
            />
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                onHoldBill();
                setOpen(false);
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
