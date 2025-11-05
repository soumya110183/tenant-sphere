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
  const [products, setProducts] = useState([]); // ✅ products from API
  const [rows, setRows] = useState([
    { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const inputRefs = useRef([]);

  // 🔄 Fetch products from backend API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("auth_token"); // 🟢 must exist if protected
        const res = await fetch("http://localhost:5000/api/products", {
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

  // 🏷️ Handle code or name entry
  const handleItemCodeChange = (index, value) => {
    const updated = [...rows];
    updated[index].code = value;

    if (value.trim() === "") {
      updated[index] = { code: "", name: "", qty: 1, price: 0, tax: 0, total: 0 };
      setRows(updated);
      return;
    }

    // 🔍 Find matching product by ID, barcode, or name
    const found = products.find(
      (item) =>
        item.id.toString() === value.toString() ||
        (item.barcode &&
          item.barcode.toString().toLowerCase() === value.toLowerCase()) ||
         ( item.sku.toString().toLowerCase() === value.toLowerCase()) ||
        item.name.toLowerCase() === value.toLowerCase() 
    );

    if (found) {
      updated[index].name = found.name;
      updated[index].price = found.selling_price || 0; // match your DB field
      updated[index].tax = found.tax || 0;
      updated[index].total = found.selling_price * updated[index].qty;

      if (index === rows.length - 1) addNewRow(); // Auto-add next row
    }

    setRows(updated);
  };

  // 🔢 Handle quantity update
  const handleQtyChange = (index, qty) => {
    const updated = [...rows];
    updated[index].qty = qty;
    updated[index].total = updated[index].price * qty;
    setRows(updated);
  };

  // ⌨️ Enter key navigation
  const handleEnterKey = (e, index) => {
    if (e.key === "Enter") {
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
          <CardContent>
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
                    <TableCell>
                      <Input
                        ref={(el) => (inputRefs.current[index] = el)}
                        value={row.code}
                        onChange={(e) =>
                          handleItemCodeChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleEnterKey(e, index)}
                        placeholder="Enter code or name"
                      />
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
