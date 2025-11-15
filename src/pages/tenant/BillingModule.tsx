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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const SupermarketBilling = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([
    { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInputIndex, setCurrentInputIndex] = useState(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const inputRefs = useRef([]);
  const suggestionRef = useRef(null);

  // 🔄 Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("https://billingbackend-1vei.onrender.com/api/inventory", {
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
      } catch (err) {
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

  // Debug: Log products when they change
  useEffect(() => {
    if (products.length > 0) {
      console.log("Products available for search:", products);
      console.log("Sample SKUs:", products.map(p => ({ name: p.name, sku: p.sku, barcode: p.barcode })));
    }
  }, [products]);

  const addNewRow = () => {
    setRows((prev) => [
      ...prev,
      { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 },
    ]);
  };

  const deleteRow = (index) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const getMatchingProducts = (term) => {
  if (!term || term.length < 1) return [];
  const lower = term.toLowerCase();

  console.log("Searching for:", term);

  const matches = products
    .filter(
      (p) =>
        p.name?.toLowerCase().includes(lower) ||
        p.barcode?.toLowerCase().includes(lower)
    )
    .slice(0, 8);

  console.log("Found matches:", matches);
  return matches;
};


  const handleItemCodeChange = (index, value) => {
    const updated = [...rows];
    updated[index].code = value;
    
    // Get matching products for suggestions
    const matches = getMatchingProducts(value);
    setSuggestions(matches);
    setCurrentInputIndex(index);
    setShowSuggestions(matches.length > 0);

    // ✅ Clear all fields if input is empty
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

    // ✅ FIXED: Auto-fill when exact match found (barcode, SKU, or name)
 const exactMatch = products.find(
  (p) =>
    p.name?.toLowerCase() === value.toLowerCase() ||
    p.barcode?.toLowerCase() === value.toLowerCase() ||
    p.sku?.toLowerCase() === value.toLowerCase() ||
    p.id?.toString() === value
);


    console.log("Exact match search for:", value, "Found:", exactMatch);

    if (exactMatch) {
      // ✅ Auto-fill the row with product details
      updated[index].code = exactMatch.name; // ✅ Change input to show product name
      updated[index].name = exactMatch.name;
      updated[index].price = exactMatch.selling_price || 0;
      updated[index].tax = exactMatch.tax_percent || 0;
      updated[index].product_id = exactMatch.product_id;
      updated[index].total = updated[index].qty * updated[index].price;
      setShowSuggestions(false);
      
      console.log("Auto-filled row with:", exactMatch.name);
    } else {
      // ✅ Keep the search term but clear other fields if no exact match
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
    }
    
    setRows(updated);
  };

  const handleSuggestionClick = (product) => {
    if (currentInputIndex === null) return;

    const updated = [...rows];
    const existingIndex = updated.findIndex(
      (r) => r.name.toLowerCase() === product.name.toLowerCase()
    );
    
    if (existingIndex !== -1 && existingIndex !== currentInputIndex) {
      // ✅ Item already exists in bill → just increase quantity
      updated[existingIndex].qty += 1;
      updated[existingIndex].total =
        updated[existingIndex].qty * updated[existingIndex].price;

      // Remove the duplicate row
      updated.splice(currentInputIndex, 1);
    } else {
      // 🆕 First-time selection
      updated[currentInputIndex].code = product.name; // ✅ Show product name in input
      updated[currentInputIndex].name = product.name;
      updated[currentInputIndex].price = product.selling_price || 0;
      updated[currentInputIndex].tax = product.tax_percent || 0;
      updated[currentInputIndex].product_id = product.product_id;
      updated[currentInputIndex].total =
        product.selling_price * updated[currentInputIndex].qty;
    }

    setRows(updated);
    setShowSuggestions(false);
    setCurrentInputIndex(null);

    // Auto-add new row only if we're at the last one
    if (currentInputIndex === updated.length - 1) {
      addNewRow();
      setTimeout(() => inputRefs.current[currentInputIndex + 1]?.focus(), 100);
    } else {
      inputRefs.current[currentInputIndex + 1]?.focus();
    }
  };

  const handleQtyChange = (index, value) => {
    const updated = [...rows];
    if (value === "" || value === null) {
      updated[index].qty = "";
      updated[index].total = 0;
    } else {
      const qty = Number(value);
      updated[index].qty = qty;
      updated[index].total = updated[index].price * qty;
    }
    setRows(updated);
  };

  const calculateSubtotal = () => rows.reduce((sum, r) => sum + r.total, 0);
  const calculateIncludedTax = () =>
    rows.reduce((s, r) => s + (r.price * (r.tax / 100)) * r.qty, 0);
  const calculateTotal = () => calculateSubtotal();

  // 🧾 Generate and Save Invoice
  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    
    const validItems = rows.filter((r) => r.name);
    if (validItems.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one product",
        variant: "destructive",
      });
      setIsGeneratingInvoice(false);
      return;
    }

    // ✅ STOCK VALIDATION
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

    const token = localStorage.getItem("auth_token");
    console.log("Generating invoice with items:", validItems);
    try {
      const res = await fetch("https://billingbackend-1vei.onrender.com/api/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          items: validItems.map((r) => ({
            product_id: r.product_id,
            qty: r.qty,
            price: r.price,
            tax: r.tax,
            total: r.total,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Invoice creation failed");

      toast({
        title: "Invoice Created",
        description: `Invoice ${json.invoice.invoice_number} generated`,
      });

      generatePDFBill(json.invoice.invoice_number);

      setRows([{ code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 }]);
    } catch (err) {
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

  // 🧾 PDF Receipt Generator
 const generatePDFBill = (invoiceNumber) => {
  const validItems = rows.filter((r) => r.name);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 297],
  });

  const date = new Date().toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
  const time = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  // Format payment method for display
  const paymentMethodDisplay = {
    'cash': 'CASH',
    'card': 'CARD',
    'upi': 'UPI',
    'credit': 'CREDIT'
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
  
  validItems.forEach((item) => {
    const itemLine = `${item.qty}x ${item.name}`;
    const price = `AED ${item.total.toFixed(2)}`;
    
    doc.text(itemLine, 5, y);
    doc.text(price, 75, y, { align: "right" });
    y += 5;
  });

  // Dashed line before totals
  y += 2;
  doc.setFontSize(9);
  doc.text("----------------------------------------", 5, y);
  y += 6;

  // Total amount
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL:", 40, y, { align: "right" });
  doc.text(`AED ${calculateTotal().toFixed(2)}`, 75, y, { align: "right" });
  y += 6;

  // Payment method
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.text("Payment Method:", 5, y);
  doc.text(paymentMethodDisplay[paymentMethod] || paymentMethod.toUpperCase(), 75, y, { align: "right" });
  y += 5;

  // Dashed line
  doc.setFontSize(9);
  doc.text("----------------------------------------", 5, y);
  y += 6;
  
  // Thank you message
  doc.setFontSize(10);
  doc.setFont("courier", "bold");
  doc.text("********* THANK YOU! *********", 40, y, { align: "center" });
  y += 8;

  // Barcode representation (using lines)
  doc.setLineWidth(0.5);
  const barcodeY = y;
  const barcodeWidth = 60;
  const barcodeStart = (80 - barcodeWidth) / 2;
  
  // Simple barcode simulation with vertical lines
  for (let i = 0; i < 40; i++) {
    const lineWidth = Math.random() > 0.5 ? 1 : 0.5;
    doc.setLineWidth(lineWidth);
    doc.line(barcodeStart + i * 1.5, barcodeY, barcodeStart + i * 1.5, barcodeY + 15);
  }

  doc.save(`receipt-${invoiceNumber}.pdf`);
};
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">Enter products and print receipt</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Billing Table</CardTitle></CardHeader>
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
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        ref={(el) => (inputRefs.current[i] = el)}
                        value={r.code}
                        onChange={(e) => handleItemCodeChange(i, e.target.value)}
                        placeholder="Enter name, barcode, or SKU"
                      />
                      {showSuggestions && currentInputIndex === i && (
                        <div
                          ref={suggestionRef}
                          className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto min-w-[300px]"
                          style={{
                            top: `${inputRefs.current[i]?.getBoundingClientRect().bottom + window.scrollY + 4}px`,
                            left: `${inputRefs.current[i]?.getBoundingClientRect().left + window.scrollX}px`,
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
                                Stock: {p.quantity} • AED {p.selling_price}
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
                        onChange={(e) => handleQtyChange(i, e.target.value)}
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
                    <TableCell>AED {r.total.toFixed(2)}</TableCell>
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
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" onClick={addNewRow} className="mt-4">
              + Add Row
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bill Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>AED {calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>AED {calculateIncludedTax().toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>AED {calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <Separator />

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