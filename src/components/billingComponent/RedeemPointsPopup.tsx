import {  useState } from "react";
import { Button } from "../ui/button";
import { Coins,  X } from "lucide-react";

import { Input } from "../ui/input";

export const RedeemPointsPopup = ({
  show,
  onClose,
  customer,
  onApplyRedeem
}: {
  show: boolean;
  onClose: () => void;
  customer: Customer | null;
  onApplyRedeem: (points: number) => void;
}) => {
  const [redeemPoints, setRedeemPoints] = useState<number | "">("");

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Redeem Loyalty Points</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center mb-6">
          <Coins className="h-16 w-16 text-yellow-500 mx-auto mb-3" />
          <p className="text-lg font-semibold">
            Available Points: <span className="text-blue-600">{customer?.loyalty_points || 0}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            1 Point = AED 1.00 discount
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[10, 50, 100, 200].map((points) => (
            <Button
              key={points}
              variant="outline"
              onClick={() => onApplyRedeem(points)}
              disabled={points > (customer?.loyalty_points || 0)}
              className="h-16 flex-col"
            >
              <span className="font-semibold">{points}</span>
              <span className="text-xs text-muted-foreground">Points</span>
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Custom points"
            max={customer?.loyalty_points || 0}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              if (value <= (customer?.loyalty_points || 0)) {
                setRedeemPoints(value);
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={() => {
              if (redeemPoints && redeemPoints > 0) {
                onApplyRedeem(Number(redeemPoints));
              }
            }}
            disabled={!redeemPoints || redeemPoints <= 0}
          >
            Apply
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setRedeemPoints("");
            onClose();
          }}
          className="w-full mt-3"
        >
          Clear Points
        </Button>
      </div>
    </div>
  );
};