import React from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface InventoryModalProps {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  productCatalog: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitting: boolean;
  editingItem: any;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  formData,
  setFormData,
  productCatalog,
  onSubmit,
  onClose,
  submitting,
  editingItem,
}) => {
  const selectedProduct = productCatalog.find(
    (p) => String(p.id) === String(formData.productId)
  );

  return (
    <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select Product *
          </label>
          <select
            required
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            value={formData.productId || ""}
            onChange={(e) => {
              const prod = productCatalog.find(
                (p) => p.id === parseInt(e.target.value)
              );
              if (prod) {
                setFormData({
                  ...formData,
                  productId: prod.id,
                  name: prod.name,
                  brand: prod.brand,
                  category: prod.category,
                  unit: prod.unit,
                  costPrice: prod.cost_price,
                  sellingPrice: prod.selling_price,
                  tax: prod.tax_percent || 0,
                });
              } else {
                setFormData({
                  ...formData,
                  productId: "",
                  name: "",
                  brand: "",
                  category: "",
                  unit: "",
                  costPrice: 0,
                  sellingPrice: 0,
                  tax: 0,
                });
              }
            }}
            disabled={!!editingItem}
          >
            <option value="">Select Product</option>
            {productCatalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {p.brand} - AED {p.selling_price} / {p.unit}
              </option>
            ))}
          </select>
        </div>

        {formData.productId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">
                {selectedProduct?.name || formData.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Brand</p>
              <p className="text-sm font-medium">
                {selectedProduct?.brand || formData.brand}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="text-sm font-medium">
                {selectedProduct?.category || formData.category}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unit</p>
              <p className="text-sm font-medium">
                {selectedProduct?.unit || formData.unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost Price</p>
              <p className="text-sm font-medium">
                AED {selectedProduct?.cost_price ?? formData.costPrice ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Selling Price</p>
              <p className="text-sm font-medium">
                AED{" "}
                {selectedProduct?.selling_price ?? formData.sellingPrice ?? 0}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quantity *</label>
            <input
              type="number"
              required
              min="0"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.quantity ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Reorder Level
            </label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.reorderLevel ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reorderLevel: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Stock</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.maxStock ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxStock: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.expiryDate || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expiryDate: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button type="submit" className="flex-1" disabled={submitting}>
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Saving..." : editingItem ? "Update" : "Save"}
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
