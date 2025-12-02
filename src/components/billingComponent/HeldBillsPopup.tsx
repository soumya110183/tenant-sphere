import { Clock, Play, X } from "lucide-react";
import { Button } from "../ui/button";

type BillRow = {
  code: string;
  name: string;
  qty: number | "";
  price: number;
  tax: number;
  total: number;
  product_id?: number | null;
};
type Customer = {
  id: number;
  name: string;
  phone: string;
  loyalty_points: number;
  membership_tier: string;
};
type HeldBill = {
  id: string;
  name: string;
  timestamp: string;
  customer: Customer | null;
  rows: BillRow[];
  couponCode: string;
  redeemPoints: number | "";
  preview: any;
  previewItems: any[];
  subtotal: number;
  total: number;
};

export const HeldBillsPopup = ({
  show,
  onClose,
  heldBills,
  onRestoreBill,
  onDeleteBill
}: {
  show: boolean;
  onClose: () => void;
  heldBills: HeldBill[];
  onRestoreBill: (bill: HeldBill) => void;
  onDeleteBill: (billId: string, e: React.MouseEvent) => void;
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Held Bills</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {heldBills.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {heldBills.map((bill) => (
                <div
                  key={bill.id}
                  className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => onRestoreBill(bill)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{bill.name}</h4>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {new Date(bill.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Items: {bill.rows.filter((r: any) => r.name).length}</p>
                        <p>Customer: {bill.customer?.name || 'Walk-in'}</p>
                        <p>Total: AED {bill.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onRestoreBill(bill)}>
                        <Play className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => onDeleteBill(bill.id, e)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 flex-1 flex items-center justify-center">
            <div>
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No held bills</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bills you hold will appear here
              </p>
            </div>
          </div>
        )}

        <Button variant="outline" onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    </div>
  );
};