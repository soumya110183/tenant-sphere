import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const PaymentMethodSection = ({ value, onChange }) => {
  const methods = ["cash", "card", "upi", "credit"];

  return (
    <div>
      <Label>Payment Method</Label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {methods.map((m) => (
          <Button
            key={m}
            variant={value === m ? "default" : "outline"}
            className="flex-col"
            onClick={() => onChange(m)}
          >
            {m.toUpperCase()}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodSection;
