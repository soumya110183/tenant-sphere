import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = "https://billingbackend-1vei.onrender.com";

export default function Coupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields matching backend discount_rules
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [minBill, setMinBill] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [perCustomerLimit, setPerCustomerLimit] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchCoupons();
  }, []);

  // ===============================
  // FETCH ALL COUPON RULES
  // ===============================
  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/api/discounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success) {
        // Only coupon rules
        setCoupons(json.data.filter((r: any) => r.type === "coupon"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // CREATE NEW COUPON
  // ===============================
  const createCoupon = async () => {
    if (!code.trim()) {
      alert("Coupon code is required");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/api/discounts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "coupon",
          code: code.toUpperCase(),
          discount_percent: discountPercent ? Number(discountPercent) : null,
          discount_amount: discountAmount ? Number(discountAmount) : null,
          min_bill_amount: minBill ? Number(minBill) : 0,
          max_uses: maxUses ? Number(maxUses) : null,
          per_customer_limit: perCustomerLimit ? Number(perCustomerLimit) : null,
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
          is_active: true,
        }),
      });

      const json = await res.json();

      if (json.success) {
        resetForm();
        fetchCoupons();
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error("Create coupon error", err);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // DEACTIVATE COUPON
  // ===============================
  const deactivateCoupon = async (id: number) => {
    try {
      const token = localStorage.getItem("auth_token");

      const res = await fetch(`${API_BASE}/api/discounts/${id}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success) fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  // Reset form
  const resetForm = () => {
    setCode("");
    setDiscountPercent("");
    setDiscountAmount("");
    setMinBill("");
    setMaxUses("");
    setPerCustomerLimit("");
    setDescription("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6">
      {/* CREATE NEW COUPON */}
      <Card>
        <CardHeader>
          <CardTitle>Create Coupon</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">

          <div>
            <Label>Coupon Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NEWYEAR50"
            />
          </div>

          <div>
            <Label>Discount (%)</Label>
            <Input
              type="number"
              placeholder="10"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </div>

          <div>
            <Label>Discount Amount (₹)</Label>
            <Input
              type="number"
              placeholder="200"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
          </div>

          <div>
            <Label>Minimum Bill Amount</Label>
            <Input
              type="number"
              placeholder="500"
              value={minBill}
              onChange={(e) => setMinBill(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Uses</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>

            <div>
              <Label>Per Customer Limit</Label>
              <Input
                type="number"
                value={perCustomerLimit}
                onChange={(e) => setPerCustomerLimit(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Festival discount offer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

<div className="mt-2 flex justify-start">
  <Button disabled={loading} onClick={createCoupon}>
    {loading ? "Saving..." : "Create Coupon"}
  </Button>
</div>



        </CardContent>
      </Card>

      {/* COUPON LIST */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {coupons.map((c) => (
            <div key={c.id} className="border p-4 rounded-lg flex justify-between">

              <div>
                <p className="font-semibold text-lg">{c.code}</p>

                <p className="text-sm text-muted-foreground">
                  {c.discount_percent ? `${c.discount_percent}%` : ""}
                  {c.discount_amount ? ` • ₹${c.discount_amount}` : ""}
                </p>

                <p className="text-xs text-muted-foreground">
                  Min Bill: ₹{c.min_bill_amount || 0}
                </p>

                {c.start_date && (
                  <p className="text-xs text-muted-foreground">
                    Valid: {new Date(c.start_date).toLocaleDateString()} -{" "}
                    {c.end_date
                      ? new Date(c.end_date).toLocaleDateString()
                      : "No Expiry"}
                  </p>
                )}

                <Badge variant={c.is_active ? "default" : "secondary"} className="mt-1">
                  {c.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {c.is_active && (
                <Button variant="destructive" onClick={() => deactivateCoupon(c.id)}>
                  Deactivate
                </Button>
              )}
            </div>
          ))}

          {coupons.length === 0 && (
            <p className="text-sm text-muted-foreground">No coupons found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
