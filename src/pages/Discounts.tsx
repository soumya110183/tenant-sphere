import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE = "https://billingbackend-1vei.onrender.com";

type DiscountRule = {
  id: number;
  type: string;
  discount_percent?: number | null;
  discount_amount?: number | null;
  min_bill_amount?: number | null;
  is_active: boolean;
  description?: string | null;
  product_id?: number | null;
};

type Product = {
  id: number;
  name: string;
  category?: string | null;
};

type ApplyTo = "bill" | "category" | "product";

export default function Discounts() {
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  // FORM STATES
  const [type, setType] = useState<"percentage" | "fixed" | "seasonal">("percentage");
  const [applyTo, setApplyTo] = useState<ApplyTo>("bill"); 
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [minBill, setMinBill] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    fetchDiscountRules();
    fetchProducts();
  }, []);

  // Fetch rules
  const fetchDiscountRules = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/discounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (json.success) {
      // Exclude coupons (they have a separate UI)
      setDiscounts(json.data.filter((d: DiscountRule) => d.type !== "coupon"));
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();

    const list: Product[] = json.data || [];
    setProducts(list);

    const cats = Array.from(
      new Set(
        list.map((p) => p.category).filter((c): c is string => !!c?.trim())
      )
    ).sort();

    setCategories(cats);
  };

  // Convert UI type → Backend type
  const resolveBackendType = () => {
    if (applyTo === "bill") return "bill";
    if (applyTo === "product") return "item";
    if (applyTo === "category") return "item"; // category creates multiple item rules
    return "bill";
  };

  // Create discount
  const createDiscount = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) return alert("Not authenticated");

      // VALIDATIONS
      if ((type === "percentage" || type === "seasonal") && !discountPercent)
        return alert("Enter discount percent");

      if (type === "fixed" && !discountAmount)
        return alert("Enter discount amount");

      if (type === "seasonal" && (!startDate || !endDate))
        return alert("Select start & end date");

      if (applyTo === "product" && !selectedProductId)
        return alert("Select a product");

      if (applyTo === "category" && !selectedCategory)
        return alert("Select a category");

      const backendType = resolveBackendType();

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Base payload
      const basePayload: any = {
        type: backendType,
        is_active: true,
        description: description || null,
        min_bill_amount: minBill ? Number(minBill) : null,
      };

      // Set discount value
      if (type === "percentage" || type === "seasonal") {
        basePayload.discount_percent = Number(discountPercent);
      }

      if (type === "fixed") {
        basePayload.discount_amount = Number(discountAmount);
      }

      if (type === "seasonal") {
        basePayload.start_date = startDate;
        basePayload.end_date = endDate;
      }

      // BILL-WIDE or SINGLE PRODUCT DISCOUNT
      if (applyTo === "bill" || applyTo === "product") {
        const payload = { ...basePayload };

        if (applyTo === "product") {
          payload.product_id = Number(selectedProductId);
        } else {
          payload.product_id = null;
        }

        const res = await fetch(`${API_BASE}/api/discounts`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);
      }

      // CATEGORY-WISE — create rule per product
      if (applyTo === "category") {
        const productsInCategory = products.filter(
          (p) => p.category === selectedCategory
        );

        await Promise.all(
          productsInCategory.map((p) =>
            fetch(`${API_BASE}/api/discounts`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                ...basePayload,
                product_id: p.id,
              }),
            })
          )
        );
      }

      await fetchDiscountRules();
      resetForm();
    } catch (err: any) {
      console.error("Create discount error:", err);
      alert(err.message || "Error creating discount");
    } finally {
      setLoading(false);
    }
  };

  const deactivateRule = async (id: number) => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/discounts/${id}/deactivate`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (json.success) fetchDiscountRules();
  };

  const resetForm = () => {
    setType("percentage");
    setApplyTo("bill");
    setDiscountPercent("");
    setDiscountAmount("");
    setMinBill("");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setSelectedCategory("");
    setSelectedProductId("");
  };

  const getProductName = (product_id?: number | null) => {
    if (!product_id) return null;
    const p = products.find((prod) => prod.id === product_id);
    return p ? p.name : `Product #${product_id}`;
  };

  return (
    <div className="space-y-6">
      {/* CREATE DISCOUNT */}
      <Card>
        <CardHeader>
          <CardTitle>Create Discount Rule</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* TYPE + APPLY TO */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Discount Type</Label>
              <select
                className="border px-2 py-2 rounded-md w-full mt-1"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="percentage">Percentage %</option>
                <option value="fixed">Fixed Amount</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>

            <div>
              <Label>Apply To</Label>
              <select
                className="border px-2 py-2 rounded-md w-full mt-1"
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value as ApplyTo)}
              >
                <option value="bill">Entire Bill</option>
                <option value="category">Category</option>
                <option value="product">Single Product</option>
              </select>
            </div>
          </div>

          {/* Discount Fields */}
          {(type === "percentage" || type === "seasonal") && (
            <div>
              <Label>Discount Percent (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {type === "fixed" && (
            <div>
              <Label>Discount Amount</Label>
              <Input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {type === "seasonal" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Category */}
          {applyTo === "category" && (
            <div>
              <Label>Category</Label>
              <select
                className="border px-2 py-2 rounded-md w-full mt-1"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Product */}
          {applyTo === "product" && (
            <div>
              <Label>Product</Label>
              <select
                className="border px-2 py-2 rounded-md w-full mt-1"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category ? `(${p.category})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Min Bill */}
          <div>
            <Label>Minimum Bill Amount (optional)</Label>
            <Input
              type="number"
              min={0}
              value={minBill}
              onChange={(e) => setMinBill(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="e.g. Weekend sale, Festival offer"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button onClick={createDiscount} disabled={loading}>
              {loading ? "Saving..." : "Create Rule"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LIST RULES */}
      <Card>
        <CardHeader>
          <CardTitle>All Discount Rules</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {discounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No discount rules created yet.</p>
          )}

          {discounts.map((d) => {
            const productName = getProductName(d.product_id);
            const isBillWide = !d.product_id;

            return (
              <div
                key={d.id}
                className="border p-3 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div className="space-y-1">
                  <p className="font-semibold capitalize">
                    {d.type} Discount{" "}
                    {isBillWide ? (
                      <span className="text-xs text-muted-foreground">(Entire Bill)</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">({productName})</span>
                    )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {d.discount_percent ? `${d.discount_percent}%` : d.discount_amount ? `₹${d.discount_amount}` : ""}
                    {d.min_bill_amount ? ` • Min Bill: ₹${d.min_bill_amount}` : ""}
                  </p>

                  {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}

                  <Badge variant={d.is_active ? "default" : "secondary"}>
                    {d.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {d.is_active && (
                  <Button variant="destructive" onClick={() => deactivateRule(d.id)}>
                    Deactivate
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
