import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save } from "lucide-react";
import { inventoryService } from "@/services/api";

interface Props {
  formData: any;
  setFormData: (f: any) => void;
  purchaseProducts: any[];
  setPurchaseProducts: (p: any) => void;
  productCatalog: any[];
  suppliers: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting?: boolean;
}

export const PurchaseModal: React.FC<Props> = ({
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const doSearch = async (q?: string, idx?: number) => {
    const term = ((q ?? query) || "").trim();
    if (!term) return;
    setLoading(true);
    try {
      const resp = await inventoryService.getAll({
        search: term,
        limit: 50,
        page: 1,
      });
      const raw = resp && (resp as any).data ? (resp as any).data : resp;
      const arr = Array.isArray(raw) ? raw : raw?.data || raw?.results || [];
      setResults(arr.slice(0, 50));
      setShowResults(true);
      setSearchIndex(idx ?? null);
    } catch (err) {
      console.error(err);
      setResults([]);
      setShowResults(false);
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
              {(suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.invoice_number || ""}
              onChange={(e) =>
                setFormData({ ...formData, invoice_number: e.target.value })
              }
              placeholder="Leave empty for auto-generation"
            />
          </div>
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
                  { product_id: "", quantity: 1, cost_price: 0 },
                ])
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Add Item
            </Button>
          </div>

          {(purchaseProducts || []).map((pp, idx) => (
            <div key={idx} className="mb-4 p-3 border rounded">
              <div className="flex gap-2">
                <input
                  type="search"
                  className="flex-1 px-2 py-1 border rounded"
                  placeholder="Search name / sku / barcode"
                  value={searchIndex === idx ? query : ""}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchIndex(idx);
                    setShowResults(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      doSearch(undefined, idx);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => doSearch(undefined, idx)}
                >
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>

              {showResults && searchIndex === idx && results.length > 0 && (
                <ul className="mt-2 border rounded max-h-48 overflow-auto bg-white">
                  {results.map((r: any) => (
                    <li
                      key={r.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        const updated = [...purchaseProducts];
                        updated[idx].product_id = r.id;
                        updated[idx].cost_price =
                          r.cost_price ?? r.unit_cost ?? 0;
                        setPurchaseProducts(updated);
                        setShowResults(false);
                        setQuery("");
                        setResults([]);
                      }}
                    >
                      {r.name} — AED {r.cost_price ?? r.unit_cost}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 grid grid-cols-3 gap-2">
                <input
                  className="px-2 py-1 border rounded"
                  value={pp.quantity}
                  type="number"
                  min={1}
                  onChange={(e) => {
                    const copy = [...purchaseProducts];
                    copy[idx].quantity = parseFloat(e.target.value) || 1;
                    setPurchaseProducts(copy);
                  }}
                />
                <input
                  className="px-2 py-1 border rounded"
                  value={pp.cost_price}
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPurchaseProducts(
                      purchaseProducts.filter((_, i) => i !== idx)
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {(purchaseProducts || []).length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              Total: AED{" "}
              {(purchaseProducts || [])
                .reduce(
                  (s, it) => s + (it.quantity || 0) * (it.cost_price || 0),
                  0
                )
                .toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={submitting}>
          <Save className="h-4 w-4 mr-2" />{" "}
          {submitting ? "Creating Purchase..." : "Create Purchase"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
