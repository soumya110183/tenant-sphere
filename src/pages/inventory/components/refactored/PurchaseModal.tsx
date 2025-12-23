import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save } from "lucide-react";
import { inventoryService } from "@/services/api";

interface PurchaseModalProps {
  formData: any;
  setFormData: (data: any) => void;
  purchaseProducts: any[];
  setPurchaseProducts: (products: any[]) => void;
  productCatalog: any[];
  suppliers: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  formData,
  setFormData,
  purchaseProducts,
  setPurchaseProducts,
  productCatalog,
  suppliers,
  onSubmit,
  onClose,
  submitting,
}) => {
  console.log("PurchaseModal rendered", {
    formData,
    purchaseProducts,
    productCatalogLength: productCatalog?.length,
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q?: string) => {
    const term = ((q ?? query) || "").trim();
    if (!term) return setResults([]);
    try {
      setLoading(true);
      const resp = await inventoryService.getAll({
        search: term,
        limit: 50,
        page: 1,
      });
      const data = resp?.data ?? resp ?? [];
      // normalize possible shapes
      let raw: any[] = [];
      if (Array.isArray(data)) raw = data;
      else if (Array.isArray(resp?.data)) raw = resp.data;
      else if (Array.isArray(resp?.results)) raw = resp.results;
      else if (Array.isArray(resp?.items)) raw = resp.items;
      else if (Array.isArray(resp?.data?.data)) raw = resp.data.data;
      // sort by simple relevance score based on the search term
      const score = (p: any) => {
        const t = term.toLowerCase();
        const name = (p.name || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        let s = 0;
        if (name === t) s += 100;
        if (name.startsWith(t)) s += 50;
        if (name.includes(t)) s += 20;
        if (sku === t || barcode === t) s += 40;
        if (sku.includes(t) || barcode.includes(t)) s += 10;
        return s;
      };

      const sorted = (raw || []).slice().sort((a, b) => score(b) - score(a));
      setResults(sorted.slice(0, 50));
    } catch (err) {
      console.error("Inventory search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Supplier *</label>
            <select
              required
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.supplier_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supplier_id: parseInt(e.target.value) || undefined,
                })
              }
            >
              <option value="">Select Supplier</option>
              {(suppliers || []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                  {supplier.contact_person && ` - ${supplier.contact_person}`}
                </option>
              ))}
            </select>
          </div>
          {/* <div>
            <label className="block text-sm font-medium mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.invoice_number || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  invoice_number: e.target.value,
                })
              }
              placeholder="Leave empty for auto-generation"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will auto-generate if left 
            </p>
          </div> */}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <label className="font-medium text-sm">Purchase Items *</label>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                setPurchaseProducts([
                  ...purchaseProducts,
                  {
                    product_id: "",
                    quantity: 1,
                    cost_price: 0,
                    expiry_date: "",
                    reorder_level: 0,
                    max_stock: 0,
                  },
                ])
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>

          {(Array.isArray(purchaseProducts) ? purchaseProducts : []).map(
            (pp, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4 p-4 border rounded-lg bg-muted/20"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Product *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="search"
                        placeholder="Search product by name, SKU or barcode"
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            doSearch();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => doSearch()}
                      >
                        {loading ? "Searching..." : "Search"}
                      </Button>
                    </div>

                    <select
                      required
                      className="w-full mt-2 px-3 py-2 border rounded-md bg-background text-sm"
                      value={pp.product_id ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsedId = val === "" ? "" : parseInt(val);
                        const pool =
                          (results && results.length
                            ? results
                            : productCatalog) || [];
                        const selectedProduct = pool.find(
                          (p) => p.id === parsedId
                        );
                        const updated = [...purchaseProducts];
                        updated[idx].product_id =
                          parsedId === "" ? "" : parsedId;
                        if (selectedProduct) {
                          updated[idx].cost_price =
                            selectedProduct.cost_price ||
                            selectedProduct.unit_cost ||
                            0;
                        }
                        setPurchaseProducts(updated);
                      }}
                    >
                      <option value="">Select Product</option>
                      {(() => {
                        const pool = (
                          results && results.length
                            ? results
                            : productCatalog || []
                        ).slice();
                        // score using current query for fallback sorting
                        const q = (query || "").trim().toLowerCase();
                        const score = (p: any) => {
                          const t = q;
                          const name = (p.name || "").toLowerCase();
                          const sku = (p.sku || "").toLowerCase();
                          const barcode = (p.barcode || "").toLowerCase();
                          let s = 0;
                          if (name === t) s += 100;
                          if (name.startsWith(t)) s += 50;
                          if (name.includes(t)) s += 20;
                          if (sku === t || barcode === t) s += 40;
                          if (sku.includes(t) || barcode.includes(t)) s += 10;
                          return s;
                        };
                        pool.sort((a, b) => score(b) - score(a));
                        // ensure currently selected product is first
                        const selId = pp.product_id;
                        if (selId) {
                          const idxSel = pool.findIndex((p) => p.id === selId);
                          if (idxSel > 0) {
                            const [it] = pool.splice(idxSel, 1);
                            pool.unshift(it);
                          }
                        }
                        return pool.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.brand} - AED{" "}
                            {product.cost_price ?? product.unit_cost} per{" "}
                            {product.unit}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={pp.quantity ?? ""}
                      onChange={(e) => {
                        const updated = [...purchaseProducts];
                        updated[idx].quantity =
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value) || 1;
                        setPurchaseProducts(updated);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Cost Price (AED)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={pp.cost_price ?? 0}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={pp.expiry_date || ""}
                      onChange={(e) => {
                        const updated = [...purchaseProducts];
                        updated[idx].expiry_date = e.target.value;
                        setPurchaseProducts(updated);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={pp.reorder_level ?? ""}
                      onChange={(e) => {
                        const updated = [...purchaseProducts];
                        updated[idx].reorder_level =
                          e.target.value === ""
                            ? ""
                            : parseInt(e.target.value) || 0;
                        setPurchaseProducts(updated);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Max Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={pp.max_stock ?? ""}
                      onChange={(e) => {
                        const updated = [...purchaseProducts];
                        updated[idx].max_stock =
                          e.target.value === ""
                            ? ""
                            : parseInt(e.target.value) || 0;
                        setPurchaseProducts(updated);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = purchaseProducts.filter(
                        (_, i) => i !== idx
                      );
                      setPurchaseProducts(updated);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove Item
                  </Button>
                </div>
              </div>
            )
          )}

          {(Array.isArray(purchaseProducts) ? purchaseProducts : []).length >
            0 && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="font-bold text-lg">
                  AED{" "}
                  {(Array.isArray(purchaseProducts) ? purchaseProducts : [])
                    .reduce(
                      (sum, item) => sum + item.quantity * item.cost_price,
                      0
                    )
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button type="submit" className="flex-1" disabled={submitting}>
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Creating Purchase..." : "Create Purchase"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1 sm:flex-none"
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
