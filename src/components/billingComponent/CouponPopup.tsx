import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const API_BASE = "https://billingbackend-1vei.onrender.com";
export const CouponPopup = ({ 
  show, 
  onClose, 
  onSelectCoupon 
}: { 
  show: boolean;
  onClose: () => void;
  onSelectCoupon: (coupon: any) => void;
}) => {
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const { toast } = useToast();

  const fetchAvailableCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/discounts/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) {
        setAvailableCoupons([]);
        return;
      }

      const coupons = (json.data || []).filter(
        (r: any) => r.type === "coupon" && r.is_active
      );
      setAvailableCoupons(coupons);
    } catch (err) {
      console.error("Coupon fetch error:", err);
      toast({
        title: "Error loading coupons",
        description: "Failed to fetch available coupons",
        variant: "destructive",
      });
      setAvailableCoupons([]);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (show) {
      fetchAvailableCoupons();
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Available Coupons</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoadingCoupons ? (
          <div className="text-center py-8">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
            <p className="text-sm text-muted-foreground mt-2">Loading coupons...</p>
          </div>
        ) : availableCoupons.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                onClick={() => onSelectCoupon(coupon)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-primary">{coupon.code}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {coupon.description || "Special discount coupon"}
                    </p>
                    {coupon.valid_from && coupon.valid_until && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Valid: {new Date(coupon.valid_from).toLocaleDateString()} -{" "}
                        {new Date(coupon.valid_until).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {coupon.discount_percent
                        ? `${coupon.discount_percent}% OFF`
                        : `AED ${coupon.discount_amount} OFF`}
                    </div>
                    {coupon.min_purchase_amount && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Min. purchase: AED {coupon.min_purchase_amount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No active coupons available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for new promotions
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1">
            Clear Coupon
          </Button>
        </div>
      </div>
    </div>
  );
};