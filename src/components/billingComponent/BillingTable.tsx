import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { MinusCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

type Product = {
  inventory_id: number;
  product_id: number;
  name: string;
  sku: string;
  barcode: string;
  selling_price: number;
  tax: number;
  quantity: number;
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

export const BillingTable = ({
  rows,
  products,
  onRowsChange,
  onAddRow,
  onDeleteRow,
}: {
  rows: BillRow[];
  products: Product[];
  onRowsChange: (rows: BillRow[]) => void;
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
}) => {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentInputIndex, setCurrentInputIndex] = useState<number | null>(
    null
  );

  const inputRefs = useRef<HTMLInputElement[]>([]);
  const suggestionRef = useRef<HTMLDivElement | null>(null);
  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const getMatchingProducts = (term: string) => {
    if (!term || term.length < 1) return [];
    const lower = term.toLowerCase();

    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.barcode?.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower)
      )
      .slice(0, 8);
  };

  const handleItemCodeChange = (index: number, value: string) => {
    const updated = [...rows];
    updated[index].code = value;

    const matches = getMatchingProducts(value);
    setSuggestions(matches);
    setCurrentInputIndex(index);
    const shouldShow = matches.length > 0;
    setShowSuggestions(shouldShow);

    // compute portal position when suggestions are shown
    if (shouldShow) {
      const el = inputRefs.current[index];
      if (el) {
        const rect = el.getBoundingClientRect();
        setPortalPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    } else {
      setPortalPos(null);
    }

    if (!value.trim()) {
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
      onRowsChange(updated);
      return;
    }

    const exactMatch = products.find(
      (p) =>
        p.name.toLowerCase() === value.toLowerCase() ||
        p.barcode === value ||
        p.sku === value ||
        p.product_id.toString() === value
    );

    if (exactMatch) {
      updated[index].code = exactMatch.name;
      updated[index].name = exactMatch.name;
      updated[index].price = Number(exactMatch.selling_price || 0);
      updated[index].tax = Number(exactMatch.tax || 0);
      updated[index].product_id = exactMatch.product_id;
      updated[index].total = (updated[index].qty || 0) * updated[index].price;

      setShowSuggestions(false);
      setPortalPos(null);
    } else {
      updated[index].name = "";
      updated[index].price = 0;
      updated[index].tax = 0;
      updated[index].total = 0;
      updated[index].product_id = null;
    }

    onRowsChange(updated);
  };

  const handleSuggestionClick = (product: Product) => {
    if (currentInputIndex === null) return;

    const updated = [...rows];

    updated[currentInputIndex].code = product.name;
    updated[currentInputIndex].name = product.name;
    updated[currentInputIndex].price = Number(product.selling_price || 0);
    updated[currentInputIndex].tax = Number(product.tax || 0);
    updated[currentInputIndex].product_id = product.product_id;

    updated[currentInputIndex].total =
      Number(product.selling_price || 0) *
      Number(updated[currentInputIndex].qty || 0);

    onRowsChange(updated);

    setShowSuggestions(false);
    setCurrentInputIndex(null);

    // Auto-focus next row
    if (currentInputIndex === updated.length - 1) {
      onAddRow();
      setTimeout(() => inputRefs.current[currentInputIndex + 1]?.focus(), 100);
    } else {
      inputRefs.current[currentInputIndex + 1]?.focus();
    }
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

    onRowsChange(updated);
  };

  // Keep portal position updated on scroll/resize while suggestions are visible
  useEffect(() => {
    if (!showSuggestions || currentInputIndex === null) return;

    const updatePos = () => {
      const el = inputRefs.current[currentInputIndex!];
      if (!el) return setPortalPos(null);
      const rect = el.getBoundingClientRect();
      setPortalPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);

    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [showSuggestions, currentInputIndex]);

  return (
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
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="relative">
                    <Input
                      ref={(el) => (inputRefs.current[i] = el!)}
                      value={r.code}
                      onChange={(e) => handleItemCodeChange(i, e.target.value)}
                      placeholder="Enter name, barcode, or SKU"
                    />

                    {showSuggestions && currentInputIndex === i && (
                      <>
                        {portalPos ? (
                          createPortal(
                            <div
                              ref={suggestionRef}
                              className="bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                              style={{
                                position: "absolute",
                                top: portalPos.top,
                                left: portalPos.left,
                                width: portalPos.width,
                                zIndex: 9999,
                              }}
                            >
                              {suggestions.map((p) => (
                                <div
                                  key={p.inventory_id}
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
                            </div>,
                            document.body
                          )
                        ) : (
                          <div
                            ref={suggestionRef}
                            className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto w-full mt-1"
                          >
                            {suggestions.map((p) => (
                              <div
                                key={p.inventory_id}
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
                      </>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Input
                    type="number"
                    value={r.qty}
                    onChange={(e) => handleQtyChange(i, e.target.value)}
                    onBlur={() => {
                      if (!rows[i].qty || rows[i].qty === 0) {
                        const updated = [...rows];
                        updated[i].qty = 1;
                        updated[i].total = updated[i].price;
                        onRowsChange(updated);
                      }
                    }}
                  />
                </TableCell>

                <TableCell>AED {r.price.toFixed(2)}</TableCell>
                <TableCell>AED {Number(r.total).toFixed(2)}</TableCell>

                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteRow(i)}
                    disabled={rows.length === 1}
                  >
                    <MinusCircle className="h-5 w-5 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="outline" onClick={onAddRow} className="mt-4">
          + Add Row
        </Button>
      </CardContent>
    </Card>
  );
};
