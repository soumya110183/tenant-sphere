import { useState, useRef, useEffect } from "react";
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
  X,
  Coins,
  Save,
  Clock,
  Play,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const API_BASE = "https://billingbackend-1vei.onrender.com";

const SupermarketBilling = () => {
  const { toast } = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [rows, setRows] = useState<
    {
      code: string;
      name: string;
      qty: number | "";
      price: number;
      tax: number;
      total: number;
      product_id?: number | null;
    }[]
  >([{ code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 }]);

  const [paymentMethod, setPaymentMethod] = useState("cash");

  // suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInputIndex, setCurrentInputIndex] = useState<number | null>(
    null
  );

  // discounts / preview state
  const [couponCode, setCouponCode] = useState("");
  const [redeemPoints, setRedeemPoints] = useState<number | "">("");
  const [preview, setPreview] = useState<any | null>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isApplyingDiscounts, setIsApplyingDiscounts] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  // Popup states
  const [showCouponPopup, setShowCouponPopup] = useState(false);
  const [showRedeemPopup, setShowRedeemPopup] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  // Hold bill state
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [billName, setBillName] = useState("");

  const inputRefs = useRef<HTMLInputElement[]>([]);
  const suggestionRef = useRef<HTMLDivElement | null>(null);


  const [customerSearch, setCustomerSearch] = useState("");
