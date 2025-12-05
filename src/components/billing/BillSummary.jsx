import { Separator } from "@/components/ui/separator";

export const BillSummary = ({ subtotal, tax, total, redeem, finalPayable }) => {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>AED {subtotal}</span>
      </div>

      <div className="flex justify-between">
        <span>Tax</span>
        <span>AED {tax}</span>
      </div>

      <Separator />

      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>AED {total}</span>
      </div>

      {redeem > 0 && (
        <div className="flex justify-between text-blue-600">
          <span>Redeem</span>
          <span>-AED {redeem}</span>
        </div>
      )}

      <div className="flex justify-between font-bold text-lg">
        <span>Final Payable</span>
        <span>AED {finalPayable}</span>
      </div>
    </div>
  );
};

export default BillSummarysss;
