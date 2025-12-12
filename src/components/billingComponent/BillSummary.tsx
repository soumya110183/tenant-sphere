import React, { useState } from "react";
import { Separator } from "@radix-ui/react-dropdown-menu";
import {
  Banknote,
  Coins,
  CreditCard,
  Printer,
  Receipt,
  Smartphone,
  Tag,
  X,
  User,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// If you have a CustomerSearch component in the same folder, keep this import.
// If your project has it at a different path, update the import path accordingly.
import { CustomerSearch } from "./CustomerSearch";

/**
 * Unified BillSummary component
 *
 * - Provides customer search (via CustomerSearch), Add Customer modal, coupon, redeem, totals,
 *   payment method, and Print Bill button.
 * - Creates customer via POST /api/customers and on success:
 *     - calls onCustomerSelect(newCustomer)
 *     - optionally calls onRefreshCustomers() if provided by parent
 *
 * Usage: pass the props exactly as used in your SupermarketBilling.
 */

const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL ??
  "https://billingbackend-1vei.onrender.com";

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
  id: number | string;
  name: string;
  phone: string;
  loyalty_points?: number;
  membership_tier?: string;
  email?: string;
  address?: string;
  alternatePhone?: string;
  isActive?: boolean;
};

export default function BillSummary({
  rows,
  preview,
  selectedCustomer,
  couponCode,
  redeemPoints,
  paymentMethod,
  onApplyDiscounts,
  onClearDiscounts,
  onOpenCouponPopup,
  onCouponChange,
  onSelectCoupon,
  coupons,
  onOpenRedeemPopup,
  onGenerateInvoice,
  isApplyingDiscounts,
  isGeneratingInvoice,
  onPaymentMethodChange,
  customers,
  onCustomerSelect,
  onClearCustomer,
  onRefreshCustomers, // optional: parent can pass to refresh global customers list
  employees = [],
  selectedEmployee,
  onEmployeeSelect,
  onClearEmployee,
  onRefreshEmployees,
}: {
  rows: BillRow[];
  preview: any;
  selectedCustomer: any | null;
  couponCode: string;
  redeemPoints: number | "";
  paymentMethod: string;
  onApplyDiscounts: (showToast?: boolean) => void;
  onClearDiscounts: () => void;
  onOpenCouponPopup: () => void;
  onCouponChange?: (code: string) => void;
  onSelectCoupon?: (coupon: any) => void;
  onOpenRedeemPopup: () => void;
  onGenerateInvoice: () => void;
  isApplyingDiscounts: boolean;
  isGeneratingInvoice: boolean;
  onPaymentMethodChange: (method: string) => void;
  customers: any[];
  onCustomerSelect: (customer: any) => void;
  onClearCustomer: () => void;
  onRefreshCustomers?: () => Promise<void> | void;
  employees?: any[];
  selectedEmployee?: any | null;
  onEmployeeSelect?: (employee: any) => void;
  onClearEmployee?: () => void;
  onRefreshEmployees?: () => Promise<void> | void;
  coupons?: any[];
}) {
  const { toast } = useToast();

  // === Calculations (kept from your original) ===
  const calculateSubtotal = () =>
    rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  const calculateIncludedTax = () =>
    rows.reduce(
      (s, r) =>
        s + Number(r.price) * (Number(r.tax) / 100) * Number(r.qty || 0),
      0
    );

  const calculateTotal = () => calculateSubtotal();

  const uiSubtotal = preview?.subtotal ?? calculateSubtotal();
  const uiBaseTotal = preview?.total ?? calculateTotal();
  const uiItemDiscountTotal = preview?.item_discount_total ?? 0;
  const uiBillDiscountTotal = preview?.bill_discount_total ?? 0;
  const uiCouponDiscountTotal = preview?.coupon_discount_total ?? 0;
  const uiMembershipDiscountTotal = preview?.membership_discount_total ?? 0;
  const uiEmployeeDiscount =
    preview?.employee_discount_preview?.discount_this_bill ?? 0;

  /**
   * Numeric, non-negative representation of `redeemPoints`.
   *
   * - If `redeemPoints` is an empty string, this value is 0.
   * - Otherwise, `redeemPoints` is coerced to a number and clamped to a minimum of 0.
   *
   * This ensures downstream calculations receive a valid non-negative number even when
   * `redeemPoints` is missing, an empty string, or a negative numeric string.
   *
   * @example
   * // redeemPoints = ""   => numericRedeem = 0
   * // redeemPoints = "25" => numericRedeem = 25
   * // redeemPoints = "-5" => numericRedeem = 0
   *
   * @type {number}
   */
  const numericRedeem =
    redeemPoints === "" ? 0 : Math.max(0, Number(redeemPoints || 0));
  const maxRedeemAllowed =
    selectedCustomer?.loyalty_points != null
      ? Number(selectedCustomer.loyalty_points)
      : 0;
  const clampedRedeem =
    numericRedeem > maxRedeemAllowed ? maxRedeemAllowed : numericRedeem;
  const payableAfterRedeem = Math.max(uiBaseTotal - clampedRedeem, 0);

  // === Add Customer modal state ===
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
    alternatePhone: "",
    email: "",
    address: "",
    isActive: true,
  });

  // Employee modal state
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [empForm, setEmpForm] = useState({
    name: "",
    phone: "",
    position: "staff",
    salary: "",
    active: true,
  });
  const [empPickerOpen, setEmpPickerOpen] = useState(false);

  // Coupon search state
  const [couponQuery, setCouponQuery] = useState<string>(couponCode || "");
  const [couponSuggestions, setCouponSuggestions] = useState<any[]>([]);
  const [showCouponSuggestions, setShowCouponSuggestions] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const resetForm = () =>
    setForm({
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      address: "",
      isActive: true,
    });

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.name || !form.name.trim()) errs.name = "Name is required";
    if (!form.phone || !form.phone.trim()) errs.phone = "Phone is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /**
   * Create customer on server. On success:
   * - close modal, reset form
   * - call onCustomerSelect(newCustomer)
   * - if onRefreshCustomers provided, call it to refresh parent's customer list
   */
  const handleCreateCustomer = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setFormErrors({});
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          alternate_phone: form.alternatePhone || undefined,
          is_active: form.isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const errMsg =
          json?.error || json?.message || "Failed to create customer";
        if (json?.errors && typeof json.errors === "object") {
          setFormErrors(json.errors);
        } else {
          setFormErrors((p) => ({ ...p, general: errMsg }));
        }
        throw new Error(errMsg);
      }

      const created = json?.data ?? json;
      const newCustomer: Customer = {
        id: created.id,
        name: created.name,
        phone: created.phone,
        email: created.email,
        address: created.address,
        loyalty_points: created.loyalty_points ?? 0,
        membership_tier: created.membership_tier ?? "",
        alternatePhone: created.alternatePhone ?? created.alternate_phone ?? "",
        isActive: created.isActive ?? created.is_active ?? true,
      };

      setModalOpen(false);
      resetForm();
      toast({
        title: "Customer added",
        description: `${newCustomer.name} created`,
      });

      // select new customer in parent flow
      onCustomerSelect(newCustomer);

      // let parent refresh its full customer list if needed
      if (onRefreshCustomers) {
        try {
          await onRefreshCustomers();
        } catch {
          // keep UI robust: ignore refresh errors here
        }
      }
    } catch (err: any) {
      toast({
        title: "Create customer failed",
        description: err?.message ?? "See console",
        variant: "destructive",
      });
      console.error("Create customer error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Sync local coupon query when parent prop changes
  React.useEffect(() => {
    setCouponQuery(couponCode || "");
  }, [couponCode]);

  // Coupon search: use client-side filtering when `coupons` prop is provided,
  // otherwise fall back to debounced backend search.
  React.useEffect(() => {
    if (!couponQuery || couponQuery.trim().length === 0) {
      setCouponSuggestions([]);
      return;
    }

    const q = couponQuery.trim().toLowerCase();

    if (Array.isArray(coupons) && coupons.length > 0) {
      // Client-side filter
      const filtered = coupons.filter((c: any) => {
        const code = String(c.code || c.id || "").toLowerCase();
        const desc = String(c.description || c.name || "").toLowerCase();
        return code.includes(q) || desc.includes(q);
      });
      setCouponSuggestions(filtered);
      setShowCouponSuggestions(true);
      setLoadingCoupons(false);
      return;
    }

    // Fallback: debounced backend search
    const id = setTimeout(async () => {
      try {
        setLoadingCoupons(true);
        const token = localStorage.getItem("auth_token");
        // try a search endpoint; backend may accept `search` query param
        const res = await fetch(
          `${API_BASE}/api/coupons?search=${encodeURIComponent(q)}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              "Content-Type": "application/json",
            },
          }
        );
        const j = await res.json();
        const list = res.ok ? j.data ?? (Array.isArray(j) ? j : []) : [];
        setCouponSuggestions(list);
        setShowCouponSuggestions(true);
      } catch (e) {
        console.warn("Coupon search failed", e);
        setCouponSuggestions([]);
      } finally {
        setLoadingCoupons(false);
      }
    }, 250);

    return () => clearTimeout(id);
  }, [couponQuery, coupons]);

  const CustomerModal = () => {
    if (!modalOpen) return null;
    return (
      <div
        className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
        onClick={() => setModalOpen(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center border-b p-4">
            <h2 className="font-bold text-lg">Add Customer</h2>
            <button disabled={saving} onClick={() => setModalOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {formErrors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {formErrors.general}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <div className="flex items-center border rounded-md px-2">
                <User className="h-4 w-4 text-gray-400" />
                <input
                  required
                  disabled={saving}
                  className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                  placeholder="Enter customer name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              {formErrors.name && (
                <div className="text-red-600 text-sm mt-1">
                  {formErrors.name}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <div className="flex items-center border rounded-md px-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <input
                  required
                  disabled={saving}
                  className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              {formErrors.phone && (
                <div className="text-red-600 text-sm mt-1">
                  {formErrors.phone}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Alternate Phone
              </label>
              <div className="flex items-center border rounded-md px-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <input
                  disabled={saving}
                  className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                  placeholder="Enter alternate phone"
                  value={form.alternatePhone}
                  onChange={(e) =>
                    setForm({ ...form, alternatePhone: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <div className="flex items-center border rounded-md px-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  disabled={saving}
                  className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              {formErrors.email && (
                <div className="text-red-600 text-sm mt-1">
                  {formErrors.email}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <div className="flex items-start border rounded-md px-2 py-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <textarea
                  disabled={saving}
                  className="w-full px-2 bg-transparent text-sm resize-none outline-none"
                  placeholder="Enter address"
                  rows={3}
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                disabled={saving}
                className="w-full px-3 py-2 border rounded-md text-sm bg-transparent"
                value={form.isActive ? "Active" : "Inactive"}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.value === "Active" })
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <Button
              onClick={handleCreateCustomer}
              className="w-full"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const EmployeeModal = () => {
    if (!empModalOpen) return null;
    return (
      <div
        className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
        onClick={() => setEmpModalOpen(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center border-b p-4">
            <h2 className="font-bold text-lg">Add Staff</h2>
            <button disabled={empSaving} onClick={() => setEmpModalOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full name *
              </label>
              <div className="flex items-center border rounded-md px-2">
                <User className="h-4 w-4 text-gray-400" />
                <input
                  required
                  disabled={empSaving}
                  className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                  placeholder="Enter staff name"
                  value={empForm.name}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <div className="flex items-center border rounded-md px-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <input
                  disabled={empSaving}
                  className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                  placeholder="Enter phone number"
                  value={empForm.phone}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Position</label>
              <input
                disabled={empSaving}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                value={empForm.position}
                onChange={(e) =>
                  setEmpForm({ ...empForm, position: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Salary (monthly)
              </label>
              <input
                disabled={empSaving}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                value={empForm.salary}
                onChange={(e) =>
                  setEmpForm({ ...empForm, salary: e.target.value })
                }
                type="number"
                min="0"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                onClick={async () => {
                  // create employee
                  if (!empForm.name || !empForm.name.trim()) {
                    toast({
                      title: "Name required",
                      description: "Enter staff name",
                      variant: "destructive",
                    });
                    return;
                  }
                  setEmpSaving(true);
                  try {
                    const token = localStorage.getItem("auth_token");
                    const res = await fetch(`${API_BASE}/api/employees`, {
                      method: "POST",
                      headers: {
                        Authorization: token ? `Bearer ${token}` : "",
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        full_name: empForm.name,
                        phone: empForm.phone || undefined,
                        position: empForm.position || "staff",
                        salary: empForm.salary
                          ? Number(empForm.salary)
                          : undefined,
                        is_active: empForm.active ?? true,
                      }),
                    });
                    const json = await res.json();
                    if (!res.ok)
                      throw new Error(
                        json?.error || json?.message || "Failed to create staff"
                      );
                    const created = json?.data ?? json;
                    setEmpModalOpen(false);
                    setEmpForm({
                      name: "",
                      phone: "",
                      position: "staff",
                      salary: "",
                      active: true,
                    });
                    toast({
                      title: "Staff added",
                      description: `${
                        created.full_name || created.name
                      } created`,
                    });
                    if (onEmployeeSelect)
                      onEmployeeSelect({
                        id: created.id ?? created._id,
                        name: created.full_name || created.name,
                        phone: created.phone || "",
                      } as Customer);
                    if (onRefreshEmployees) await onRefreshEmployees();
                  } catch (err: any) {
                    console.error("Create staff failed:", err);
                    toast({
                      title: "Failed to add staff",
                      description: err.message || "See console",
                      variant: "destructive",
                    });
                  } finally {
                    setEmpSaving(false);
                  }
                }}
                className="flex-1"
                disabled={empSaving}
              >
                {empSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmpModalOpen(false)}
                className="flex-1 sm:flex-none"
                disabled={empSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // === Render ===
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Summary</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Search Section (top) */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Customer</div>
            <div className="text-xs text-muted-foreground">
              (for loyalty & coupons)
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded-md"
            >
              <UserPlus className="h-4 w-4" />
              Add
            </Button>

            {/* compact staff selector (chip moved to the right of Staff button) */}

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmpPickerOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1 rounded-md"
                title="Select staff"
              >
                <User className="h-4 w-4" />
                Staff
              </Button>

              {empPickerOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border rounded shadow p-3 z-50">
                  <label className="block text-xs text-muted-foreground mb-2">
                    Select staff (tenant)
                  </label>
                  <select
                    className="w-full px-2 py-2 border rounded mb-2 bg-background text-sm"
                    value={selectedEmployee?.id ?? ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      const found = employees?.find(
                        (x) => String(x.id) === String(id)
                      );
                      if (found && onEmployeeSelect) onEmployeeSelect(found);
                      setEmpPickerOpen(false);
                    }}
                  >
                    <option value="">-- Select staff --</option>
                    {employees?.map((emp: any) => (
                      <option key={emp.id ?? emp._id} value={emp.id ?? emp._id}>
                        {emp.full_name || emp.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEmpPickerOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* compact staff chip + clear button placed to the right of the Staff button */}
            {selectedEmployee && onClearEmployee && (
              <div className="hidden sm:flex items-center gap-2 bg-muted/10 px-2 py-1 rounded-md">
                <span className="text-sm">{selectedEmployee.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearEmployee();
                  }}
                  title="Clear staff"
                  className="p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 space-y-2">
          {typeof CustomerSearch === "function" ? (
            <CustomerSearch
              customers={customers}
              selectedCustomer={selectedCustomer}
              onCustomerSelect={onCustomerSelect}
              onClearCustomer={onClearCustomer}
            />
          ) : (
            <Input
              value={selectedCustomer?.name ?? ""}
              readOnly
              placeholder="Select or add customer"
            />
          )}

          {/* Selected employee display */}
          {/* <div className="mt-1">
            <div className="text-sm font-medium">Staff</div>
            <div className="text-xs text-muted-foreground">
              (optional: apply staff discount)
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={selectedEmployee?.name ?? ""}
                readOnly
                placeholder="Select or add staff"
              />
              {selectedEmployee && onClearEmployee && (
                <Button variant="outline" size="sm" onClick={onClearEmployee}>
                  Clear
                </Button>
              )}
            </div>
          </div> */}
        </div>

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
            <div className="relative flex-1">
              <input
                value={couponQuery}
                onChange={(e) => setCouponQuery(e.target.value)}
                onFocus={() => setShowCouponSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowCouponSuggestions(false), 150)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (couponQuery && typeof onCouponChange === "function") {
                      const code = couponQuery.trim();
                      onCouponChange(code);
                      // if this code matches one of the loaded suggestions, pass the full coupon object
                      try {
                        const matched = couponSuggestions.find(
                          (cc: any) => String(cc.code) === String(code)
                        );
                        if (matched && typeof onSelectCoupon === "function")
                          onSelectCoupon(matched);
                      } catch (e) {
                        // ignore
                      }
                      setShowCouponSuggestions(false);
                      toast({
                        title: "Coupon set",
                        description: code,
                      });
                      // apply discounts immediately after selecting coupon via Enter
                      try {
                        onApplyDiscounts?.(true);
                      } catch (err) {
                        /* ignore */
                      }
                    }
                  }
                }}
                placeholder="Search coupons or enter code"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
              />

              {showCouponSuggestions && couponSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-50 max-h-52 overflow-auto">
                  {couponSuggestions.map((c: any) => (
                    <button
                      key={c.id ?? c.code}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50"
                      onClick={() => {
                        // let parent know about selected coupon
                        if (typeof onCouponChange === "function")
                          onCouponChange(c.code);
                        // provide the full coupon object to parent (same as CouponPopup)
                        if (typeof onSelectCoupon === "function")
                          onSelectCoupon(c);
                        // close suggestions and update local query
                        setCouponQuery(c.code || "");
                        setShowCouponSuggestions(false);
                        // optionally show toast
                        toast({
                          title: "Coupon selected",
                          description: `${c.code} ${
                            c.description ? "- " + c.description : ""
                          }`,
                        });
                        // apply discounts immediately after selecting coupon
                        try {
                          onApplyDiscounts?.(true);
                        } catch (err) {
                          /* ignore */
                        }
                      }}
                    >
                      <div className="font-medium text-sm">{c.code}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground">
                          {c.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {showCouponSuggestions &&
                !loadingCoupons &&
                couponSuggestions.length === 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-50 px-3 py-2 text-sm text-muted-foreground">
                    No coupons found
                  </div>
                )}
            </div>
            <Button
              variant="outline"
              onClick={onOpenCouponPopup}
              className="whitespace-nowrap"
            >
              <Tag className="h-4 w-4 mr-1" />
              Browse
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => onApplyDiscounts?.(true)}
              disabled={isApplyingDiscounts}
              className="flex-1"
            >
              {isApplyingDiscounts ? "Applying..." : "Apply Discounts"}
            </Button>
            <Button
              variant="outline"
              onClick={onClearDiscounts}
              className="flex-1"
            >
              Clear
            </Button>
          </div>

          {couponCode && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">Applied Coupon:</span>
                <span className="text-blue-700 font-semibold">
                  {couponCode}
                </span>
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

          {uiEmployeeDiscount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Staff Discount</span>
              <span>-AED {Number(uiEmployeeDiscount).toFixed(2)}</span>
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
              Will earn approx{" "}
              <span className="font-semibold">
                {preview.preview_loyalty_points}
              </span>{" "}
              points (before redeem).
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

      {CustomerModal()}
      {EmployeeModal()}
    </Card>
  );
}
