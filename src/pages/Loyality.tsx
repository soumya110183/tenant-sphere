import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoyaltySettings = () => {
  const [rule, setRule] = useState<any | null>(null);
  const [currencyUnit, setCurrencyUnit] = useState(100);
  const [pointsPerCurrency, setPointsPerCurrency] = useState(1);
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:5000";

  useEffect(() => {
    fetchActiveRule();
  }, []);

  // ✅ GET ACTIVE RULE
  const fetchActiveRule = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/loyalty-rules/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRule(json.data);
        setCurrencyUnit(json.data.currency_unit);
        setPointsPerCurrency(json.data.points_per_currency);
      }
    } catch (err) {
      console.error("Fetch active rule error", err);
    }
  };

  // ✅ CREATE NEW RULE (Backend auto-deactivates old rule)
  const saveRules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/loyalty-rules`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currency_unit: Number(currencyUnit),
          points_per_currency: Number(pointsPerCurrency),
        }),
      });

      const json = await res.json();
      if (json.success) {
        fetchActiveRule();
      }
    } catch (err) {
      console.error("Save rules error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SETTINGS FORM */}
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Program Settings</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <Label>Currency Unit (₹ / AED)</Label>
            <Input
              type="number"
              value={currencyUnit}
              onChange={(e) => setCurrencyUnit(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Example: Every {currencyUnit} spent earns loyalty points
            </p>
          </div>

          <div>
            <Label>Points Earned Per Currency Unit</Label>
            <Input
              type="number"
              value={pointsPerCurrency}
              onChange={(e) => setPointsPerCurrency(e.target.value)}
            />
          </div>

      <Button onClick={saveRules} disabled={loading} className="mt-3">
  {loading ? "Saving..." : "Save Loyalty Rules"}
</Button>

        </CardContent>
      </Card>

      {/* CURRENT ACTIVE RULE */}
      {rule && (
        <Card>
          <CardHeader>
            <CardTitle>Current Active Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Earn <strong>{rule.points_per_currency}</strong> points for every
              <strong> {rule.currency_unit}</strong> spent.
            </p>
          </CardContent>
        </Card>
      )}

      {/* STATIC MEMBERSHIP TIERS */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { tier: "Bronze", points: 0 },
            { tier: "Silver", points: 500 },
            { tier: "Gold", points: 2000 },
            { tier: "Platinum", points: 5000 },
          ].map((t) => (
            <div key={t.tier} className="p-3 border rounded-xl flex items-center justify-between">
              <div>
                <p className="font-semibold">{t.tier}</p>
                <p className="text-xs text-muted-foreground">
                  Lifetime points needed: {t.points}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoyaltySettings;
