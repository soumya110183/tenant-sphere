import { BillingTable } from "@/components/billingComponent/BillingTable";
import { BillSummary } from "@/components/billingComponent/BillSummary";
import { CouponPopup } from "@/components/billingComponent/CouponPopup";
import { generatePDFBill } from "@/components/billingComponent/functions/generatePDFBill";
import { HeldBillsPopup } from "@/components/billingComponent/HeldBillsPopup";
import { HoldBillSection } from "@/components/billingComponent/HoldBillSection";
import { RedeemPointsPopup } from "@/components/billingComponent/RedeemPointsPopup";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";

// =============================================
// TYPES
// =============================================
type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  selling_price: number;
 tax: number;
  quantity: number;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  loyalty_points: number;
  membership_tier: string;
};

type BillRow = {
  code: string;
  name: string;
  qty: number | "";
  price: number;
  tax: number;
  total: number;
  product_id?: number | null;
};

type HeldBill = {
  id: string;
  name: string;
  timestamp: string;
  customer: Customer | null;
  rows: BillRow[];
  couponCode: string;
  redeemPoints: number | "";
  preview: any;
  previewItems: any[];
  subtotal: number;
  total: number;
};

// =============================================
// HELD BILLS POPUP COMPONENT
// =============================================



// =============================================
// BILLING TABLE COMPONENT
// =============================================



// =============================================
// CUSTOMER SEARCH COMPONENT
// =============================================



// =============================================
// BILL SUMMARY COMPONENT (UPDATED WITH CUSTOMER SEARCH)
// =============================================



// =============================================
// HOLD BILL COMPONENT
// =============================================



// =============================================
// PDF GENERATION FUNCTION
// =============================================



// =============================================
// MAIN COMPONENT
// =============================================

