import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE = "https://billingbackend-1vei.onrender.com";

export default function Discounts() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // FORM STATES
  const [type, setType] = useState("percentage");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [minBill, setMinBill] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchDiscountRules();
  }, []);

  // Fetch rules
  const fetchDiscountRules = async () => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/discounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (json.success) {
      setDiscounts(json.data.filter((d: any) => d.type !== "coupon"));
    }
  };

  // Create rule
  const createDiscount = async () => {
    setLoading(true);

    const token = localStorage.getItem("auth_token");

    let payload: any = {
      type,
      is_active: true,
      description: description || null,
      min_bill_amount: minBill ? Number(minBill) : null,
    };

    if (type === "percentage") {
      payload.discount_percent = Number(discountPercent);
    } else if (type === "fixed") {
      payload.discount_amount = Number(discountAmount);
    } else if (type === "seasonal") {
      payload.discount_percent = Number(discountPercent);
      payload.start_date = startDate;
      payload.end_date = endDate;
    }

    const res = await fetch(`${API_BASE}/api/discounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json.success) {
      fetchDiscountRules();
      resetForm();
    } else {
      alert(json.error);
    }

    setLoading(false);
  };

  const deactivateRule = async (id: number) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/discounts/${id}/deactivate`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (json.success) fetchDiscountRules();
  };

  const resetForm = () => {
    setType("percentage");
    setDiscountPercent("");
    setDiscountAmount("");
    setMinBill("");
    setStartDate("");
    setEndDate("");
    setDescription("");
  };

  return (
    <div className="space-y-6">
      {/* CREATE DISCOUNT */}
      <Card>
        <CardHeader>
          <CardTitle>Create Discount Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Type Select */}
          <div>
            <Label>Discount Type</Label>
            <select
              className="border px-2 py-2 rounded-md w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed Amount</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>

          {/* Percentage */}
          {type === "percentage" && (
            <div>
              <Label>Discount Percent (%)</Label>
              <Input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
          )}

          {/* Fixed */}
          {type === "fixed" && (
            <div>
              <Label>Discount Amount</Label>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
          )}

          {/* Seasonal Dates */}
          {type === "seasonal" && (
            <>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Min bill */}
          <div>
            <Label>Minimum Bill Amount (optional)</Label>
            <Input
              type="number"
              value={minBill}
              onChange={(e) => setMinBill(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Save */}
          <Button onClick={createDiscount} disabled={loading}>
            {loading ? "Saving..." : "Create Rule"}
          </Button>
        </CardContent>
      </Card>

      {/* LIST RULES */}
      <Card>
        <CardHeader>
          <CardTitle>All Discount Rules</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {discounts.map((d) => (
            <div
              key={d.id}
              className="border rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold capitalize">
                  {d.type} Discount
                </p>

                <p className="text-xs text-muted-foreground">
                  {d.discount_percent && `${d.discount_percent}%`}
                  {d.discount_amount && `₹${d.discount_amount}`}
                  {d.min_bill_amount && ` • Min: ₹${d.min_bill_amount}`}
                </p>

                <Badge variant={d.is_active ? "default" : "secondary"}>
                  {d.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {d.is_active && (
                <Button
                  variant="destructive"
                  onClick={() => deactivateRule(d.id)}
                >
                  Deactivate
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
