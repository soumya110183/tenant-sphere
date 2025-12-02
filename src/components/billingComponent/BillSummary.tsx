import { Separator } from "@radix-ui/react-dropdown-menu";
import { Banknote, Coins, CreditCard, Printer, Receipt, Smartphone, Tag } from "lucide-react";
import { Button } from "../ui/button"; 
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CustomerSearch } from "./CustomerSearch";




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



export const BillSummary = ({
  rows,
  preview,
  selectedCustomer,
  couponCode,
  redeemPoints,
  paymentMethod,
  onApplyDiscounts,
  onClearDiscounts,
  onOpenCouponPopup,
  onOpenRedeemPopup,
  onGenerateInvoice,
  isApplyingDiscounts,
  isGeneratingInvoice,
  onPaymentMethodChange,
  customers,
  onCustomerSelect,
  onClearCustomer
}: {
  rows: BillRow[];
  preview: any;
  selectedCustomer: Customer | null;
  couponCode: string;
  redeemPoints: number | "";
  paymentMethod: string;
  onApplyDiscounts: () => void;
  onClearDiscounts: () => void;
  onOpenCouponPopup: () => void;
  onOpenRedeemPopup: () => void;
  onGenerateInvoice: () => void;
  isApplyingDiscounts: boolean;
  isGeneratingInvoice: boolean;
  onPaymentMethodChange: (method: string) => void;
  customers: Customer[];
  onCustomerSelect: (customer: Customer) => void;
  onClearCustomer: () => void;
}) => {
  const calculateSubtotal = () =>
    rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  const calculateIncludedTax = () =>
    rows.reduce(
      (s, r) =>
        s + (Number(r.price) * (Number(r.tax) / 100)) * Number(r.qty || 0),
      0
    );

  const calculateTotal = () => calculateSubtotal();

  const uiSubtotal = preview?.subtotal ?? calculateSubtotal();
  const uiBaseTotal = preview?.total ?? calculateTotal();
  const uiItemDiscountTotal = preview?.item_discount_total ?? 0;
  const uiBillDiscountTotal = preview?.bill_discount_total ?? 0;
  const uiCouponDiscountTotal = preview?.coupon_discount_total ?? 0;
  const uiMembershipDiscountTotal = preview?.membership_discount_total ?? 0;

  const numericRedeem = redeemPoints === "" ? 0 : Math.max(0, Number(redeemPoints || 0));
  const maxRedeemAllowed = selectedCustomer?.loyalty_points != null ? Number(selectedCustomer.loyalty_points) : 0;
  const clampedRedeem = numericRedeem > maxRedeemAllowed ? maxRedeemAllowed : numericRedeem;
  const payableAfterRedeem = Math.max(uiBaseTotal - clampedRedeem, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Search Section - NOW AT THE TOP */}
        <CustomerSearch
          customers={customers}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={onCustomerSelect}
          onClearCustomer={onClearCustomer}
        />

        {selectedCustomer && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRedeemPopup}
            className="w-full"
          >
            <Coins className="h-3 w-3 mr-1" />
            Redeem Points
          </Button>
        )}

        <Separator />

        {/* Coupon Section */}
        <div>
          <Label>Coupon Code</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={couponCode}
              onChange={(e) => {}}
              placeholder="Enter coupon code"
              className="flex-1"
              readOnly
            />
            <Button variant="outline" onClick={onOpenCouponPopup} className="whitespace-nowrap">
              <Tag className="h-4 w-4 mr-1" />
              Browse
            </Button>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={onApplyDiscounts}
              disabled={isApplyingDiscounts}
              className="flex-1"
            >
              {isApplyingDiscounts ? "Applying..." : "Apply Discounts"}
            </Button>
            <Button variant="outline" onClick={onClearDiscounts} className="flex-1">
              Clear
            </Button>
          </div>

          {couponCode && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">Applied Coupon:</span>
                <span className="text-blue-700 font-semibold">{couponCode}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>AED {uiSubtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Tax (approx)</span>
            <span>AED {calculateIncludedTax().toFixed(2)}</span>
          </div>

          {uiItemDiscountTotal > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Item Discounts</span>
              <span>-AED {uiItemDiscountTotal.toFixed(2)}</span>
            </div>
          )}

          {uiBillDiscountTotal > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Bill Discounts</span>
              <span>-AED {uiBillDiscountTotal.toFixed(2)}</span>
            </div>
          )}

          {uiCouponDiscountTotal > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Coupon Discount</span>
              <span>-AED {uiCouponDiscountTotal.toFixed(2)}</span>
            </div>
          )}

          {uiMembershipDiscountTotal > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Membership Discount</span>
              <span>-AED {uiMembershipDiscountTotal.toFixed(2)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <span className="font-semibold">Total before Redeem</span>
            <span className="font-semibold">AED {uiBaseTotal.toFixed(2)}</span>
          </div>

          {selectedCustomer && clampedRedeem > 0 && (
            <div className="flex justify-between text-blue-700 text-sm">
              <span>Redeem Points ({clampedRedeem})</span>
              <span>-AED {clampedRedeem.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg">
            <span>Final Payable</span>
            <span>AED {payableAfterRedeem.toFixed(2)}</span>
          </div>

          {preview?.preview_loyalty_points != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Will earn approx <span className="font-semibold">{preview.preview_loyalty_points}</span> points (before redeem).
            </p>
          )}
        </div>

        <Separator />

        {/* Payment Method */}
        <div>
          <Label>Payment Method</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { id: "cash", icon: Banknote, label: "Cash" },
              { id: "card", icon: CreditCard, label: "Card" },
              { id: "upi", icon: Smartphone, label: "UPI" },
              { id: "credit", icon: Receipt, label: "Credit" },
            ].map(({ id, icon: Icon, label }) => (
              <Button
                key={id}
                variant={paymentMethod === id ? "default" : "outline"}
                onClick={() => onPaymentMethodChange(id)}
                className="flex-col h-auto py-3"
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Print Bill */}
        <Button
          onClick={onGenerateInvoice}
          className="w-full mt-4"
          size="lg"
          disabled={isGeneratingInvoice}
        >
          {isGeneratingInvoice ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-4 w-4" />
              Print Bill
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};