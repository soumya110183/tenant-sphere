import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CouponSection = ({
  couponCode,
  onChange,
  onApply,
  onClear,
  onBrowse,
}) => {
  return (
    <div className="space-y-2">
      <Label>Coupon Code</Label>

      <div className="flex gap-2">
        <Input
          value={couponCode}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter coupon"
        />
        <Button variant="outline" onClick={onBrowse}>
          Browse
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onApply}>
          Apply Discounts
        </Button>
        <Button variant="outline" className="flex-1" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
};

export default CouponSection;