const SupermarketBilling = () => {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [rows, setRows] = useState<BillRow[]>([
    { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 }
  ]);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [couponCode, setCouponCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState<number | "">("");
  const [preview, setPreview] = useState<any | null>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isApplyingDiscounts, setIsApplyingDiscounts] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const [showCouponPopup, setShowCouponPopup] = useState(false);
  const [showRedeemPopup, setShowRedeemPopup] = useState(false);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [billName, setBillName] = useState("");
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);

  // Data fetching effects
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/inventory`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const json = await res.json();
        console.log("Fetched products:", json.data);
        if (res.ok) setProducts(json.data || []);
        else toast({
          title: "Failed to load products",
          description: json.error || "Please check your token or server",
          variant: "destructive",
        });
      } catch (err: any) {
        console.error("Error fetching products:", err);
        toast({
          title: "Error fetching products",
          description: err.message,
          variant: "destructive",
        });
      }
    };
    fetchProducts();
  }, [toast]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/customers`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const json = await res.json();
        if (res.ok && json.success) setCustomers(json.data || []);
        else toast({
          title: "Failed to load customers",
          description: json.error || "Please check your token or server",
          variant: "destructive",
        });
      } catch (err: any) {
        console.error("Error fetching customers:", err);
        toast({
          title: "Error fetching customers",
          description: err.message,
          variant: "destructive",
        });
      }
    };
    fetchCustomers();
  }, [toast]);

  useEffect(() => {
  if (rows.some(r => r.name && r.product_id)) {
    handleApplyDiscounts();
  }
}, [rows, selectedCustomer, couponCode]);


  // Row management
  const addNewRow = () => {
    setRows((prev) => [
      ...prev,
      { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 },
    ]);
  };

  const deleteRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  // Customer management
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setRedeemPoints("");
    setPreview(null);
    setPreviewItems([]);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setRedeemPoints("");
    setPreview(null);
    setPreviewItems([]);
  };

  // Discounts and preview
  const buildItemsPayload = () => {
    const validItems = rows.filter((r) => r.name && r.product_id);
    return validItems.map((r) => ({
      product_id: r.product_id,
      qty: Number(r.qty || 0),
      price: Number(r.price || 0),
      tax: Number(r.tax || 0),
    }));
  };

  const handleApplyDiscounts = async () => {
    const itemsPayload = buildItemsPayload();
    if (!itemsPayload.length) {
      toast({
        title: "No items",
        description: "Add some items before applying discounts",
        variant: "destructive",
      });
      return;
    }

    setIsApplyingDiscounts(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/invoices/preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: itemsPayload,
          customer_id: selectedCustomer?.id || null,
          coupon_code: couponCode || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to apply discounts");

      setPreview(json.preview || null);
      setPreviewItems(json.items || []);
      toast({
        title: "Discounts applied",
        description: "Preview updated with active discounts & coupon",
      });
    } catch (err: any) {
      console.error("Preview error:", err);
      toast({
        title: "Discount preview failed",
        description: err.message,
        variant: "destructive",
      });
      setPreview(null);
      setPreviewItems([]);
    } finally {
      setIsApplyingDiscounts(false);
    }
  };

  const handleClearDiscounts = () => {
    setCouponCode("");
    setPreview(null);
    setPreviewItems([]);
  };

  // Coupon management
  const handleSelectCoupon = (coupon: any) => {
    setCouponCode(coupon.code);
    setShowCouponPopup(false);
    toast({
      title: "Coupon Applied",
      description: `${coupon.code} - ${coupon.description || "Coupon applied"}`,
    });
  };

  // Redeem points management
  const handleApplyRedeem = (points: number) => {
    const maxPoints = selectedCustomer?.loyalty_points || 0;
    const pointsToUse = Math.min(points, maxPoints);
    setRedeemPoints(pointsToUse);
    setShowRedeemPopup(false);
    toast({
      title: "Points Redeemed",
      description: `Redeemed ${pointsToUse} points for AED ${pointsToUse}.00 discount`,
    });
  };

  // Bill holding management
  const handleHoldBill = () => {
    if (rows.length === 0 || !rows.some(row => row.name && row.qty)) {
      toast({
        title: "Cannot Hold Bill",
        description: "Add at least one item to hold the bill",
        variant: "destructive",
      });
      return;
    }

    const billData: HeldBill = {
      id: Date.now().toString(),
      name: billName || `Bill ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      customer: selectedCustomer,
      rows: [...rows],
      couponCode,
      redeemPoints,
      preview,
      previewItems,
     subtotal: preview?.subtotal || 0,
total: preview?.total || 0

    };

    setHeldBills(prev => [billData, ...prev]);
    setBillName("");
    toast({
      title: "Bill Held",
      description: `Bill "${billData.name}" has been saved`,
    });

    // Clear current bill
    setRows([{ code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 }]);
    setCouponCode("");
    setRedeemPoints("");
    setPreview(null);
    setPreviewItems([]);
    setSelectedCustomer(null);
  };

  const handleRestoreBill = (bill: HeldBill) => {
    setRows(bill.rows);
    setCouponCode(bill.couponCode);
    setRedeemPoints(bill.redeemPoints);
    setPreview(bill.preview);
    setPreviewItems(bill.previewItems);
    setSelectedCustomer(bill.customer);
    setHeldBills(prev => prev.filter(b => b.id !== bill.id));
    setShowHeldBills(false);
    toast({
      title: "Bill Restored",
      description: `Bill "${bill.name}" has been restored`,
    });
  };

  const handleDeleteHeldBill = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHeldBills(prev => prev.filter(bill => bill.id !== billId));
    toast({
      title: "Bill Deleted",
      description: "Held bill has been removed",
    });
  };

  // Invoice generation
  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    const validItems = rows.filter((r) => r.name && r.product_id);
    console.log("Generating invoice with items:", validItems);
    
    if (validItems.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one product",
        variant: "destructive",
      });
      setIsGeneratingInvoice(false);
      return;
    }

    // Stock validation
    for (const item of validItems) {
      const product = products.find((p) => p.name === item.name);
      if (product && item.qty > product.quantity) {
        toast({
          title: "Insufficient Stock",
          description: `${product.name} has only ${product.quantity} left.`,
          variant: "destructive",
        });
        setIsGeneratingInvoice(false);
        return;
      }
    }

    // Redeem validation
    const numericRedeem = redeemPoints === "" ? 0 : Math.max(0, Number(redeemPoints || 0));
    const maxRedeemAllowed = selectedCustomer?.loyalty_points != null ? Number(selectedCustomer.loyalty_points) : 0;
    
    if (selectedCustomer && numericRedeem > maxRedeemAllowed) {
      toast({
        title: "Invalid redeem",
        description: `Customer has only ${maxRedeemAllowed} points`,
        variant: "destructive",
      });
      setIsGeneratingInvoice(false);
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/billing`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          customer_id: selectedCustomer?.id || null,
          redeem_points: numericRedeem,
          coupon_code: couponCode || null,
          items: validItems.map((r) => ({
            product_id: r.product_id,
            qty: Number(r.qty || 0),
            price: Number(r.price || 0),
            tax: Number(r.tax || 0),
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Invoice creation failed");

      toast({
        title: "Invoice Created",
        description: `Invoice ${json.invoice.invoice_number} generated`,
      });
generatePDFBill(
  json.invoice.invoice_number,
  json.items || [],
  json.invoice.final_amount,
  paymentMethod
);



      // Reset state
      setRows([{ code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 }]);
      setPreview(null);
      setPreviewItems([]);
      setCouponCode("");
      setRedeemPoints("");
      setSelectedCustomer(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Helper functions
  const calculateSubtotal = () =>
    rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  const calculateTotal = () => calculateSubtotal();

  return (
    <div className="space-y-6">
      {/* Popups */}
      <CouponPopup
        show={showCouponPopup}
        onClose={() => setShowCouponPopup(false)}
        onSelectCoupon={handleSelectCoupon}
      />

      <RedeemPointsPopup
        show={showRedeemPopup}
        onClose={() => setShowRedeemPopup(false)}
        customer={selectedCustomer}
        onApplyRedeem={handleApplyRedeem}
      />

      <HeldBillsPopup
        show={showHeldBills}
        onClose={() => setShowHeldBills(false)}
        heldBills={heldBills}
        onRestoreBill={handleRestoreBill}
        onDeleteBill={handleDeleteHeldBill}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Enter products, apply discounts, and print receipt
          </p>
        </div>
      </div>

      {/* Hold Bill Section */}
      <HoldBillSection
        rows={rows}
        billName={billName}
        onBillNameChange={setBillName}
        onHoldBill={handleHoldBill}
        heldBillsCount={heldBills.length}
        onShowHeldBills={() => setShowHeldBills(true)}
      />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing Table */}
        <BillingTable
          rows={rows}
          products={products}
          onRowsChange={setRows}
          onAddRow={addNewRow}
          onDeleteRow={deleteRow}
        />

        {/* Bill Summary - NOW INCLUDES CUSTOMER SEARCH */}
        <BillSummary
          rows={rows}
          preview={preview}
          selectedCustomer={selectedCustomer}
          couponCode={couponCode}
          redeemPoints={redeemPoints}
          paymentMethod={paymentMethod}
          onApplyDiscounts={handleApplyDiscounts}
          onClearDiscounts={handleClearDiscounts}
          onOpenCouponPopup={() => setShowCouponPopup(true)}
          onOpenRedeemPopup={() => setShowRedeemPopup(true)}
          onGenerateInvoice={handleGenerateInvoice}
          isApplyingDiscounts={isApplyingDiscounts}
          isGeneratingInvoice={isGeneratingInvoice}
          onPaymentMethodChange={setPaymentMethod}
          customers={customers}
          onCustomerSelect={handleCustomerSelect}
          onClearCustomer={handleClearCustomer}
        />
      </div>
    </div>
  );
};

export default SupermarketBilling;