const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // 🔄 Fetch inventory products
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
        else
          toast({
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

  // 🔄 Fetch customers
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
        console.log("Fetched customers:", json);

        if (res.ok && json.success) {
          setCustomers(json.data || []);
        } else {
          toast({
            title: "Failed to load customers",
            description: json.error || "Please check your token or server",
            variant: "destructive",
          });
        }
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

  // 🔄 Fetch available coupons
  const fetchAvailableCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/discounts/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok) {
        console.log("Failed coupon fetch:", json);
        setAvailableCoupons([]);
        return;
      }

      // Filter only COUPON rules
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

  // Open coupon popup and fetch coupons
  const handleOpenCouponPopup = async () => {
    setShowCouponPopup(true);
    await fetchAvailableCoupons();
  };

  // Open redeem points popup
  const handleOpenRedeemPopup = () => {
    if (!selectedCustomer) {
      toast({
        title: "No Customer Selected",
        description: "Please select a customer to redeem points",
        variant: "destructive",
      });
      return;
    }
    setShowRedeemPopup(true);
  };

  // Select coupon from popup
  const handleSelectCoupon = (coupon: any) => {
    setCouponCode(coupon.code);
    setShowCouponPopup(false);
    toast({
      title: "Coupon Applied",
      description: `${coupon.code} - ${coupon.description || "Coupon applied"}`,
    });
  };

  // Apply redeem points
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

  // Hold current bill
  const handleHoldBill = () => {
    if (rows.length === 0 || !rows.some(row => row.name && row.qty)) {
      toast({
        title: "Cannot Hold Bill",
        description: "Add at least one item to hold the bill",
        variant: "destructive",
      });
      return;
    }

    const billData = {
      id: Date.now().toString(),
      name: billName || `Bill ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      customer: selectedCustomer,
      rows: [...rows],
      couponCode,
      redeemPoints,
      preview,
      previewItems,
      subtotal: calculateSubtotal(),
      total: calculateTotal()
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
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
  };

  // Restore held bill
  const handleRestoreBill = (bill: any) => {
    setRows(bill.rows);
    setCouponCode(bill.couponCode);
    setRedeemPoints(bill.redeemPoints);
    setPreview(bill.preview);
    setPreviewItems(bill.previewItems);
    setSelectedCustomerId(bill.customer?.id || null);
    setSelectedCustomer(bill.customer);
    
    // Remove from held bills
    setHeldBills(prev => prev.filter(b => b.id !== bill.id));
    setShowHeldBills(false);
    
    toast({
      title: "Bill Restored",
      description: `Bill "${bill.name}" has been restored`,
    });
  };

  // Delete held bill
  const handleDeleteHeldBill = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHeldBills(prev => prev.filter(bill => bill.id !== billId));
    toast({
      title: "Bill Deleted",
      description: "Held bill has been removed",
    });
  };

  // Debug: Log products when they change
  useEffect(() => {
    if (products.length > 0) {
      console.log("Products available for search:", products);
      console.log(
        "Sample SKUs:",
        products.map((p) => ({
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
        }))
      );
    }
  }, [products]);

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

  const getMatchingProducts = (term: string) => {
    if (!term || term.length < 1) return [];
    const lower = term.toLowerCase();

    console.log("Searching for:", term);

    const matches = products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          p.barcode?.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower)
      )
      .slice(0, 8);

    console.log("Found matches:", matches);
    return matches;
  };

  const handleItemCodeChange = (index: number, value: string) => {
    const updated = [...rows];
    updated[index].code = value;

    // Reset preview whenever items change (so it's not stale)
    setPreview(null);
    setPreviewItems([]);

    const matches = getMatchingProducts(value);
    setSuggestions(matches);
    setCurrentInputIndex(index);
    setShowSuggestions(matches.length > 0);

    // Clear row if empty
    if (!value.trim()) {
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
      setRows(updated);
      setShowSuggestions(false);
      return;
    }

    const exactMatch = products.find(
      (p) =>
        p.name?.toLowerCase() === value.toLowerCase() ||
        p.barcode?.toLowerCase() === value.toLowerCase() ||
        p.sku?.toLowerCase() === value.toLowerCase() ||
        p.id?.toString() === value // sometimes id typed
    );

    console.log("Exact match search for:", value, "Found:", exactMatch);

    if (exactMatch) {
      updated[index].code = exactMatch.name;
      updated[index].name = exactMatch.name;
      updated[index].price = Number(exactMatch.selling_price || 0);
      updated[index].tax = Number(exactMatch.tax_percent || 0);
      updated[index].product_id = exactMatch.product_id || exactMatch.id;
      updated[index].total =
        (updated[index].qty || 0) * updated[index].price;
      setShowSuggestions(false);
      console.log("Auto-filled row with:", exactMatch.name);
    } else {
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
    }

    setRows(updated);
  };

  const handleSuggestionClick = (product: any) => {
    if (currentInputIndex === null) return;

    const updated = [...rows];
    const existingIndex = updated.findIndex(
      (r) => r.name.toLowerCase() === product.name.toLowerCase()
    );

    if (existingIndex !== -1 && existingIndex !== currentInputIndex) {
      // Item already exists → just bump quantity
      const existing = updated[existingIndex];
      const newQty = Number(existing.qty || 0) + 1;
      existing.qty = newQty;
      existing.total = newQty * existing.price;

      // remove current row
      updated.splice(currentInputIndex, 1);
    } else {
      updated[currentInputIndex].code = product.name;
      updated[currentInputIndex].name = product.name;
      updated[currentInputIndex].price = Number(product.selling_price || 0);
      updated[currentInputIndex].tax = Number(product.tax_percent || 0);
      updated[currentInputIndex].product_id =
        product.product_id || product.id;
      updated[currentInputIndex].total =
        Number(product.selling_price || 0) *
        Number(updated[currentInputIndex].qty || 0);
    }

    setRows(updated);
    setShowSuggestions(false);
    setCurrentInputIndex(null);

    // add a new row if we were on the last one
    if (currentInputIndex === updated.length - 1) {
      addNewRow();
      setTimeout(
        () => inputRefs.current[currentInputIndex + 1]?.focus(),
        100
      );
    } else {
      inputRefs.current[currentInputIndex + 1]?.focus();
    }

    // Reset preview when items change
    setPreview(null);
    setPreviewItems([]);
  };

  const handleQtyChange = (index: number, value: string) => {
    const updated = [...rows];
    if (value === "" || value === null) {
      updated[index].qty = "";
      updated[index].total = 0;
    } else {
      const qty = Number(value);
      updated[index].qty = qty;
      updated[index].total = qty * updated[index].price;
    }
    setRows(updated);
    setPreview(null);
    setPreviewItems([]);
  };

  const calculateSubtotal = () =>
    rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  const calculateIncludedTax = () =>
    rows.reduce(
      (s, r) =>
        s +
        (Number(r.price) * (Number(r.tax) / 100)) * Number(r.qty || 0),
      0
    );

  const calculateTotal = () => calculateSubtotal();

  // 👤 Handle customer selection
  const handleCustomerChange = (value: string) => {
    if (!value) {
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      setRedeemPoints("");
      setPreview(null);
      setPreviewItems([]);
      return;
    }
    const id = Number(value);
    setSelectedCustomerId(id);
    const cust = customers.find((c) => c.id === id) || null;
    setSelectedCustomer(cust || null);
    setRedeemPoints(""); // reset
    setPreview(null);
    setPreviewItems([]);
  };

  // 🔁 Build items payload for preview / invoice
  const buildItemsPayload = () => {
    const validItems = rows.filter((r) => r.name && r.product_id);
    return validItems.map((r) => ({
      product_id: r.product_id,
      qty: Number(r.qty || 0),
      price: Number(r.price || 0),
      tax: Number(r.tax || 0),
    }));
  };

  // 🎟️ Apply / Refresh Discounts (preview API)
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
          customer_id: selectedCustomerId,
          coupon_code: couponCode || null,
        }),
      });

      const json = await res.json();
      console.log("Preview response:", json);

      if (!res.ok) {
        throw new Error(json.error || "Failed to apply discounts");
      }

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

  // Compute final total for UI (after redeem preview)
  const uiSubtotal = preview?.subtotal ?? calculateSubtotal();
  const uiBaseTotal = preview?.total ?? calculateTotal();
  const uiItemDiscountTotal = preview?.item_discount_total ?? 0;
  const uiBillDiscountTotal = preview?.bill_discount_total ?? 0;
  const uiCouponDiscountTotal = preview?.coupon_discount_total ?? 0;
  const uiMembershipDiscountTotal = preview?.membership_discount_total ?? 0;

  const numericRedeem =
    redeemPoints === "" ? 0 : Math.max(0, Number(redeemPoints || 0));

  const maxRedeemAllowed =
    selectedCustomer?.loyalty_points != null
      ? Number(selectedCustomer.loyalty_points)
      : 0;

  const clampedRedeem =
    numericRedeem > maxRedeemAllowed ? maxRedeemAllowed : numericRedeem;

  const payableAfterRedeem = Math.max(uiBaseTotal - clampedRedeem, 0);

  // 🧾 Generate and Save Invoice (final)
  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);

    const validItems = rows.filter((r) => r.name && r.product_id);
    if (validItems.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one product",
        variant: "destructive",
      });
      setIsGeneratingInvoice(false);
      return;
    }

    // STOCK VALIDATION
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
    if (selectedCustomer && numericRedeem > maxRedeemAllowed) {
      toast({
        title: "Invalid redeem",
        description: `Customer has only ${maxRedeemAllowed} points`,
        variant: "destructive",
      });
      setIsGeneratingInvoice(false);
      return;
    }

    const token = localStorage.getItem("auth_token");
    console.log("Generating invoice with items:", validItems);

    try {
      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          customer_id: selectedCustomerId,
          redeem_points: clampedRedeem,
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

      console.log("Invoice response:", json);

      toast({
        title: "Invoice Created",
        description: `Invoice ${json.invoice.invoice_number} generated`,
      });

      // Use server items & totals for PDF
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
      setSelectedCustomerId(null);
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

  // 🧾 PDF Receipt Generator using SERVER items
  const generatePDFBill = (
    invoiceNumber: string,
    serverItems: any[],
    finalAmount: number,
    paymentMethod: string
  ) => {
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

    const paymentMethodDisplay: Record<string, string> = {
      cash: "CASH",
      card: "CARD",
      upi: "UPI",
      credit: "CREDIT",
    };

    let y = 10;

    // Top border stars
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("********************************", 40, y, { align: "center" });
    y += 5;

    // Store name
    doc.setFontSize(16);
    doc.setFont("courier", "bold");
    doc.text("SUPERMART", 40, y, { align: "center" });
    y += 5;

    // Bottom border stars
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("********************************", 40, y, { align: "center" });
    y += 6;

    // Invoice number and timestamp
    doc.setFontSize(9);
    doc.text(`Invoice No: ${invoiceNumber}`, 5, y);
    y += 4;
    doc.text(`Date: ${date} ${time}`, 5, y);
    y += 4;

    // Dashed line
    doc.text("----------------------------------------", 5, y);
    y += 6;

    // Items
    doc.setFont("courier", "normal");
    doc.setFontSize(10);

    serverItems.forEach((item) => {
      const itemLine = `${item.quantity}x ${item.name || "Item"}`;
      const priceLine = `AED ${Number(
        item.total ?? item.net_price ?? 0
      ).toFixed(2)}`;

      doc.text(itemLine, 5, y);
      doc.text(priceLine, 75, y, { align: "right" });
      y += 5;
    });

    // Dashed line before totals
    y += 2;
    doc.setFontSize(9);
    doc.text("----------------------------------------", 5, y);
    y += 6;

    // Total amount from server
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL:", 40, y, { align: "right" });
    doc.text(`AED ${Number(finalAmount).toFixed(2)}`, 75, y, {
      align: "right",
    });
    y += 6;

    // Payment method
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text("Payment Method:", 5, y);
    doc.text(
      paymentMethodDisplay[paymentMethod] || paymentMethod.toUpperCase(),
      75,
      y,
      { align: "right" }
    );
    y += 5;

    // Dashed line
    doc.setFontSize(9);
    doc.text("----------------------------------------", 5, y);
    y += 6;

    // Thank you message
    doc.setFontSize(10);
    doc.setFont("courier", "bold");
    doc.text("********* THANK YOU! *********", 40, y, {
      align: "center",
    });
    y += 8;

    // Simple barcode simulation
    doc.setLineWidth(0.5);
    const barcodeY = y;
    const barcodeWidth = 60;
    const barcodeStart = (80 - barcodeWidth) / 2;

    for (let i = 0; i < 40; i++) {
      const lineWidth = Math.random() > 0.5 ? 1 : 0.5;
      doc.setLineWidth(lineWidth);
      doc.line(
        barcodeStart + i * 1.5,
        barcodeY,
        barcodeStart + i * 1.5,
        barcodeY + 15
      );
    }

    doc.save(`receipt-${invoiceNumber}.pdf`);
  };

  // Helper to find preview discount for a row
  const getPreviewForRow = (row: any) => {
    if (!previewItems?.length || !row.product_id) return null;
    return previewItems.find(
      (it) =>
        Number(it.product_id) === Number(row.product_id) &&
        Number(it.qty) === Number(row.qty) &&
        Number(it.price) === Number(row.price)
    );
  };

  return (
    <div className="space-y-6">
      {/* Coupon Popup */}
      {showCouponPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Available Coupons</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCouponPopup(false)}
              >
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
                    onClick={() => handleSelectCoupon(coupon)}
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
              <Button
                variant="outline"
                onClick={() => setShowCouponPopup(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setCouponCode("");
                  setShowCouponPopup(false);
                }}
                className="flex-1"
              >
                Clear Coupon
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Points Popup */}
      {showRedeemPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Redeem Loyalty Points</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRedeemPopup(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center mb-6">
              <Coins className="h-16 w-16 text-yellow-500 mx-auto mb-3" />
              <p className="text-lg font-semibold">
                Available Points: <span className="text-blue-600">{selectedCustomer?.loyalty_points || 0}</span>
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
                  onClick={() => handleApplyRedeem(points)}
                  disabled={points > (selectedCustomer?.loyalty_points || 0)}
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
                max={selectedCustomer?.loyalty_points || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value <= (selectedCustomer?.loyalty_points || 0)) {
                    setRedeemPoints(value);
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (redeemPoints && redeemPoints > 0) {
                    handleApplyRedeem(Number(redeemPoints));
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
                setShowRedeemPopup(false);
              }}
              className="w-full mt-3"
            >
              Clear Points
            </Button>
          </div>
        </div>
      )}

      {/* Held Bills Popup */}
      {showHeldBills && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Held Bills</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHeldBills(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {heldBills.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {heldBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                      onClick={() => handleRestoreBill(bill)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{bill.name}</h4>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {new Date(bill.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Items: {bill.rows.filter((r: any) => r.name).length}</p>
                            <p>Customer: {bill.customer?.name || 'Walk-in'}</p>
                            <p>Total: AED {bill.total.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRestoreBill(bill)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => handleDeleteHeldBill(bill.id, e)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 flex-1 flex items-center justify-center">
                <div>
                  <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No held bills</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bills you hold will appear here
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setShowHeldBills(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Enter products, apply discounts, and print receipt
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHeldBills(true)}
            disabled={heldBills.length === 0}
          >
            <Clock className="h-4 w-4 mr-2" />
            Held Bills ({heldBills.length})
          </Button>
          
          <Button
            variant="outline"
            onClick={handleHoldBill}
            disabled={!rows.some(row => row.name && row.qty)}
          >
            <Save className="h-4 w-4 mr-2" />
            Hold Bill
          </Button>
        </div>
      </div>

      {/* Bill Name Input for Holding */}
      {rows.some(row => row.name && row.qty) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Label htmlFor="billName" className="text-blue-900 font-medium">Bill Name (for holding)</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="billName"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="e.g., Customer Phone Bill, Regular Order, etc."
              className="flex-1"
            />
            <Button
              onClick={handleHoldBill}
              disabled={!rows.some(row => row.name && row.qty)}
              className="whitespace-nowrap"
            >
              <Save className="h-4 w-4 mr-2" />
              Hold Bill
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Billing Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Billing Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code / Name</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const previewRow = getPreviewForRow(r);
                  const effectiveTotal =
                    previewRow?.net_price ?? r.total ?? 0;
                  const discountForRow = previewRow?.discount_amount || 0;

                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          ref={(el) => (inputRefs.current[i] = el!)}
                          value={r.code}
                          onChange={(e) =>
                            handleItemCodeChange(i, e.target.value)
                          }
                          placeholder="Enter name, barcode, or SKU"
                        />
                        {showSuggestions && currentInputIndex === i && (
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
                            {suggestions.map((p, idx) => (
                              <div
                                key={p.id}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                                onClick={() => handleSuggestionClick(p)}
                              >
                                <div className="font-medium text-sm">
                                  {p.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {p.sku && `SKU: ${p.sku} • `}
                                  {p.barcode && `Barcode: ${p.barcode} • `}
                                  Stock: {p.quantity} • AED{" "}
                                  {p.selling_price}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={r.qty}
                          onChange={(e) =>
                            handleQtyChange(i, e.target.value)
                          }
                          onBlur={() => {
                            if (rows[i].qty === "" || rows[i].qty === 0) {
                              const updated = [...rows];
                              updated[i].qty = 1;
                              updated[i].total = updated[i].price;
                              setRows(updated);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>AED {r.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-end">
                          <span className="font-medium">
                            AED {Number(effectiveTotal).toFixed(2)}
                          </span>
                          {discountForRow > 0 && (
                            <span className="text-xs text-green-600">
                              -AED {Number(discountForRow).toFixed(2)}{" "}
                              discount
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(i)}
                          disabled={rows.length === 1}
                        >
                          <MinusCircle className="h-5 w-5 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button variant="outline" onClick={addNewRow} className="mt-4">
              + Add Row
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT: Summary / Customer / Discounts */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer & Loyalty */}
            <div className="space-y-2">
              <Label>Customer (for loyalty & coupons)</Label>
            <div className="relative">
  <Input
    placeholder="Search customer by name or phone"
    value={customerSearch}
    onChange={(e) => {
      const val = e.target.value;
      setCustomerSearch(val);

      if (!val.trim()) {
        setCustomerSuggestions([]);
        setShowCustomerSuggestions(false);
        setSelectedCustomer(null);
        setSelectedCustomerId(null);
        return;
      }

      const search = val.toLowerCase();

      const filtered = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.phone && c.phone.toLowerCase().includes(search))
      );

      setCustomerSuggestions(filtered);
      setShowCustomerSuggestions(true);
    }}
    onFocus={() => {
      if (customerSuggestions.length > 0) setShowCustomerSuggestions(true);
    }}
  />

  {showCustomerSuggestions && customerSuggestions.length > 0 && (
    <div className="absolute bg-white border rounded-md shadow-lg w-full z-[999] max-h-60 overflow-y-auto mt-1">
      {customerSuggestions.map((c) => (
        <div
          key={c.id}
          className="p-2 cursor-pointer hover:bg-gray-100 border-b"
          onClick={() => {
            setSelectedCustomerId(c.id);
            setSelectedCustomer(c);
            setCustomerSearch(c.name);
            setShowCustomerSuggestions(false);

            // reset discounts
            setRedeemPoints("");
            setCouponCode("");
            setPreview(null);
            setPreviewItems([]);
          }}
        >
          <p className="font-semibold text-sm">{c.name}</p>
          <p className="text-xs text-gray-500">{c.phone || "No phone"}</p>
        </div>
      ))}
    </div>
  )}
</div>
{selectedCustomer && (
  <div className="mt-2 text-sm bg-blue-50 p-2 rounded border border-blue-200">
    <div className="flex justify-between">
      <span className="font-medium">Name:</span>
      <span>{selectedCustomer.name}</span>
    </div>
    <div className="flex justify-between">
      <span className="font-medium">Phone:</span>
      <span>{selectedCustomer.phone || "N/A"}</span>
    </div>
    <div className="flex justify-between">
      <span className="font-medium">Points:</span>
      <span className="text-blue-600 font-semibold">
        {selectedCustomer.loyalty_points || 0}
      </span>
    </div>
    <div className="flex justify-between">
      <span className="font-medium">Tier:</span>
      <span>{selectedCustomer.membership_tier || "Bronze"}</span>
    </div>

    <Button
      variant="outline"
      size="sm"
      onClick={handleOpenRedeemPopup}
      className="w-full mt-2"
    >
      Redeem Points
    </Button>
  </div>
)}


              {selectedCustomer && (
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Loyalty Points:</span>
                    <span className="font-semibold text-blue-600">
                      {selectedCustomer.loyalty_points ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tier:</span>
                    <span className="font-semibold">
                      {selectedCustomer.membership_tier || "Bronze"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenRedeemPopup}
                    className="w-full mt-2"
                  >
                    <Coins className="h-3 w-3 mr-1" />
                    Redeem Points
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Coupon Section */}
            <div>
              <Label>Coupon Code</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleOpenCouponPopup}
                  className="whitespace-nowrap"
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Browse
                </Button>
              </div>
              
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={handleApplyDiscounts}
                  disabled={isApplyingDiscounts}
                  className="flex-1"
                >
                  {isApplyingDiscounts ? "Applying..." : "Apply Discounts"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCouponCode("");
                    setPreview(null);
                    setPreviewItems([]);
                  }}
                  className="flex-1"
                >
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
                <span className="font-semibold">
                  AED {uiBaseTotal.toFixed(2)}
                </span>
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
                    onClick={() => setPaymentMethod(id)}
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
    </div>
  );
};

export default SupermarketBilling;