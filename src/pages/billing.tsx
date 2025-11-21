import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Printer,
  Receipt,
  MinusCircle,
  Tag,
  List,
  X,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

type RowType = {
  code: string;
  name: string;
  qty: number | string;
  price: number;
  tax: number;
  total: number;
  product_id: any | null;
  sku?: string;
};

type ProductType = any;

const SupermarketBilling: React.FC = () => {
  const { toast } = useToast();

  const [customer, setCustomer] = useState<{
    name: string;
    phone: string;
    loyalityPoints: number;
  }>({
    name: "",
    phone: "",
    loyalityPoints: 0,
  });

  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatPercent, setVatPercent] = useState<number>(5);
  const [vatRegistrationNumber, setVatRegistrationNumber] =
    useState<string>("");

  const [products, setProducts] = useState<ProductType[]>([]);
  const [rows, setRows] = useState<RowType[]>([
    {
      code: "",
      name: "",
      qty: 1,
      price: 0,
      tax: 0,
      total: 0,
      product_id: null,
    },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [suggestions, setSuggestions] = useState<ProductType[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [currentInputIndex, setCurrentInputIndex] = useState<number | null>(
    null
  );
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const inputRefs = useRef<any[]>([]);
  const suggestionRef = useRef<HTMLDivElement | null>(null);

  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] =
    useState<boolean>(false);
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const customerSuggestionRef = useRef<HTMLDivElement | null>(null);

  const [autoApplyBestCoupon, setAutoApplyBestCoupon] = useState(true);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(120);

  const [walletBalance, setWalletBalance] = useState(50);
  const [applyWallet, setApplyWallet] = useState(false);
  const [walletUseAmount, setWalletUseAmount] = useState<number | "">("");

  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  // Dynamic discount rules fetched from backend /api/discounts/active
  const [discountRules, setDiscountRules] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [allDiscountRules, setAllDiscountRules] = useState<any[]>([]);
  const [showAllDiscounts, setShowAllDiscounts] = useState(false);

  const [referralCode, setReferralCode] = useState<string>("");
  const [appliedReferral, setAppliedReferral] = useState<any>(null);

  const sampleCustomers = [
    { id: "C1", name: "Rahul Varma", phone: "9447123456" },
    { id: "C2", name: "Anita Menon", phone: "9498123456" },
    { id: "C3", name: "Suresh Kumar", phone: "9846123456" },
    { id: "C4", name: "Store Walk-in", phone: "" },
  ];

  // const sampleCoupons = [
  //   {
  //     id: "C-UAE-10",
  //     code: "UAE10",
  //     type: "percent",
  //     scope: "order",
  //     value: 10,
  //     max_value: 200,
  //     min_order_value: 0,
  //     stackable: false,
  //     start_at: null,
  //     end_at: null,
  //     description: "10% off on order, max AED 200",
  //     active: true,
  //   },
  //   {
  //     id: "C-FLAT50",
  //     code: "FLAT50",
  //     type: "flat",
  //     scope: "order",
  //     value: 50,
  //     max_value: 50,
  //     min_order_value: 200,
  //     stackable: false,
  //     start_at: null,
  //     end_at: null,
  //     description: "AED 50 off on orders over AED 200",
  //     active: true,
  //   },
  // ];

  // Fetch active discount rules from backend and map to internal coupon shape
  const fetchActiveDiscountRules = async () => {
    if (loadingCoupons) return;
    setLoadingCoupons(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        "https://billingbackend-1vei.onrender.com/api/discounts/active",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (res.ok) {
        const mapped = (json.data || []).map((r: any) => ({
          id: r.id || r._id,
          code: r.code || r.coupon_code || r.name || r.discount_code || "RULE",
          type: r.type || r.discount_type || "percent",
          scope: r.scope || r.discount_scope || "order",
          value: Number(
            r.value ?? r.amount ?? r.percent ?? r.discount_value ?? 0
          ),
          max_value: Number(
            r.max_value ?? r.max_discount ?? r.maximum_value ?? 0
          ),
          min_order_value: Number(
            r.min_order_value ?? r.min_order_amount ?? r.minimum_value ?? 0
          ),
          stackable: !!(r.stackable ?? r.is_stackable),
          start_at:
            r.start_at || r.startDate || r.valid_from || r.starts_at || null,
          end_at: r.end_at || r.endDate || r.valid_until || r.ends_at || null,
          description: r.description || r.title || r.name || "Discount rule",
          active: (r.active ?? r.is_active ?? r.status === "active") !== false,
        }));
        setDiscountRules(mapped);
      } else {
        toast({
          title: "Discount rules unavailable",
          description: json.error || "Using local sample coupons",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Discount fetch failed",
        description: "Network error – using local sample coupons",
        variant: "destructive",
      });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const fetchAllDiscountRules = async () => {
    if (loadingCoupons) return;
    setLoadingCoupons(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        "https://billingbackend-1vei.onrender.com/api/discounts",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (res.ok) {
        const mapped = (json.data || []).map((r: any) => ({
          id: r.id || r._id,
          code: r.code || r.coupon_code || r.name || r.discount_code || "RULE",
          type: r.type || r.discount_type || "percent",
          scope: r.scope || r.discount_scope || "order",
          value: Number(
            r.value ?? r.amount ?? r.percent ?? r.discount_value ?? 0
          ),
          max_value: Number(
            r.max_value ?? r.max_discount ?? r.maximum_value ?? 0
          ),
          min_order_value: Number(
            r.min_order_value ?? r.min_order_amount ?? r.minimum_value ?? 0
          ),
          stackable: !!(r.stackable ?? r.is_stackable),
          start_at:
            r.start_at || r.startDate || r.valid_from || r.starts_at || null,
          end_at: r.end_at || r.endDate || r.valid_until || r.ends_at || null,
          description: r.description || r.title || r.name || "Discount rule",
          active: (r.active ?? r.is_active ?? r.status === "active") !== false,
        }));
        setAllDiscountRules(mapped);
      } else {
        toast({
          title: "Load all discounts failed",
          description: json.error || "Server returned error",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Network error",
        description: "Could not load all discount rules",
        variant: "destructive",
      });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const toggleRuleActive = async (rule: any) => {
    const token = localStorage.getItem("auth_token");
    try {
      let endpoint = `https://billingbackend-1vei.onrender.com/api/discounts/${rule.id}`;
      let options: any = {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !rule.active }),
      };

      // If deactivating, use dedicated deactivate route
      if (rule.active) {
        endpoint = `https://billingbackend-1vei.onrender.com/api/discounts/${rule.id}/deactivate`;
        options = {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        };
      }

      const res = await fetch(endpoint, options);
      if (!res.ok) {
        throw new Error("Status change failed");
      }

      toast({
        title: rule.active ? "Rule deactivated" : "Rule activated",
        description: rule.code,
      });

      // Refresh both lists
      await fetchActiveDiscountRules();
      if (showAllDiscounts) {
        await fetchAllDiscountRules();
      }
    } catch (e) {
      toast({
        title: "Update failed",
        description: (e as any).message || "Could not change rule status",
        variant: "destructive",
      });
    }
  };

  const sampleReferrals = [
    {
      id: "R-NEW-10",
      code: "REF10",
      type: "flat",
      applied_amount: 10,
      description: "AED 10 off for referred customer (demo)",
      active: true,
    },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(
          "https://billingbackend-1vei.onrender.com/api/inventory",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const json = await res.json();
        if (res.ok) {
          setProducts(json.data || []);
        } else {
          toast({
            title: "Failed to load products",
            description:
              json.error || "Server unreachable — using client demo mode",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        toast({
          title: "Product load error",
          description: "Network failed — running in offline demo mode",
          variant: "destructive",
        });
      }
    };

    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(
          "https://billingbackend-1vei.onrender.com/api/customers",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const json = await res.json();
        if (res.ok) {
          setCustomerSuggestions(json.data || sampleCustomers);
        } else {
          setCustomerSuggestions(sampleCustomers);
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
        setCustomerSuggestions(sampleCustomers);
      }
    };

    fetchProducts();
    fetchCustomers();
    fetchActiveDiscountRules();
  }, []);

  function round2(v: number) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  }

  const getMatchingProducts = (term: string) => {
    if (!term || term.length < 1) return [];
    const lower = term.toLowerCase();
    if (!products || products.length === 0) return [];

    return products
      .filter(
        (p: any) =>
          p.name?.toLowerCase().includes(lower) ||
          p.barcode?.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower)
      )
      .slice(0, 8);
  };

  const getMatchingCustomers = (term: string) => {
    if (!term || term.length < 1) return [];
    const lower = term.toLowerCase();
    if (!customerSuggestions || customerSuggestions.length === 0) return [];

    return customerSuggestions
      .filter(
        (c: any) =>
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.phone && String(c.phone).toLowerCase().includes(lower))
      )
      .slice(0, 8);
  };

  const addNewRow = () => {
    setRows((prev) => [
      ...prev,
      {
        code: "",
        name: "",
        qty: 1,
        price: 0,
        tax: 0,
        total: 0,
        product_id: null,
      },
    ]);
  };

  const deleteRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemCodeChange = (index: number, value: string) => {
    const updated = [...rows];
    updated[index].code = value;
    setRows(updated);
    setCurrentInputIndex(index);

    if (!value || !value.trim()) {
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
      setRows(updated);
      setShowSuggestions(false);
      return;
    }

    const matches = getMatchingProducts(value);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);

    const exactMatch = products.find(
      (p: any) =>
        p.name?.toLowerCase() === value.toLowerCase() ||
        p.barcode?.toLowerCase() === value.toLowerCase() ||
        p.sku?.toLowerCase() === value.toLowerCase() ||
        String(p.id) === value
    );

    if (exactMatch) {
      updated[index].code = exactMatch.name;
      updated[index].name = exactMatch.name;
      updated[index].price = Number(exactMatch.selling_price || 0);
      updated[index].tax =
        typeof exactMatch.tax_percent !== "undefined" &&
        exactMatch.tax_percent !== null
          ? Number(exactMatch.tax_percent)
          : 0;
      updated[index].product_id = exactMatch.product_id || exactMatch.id;
      updated[index].total =
        Number(updated[index].qty || 1) * Number(updated[index].price || 0);
      setRows(updated);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (product: any) => {
    if (currentInputIndex === null) return;
    const updated = [...rows];
    const idx = currentInputIndex;

    const existingIndex = updated.findIndex(
      (r, i) =>
        i !== idx && r.name?.toLowerCase() === product.name.toLowerCase()
    );

    if (existingIndex !== -1) {
      updated[existingIndex].qty = Number(updated[existingIndex].qty || 0) + 1;
      updated[existingIndex].total =
        updated[existingIndex].qty * updated[existingIndex].price;
      updated.splice(idx, 1);
      setRows(updated);
      setShowSuggestions(false);
      setCurrentInputIndex(null);
      return;
    }

    updated[idx].code = product.name;
    updated[idx].name = product.name;
    updated[idx].price = Number(product.selling_price || 0);
    updated[idx].tax =
      typeof product.tax_percent !== "undefined" && product.tax_percent !== null
        ? Number(product.tax_percent)
        : 0;
    updated[idx].product_id = product.product_id || product.id;
    updated[idx].total = updated[idx].qty
      ? round2((updated[idx].qty as number) * updated[idx].price)
      : 0;

    setRows(updated);
    setShowSuggestions(false);
    setCurrentInputIndex(null);

    if (idx === updated.length - 1) {
      addNewRow();
      setTimeout(() => inputRefs.current[idx + 1]?.focus(), 100);
    } else {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleQtyChange = (index: number, value: string | number) => {
    const updated = [...rows];
    if (value === "" || value === null) {
      updated[index].qty = "";
      updated[index].total = 0;
    } else {
      const qty = Number(value);
      updated[index].qty = qty;
      updated[index].total = round2((updated[index].price || 0) * qty);
    }
    setRows(updated);
  };

  const calculateSubtotal = () =>
    round2(rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0));

  const calculateIncludedTax = () =>
    round2(
      rows.reduce((s, r) => {
        const price = Number(r.price) || 0;
        const qty = Number(r.qty) || 0;
        const lineTaxPercent =
          typeof r.tax !== "undefined" && r.tax !== null && Number(r.tax) > 0
            ? Number(r.tax)
            : 0;
        const effectiveTaxPercent =
          lineTaxPercent > 0
            ? lineTaxPercent
            : vatEnabled
            ? Number(vatPercent || 0)
            : 0;
        return s + price * qty * (effectiveTaxPercent / 100);
      }, 0)
    );

  const couponAmount = appliedCoupon?.applied_amount
    ? Number(appliedCoupon.applied_amount)
    : 0;
  const referralAmount = appliedReferral?.applied_amount
    ? Number(appliedReferral.applied_amount)
    : 0;
  const walletApplied = applyWallet
    ? Math.min(Number(walletUseAmount || 0), Number(walletBalance || 0))
    : 0;

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateIncludedTax();
    const afterDiscounts = Math.max(
      0,
      subtotal - couponAmount - referralAmount
    );
    const afterWallet = Math.max(0, afterDiscounts - walletApplied);
    const grand = round2(afterWallet + tax);
    return grand;
  };

  function evaluateCouponOnCart(coupon: any, cartRows: any[]) {
    const subtotal = round2(
      cartRows.reduce((s, r) => s + (Number(r.total) || 0), 0)
    );

    if (!coupon || !coupon.active) {
      return { valid: false, applied_amount: 0, reason: "inactive" };
    }

    if (coupon.min_order_value && subtotal < coupon.min_order_value) {
      return { valid: false, applied_amount: 0, reason: "min_order_not_met" };
    }

    const now = Date.now();
    if (coupon.start_at && new Date(coupon.start_at).getTime() > now) {
      return { valid: false, applied_amount: 0, reason: "not_started" };
    }
    if (coupon.end_at && new Date(coupon.end_at).getTime() < now) {
      return { valid: false, applied_amount: 0, reason: "expired" };
    }

    let applied = 0;

    if (coupon.scope === "order") {
      if (coupon.type === "percent")
        applied = (subtotal * (coupon.value || 0)) / 100;
      else if (coupon.type === "flat") applied = coupon.value || 0;
      if (coupon.max_value) applied = Math.min(applied, coupon.max_value);
    } else if (coupon.scope === "item") {
      let matchAmount = 0;
      cartRows.forEach((r) => {
        const name = (r.name || "").toLowerCase();
        const priceQty = (Number(r.price) || 0) * (Number(r.qty) || 0);
        let matches = false;

        if (coupon.appliesTo && coupon.appliesTo.nameContains) {
          for (const token of coupon.appliesTo.nameContains) {
            if (name.includes(token.toLowerCase())) {
              matches = true;
              break;
            }
          }
        }

        if (coupon.sku && r.sku && coupon.sku === r.sku) matches = true;

        if (matches) {
          if (coupon.type === "percent")
            matchAmount += (priceQty * (coupon.value || 0)) / 100;
          else if (coupon.type === "flat") matchAmount += coupon.value || 0;
        }
      });

      applied = matchAmount;
      if (coupon.max_value) applied = Math.min(applied, coupon.max_value);
    } else {
      applied = 0;
    }

    applied = round2(Math.max(0, applied));
    const valid = applied > 0;
    return {
      valid,
      applied_amount: applied,
      reason: valid ? null : "no_match",
    };
  }

  const validateCouponLocal = (code: string) => {
    if (!code || !code.trim()) return { valid: false, reason: "empty" };
    const c = discountRules.find(
      (x) => x.code.toLowerCase() === code.trim().toLowerCase()
    );
    if (!c) return { valid: false, reason: "not_found" };
    const evalResult = evaluateCouponOnCart(c, rows);
    if (!evalResult.valid) return { valid: false, reason: evalResult.reason };
    return {
      valid: true,
      applied_amount: evalResult.applied_amount,
      details: c,
    };
  };

  const applyCouponLocal = () => {
    const res = validateCouponLocal(couponCode);
    if (!res.valid) {
      setAppliedCoupon(null);
      toast({
        title: "Coupon invalid",
        description: `Reason: ${res.reason || "not applicable"}`,
        variant: "destructive",
      });
      return;
    }
    setAppliedCoupon({
      code: couponCode.trim().toUpperCase(),
      applied_amount: res.applied_amount,
      details: res.details,
    });
    toast({
      title: "Coupon applied",
      description: `Discount AED ${res.applied_amount.toFixed(2)}`,
    });
  };

  useEffect(() => {
    if (!autoApplyBestCoupon) return;
    if (!discountRules.length) return;

    const active = discountRules.filter((c) => c.active);

    const evaluateCombo = (couponsCombo: any[]) => {
      const anyNonStackable = couponsCombo.some((c) => !c.stackable);
      if (anyNonStackable && couponsCombo.length > 1) return { valid: false };

      let tempRows = JSON.parse(JSON.stringify(rows));
      let totalApplied = 0;

      const itemCoupons = couponsCombo.filter((c) => c.scope === "item");
      const orderCoupons = couponsCombo.filter((c) => c.scope === "order");
      const seq = [...itemCoupons, ...orderCoupons];

      for (const cup of seq) {
        const res = evaluateCouponOnCart(cup, tempRows);
        if (!res.valid) continue;

        totalApplied += res.applied_amount;

        if (cup.scope === "order" && res.applied_amount > 0) {
          const subtotalNow = tempRows.reduce((s, r) => s + (r.total || 0), 0);
          if (subtotalNow <= 0) continue;
          const ratio = res.applied_amount / subtotalNow;

          tempRows = tempRows.map((r) => {
            const reduction = round2((r.total || 0) * ratio);
            const newTotal = Math.max(0, round2((r.total || 0) - reduction));
            const newPrice = r.qty ? round2(newTotal / r.qty) : r.price;
            return { ...r, total: newTotal, price: newPrice };
          });
        } else if (cup.scope === "item") {
          tempRows = tempRows.map((r) => {
            let matches = false;
            if (cup.appliesTo && cup.appliesTo.nameContains) {
              for (const token of cup.appliesTo.nameContains) {
                if (
                  (r.name || "").toLowerCase().includes(token.toLowerCase())
                ) {
                  matches = true;
                  break;
                }
              }
            }

            if (matches) {
              let reduction = 0;
              if (cup.type === "percent")
                reduction = round2((r.price * r.qty * (cup.value || 0)) / 100);
              else if (cup.type === "flat") reduction = cup.value || 0;

              const newTotal = Math.max(0, round2(r.total - reduction));
              const newPrice = r.qty ? round2(newTotal / r.qty) : r.price;
              return { ...r, total: newTotal, price: newPrice };
            }

            return r;
          });
        }
      }

      return { valid: true, applied_amount: round2(totalApplied) };
    };

    let best = { combo: [], applied_amount: 0 };
    const combos: any[] = [[]];

    for (let i = 0; i < active.length; i++) combos.push([active[i]]);
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++)
        combos.push([active[i], active[j]]);
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++)
        for (let k = j + 1; k < active.length; k++)
          combos.push([active[i], active[j], active[k]]);

    combos.forEach((cset) => {
      if (cset.length === 0) return;
      const evalRes = evaluateCombo(cset);
      if (!evalRes.valid) return;
      if (evalRes.applied_amount > best.applied_amount)
        best = { combo: cset, applied_amount: evalRes.applied_amount };
    });

    if (best.applied_amount > 0) {
      if (best.combo.length === 1) {
        setAppliedCoupon({
          code: best.combo[0].code,
          applied_amount: best.applied_amount,
          details: best.combo[0],
        });
      } else {
        setAppliedCoupon({
          code: best.combo.map((c) => c.code).join("+"),
          applied_amount: best.applied_amount,
          details: { combined: true, coupons: best.combo },
        });
      }
    } else {
      setAppliedCoupon(null);
    }
  }, [rows, autoApplyBestCoupon, vatEnabled, vatPercent]);

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);

    try {
      const validItems = rows.filter((r) => r.name && Number(r.qty) > 0);
      if (validItems.length === 0) {
        toast({
          title: "No items",
          description: "Please add at least one product",
          variant: "destructive",
        });
        setIsGeneratingInvoice(false);
        return;
      }

      for (const item of validItems) {
        const product = products.find(
          (p: any) => p.name === item.name || p.product_id === item.product_id
        );
        if (product && Number(item.qty) > Number(product.quantity || 0)) {
          toast({
            title: "Insufficient stock",
            description: `${product.name} has only ${product.quantity} left.`,
            variant: "destructive",
          });
          setIsGeneratingInvoice(false);
          return;
        }
      }

      const payload = {
        invoice_number: `D-${Date.now()}`,
        payment_method: paymentMethod,
        customer: {
          name: customer.name,
          phone: customer.phone,
          // include multiple spellings for backend compatibility
          loyaltyPoints: loyaltyPoints,
          loyalty_points: loyaltyPoints,
          loyality_points: loyaltyPoints,
        },
        vat: {
          enabled: vatEnabled,
          percent: Number(vatPercent || 0),
          trn: vatRegistrationNumber,
        },
        items: validItems.map((r) => ({
          product_id: r.product_id,
          name: r.name,
          qty: r.qty,
          price: r.price,
          tax_percent:
            typeof r.tax !== "undefined" && r.tax !== null && Number(r.tax) > 0
              ? Number(r.tax)
              : vatEnabled
              ? Number(vatPercent || 0)
              : 0,
          total: r.total,
        })),
        applied_coupon: appliedCoupon,
        referral: appliedReferral,
        wallet_applied: applyWallet ? walletApplied : 0,
        totals: {
          subtotal: calculateSubtotal(),
          tax: calculateIncludedTax(),
          coupon: couponAmount,
          referral: referralAmount,
          wallet: walletApplied,
          grand_total: calculateTotal(),
        },
      };

      // Try to POST invoice to backend; fall back to local PDF generation on failure
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(
          "https://billingbackend-1vei.onrender.com/api/invoices",
          //"https://billingbackend-1vei.onrender.com/api/invoices",
          {
            method: "POST",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json().catch(() => null);
        if (res.ok) {
          const serverInvoiceNo =
            json?.data?.invoice_number ??
            json?.invoice_number ??
            payload.invoice_number;
          toast({
            title: "Invoice created",
            description: `Invoice ${serverInvoiceNo}`,
          });
          // Broadcast invoice-created event for other pages (e.g., Inventory) to react
          window.dispatchEvent(
            new CustomEvent("invoice-created", {
              detail: { invoice: json?.data ?? payload },
            })
          );
          // Optimistically reduce local stock quantities
          setProducts((prev: any[]) =>
            prev.map((p: any) => {
              const match = payload.items.find(
                (i: any) =>
                  i.product_id === p.product_id ||
                  i.product_id === p.id ||
                  (p.name && i.name && p.name === i.name)
              );
              if (!match) return p;
              const used = Number(match.qty) || 0;
              const currentQty = Number(p.quantity ?? p.qty ?? 0);
              return { ...p, quantity: Math.max(0, currentQty - used) };
            })
          );
          generatePDFBill(serverInvoiceNo, json?.data ?? payload);
        } else {
          console.warn("Invoice POST failed", json);
          toast({
            title: "Invoice saved locally",
            description: `Could not save to server — created local invoice ${payload.invoice_number}`,
            variant: "destructive",
          });
          window.dispatchEvent(
            new CustomEvent("invoice-created", { detail: { invoice: payload } })
          );
          generatePDFBill(payload.invoice_number, payload);
        }
      } catch (err) {
        console.error("Invoice POST error", err);
        toast({
          title: "Invoice saved locally",
          description: `Network error — created local invoice ${payload.invoice_number}`,
          variant: "destructive",
        });
        window.dispatchEvent(
          new CustomEvent("invoice-created", { detail: { invoice: payload } })
        );
        generatePDFBill(payload.invoice_number, payload);
      }

      setRows([
        {
          code: "",
          name: "",
          qty: 1,
          price: 0,
          tax: 0,
          total: 0,
          product_id: null,
        },
      ]);
      setAppliedCoupon(null);
      setCouponCode("");
      setAppliedReferral(null);
      setReferralCode("");
      setApplyWallet(false);
      setWalletUseAmount(0);
    } catch (err: any) {
      console.error("Invoice error:", err);
      toast({
        title: "Error",
        description: err.message || "Could not create invoice",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const generatePDFBill = (invoiceNumber: string, invoiceObj: any = null) => {
    const payload = invoiceObj || {
      invoice_number: invoiceNumber,
      items: rows.filter((r) => r.name),
      vat: {
        enabled: vatEnabled,
        percent: Number(vatPercent || 0),
        trn: vatRegistrationNumber,
      },
      totals: {
        subtotal: calculateSubtotal(),
        tax: calculateIncludedTax(),
        coupon: couponAmount,
        referral: referralAmount,
        wallet: walletApplied,
        grand_total: calculateTotal(),
      },
      customer: {
        name: customer.name,
        phone: customer.phone,
        loyaltyPoints: loyaltyPoints,
      },
    };

    const validItems = payload.items;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297],
    });

    const date = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    let y = 10;

    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("********************************", 40, y, { align: "center" });
    y += 5;

    doc.setFontSize(14);
    doc.setFont("courier", "bold");
    doc.text("SUPERMART (DEMO)", 40, y, { align: "center" });
    y += 6;

    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.text("********************************", 40, y, { align: "center" });
    y += 6;

    if (
      payload.customer &&
      (payload.customer.name ||
        payload.customer.phone ||
        payload.customer.loyaltyPoints)
    ) {
      if (payload.customer.name) {
        doc.setFontSize(9);
        doc.text(`Customer: ${payload.customer.name}`, 5, y);
        y += 4;
      }
      if (payload.customer.phone) {
        doc.setFontSize(9);
        doc.text(`Phone: ${payload.customer.phone}`, 5, y);
        y += 4;
      }
      y += 2;
    }

    if (payload.vat && payload.vat.enabled && payload.vat.trn) {
      doc.setFontSize(9);
      doc.text(`VAT TRN: ${payload.vat.trn}`, 5, y);
      y += 5;
    }

    doc.setFontSize(9);
    doc.text(`Invoice No: ${payload.invoice_number}`, 5, y);
    y += 4;

    doc.text(`Date: ${date} ${time}`, 5, y);
    y += 6;

    doc.text("----------------------------------------", 5, y);
    y += 6;

    doc.setFont("courier", "normal");
    doc.setFontSize(10);

    validItems.forEach((item: any) => {
      const itemLine = `${item.qty}x ${item.name}`;
      const price = `AED ${round2(item.total).toFixed(2)}`;

      doc.text(itemLine, 5, y);
      doc.text(price, 75, y, { align: "right" });
      y += 5;
    });

    y += 2;
    doc.setFontSize(9);
    doc.text("----------------------------------------", 5, y);
    y += 6;

    const subtotal = payload.totals.subtotal;
    const tax = payload.totals.tax;
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text("SUBTOTAL:", 5, y);
    doc.text(`AED ${subtotal.toFixed(2)}`, 75, y, { align: "right" });
    y += 6;

    if (payload.totals.coupon > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(`Coupon:`, 5, y);
      doc.text(`- AED ${payload.totals.coupon.toFixed(2)}`, 75, y, {
        align: "right",
      });
      y += 6;
    }

    if (payload.totals.referral > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(`Referral:`, 5, y);
      doc.text(`- AED ${payload.totals.referral.toFixed(2)}`, 75, y, {
        align: "right",
      });
      y += 6;
    }

    if (payload.totals.wallet > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(`Wallet Applied:`, 5, y);
      doc.text(`- AED ${payload.totals.wallet.toFixed(2)}`, 75, y, {
        align: "right",
      });
      y += 6;
    }

    if (payload.vat && payload.vat.enabled) {
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(`VAT (${payload.vat.percent}%):`, 5, y);
      doc.text(`AED ${tax.toFixed(2)}`, 75, y, { align: "right" });
      y += 6;
    }

    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", 5, y);
    doc.text(`AED ${payload.totals.grand_total.toFixed(2)}`, 75, y, {
      align: "right",
    });
    y += 8;

    const paymentMethodDisplay: any = {
      cash: "CASH",
      card: "CARD",
      upi: "UPI",
      credit: "CREDIT",
    };
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text("Payment Method:", 5, y);
    doc.text(
      paymentMethodDisplay[paymentMethod] || paymentMethod.toUpperCase(),
      75,
      y,
      { align: "right" }
    );
    y += 6;

    doc.setFontSize(9);
    doc.text("----------------------------------------", 5, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont("courier", "bold");
    doc.text("********* THANK YOU! *********", 40, y, { align: "center" });
    y += 8;

    doc.save(`receipt-${payload.invoice_number}.pdf`);
  };

  const onApplyCouponClick = async () => {
    // If user entered a code, attempt to apply that specific rule.
    if (couponCode && couponCode.trim()) {
      // Ensure discount rules loaded (fetch once)
      if (!discountRules.length) await fetchActiveDiscountRules();
      const code = couponCode.trim().toUpperCase();
      const rule = discountRules.find(
        (r) => r.code && r.code.toUpperCase() === code
      );
      const sourceCoupon = rule;
      if (!sourceCoupon) {
        toast({
          title: "Coupon not found",
          description: "Code does not match any active rule",
          variant: "destructive",
        });
        return;
      }
      const evalRes = evaluateCouponOnCart(sourceCoupon, rows);
      if (!evalRes.valid) {
        toast({
          title: "Coupon invalid",
          description: evalRes.reason || "Not applicable to current cart",
          variant: "destructive",
        });
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({
        code,
        applied_amount: evalRes.applied_amount,
        details: evalRes.details,
      });
      toast({
        title: "Coupon applied",
        description: `Discount AED ${evalRes.applied_amount.toFixed(2)}`,
      });
      return;
    }

    // No code entered: fetch and show picker modal with applicable rules.
    if (!discountRules.length) await fetchActiveDiscountRules();
    if (showAllDiscounts && !allDiscountRules.length)
      await fetchAllDiscountRules();
    setShowPromotionsModal(true);
  };

  const quickApplyPromotion = (coupon: any) => {
    const ev = evaluateCouponOnCart(coupon, rows);
    if (!ev.valid) {
      toast({
        title: "Not applicable",
        description: "Promotion not applicable to current cart",
        variant: "destructive",
      });
      return;
    }
    setAppliedCoupon({
      code: coupon.code,
      applied_amount: ev.applied_amount,
      details: coupon,
    });
    toast({
      title: "Promotion applied",
      description: `${coupon.code} — AED ${ev.applied_amount.toFixed(2)}`,
    });
    setShowPromotionsModal(false);
  };

  const handleCustomerInputChange = (value: string) => {
    setCustomer((c) => ({ ...c, name: value }));
    const matches = getMatchingCustomers(value);
    setShowCustomerSuggestions(matches.length > 0);
  };

  const handleCustomerSelect = (cust: any) => {
    const points =
      cust?.loyaltyPoints ??
      cust?.loyalty_points ??
      cust?.loyalityPoints ??
      cust?.loyality_points ??
      0;
    setCustomer({
      name: cust.name || "",
      phone: cust.phone || "",
      loyalityPoints: points,
    });
    setLoyaltyPoints(Number(points || 0));
    setShowCustomerSuggestions(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleCustomerBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => setShowCustomerSuggestions(false), 150);
  };

  const subtotalVal = calculateSubtotal();
  const vatVal = calculateIncludedTax();
  const couponVal = couponAmount;
  const referralVal = referralAmount;
  const walletVal = walletApplied;
  const totalVal = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header matching inventory style */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Enter products, manage customer and print receipt
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Billing Table
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* Customer & VAT controls */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Label className="block text-sm font-medium mb-1">
                  Customer
                </Label>
                <Input
                  ref={(el) => (customerInputRef.current = el)}
                  className="w-full"
                  placeholder="Type name or phone"
                  value={customer.name}
                  onChange={(e) => handleCustomerInputChange(e.target.value)}
                  onFocus={(e) => {
                    const matches = getMatchingCustomers(e.currentTarget.value);
                    setShowCustomerSuggestions(matches.length > 0);
                  }}
                  onBlur={handleCustomerBlur}
                />

                {showCustomerSuggestions && (
                  <div
                    ref={customerSuggestionRef}
                    className="absolute z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto w-full mt-1"
                  >
                    {getMatchingCustomers(customer.name).map(
                      (c: any, idx: number) => (
                        <div
                          key={c.id || `${c.name}-${idx}`}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            handleCustomerSelect(c);
                          }}
                        >
                          <div className="font-medium text-sm">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.phone ? `Phone: ${c.phone}` : "Phone: N/A"}
                          </div>
                        </div>
                      )
                    )}

                    {getMatchingCustomers(customer.name).length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No matching customers
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* VAT controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="vatEnabled"
                    type="checkbox"
                    checked={vatEnabled}
                    onChange={(e) => setVatEnabled(e.target.checked)}
                  />
                  <Label htmlFor="vatEnabled" className="text-sm font-medium">
                    VAT Enabled
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Rate %</Label>
                  <Input
                    className="w-20"
                    type="number"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(Number(e.target.value || 0))}
                  />
                </div>
              </div>

              {/* Promotions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoCoupon"
                    checked={autoApplyBestCoupon}
                    onChange={(e) => setAutoApplyBestCoupon(e.target.checked)}
                  />
                  <Label htmlFor="autoCoupon" className="text-sm">
                    Auto-apply best coupon
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowPromotionsModal(true)}
                    variant="outline"
                    size="sm"
                  >
                    <List className="mr-2 h-4 w-4" /> Promotions
                  </Button>

                  <Button
                    onClick={() => setShowLoyaltyModal(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    <span className="flex items-center gap-2">
                      <span>Loyalty</span>
                      <span className="inline-block bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">
                        {loyaltyPoints}
                      </span>
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="text-left py-3 text-sm font-medium">
                      Item Code / Name
                    </TableHead>
                    <TableHead className="text-left py-3 text-sm font-medium">
                      Qty
                    </TableHead>
                    <TableHead className="text-left py-3 text-sm font-medium">
                      Price
                    </TableHead>
                    <TableHead className="text-left py-3 text-sm font-medium">
                      VAT%
                    </TableHead>
                    <TableHead className="text-left py-3 text-sm font-medium">
                      Total
                    </TableHead>
                    <TableHead className="text-right py-3 text-sm font-medium">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className="border-b hover:bg-muted/50">
                      <TableCell className="py-2">
                        <Input
                          ref={(el) => (inputRefs.current[i] = el)}
                          value={r.code}
                          onChange={(e) =>
                            handleItemCodeChange(i, e.target.value)
                          }
                          placeholder="Enter name, barcode, or SKU"
                          className="text-sm"
                        />

                        {showSuggestions &&
                          currentInputIndex === i &&
                          suggestions &&
                          suggestions.length > 0 && (
                            <div
                              ref={suggestionRef}
                              className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto min-w-[300px]"
                              style={{
                                top: `${
                                  inputRefs.current[i]?.getBoundingClientRect()
                                    .bottom +
                                  window.scrollY +
                                  4
                                }px`,
                                left: `${
                                  inputRefs.current[i]?.getBoundingClientRect()
                                    .left + window.scrollX
                                }px`,
                              }}
                            >
                              {suggestions.map((p: any, idx: number) => (
                                <div
                                  key={p.id || idx}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                                  onMouseDown={(ev) => {
                                    ev.preventDefault();
                                    handleSuggestionClick(p);
                                  }}
                                >
                                  <div className="font-medium text-sm">
                                    {p.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {p.sku && `SKU: ${p.sku} • `}
                                    {p.barcode && `Barcode: ${p.barcode} • `}
                                    Stock: {p.quantity || "N/A"} • AED{" "}
                                    {p.selling_price}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </TableCell>

                      <TableCell className="py-2">
                        <Input
                          type="number"
                          value={r.qty}
                          onChange={(e) => handleQtyChange(i, e.target.value)}
                          onBlur={() => {
                            if (
                              rows[i].qty === "" ||
                              Number(rows[i].qty) === 0
                            ) {
                              const updated = [...rows];
                              updated[i].qty = 1;
                              updated[i].total = updated[i].price;
                              setRows(updated);
                            }
                          }}
                          className="text-sm w-20"
                        />
                      </TableCell>

                      <TableCell className="py-2">
                        <Input
                          type="number"
                          value={r.price}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[i].price = Number(e.target.value || 0);
                            updated[i].total = round2(
                              updated[i].price * (Number(updated[i].qty) || 0)
                            );
                            setRows(updated);
                          }}
                          className="text-sm w-24"
                        />
                      </TableCell>

                      <TableCell className="py-2">
                        <Input
                          type="number"
                          value={r.tax}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[i].tax = Number(e.target.value || 0);
                            setRows(updated);
                          }}
                          placeholder={vatEnabled ? `${vatPercent}` : "0"}
                          className="text-sm w-16"
                        />
                      </TableCell>

                      <TableCell className="py-2 font-medium text-sm">
                        AED {Number(r.total || 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRow(i)}
                          disabled={rows.length === 1}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" onClick={addNewRow}>
                <Plus className="h-4 w-4 mr-2" /> Add Row
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setRows([
                    {
                      code: "",
                      name: "",
                      qty: 1,
                      price: 0,
                      tax: 0,
                      total: 0,
                      product_id: null,
                    },
                  ]);
                  setAppliedCoupon(null);
                  setAppliedReferral(null);
                }}
              >
                <X className="h-4 w-4 mr-2" /> Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary & Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  AED {subtotalVal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  VAT {vatEnabled ? `(${vatPercent}%)` : "(Disabled)"}
                </span>
                <span className="font-medium">AED {vatVal.toFixed(2)}</span>
              </div>

              {/* Coupon */}
              <div className="pt-3 border-t space-y-2">
                <Label className="text-sm font-medium">Coupon / Discount</Label>

                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="text-sm"
                  />
                  <Button onClick={onApplyCouponClick} size="sm">
                    Apply
                  </Button>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between py-2 text-green-600">
                    <span className="text-sm">
                      Applied: {appliedCoupon.code}
                    </span>
                    <span className="text-sm font-medium">
                      - AED {Number(appliedCoupon.applied_amount).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              {couponVal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coupon Discount</span>
                  <span className="font-medium text-green-600">
                    - AED {couponVal.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-bold pt-2 border-t">
                <span className="text-lg">Total</span>
                <span className="text-2xl">AED {totalVal.toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="block text-sm font-medium mb-3">
                Payment Method
              </Label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "cash", icon: Banknote, label: "Cash" },
                  { id: "card", icon: CreditCard, label: "Card" },
                  { id: "upi", icon: Smartphone, label: "UPI" },
                  { id: "credit", icon: Receipt, label: "Credit" },
                ].map(({ id, icon: Icon, label }) => (
                  <Button
                    key={id}
                    variant={paymentMethod === id ? "default" : "outline"}
                    onClick={() => setPaymentMethod(id)}
                    className="flex-col h-auto py-3"
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerateInvoice}
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
      </div>

      {/* Promotions modal */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  {loadingCoupons
                    ? "Loading Discounts"
                    : showAllDiscounts
                    ? "All Discount Rules"
                    : "Active Promotions"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPromotionsModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant={showAllDiscounts ? "outline" : "default"}
                  size="sm"
                  onClick={async () => {
                    setShowAllDiscounts(false);
                    if (!discountRules.length) await fetchActiveDiscountRules();
                  }}
                >
                  Active Only
                </Button>
                <Button
                  variant={showAllDiscounts ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    setShowAllDiscounts(true);
                    if (!allDiscountRules.length) await fetchAllDiscountRules();
                  }}
                >
                  All Rules
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {(showAllDiscounts
                  ? allDiscountRules.length
                    ? allDiscountRules
                    : discountRules
                  : discountRules
                )
                  .filter((c) => showAllDiscounts || c.active)
                  .map((p) => {
                    const evalRes = evaluateCouponOnCart(p, rows);
                    const isBackendRule =
                      showAllDiscounts ||
                      discountRules.some((r) => r.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {p.code} — {p.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {p.scope.toUpperCase()} • {p.type.toUpperCase()} •
                            Min order: AED {p.min_order_value || 0} •
                            {p.stackable ? " Stackable" : " Exclusive"}
                            {showAllDiscounts && (
                              <>
                                {" "}
                                •{" "}
                                {p.active ? (
                                  <span className="text-green-600 font-semibold">
                                    ACTIVE
                                  </span>
                                ) : (
                                  <span className="text-yellow-600 font-semibold">
                                    INACTIVE
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm mb-2">
                            {evalRes.valid ? (
                              <span className="text-green-600 font-medium">
                                Save AED {evalRes.applied_amount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-red-500">
                                Not applicable
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2 flex-wrap justify-end">
                            <Button
                              size="sm"
                              onClick={() => quickApplyPromotion(p)}
                              disabled={!evalRes.valid || !p.active}
                            >
                              Apply
                            </Button>
                            {isBackendRule && showAllDiscounts && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleRuleActive(p)}
                              >
                                {p.active ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard?.writeText(p.code);
                                toast({
                                  title: "Copied",
                                  description: `Code ${p.code} copied`,
                                });
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Loyalty modal */}
      {showLoyaltyModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Loyalty
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLoyaltyModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">Your loyalty points</div>
                <div className="text-3xl font-bold">{loyaltyPoints}</div>

                <div className="text-sm text-muted-foreground">
                  Redeem points for discounts or offers.
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => {
                      const redeem = Math.min(50, loyaltyPoints);
                      setLoyaltyPoints((p) => p - redeem);
                      toast({
                        title: "Redeemed",
                        description: `Redeemed ${redeem} points`,
                      });
                    }}
                  >
                    Redeem 50
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLoyaltyModal(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SupermarketBilling;
