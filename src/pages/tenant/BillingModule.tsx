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
  const inputRefs = useRef([]);
  const suggestionRef = useRef(null);

  // 🔄 Fetch products from backend API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("https://billingbackend-1vei.onrender.com/api/products", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const json = await res.json();

        if (res.ok) {
          setProducts(json.data || []);
        } else {
          toast({
            title: "Failed to load products",
            description: json.error || "Please check your token or server",
            variant: "destructive",
          });
        }
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

  // ➕ Add new empty row
  const addNewRow = () => {
    setRows((prev) => [
      ...prev,
      { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 },
    ]);
  };

  // ❌ Delete a specific row
  const deleteRow = (index) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  // 🔍 Get matching products for autocomplete
  const getMatchingProducts = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.id.toString().includes(term) ||
        (product.barcode && product.barcode.toString().toLowerCase().includes(term)) ||
        (product.sku && product.sku.toString().toLowerCase().includes(term))
    ).slice(0, 8); // Limit to 8 suggestions
  };

  // 🏷️ Handle code or name entry
  const handleItemCodeChange = (index, value) => {
    const updated = [...rows];
    updated[index].code = value;

    if (value.trim() === "") {
      updated[index] = { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 };
      setRows(updated);
      setShowSuggestions(false);
      return;
    }

    // Show suggestions
    const matches = getMatchingProducts(value);
    setSuggestions(matches);
    setActiveSuggestionIndex(0);
    setCurrentInputIndex(index);
    setShowSuggestions(matches.length > 0);

    // If user types exact match and presses enter or tab, auto-select
    const exactMatch = products.find(
      (item) =>
        item.id.toString() === value.toString() ||
        (item.barcode && item.barcode.toString().toLowerCase() === value.toLowerCase()) ||
        (item.sku && item.sku.toString().toLowerCase() === value.toLowerCase()) ||
        item.name.toLowerCase() === value.toLowerCase()
    );

    if (exactMatch) {
      updated[index].name = exactMatch.name;
      updated[index].price = exactMatch.selling_price || 0;
      updated[index].tax = exactMatch.tax || 0;
      updated[index].total = exactMatch.selling_price * updated[index].qty;
      setRows(updated);
      setShowSuggestions(false);
    } else {
      // Clear other fields if no exact match
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      setRows(updated);
    }
  };

  // ✅ Handle suggestion selection
  const handleSuggestionClick = (product) => {
    if (currentInputIndex === null) return;

    const updated = [...rows];
    updated[currentInputIndex].code = product.name; // Set code to product name
    updated[currentInputIndex].name = product.name;
    updated[currentInputIndex].price = product.selling_price || 0;
    updated[currentInputIndex].tax = product.tax || 0;
    updated[currentInputIndex].total = product.selling_price * updated[currentInputIndex].qty;

    setRows(updated);
    setShowSuggestions(false);
    setCurrentInputIndex(null);

    // Auto-add next row if this is the last row
    if (currentInputIndex === rows.length - 1) {
      addNewRow();
      setTimeout(() => inputRefs.current[currentInputIndex + 1]?.focus(), 100);
    } else {
      inputRefs.current[currentInputIndex + 1]?.focus();
    }
  };

  // ⌨️ Handle keyboard navigation in suggestions
  const handleKeyDown = (e, index) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSuggestionClick(suggestions[activeSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = rows[index];
      if (current.name) {
        if (index === rows.length - 1) {
          addNewRow();
          setTimeout(() => inputRefs.current[index + 1]?.focus(), 100);
        } else {
          inputRefs.current[index + 1]?.focus();
        }
      }
    }
  };

  // 🔢 Handle quantity update
  const handleQtyChange = (index, qty) => {
    const updated = [...rows];
    updated[index].qty = qty;
    updated[index].total = updated[index].price * qty;
    setRows(updated);
  };

  // 👇 Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 🧮 Calculations
  const calculateSubtotal = () => rows.reduce((s, r) => s + r.total, 0);
  const calculateIncludedTax = () =>
    rows.reduce((s, r) => {
      if (r.tax && r.price) {
        const taxAmount = (r.price * r.tax) / (100 + r.tax);
        return s + taxAmount * r.qty;
      }
      return s;
    }, 0);
  const calculateTotal = () => calculateSubtotal();

  // 🧾 Generate Bill
  const generateBill = () => {
    const validItems = rows.filter((r) => r.name);

    if (validItems.length === 0) {
      toast({
        title: "No items entered",
        description: "Please enter at least one valid product",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Bill Generated",
      description: `Invoice #INV-${Date.now().toString().slice(-6)} created successfully`,
    });

    // reset rows
    setRows([{ code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 }]);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  // Auto-focus new rows
  useEffect(() => {
    const lastIndex = rows.length - 1;
    inputRefs.current[lastIndex]?.focus();
  }, [rows.length]);

  // 🧾 UI Layout
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Enter product code or name to auto-fill details
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Billing Table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code / Name</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>MRP (Incl. Tax)</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="relative">
                      <Input
                        ref={(el) => (inputRefs.current[index] = el)}
                        value={row.code}
                        onChange={(e) =>
                          handleItemCodeChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onFocus={() => {
                          const matches = getMatchingProducts(row.code);
                          setSuggestions(matches);
                          setCurrentInputIndex(index);
                          setShowSuggestions(matches.length > 0);
                        }}
                        placeholder="Enter code or name"
                      />
                      
                      {/* Autocomplete Suggestions */}
                      {showSuggestions && currentInputIndex === index && (
                        <div 
                          ref={suggestionRef}
                          className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto min-w-[300px]"
                          style={{
                            top: `${inputRefs.current[index]?.getBoundingClientRect().bottom + window.scrollY + 4}px`,
                            left: `${inputRefs.current[index]?.getBoundingClientRect().left + window.scrollX}px`,
                            width: `${inputRefs.current[index]?.getBoundingClientRect().width}px`
                          }}
                        >
                          {suggestions.map((product, idx) => (
                            <div
                              key={product.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                idx === activeSuggestionIndex ? "bg-blue-50 border-blue-200" : ""
                              } border-b border-gray-100 last:border-b-0`}
                              onClick={() => handleSuggestionClick(product)}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                            >
                              <div className="font-medium text-sm">{product.name}</div>
                              <div className="text-xs text-gray-500 flex justify-between">
                                <span>Price: AED {product.selling_price}</span>
                                {product.barcode && <span>Barcode: {product.barcode}</span>}
                                {product.sku && <span>SKU: {product.sku}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.name || "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) =>
                          handleQtyChange(index, Number(e.target.value))
                        }
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>AED {row.price.toFixed(2)}</TableCell>
                    <TableCell>{row.tax}%</TableCell>
                    <TableCell>AED {row.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(index)}
                        disabled={rows.length === 1}
                      >
                        <MinusCircle className="h-5 w-5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            <Button variant="outline" onClick={addNewRow} className="mt-4">
              + Add Row
            </Button>
          </CardContent>
        </Card>

        {/* Bill Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal (MRP)</span>
                <span>AED {calculateSubtotal().toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Included GST</span>
                <span>AED {calculateIncludedTax().toFixed(2)}</span>
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total Payable</span>
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

            <Button onClick={generateBill} className="w-full mt-4" size="lg">
              <Printer className="mr-2 h-4 w-4" />
              Print Bill
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupermarketBilling;