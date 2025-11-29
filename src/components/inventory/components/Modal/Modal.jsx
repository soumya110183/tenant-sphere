import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X, Save } from "lucide-react";
import { PurchaseModal } from "@/components/inventory/components/Modal/PurchaseModal";

// This will contain ALL your original modal form logic
// I'm just showing the structure - you would copy your entire modal JSX here

const Modal = ({
  showModal,
  modalType,
  editingItem,
  formData,
  setFormData,
  products,
  sales,
  saleProducts,
  setSaleProducts,
  purchaseProducts,
  setPurchaseProducts,
  returnItems,
  setReturnItems,
  onClose,
  onSubmit,
  productCatalog,
  suppliers,
  submitting,
}) => {
  if (!showModal) return null;

  // Refund calculation logic for sales returns
  let selectedSale = null;
  let refundComputation = [];
  let totalRefund = 0;

  if (modalType === "salesReturn" && formData.originalSaleId) {
    selectedSale = sales.find(
      (s) => String(s.id) === String(formData.originalSaleId)
    );
    if (selectedSale && selectedSale.invoice_items) {
      refundComputation = returnItems
        .map((ri) => {
          if (!ri.productId || !ri.qty) return null;
          const invoiceItem = selectedSale.invoice_items.find(
            (ii) =>
              String(ii.product_id) === String(ri.productId) ||
              String(ii.products?.id) === String(ri.productId)
          );
          if (!invoiceItem) return null;

          const netPriceRaw =
            invoiceItem.net_price ??
            invoiceItem.price ??
            invoiceItem.selling_price ??
            (invoiceItem.total && invoiceItem.quantity
              ? invoiceItem.total / invoiceItem.quantity
              : 0);
          const netPrice = Number(netPriceRaw) || 0;
          const lineTotal = invoiceItem.total
            ? Number(invoiceItem.total)
            : netPrice * ri.qty;

          return {
            name: invoiceItem.products?.name || `Product #${ri.productId}`,
            qty: ri.qty,
            netPrice,
            lineTotal,
          };
        })
        .filter(Boolean);

      totalRefund = refundComputation.reduce(
        (sum, item) => sum + item.lineTotal,
        0
      );
    }
  }

  const getModalTitle = () => {
    const titles = {
      inventory: editingItem ? "Update Inventory" : "Add Inventory",
      sale: "New Sale Transaction",
      purchase: "New Purchase Order",
      salesReturn: "New Sales Return",
      purchaseReturn: "New Purchase Return",
      adjustment: "Stock Adjustment",
    };
    return titles[modalType];
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-background z-10">
          <h2 className="text-lg sm:text-xl font-bold">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {modalType === "purchase" ? (
          <PurchaseModal
            formData={formData}
            setFormData={setFormData}
            purchaseProducts={purchaseProducts}
            setPurchaseProducts={setPurchaseProducts}
            productCatalog={productCatalog}
            suppliers={suppliers}
            onSubmit={onSubmit}
            onClose={onClose}
            submitting={submitting}
          />
        ) : (
          <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
            {/* COPY YOUR ENTIRE ORIGINAL MODAL FORM JSX HERE */}
            {/* This includes all the form fields for inventory, sale, purchase, returns, etc. */}

            {/* Example for inventory - copy ALL your original form sections */}
            {modalType === "inventory" && (
              <div className="space-y-4">
                {/* Your original inventory form JSX */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Select Product *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.productId || ""}
                    onChange={(e) => {
                      const selectedProduct = productCatalog.find(
                        (p) => p.id === parseInt(e.target.value)
                      );
                      if (selectedProduct) {
                        setFormData({
                          ...formData,
                          productId: selectedProduct.id,
                          name: selectedProduct.name,
                          brand: selectedProduct.brand,
                          category: selectedProduct.category,
                          unit: selectedProduct.unit,
                          costPrice: selectedProduct.cost_price,
                          sellingPrice: selectedProduct.selling_price,
                          tax: selectedProduct.tax_percent || 0,
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
                    disabled={editingItem}
                  >
                    <option value="">Choose a product...</option>
                    {productCatalog.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.brand} - AED{" "}
                        {product.sellingPrice}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select from existing product catalog
                  </p>
                </div>
                {/* ... continue with all your original form fields */}
              </div>
            )}

            {modalType === "salesReturn" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Original Sale ID *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.originalSaleId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          originalSaleId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        {sales.length === 0
                          ? "No sales available"
                          : "Select Sale/Invoice"}
                      </option>
                      {sales.map((s) => (
                        <option key={s.id} value={s.id}>
                          Invoice #{s.invoice_number || s.id} -{" "}
                          {s.created_at
                            ? new Date(s.created_at).toLocaleDateString()
                            : "N/A"}{" "}
                          - AED {(s.total_amount || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Refund Type *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.refundType || "Cash"}
                      onChange={(e) =>
                        setFormData({ ...formData, refundType: e.target.value })
                      }
                    >
                      <option>Cash</option>
                      <option>Replacement</option>
                      <option>Credit</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="font-medium text-sm">
                      Return Items *
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                          "Adding sales return item, current:",
                          returnItems
                        );
                        setReturnItems([
                          ...returnItems,
                          { productId: "", qty: 1, reason: "" },
                        ]);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  {returnItems.map((ri, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2"
                    >
                      <select
                        required
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.productId}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].productId = e.target.value;
                          setReturnItems(updated);
                        }}
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.product_id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Qty"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.qty || 1}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].qty = parseInt(e.target.value) || 1;
                          setReturnItems(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Reason"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.reason || ""}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].reason = e.target.value;
                          setReturnItems(updated);
                        }}
                      />
                      {returnItems.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const updated = returnItems.filter(
                              (_, i) => i !== idx
                            );
                            setReturnItems(updated);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {refundComputation.length > 0 && (
                  <div className="bg-muted/50 p-4 rounded-md">
                    <h4 className="font-medium text-sm mb-2">
                      Refund Calculation
                    </h4>
                    {refundComputation.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-muted-foreground mb-1"
                      >
                        {item.name} × {item.qty} @ AED{" "}
                        {item.netPrice.toFixed(2)} = AED{" "}
                        {item.lineTotal.toFixed(2)}
                      </div>
                    ))}
                    <div className="font-semibold text-sm mt-2 pt-2 border-t">
                      Total Refund: AED {totalRefund.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {modalType === "purchaseReturn" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Supplier ID *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.supplierId || 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplierId: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.supplierName || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplierName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Refund Method
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.refundMethod || "Cash"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          refundMethod: e.target.value,
                        })
                      }
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit Note</option>
                      <option value="Account">Account Adjustment</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="font-medium text-sm">
                      Return Items *
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                          "Adding purchase return item, current:",
                          returnItems
                        );
                        setReturnItems([
                          ...returnItems,
                          { productId: "", qty: 1, reason: "" },
                        ]);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  {returnItems.map((ri, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2"
                    >
                      <select
                        required
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.productId}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].productId = e.target.value;
                          setReturnItems(updated);
                        }}
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.product_id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Qty"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.qty || 1}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].qty = parseInt(e.target.value) || 1;
                          setReturnItems(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Reason"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.reason || ""}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].reason = e.target.value;
                          setReturnItems(updated);
                        }}
                      />
                      {returnItems.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const updated = returnItems.filter(
                              (_, i) => i !== idx
                            );
                            setReturnItems(updated);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button type="submit" className="flex-1" disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? "Submitting..." : editingItem ? "Update" : "Save"}
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
        )}
      </div>
    </div>
  );
};

export default Modal;
