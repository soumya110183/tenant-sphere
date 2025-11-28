import React, { useEffect, useState } from "react";

// Type definitions for sales returns to improve clarity & future refactors
interface RawSalesReturn {
  id: number;
  sales_id: number;
  product_id: number;
  quantity: number;
  reason?: string;
  refund_type?: string;
  refund_amount?: number;
  total_refund?: number;
  created_at?: string;
  return_date?: string;
  date?: string;
  product_name?: string;
  name?: string;
  return_reason?: string;
  type?: string;
  amount?: number;
}

interface UISalesReturn {
  id: number;
  originalSaleId: number | undefined;
  date: string;
  productName: string;
  productId: number;
  quantity: number;
  reason: string;
  refundType: string;
  totalRefund: number;
  items: { name: string; qty: number; reason: string }[];
}

// Type definitions for purchase returns
interface RawPurchaseReturn {
  id: number;
  Suppliers_id?: number;
  refund_method?: string;
  select_product?: string;
  quantity: number;
  reason?: string;
  product_id: number;
  created_at?: string;
  products?: { name?: string; sku?: string; category?: string };
}

interface UIPurchaseReturn {
  id: number;
  supplierId: number | null;
  supplierName: string;
  date: string;
  productName: string;
  productId: number;
  quantity: number;
  reason: string;
  refundMethod: string;
  amountAdjusted: number;
  items: { name: string; qty: number; reason: string; productId: number }[];
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  Plus,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  inventoryService,
  invoiceService,
  productService,
  purchaseService,
  salesReturnService,
  purchaseReturnService,
} from "@/services/api";
import { StatsCard } from "../components/InventoryComponent/StatsCard.jsx";
import {
  LowStockAlert,
  SearchFilter,
  TabNavigation,
} from "../components/InventoryComponent/SmallComponents.jsx";
// import{Modal} from '../components/InventoryComponent/Modal.jsx';
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { PurchaseModal } from "../components/inventory/components/Modal/PurchaseModal";
import { PurchasesView } from "../components/inventory/components/PurchasesView";

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
  submitting, // ADD THIS
}) => {
  if (!showModal) return null;

  // Helper: compute refund lines & total for sales return modal
  let selectedSale: any = null;
  let refundComputation: {
    productId: any;
    qty: number;
    netPrice: number;
    lineTotal: number;
    name: string;
  }[] = [];
  let totalRefund = 0;
  if (modalType === "salesReturn" && formData.originalSaleId) {
    selectedSale = sales.find(
      (s: any) => String(s.id) === String(formData.originalSaleId)
    );
    refundComputation = (returnItems || [])
      .filter((r) => r.productId && r.qty)
      .map((ri: any) => {
        const qty = parseInt(ri.qty || 0);
        const matchItem = selectedSale?.invoice_items?.find(
          (ii: any) =>
            String(ii.product_id) === String(ri.productId) ||
            String(ii.products?.id) === String(ri.productId)
        );
        const netPriceRaw =
          matchItem?.net_price ??
          matchItem?.price ??
          matchItem?.selling_price ??
          (matchItem?.total && matchItem?.quantity
            ? matchItem.total / matchItem.quantity
            : 0);
        const netPrice = Number(netPriceRaw) || 0;
        // If backend total already represents net (after discount), prefer that for full line.
        const lineTotal = matchItem?.total
          ? Number(matchItem.total) // assumes already net (after discount)
          : netPrice * qty;
        totalRefund += lineTotal;
        return {
          productId: ri.productId,
          qty,
          netPrice,
          lineTotal,
          name: matchItem?.products?.name || `Product #${ri.productId}`,
        };
      });
  }
  console.log("modal:", productCatalog);
  // const [productCatalog,setProductCatalog] = useState([]);

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

  // Sample product catalog - in real scenario, this would come from your product database

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
            onSubmit={onSubmit}
            onClose={onClose}
            submitting={submitting}
          />
        ) : (
          <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
            {modalType === "inventory" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Select Product *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.productId || ""}
                    // In your modal component, update the product selection handler:
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
                        // Clear product details if no product selected
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

                {formData.productId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                    <div className="sm:col-span-2">
                      <h4 className="font-medium text-sm mb-2">
                        Product Details
                      </h4>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        value={formData.name || ""}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        value={formData.brand || ""}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        value={formData.category || ""}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        value={formData.unit || ""}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Cost Price (AED)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        value={formData.costPrice || 0}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Selling Price (AED)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        value={formData.sellingPrice || 0}
                        readOnly
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.quantity || 0}
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
                      Reorder Level *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.reorderLevel || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reorderLevel: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Max Stock *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.maxStock || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxStock: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  {/* <div>
                  <label className="block text-sm font-medium mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div> */}
                  {/* <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  />
                </div> */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.expiryDate || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                    />
                  </div>
                  {/* <div>
                  <label className="block text-sm font-medium mb-1">Supplier ID *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.supplierId || 1}
                    onChange={(e) => setFormData({...formData, supplierId: parseInt(e.target.value) || 1})}
                  />
                </div> */}
                </div>
              </div>
            )}

            {modalType === "sale" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Customer ID
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.customerId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, customerId: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.customerName || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Payment Type *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.paymentType || "Cash"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentType: e.target.value,
                        })
                      }
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                      <option>Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Staff ID *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.staffId || "S001"}
                      onChange={(e) =>
                        setFormData({ ...formData, staffId: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="font-medium text-sm">Products *</label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setSaleProducts([
                          ...saleProducts,
                          { productId: "", qty: 1 },
                        ])
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Product
                    </Button>
                  </div>
                  {saleProducts.map((sp, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"
                    >
                      <select
                        required
                        className="sm:col-span-2 px-3 py-2 border rounded-md bg-background text-sm"
                        value={sp.productId}
                        onChange={(e) => {
                          const updated = [...saleProducts];
                          updated[idx].productId = e.target.value;
                          setSaleProducts(updated);
                        }}
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - AED {p.sellingPrice} ({p.quantity}{" "}
                            {p.unit} available)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Qty"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={sp.qty}
                        onChange={(e) => {
                          const updated = [...saleProducts];
                          updated[idx].qty = parseInt(e.target.value) || 1;
                          setSaleProducts(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
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
                      onClick={() =>
                        setReturnItems([
                          ...returnItems,
                          { productId: "", qty: 1, reason: "" },
                        ])
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  {returnItems.map((ri, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"
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
                        {products.map((p) => (
                          <option key={p.id} value={p.product_id}>
                            {" "}
                            {/* Change p.id to p.product_id */}
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
                        value={ri.qty}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].qty = parseInt(e.target.value) || 1;
                          setReturnItems(updated);
                        }}
                      />
                      <input
                        type="text"
                        required
                        placeholder="Reason"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.reason}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].reason = e.target.value;
                          setReturnItems(updated);
                        }}
                      />
                    </div>
                  ))}

                  {formData.originalSaleId && returnItems.length > 0 && (
                    <div className="mt-4 p-3 bg-primary/5 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Refund:</span>
                        <span className="font-bold text-lg">
                          AED {totalRefund.toFixed(2)}
                        </span>
                      </div>
                      {refundComputation.length > 0 && (
                        <div className="text-xs space-y-1">
                          {refundComputation.map((line, i) => (
                            <div key={i} className="flex justify-between">
                              <span>
                                {line.name} × {line.qty} @ Net AED{" "}
                                {line.netPrice.toFixed(2)}
                              </span>
                              <span className="font-medium">
                                AED {line.lineTotal.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                      onClick={() =>
                        setReturnItems([
                          ...returnItems,
                          { productId: "", qty: 1, reason: "" },
                        ])
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  {returnItems.map((ri, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"
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
                        {products.map((p) => (
                          <option key={p.id} value={p.product_id}>
                            {" "}
                            {/* Change p.id to p.product_id */}
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
                        value={ri.qty}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].qty = parseInt(e.target.value) || 1;
                          setReturnItems(updated);
                        }}
                      />
                      <input
                        type="text"
                        required
                        placeholder="Reason"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={ri.reason}
                        onChange={(e) => {
                          const updated = [...returnItems];
                          updated[idx].reason = e.target.value;
                          setReturnItems(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalType === "adjustment" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Product *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.productId || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, productId: e.target.value })
                    }
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Current: {p.quantity} {p.unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.type || "Add"}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                  >
                    <option value="Add">Add</option>
                    <option value="Remove">Remove</option>
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
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.quantity || 0}
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
                    Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Damage, Expiry, Loss"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.reason || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                  />
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
// Tab Navigation Component

// Stock Table Row Component
const StockTableRow = ({
  item,
  getStockStatus,
  getStockColor,
  getStockPercentage,
  onEdit,
  onDelete,
}) => {
  const status = getStockStatus(item.quantity, item.reorderLevel);
  const percentage = getStockPercentage(item.quantity, item.maxStock);
  const margin = item.selling_price - item.cost_price;
  const marginPercent = ((margin / item.cost_price) * 100).toFixed(1);
  console.log(item);

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-2 sm:px-4 font-medium text-sm">{item.name}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">{item.category}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">{item.brand}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">
        {item.quantity} {item.unit}
      </td>
      <td className="py-3 px-2 sm:px-4">
        <div className="space-y-1">
          <Progress value={percentage} className="h-2 w-20 sm:w-24" />
          <p className="text-xs text-muted-foreground">
            {item.quantity}/{item.maxStock}
          </p>
        </div>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">AED {item.cost_price}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">AED {item.selling_price}</td>
      <td className="py-3 px-2 sm:px-4">
        <span className="text-green-600 font-medium text-xs sm:text-sm">
          AED {margin} ({marginPercent}%)
        </span>
      </td>
      <td className="py-3 px-2 sm:px-4">
        <Badge className={getStockColor(status)}>{status}</Badge>
      </td>
      <td className="py-3 px-2 sm:px-4 text-xs">{item.expiryDate || "N/A"}</td>
      <td className="py-3 px-2 sm:px-4">
        <div className="flex gap-1 sm:gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

// Stock View Component
const StockView = ({
  products,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  categories,
  openModal,
  handleDelete,
  getStockStatus,
  getStockColor,
  getStockPercentage,
  isLoading,
}) => (
  <div className="space-y-4">
    <SearchFilter
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      filterCategory={filterCategory}
      setFilterCategory={setFilterCategory}
      categories={categories}
      onAddProduct={() => openModal("inventory")}
    />

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Package className="h-5 w-5 text-primary" />
          Stock Inventory ({products.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Product Name
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Category
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Brand
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Quantity
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Stock Level
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Cost
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Selling
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Margin
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Expiry
                </th>
                <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? ( // Show spinner when loading
                <tr>
                  <td colSpan="11" className="text-center py-12">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? ( // Show empty message when no products
                <tr>
                  <td
                    colSpan="11"
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No inventory items found. Add your first inventory item to
                    get started!
                  </td>
                </tr>
              ) : (
                // Show products when loaded
                products.map((item) => (
                  <StockTableRow
                    key={item.id}
                    item={item}
                    getStockStatus={getStockStatus}
                    getStockColor={getStockColor}
                    getStockPercentage={getStockPercentage}
                    onEdit={(item) => openModal("inventory", item)}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Sales View Component
// Sales View Component - Updated to use invoices
// Sales View Component - Expandable rows version
// Sales View Component - Expandable rows version with eye button
const SalesView = ({ sales, openModal, handleDelete }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (saleId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Sales Transactions ({sales.length})
          </CardTitle>
          <Button
            onClick={() => openModal("sale")}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Invoice No
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Date & Time
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Payment Method
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Items Count
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Total Amount
                </th>
                <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <>
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                        #{sale.invoice_number}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {new Date(sale.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <Badge variant="outline" className="capitalize">
                          {sale.payment_method}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {sale.invoice_items?.length || 0} items
                      </td>
                      <td className="py-3 px-2 sm:px-4 font-semibold text-sm">
                        AED {sale.total_amount?.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex gap-1 sm:gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRow(sale.id)}
                            title={
                              expandedRows.has(sale.id)
                                ? "Hide items"
                                : "View items"
                            }
                          >
                            {expandedRows.has(sale.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete("sale", sale.id)}
                            title="Delete sale"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(sale.id) && sale.invoice_items && (
                      <tr className="bg-muted/20">
                        <td colSpan="6" className="py-3 px-2 sm:px-4">
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              Items Sold:
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {sale.invoice_items.map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs p-2 bg-background rounded border"
                                >
                                  <div className="font-medium">
                                    {item.products?.name}
                                  </div>
                                  <div>
                                    Qty: {item.quantity} {item.products?.unit}
                                  </div>
                                  <div>
                                    Price: AED {item.price} × {item.quantity} =
                                    AED {item.total}
                                  </div>
                                  {item.tax > 0 && (
                                    <div>Tax: AED {item.tax}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
// Returns View Component
const ReturnsView = ({ salesReturns, purchaseReturns, openModal }) => {
  console.log("ReturnsView - salesReturns:", salesReturns);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <RotateCcw className="h-5 w-5 text-primary" />
              Sales Returns ({salesReturns.length})
            </CardTitle>
            <Button
              onClick={() => openModal("salesReturn")}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Sales Return
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Return ID
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Original Sale
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Returned Items
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Refund Type
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Total Refund
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesReturns.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No sales returns yet.
                    </td>
                  </tr>
                ) : (
                  salesReturns.map((ret) => (
                    <tr key={ret.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                        SR-#{ret.id}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        #{ret.originalSaleId}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {new Date(ret.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {ret.productName} ({ret.quantity}) - {ret.reason}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <Badge variant="outline">{ret.refundType}</Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4 font-semibold text-red-600 text-sm">
                        AED{" "}
                        {ret.totalRefund ? ret.totalRefund.toFixed(2) : "0.00"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <RotateCcw className="h-5 w-5 text-primary" />
              Purchase Returns ({purchaseReturns.length})
            </CardTitle>
            <Button
              onClick={() => openModal("purchaseReturn")}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Return
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Return ID
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Supplier
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Returned Items
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Refund Method
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseReturns.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No purchase returns yet.
                    </td>
                  </tr>
                ) : (
                  purchaseReturns.map((ret) => (
                    <tr key={ret.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                        PR-#{ret.id}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {ret.supplierName || `Supplier-${ret.supplierId}`}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {new Date(ret.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">
                        {ret.productName} ({ret.quantity}) - {ret.reason}
                      </td>
                      <td className="py-3 px-2 sm:px-4 font-semibold text-green-600 text-sm">
                        {ret.refundMethod}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Adjustments View Component
const AdjustmentsView = ({ stockAdjustments, openModal }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Edit className="h-5 w-5 text-primary" />
          Stock Adjustments ({stockAdjustments.length})
        </CardTitle>
        <Button
          onClick={() => openModal("adjustment")}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Adjustment
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Adjustment ID
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Product
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Type
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Quantity
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Reason
              </th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {stockAdjustments.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  No stock adjustments yet.
                </td>
              </tr>
            ) : (
              stockAdjustments.map((adj) => (
                <tr key={adj.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                    ADJ-#{adj.id}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-sm">
                    {adj.productName}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <Badge
                      className={
                        adj.type === "Add"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }
                    >
                      {adj.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{adj.quantity}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{adj.reason}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{adj.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

// Main Component
const GroceryInventory = () => {
  const { user } = useAuth();

  // Read tab from URL parameter on mount
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    // Valid tabs: stock, sales, purchases, returns, adjustments
    const validTabs = ["stock", "sales", "purchases", "returns", "adjustments"];
    return validTabs.includes(tabParam) ? tabParam : "stock";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [products, setProducts] = useState([]);
  const [baseInventory, setBaseInventory] = useState([]); // raw inventory snapshot prior to derived adjustments
  const [isLoading, setIsLoading] = useState(true);
  const [productCatalog, setProductCatalog] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState<UIPurchaseReturn[]>(
    []
  );
  const [submitting, setSubmitting] = useState(false);

  // Add function to load purchases
  // Update your loadPurchases function to match the actual API response

  const loadSales = async () => {
    try {
      const response = await invoiceService.getAll();
      console.log("Invoices API response:", response);

      if (
        response.data &&
        response.data.success &&
        Array.isArray(response.data.data)
      ) {
        setSales(response.data.data);
      } else {
        console.error("Unexpected invoices response structure:", response);
        setSales([]);
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
      setSales([]);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
    }
  };
  const loadPurchases = async () => {
    try {
      const response = await purchaseService.getAll();
      console.log("Purchases API response:", response);

      // Based on your response structure: { success: true, data: [...] }
      if (
        response.data &&
        response.data.success &&
        Array.isArray(response.data.data)
      ) {
        setPurchases(response.data.data);
      } else {
        console.error("Unexpected purchases response structure:", response);
        setPurchases([]);
      }
    } catch (error) {
      console.error("Error loading purchases:", error);
      setPurchases([]);
      toast({
        title: "Error",
        description: "Failed to load purchases",
        variant: "destructive",
      });
    }
  };
  const { toast } = useToast();
  useEffect(() => {
    loadProducts();
    loadInventory();
    loadPurchases();
    loadSales();
    loadSalesReturns();
    loadPurchaseReturns();
    // Listen for invoice-created events from billing page to refresh sales & inventory
    const invoiceListener = (e: any) => {
      const invoice = e?.detail?.invoice;
      if (invoice && Array.isArray(invoice.items)) {
        // Optimistically decrement inventory quantities locally
        setProducts((prev: any[]) =>
          prev.map((p: any) => {
            const soldLine = invoice.items.find(
              (i: any) =>
                i.product_id === p.product_id ||
                i.product_id === p.id ||
                (i.name && p.name && i.name === p.name)
            );
            if (!soldLine) return p;
            const qtySold =
              Number(soldLine.qty) || Number(soldLine.quantity) || 0;
            const currentQty = Number(p.quantity ?? 0);
            return { ...p, quantity: Math.max(0, currentQty - qtySold) };
          })
        );
      }
      // After optimistic change, reload authoritative data
      loadSales();
      loadInventory();
    };
    window.addEventListener("invoice-created", invoiceListener);
    return () => {
      window.removeEventListener("invoice-created", invoiceListener);
    };
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      console.log("Product catalog loaded:", data.data);
      setProductCatalog(data.data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      setProductCatalog([]);
    }
  };

  const loadSalesReturns = async () => {
    try {
      const response = await salesReturnService.getAll();
      const status = response?.status;
      console.log("Sales Returns API status:", status);
      console.log("Sales Returns full Axios response:", response);

      const apiData = response?.data;
      console.log("Sales Returns top-level data payload:", apiData);

      let rawData: any[] = [];
      let shapeDetected = "none";

      // Handle common backend shapes
      if (apiData && apiData.success && Array.isArray(apiData.data)) {
        rawData = apiData.data;
        shapeDetected = "success.data[]";
      } else if (
        apiData &&
        apiData.success &&
        Array.isArray(apiData.sales_returns)
      ) {
        rawData = apiData.sales_returns;
        shapeDetected = "success.sales_returns[]";
      } else if (Array.isArray(apiData)) {
        rawData = apiData;
        shapeDetected = "rootArray";
      } else if (apiData && apiData.results && Array.isArray(apiData.results)) {
        rawData = apiData.results;
        shapeDetected = "results[]";
      } else if (apiData && apiData.id && apiData.sales_id) {
        // Single object returned – wrap it
        rawData = [apiData];
        shapeDetected = "singleObject";
      }

      console.log("Sales Returns shape detected:", shapeDetected);
      console.log("Sales Returns Raw Data (array):", rawData);

      if (!status || status !== 200) {
        console.warn("Non-200 status when fetching sales returns", status);
      }

      // If still empty, attempt to surface reason
      if (rawData.length === 0) {
        const reason =
          apiData?.error ||
          apiData?.message ||
          (status !== 200 ? `HTTP ${status}` : "No records found");
        console.warn("Sales returns rawData empty. Reason:", reason);
        // Attempt a fallback direct fetch to bypass axios interceptors / headers issues
        try {
          const token = localStorage.getItem("auth_token");
          const fallbackResp = await fetch(
            "https://billingbackend-1vei.onrender.com/api/sales_returns",
            {
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            }
          );
          const fallbackStatus = fallbackResp.status;
          const fallbackText = await fallbackResp.text();
          console.log("Fallback fetch status:", fallbackStatus);
          console.log("Fallback raw response text:", fallbackText);
          let fallbackJson: any = null;
          try {
            fallbackJson = JSON.parse(fallbackText);
          } catch {
            /* not JSON */
          }
          console.log("Fallback parsed JSON:", fallbackJson);
          if (fallbackJson) {
            let fbData: any[] = [];
            if (Array.isArray(fallbackJson)) fbData = fallbackJson;
            else if (fallbackJson.success && Array.isArray(fallbackJson.data))
              fbData = fallbackJson.data;
            else if (Array.isArray(fallbackJson.sales_returns))
              fbData = fallbackJson.sales_returns;
            else if (fallbackJson.id && fallbackJson.sales_id)
              fbData = [fallbackJson];
            if (fbData.length) {
              console.log("Using fallback fetch sales returns data:", fbData);
              const formattedFallback = fbData.map((ret: any) => ({
                id: ret.id,
                originalSaleId: ret.sales_id,
                date:
                  ret.created_at ||
                  ret.return_date ||
                  ret.date ||
                  new Date().toISOString().split("T")[0],
                productName:
                  ret.product_name || ret.name || `Product #${ret.product_id}`,
                productId: ret.product_id,
                quantity: ret.quantity,
                reason: ret.reason || ret.return_reason || "N/A",
                refundType: ret.refund_type || ret.type || "Cash",
                totalRefund:
                  ret.total_refund || ret.refund_amount || ret.amount || 0,
                items: [
                  {
                    name:
                      ret.product_name ||
                      ret.name ||
                      `Product #${ret.product_id}`,
                    qty: ret.quantity,
                    reason: ret.reason || ret.return_reason || "N/A",
                  },
                ],
              }));
              setSalesReturns(formattedFallback);
              return; // stop further processing
            }
          }
        } catch (fbErr) {
          console.error("Fallback fetch attempt failed:", fbErr);
        }
      }

      // Transform backend data to match UI expectations
      const formattedData = rawData.map((ret: any) => {
        return {
          id: ret.id,
          originalSaleId: ret.sales_id,
          date:
            ret.created_at ||
            ret.return_date ||
            ret.date ||
            new Date().toISOString().split("T")[0],
          productName:
            ret.product_name || ret.name || `Product #${ret.product_id}`,
          productId: ret.product_id,
          quantity: ret.quantity,
          reason: ret.reason || ret.return_reason || "N/A",
          refundType: ret.refund_type || ret.type || "Cash",
          totalRefund: ret.total_refund || ret.refund_amount || ret.amount || 0,
          // Synthetic items array (backend currently flat)
          items: [
            {
              name:
                ret.product_name || ret.name || `Product #${ret.product_id}`,
              qty: ret.quantity,
              reason: ret.reason || ret.return_reason || "N/A",
            },
          ],
        };
      });

      console.log("Sales Returns formatted (UI) objects:", formattedData);
      setSalesReturns(formattedData);

      // Optional: toast when empty to guide debugging
      if (formattedData.length === 0) {
        toast({
          title: "No Sales Returns",
          description: `Fetched 0 records (shape: ${shapeDetected}). Check if any returns exist or tenant scope filters them out.`,
        });
      }
    } catch (error) {
      console.error("Error loading sales returns:", error);
      if ((error as any)?.response) {
        console.error(
          "Sales returns error status:",
          (error as any).response.status
        );
        console.error(
          "Sales returns error data:",
          (error as any).response.data
        );
      }
      setSalesReturns([]);
      toast({
        title: "Error",
        description: "Failed to load sales returns",
        variant: "destructive",
      });
    }
  };

  const loadPurchaseReturns = async () => {
    try {
      const tenantId = localStorage.getItem("tenant_id");
      const params = tenantId ? { tenant_id: tenantId } : {};

      const response = await purchaseReturnService.getAll(params);
      console.log("Purchase Returns API Response:", response);

      const apiData = response?.data;
      console.log("Purchase Returns API Data:", apiData);

      let rawData: RawPurchaseReturn[] = [];

      // Backend returns { purchase_returns: [...] }
      if (apiData && Array.isArray(apiData.purchase_returns)) {
        rawData = apiData.purchase_returns;
      } else if (Array.isArray(apiData)) {
        rawData = apiData;
      } else if (apiData && apiData.data && Array.isArray(apiData.data)) {
        rawData = apiData.data;
      }

      console.log("Purchase Returns Raw Data:", rawData);

      // Transform to UI format
      const formattedData: UIPurchaseReturn[] = rawData.map((ret) => {
        const productName =
          ret.products?.name ||
          ret.select_product ||
          `Product #${ret.product_id}`;
        return {
          id: ret.id,
          supplierId: ret.Suppliers_id || null,
          supplierName: ret.Suppliers_id
            ? `Supplier #${ret.Suppliers_id}`
            : "N/A",
          date: ret.created_at || new Date().toISOString().split("T")[0],
          productName,
          productId: ret.product_id,
          quantity: ret.quantity,
          reason: ret.reason || "N/A",
          refundMethod: ret.refund_method || "N/A",
          amountAdjusted: 0, // Backend doesn't provide; calculate if needed
          items: [
            {
              name: productName,
              qty: ret.quantity,
              reason: ret.reason || "N/A",
              productId: ret.product_id,
            },
          ],
        };
      });

      console.log("Purchase Returns Formatted Data:", formattedData);
      setPurchaseReturns(formattedData);

      if (formattedData.length === 0) {
        toast({
          title: "No Purchase Returns",
          description: "Fetched 0 records. Check if any returns exist.",
        });
      }
    } catch (error) {
      console.error("Error loading purchase returns:", error);
      if ((error as any)?.response) {
        console.error("Purchase returns error:", (error as any).response);
      }
      setPurchaseReturns([]);
      toast({
        title: "Error",
        description: "Failed to load purchase returns",
        variant: "destructive",
      });
    }
  };

  const loadInventory = async () => {
    setIsLoading(true); // Start loading
    try {
      const data = await inventoryService.getAll();
      console.log("inventory data:", data.data);
      const items = data.data || [];
      setBaseInventory(items);
      setProducts(items); // initial view before derived recompute
    } catch (error) {
      console.error("Error loading inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // End loading
    }
  };

  // Derive current stock from base inventory minus sold quantities plus purchases and sales returns
  useEffect(() => {
    setProducts(baseInventory);
  }, [baseInventory]);

  // const [sales, setSales] = useState([
  //   { id: 1, date: '2025-10-28 10:30', customerId: 'C001', customerName: 'Rajesh Kumar', products: [{productId: 1, name: 'Basmati Rice', qty: 5, price: 100, tax: 5}], paymentType: 'UPI', total: 525, profit: 100, staffId: 'S001' },
  //   { id: 2, date: '2025-10-28 11:15', customerId: 'C002', customerName: 'Priya Sharma', products: [{productId: 2, name: 'Coca Cola', qty: 6, price: 40, tax: 12}], paymentType: 'Cash', total: 269, profit: 60, staffId: 'S001' },
  // ]);

  // const [purchases, setPurchases] = useState([
  //   { id: 1, supplierId: 1, supplierName: 'ABC Distributors', invoiceNo: 'INV-2025-001', date: '2025-10-25', products: [{productId: 1, name: 'Basmati Rice', qty: 50, cost: 80}], paymentMode: 'Credit', total: 4000, status: 'Unpaid' },
  //   { id: 2, supplierId: 2, supplierName: 'XYZ Wholesale', invoiceNo: 'INV-2025-002', date: '2025-10-26', products: [{productId: 2, name: 'Coca Cola', qty: 100, cost: 30}], paymentMode: 'Cash', total: 3000, status: 'Paid' },
  // ]);

  // salesReturns and purchaseReturns state declared above

  const [stockAdjustments, setStockAdjustments] = useState([
    {
      id: 1,
      productId: 1,
      productName: "Basmati Rice",
      type: "Remove",
      quantity: 2,
      reason: "Damage",
      date: "2025-10-27",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  // Give formData a permissive type so TypeScript allows dynamic fields like supplierId/supplier_id
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saleProducts, setSaleProducts] = useState([{ productId: "", qty: 1 }]);
  const [purchaseProducts, setPurchaseProducts] = useState([
    {
      product_id: "",
      quantity: 1,
      cost_price: 0,
      expiry_date: "",
      reorder_level: 0,
      max_stock: 0,
    },
  ]);
  const [returnItems, setReturnItems] = useState([
    { productId: "", qty: 1, reason: "" },
  ]);

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity < reorderLevel) return "low";
    if (quantity < reorderLevel * 1.5) return "warning";
    return "good";
  };

  const getStockColor = (status) => {
    switch (status) {
      case "low":
        return "bg-red-500/10 text-red-500";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500";
      case "good":
        return "bg-green-500/10 text-green-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStockPercentage = (quantity, maxStock) => {
    return Math.min((quantity / maxStock) * 100, 100);
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (item) {
      // ✅ Map the flattened backend data to form field names
      setFormData({
        productId: item.product_id, // This comes from the flattened response
        name: item.name,
        category: item.category,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        costPrice: item.cost_price,
        sellingPrice: item.selling_price,
        tax: item.tax_percent,
        reorderLevel: item.reorderLevel, // This comes from the formatted response
        maxStock: item.maxStock, // This comes from the formatted response
        expiryDate: item.expiryDate || item.expiry_date,
        location: item.location,
        barcode: item.barcode,
        supplierId: item.supplierId,
      });
    } else {
      switch (type) {
        case "inventory":
          setFormData({
            productId: "",
            name: "",
            category: "",
            brand: "",
            quantity: 0,
            unit: "",
            costPrice: 0,
            sellingPrice: 0,
            tax: 0,
            reorderLevel: 0,
            maxStock: 0,
            barcode: "",
            expiryDate: "",
            supplierId: 1,
          });
          break;
        case "purchase":
          setFormData({
            supplier_id: 2,
            invoice_number: "",
          });
          setPurchaseProducts([
            {
              product_id: "",
              quantity: 1,
              cost_price: 0,
              expiry_date: "",
              reorder_level: 0,
              max_stock: 0,
            },
          ]);
          break;
        // ... other cases remain the same
      }
    }
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
    setSaleProducts([{ productId: "", qty: 1 }]);
    setPurchaseProducts([
      {
        product_id: "",
        quantity: 1,
        cost_price: 0,
        expiry_date: "",
        reorder_level: 0,
        max_stock: 0,
      },
    ]);
    setReturnItems([{ productId: "", qty: 1, reason: "" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    switch (modalType) {
      case "inventory":
        try {
          // ✅ Prepare the data - only include fields that exist in inventory table
          const inventoryData = {
            product_id: parseInt(formData.productId || formData.product_id),
            quantity: parseInt(formData.quantity) || 0,
            reorder_level: parseInt(formData.reorderLevel) || 0,
            max_stock: parseInt(formData.maxStock) || 0,
            expiry_date: formData.expiryDate || null,
            // Remove cost_price and selling_price - they belong to products table
          };

          console.log("Sending to backend:", inventoryData);

          let response;
          if (editingItem) {
            // ✅ UPDATE existing inventory item
            response = await inventoryService.update(
              editingItem.id,
              inventoryData
            );
          } else {
            // ✅ CREATE new inventory item
            response = await inventoryService.create(inventoryData);
          }

          console.log("Backend response:", response);

          if (response.success || response.data) {
            // ✅ Reload the inventory to get the updated data with proper joins
            await loadInventory();
            toast({
              title: editingItem ? "Inventory Updated" : "Inventory Added",
              description: editingItem
                ? "Item updated successfully."
                : "New item added successfully.",
            });
            closeModal();
          } else {
            toast({
              title: "Error",
              description: response.error || "Unknown error occurred",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error saving inventory:", error);
          console.error("Error details:", error.response?.data);
          toast({
            title: "Error",
            description:
              error.response?.data?.error ||
              error.message ||
              "Failed to save inventory item",
            variant: "destructive",
          });
        }
        break;
      case "purchase":
        try {
          setSubmitting(true);
          const purchaseData = {
            supplier_id: parseInt(formData.supplier_id) || 2,
            invoice_number: formData.invoice_number || "",
            items: purchaseProducts
              .filter((item) => item.product_id && item.quantity > 0)
              .map((item) => ({
                product_id: parseInt(item.product_id),
                quantity: parseFloat(String(item.quantity)) || 1,
                cost_price: parseFloat(String(item.cost_price)) || 0,
                expiry_date: item.expiry_date || null,
                reorder_level: parseInt(String(item.reorder_level)) || 0,
                max_stock: parseInt(String(item.max_stock)) || 0,
              })),
          };

          // Validate at least one item
          if (purchaseData.items.length === 0) {
            toast({
              title: "Error",
              description: "Please add at least one product to the purchase",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          console.log("Creating purchase with data:", purchaseData);

          const response = await purchaseService.create(purchaseData);
          console.log("Purchase creation response:", response);

          // Match your API response structure: { data: { success: true, purchase_id, invoice_number } }
          if (response.data && response.data.success) {
            await loadPurchases();
            await loadInventory();

            toast({
              title: "Purchase Created",
              description: `Purchase ${response.data.invoice_number} created successfully!`,
            });
            closeModal();
          } else {
            toast({
              title: "Error",
              description: response.data?.error || "Failed to create purchase",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error creating purchase:", error);
          toast({
            title: "Error",
            description:
              error.response?.data?.error ||
              error.message ||
              "Failed to create purchase",
            variant: "destructive",
          });
        } finally {
          setSubmitting(false);
        }
        break;
      case "salesReturn":
        try {
          setSubmitting(true);
          const itemsPayload = (returnItems || [])
            .filter((it) => it.productId && it.qty)
            .map((it) => ({
              product_id: parseInt(it.productId),
              quantity: parseInt(it.qty || 0),
              reason: it.reason || "",
            }));

          if (!formData.originalSaleId) {
            toast({
              title: "Missing Sale",
              description: "Please select the original sale/invoice.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          if (itemsPayload.length === 0) {
            toast({
              title: "No Items",
              description: "Add at least one return item.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          // Optimistically add entries marked with _optimistic flag
          const nowISO = new Date().toISOString();
          const selectedSaleForSubmit = sales.find(
            (s: any) => String(s.id) === String(formData.originalSaleId)
          );
          const optimisticEntries = itemsPayload.map((it, idx) => {
            const productMatch = products.find(
              (p: any) =>
                String(p.product_id) === String(it.product_id) ||
                String(p.id) === String(it.product_id)
            );
            const invoiceItemMatch = selectedSaleForSubmit?.invoice_items?.find(
              (ii: any) =>
                String(ii.product_id) === String(it.product_id) ||
                String(ii.products?.id) === String(it.product_id)
            );
            const netPriceRaw =
              invoiceItemMatch?.net_price ??
              invoiceItemMatch?.price ??
              invoiceItemMatch?.selling_price ??
              (invoiceItemMatch?.total && invoiceItemMatch?.quantity
                ? invoiceItemMatch.total / invoiceItemMatch.quantity
                : 0);
            const netPrice = Number(netPriceRaw) || 0;
            const lineRefund = invoiceItemMatch?.total
              ? Number(invoiceItemMatch.total)
              : netPrice * it.quantity;
            return {
              id: `temp-${Date.now()}-${idx}`,
              originalSaleId: parseInt(formData.originalSaleId),
              date: nowISO,
              productName: productMatch?.name || `Product #${it.product_id}`,
              productId: it.product_id,
              quantity: it.quantity,
              reason: it.reason || "N/A",
              refundType: formData.refundType || "Cash",
              totalRefund: lineRefund,
              _optimistic: true,
              items: [
                {
                  name: productMatch?.name || `Product #${it.product_id}`,
                  qty: it.quantity,
                  reason: it.reason || "N/A",
                  productId: it.product_id,
                },
              ],
            } as UISalesReturn & { _optimistic?: boolean };
          });
          setSalesReturns((prev) => [...optimisticEntries, ...prev]);

          // Backend expects flat structure
          const firstItem = itemsPayload[0];
          // Compute refund for first item (payload) using invoice items
          const firstInvoiceItemMatch =
            selectedSaleForSubmit?.invoice_items?.find(
              (ii: any) =>
                String(ii.product_id) === String(firstItem.product_id) ||
                String(ii.products?.id) === String(firstItem.product_id)
            );
          const firstNetPriceRaw =
            firstInvoiceItemMatch?.net_price ??
            firstInvoiceItemMatch?.price ??
            firstInvoiceItemMatch?.selling_price ??
            (firstInvoiceItemMatch?.total && firstInvoiceItemMatch?.quantity
              ? firstInvoiceItemMatch.total / firstInvoiceItemMatch.quantity
              : 0);
          const firstNetPrice = Number(firstNetPriceRaw) || 0;
          const firstRefundAmount = firstInvoiceItemMatch?.total
            ? Number(firstInvoiceItemMatch.total)
            : firstNetPrice * firstItem.quantity;
          const payload = {
            sales_id: parseInt(formData.originalSaleId),
            product_id: firstItem.product_id,
            quantity: firstItem.quantity,
            reason: firstItem.reason,
            refund_type: formData.refundType || "Cash",
            total_refund: Number(firstRefundAmount.toFixed(2)),
            ...(localStorage.getItem("tenant_id")
              ? {
                  tenant_id: parseInt(
                    localStorage.getItem("tenant_id") as string
                  ),
                }
              : {}),
          };

          console.log(
            "Sales Return Payload:",
            JSON.stringify(payload, null, 2)
          );

          // Submit to backend - backend performs atomic inventory update
          const response = await salesReturnService.create(payload);
          const ok = response?.data?.success !== false;

          if (ok) {
            // Handle multiple items
            if (itemsPayload.length > 1) {
              for (let i = 1; i < itemsPayload.length; i++) {
                const extra = itemsPayload[i];
                const extraInvoiceItemMatch =
                  selectedSaleForSubmit?.invoice_items?.find(
                    (ii: any) =>
                      String(ii.product_id) === String(extra.product_id) ||
                      String(ii.products?.id) === String(extra.product_id)
                  );
                const extraNetPriceRaw =
                  extraInvoiceItemMatch?.net_price ??
                  extraInvoiceItemMatch?.price ??
                  extraInvoiceItemMatch?.selling_price ??
                  (extraInvoiceItemMatch?.total &&
                  extraInvoiceItemMatch?.quantity
                    ? extraInvoiceItemMatch.total /
                      extraInvoiceItemMatch.quantity
                    : 0);
                const extraNetPrice = Number(extraNetPriceRaw) || 0;
                const extraRefundAmount = extraInvoiceItemMatch?.total
                  ? Number(extraInvoiceItemMatch.total)
                  : extraNetPrice * extra.quantity;
                const extraPayload = {
                  sales_id: parseInt(formData.originalSaleId),
                  product_id: extra.product_id,
                  quantity: extra.quantity,
                  reason: extra.reason,
                  refund_type: formData.refundType || "Cash",
                  total_refund: Number(extraRefundAmount.toFixed(2)),
                  ...(localStorage.getItem("tenant_id")
                    ? {
                        tenant_id: parseInt(
                          localStorage.getItem("tenant_id") as string
                        ),
                      }
                    : {}),
                };
                try {
                  await salesReturnService.create(extraPayload);
                } catch (loopErr) {
                  console.error("Additional return item failed:", loopErr);
                }
              }
            }

            // Backend updated inventory atomically - reload authoritative data
            await loadInventory();
            await loadSalesReturns();

            toast({
              title: "Sales Return Created",
              description: "Returned items added back to inventory.",
            });
            closeModal();
          } else {
            // Remove optimistic entries on failure
            setSalesReturns((prev) => prev.filter((r: any) => !r._optimistic));
            toast({
              title: "Error",
              description:
                response?.data?.error || "Failed to create sales return",
              variant: "destructive",
            });
          }
        } catch (error) {
          // Remove optimistic entries on error
          setSalesReturns((prev) => prev.filter((r: any) => !r._optimistic));
          console.error("Error creating sales return:", error);
          const errorMsg =
            (error as any)?.response?.data?.error ||
            (error as any)?.response?.data?.message ||
            (error as any)?.message ||
            "Failed to create sales return";
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
        } finally {
          setSubmitting(false);
        }
        break;

      case "purchaseReturn":
        try {
          setSubmitting(true);

          const itemsPayload = (returnItems || [])
            .filter((it) => it.productId && (it.qty || it.quantity))
            .map((it) => ({
              product_id: parseInt(it.productId),
              quantity: parseInt(it.qty || it.quantity || 0),
              reason: it.reason || "",
            }));

          if (!formData.supplierId && !formData.supplier_id) {
            toast({
              title: "Missing Supplier",
              description: "Please provide the supplier ID.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          if (itemsPayload.length === 0) {
            toast({
              title: "No Items",
              description: "Add at least one return item.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          // Resolve tenant_id
          let tenantId: number | string | undefined =
            user?.tenant_id || user?.tenantId;

          if (!tenantId) {
            const tenantIdRaw = localStorage.getItem("tenant_id");
            if (tenantIdRaw) {
              tenantId = /^\d+$/.test(tenantIdRaw)
                ? parseInt(tenantIdRaw)
                : tenantIdRaw;
            }
          }

          console.log("Purchase Return - User:", user);
          console.log(
            "Purchase Return - Resolved tenant_id:",
            tenantId,
            "Type:",
            typeof tenantId
          );

          if (!tenantId) {
            toast({
              title: "Missing Tenant",
              description: "Tenant ID not found. Please log in again.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          // Optimistically add entries marked with _optimistic flag
          const nowISO = new Date().toISOString();
          const optimisticEntries = itemsPayload.map((it, idx) => {
            const productMatch = products.find(
              (p: any) =>
                String(p.product_id) === String(it.product_id) ||
                String(p.id) === String(it.product_id)
            );
            return {
              id: `temp-${Date.now()}-${idx}`,
              supplierId: parseInt(formData.supplierId || formData.supplier_id),
              supplierName:
                formData.supplierName ||
                `Supplier #${formData.supplierId || formData.supplier_id}`,
              date: nowISO,
              productName: productMatch?.name || `Product #${it.product_id}`,
              productId: it.product_id,
              quantity: it.quantity,
              reason: it.reason || "N/A",
              refundMethod: formData.refundMethod || "Cash",
              amountAdjusted: 0,
              _optimistic: true,
              items: [
                {
                  name: productMatch?.name || `Product #${it.product_id}`,
                  qty: it.quantity,
                  reason: it.reason || "N/A",
                  productId: it.product_id,
                },
              ],
            } as UIPurchaseReturn & { _optimistic?: boolean };
          });
          setPurchaseReturns((prev) => [...optimisticEntries, ...prev]);

          const firstItem = itemsPayload[0];
          const payload = {
            Suppliers_id: parseInt(formData.supplierId || formData.supplier_id),
            refund_method: formData.refundMethod || "Cash",
            select_product: firstItem.product_id.toString(),
            quantity: firstItem.quantity,
            reason: firstItem.reason,
            product_id: firstItem.product_id,
            tenant_id: tenantId,
          };

          console.log(
            "Purchase Return Payload:",
            JSON.stringify(payload, null, 2)
          );

          // Submit to backend - backend performs atomic inventory update
          const response = await purchaseReturnService.create(payload);
          const ok = response?.data?.purchase_return || response?.data;

          if (ok) {
            // Handle multiple items
            if (itemsPayload.length > 1) {
              for (let i = 1; i < itemsPayload.length; i++) {
                const extra = itemsPayload[i];
                const extraPayload = {
                  Suppliers_id: parseInt(
                    formData.supplierId || formData.supplier_id
                  ),
                  refund_method: formData.refundMethod || "Cash",
                  select_product: extra.product_id.toString(),
                  quantity: extra.quantity,
                  reason: extra.reason,
                  product_id: extra.product_id,
                  tenant_id: tenantId,
                };
                try {
                  await purchaseReturnService.create(extraPayload);
                } catch (loopErr) {
                  console.error(
                    "Additional purchase return item failed:",
                    loopErr
                  );
                }
              }
            }

            // Backend updated inventory atomically - reload authoritative data
            await loadInventory();
            await loadPurchaseReturns();

            toast({
              title: "Purchase Return Created",
              description: "Returned items subtracted from inventory.",
            });
            closeModal();
          } else {
            // Remove optimistic entries on failure
            setPurchaseReturns((prev) =>
              prev.filter((r: any) => !r._optimistic)
            );
            toast({
              title: "Error",
              description:
                response?.data?.error || "Failed to create purchase return",
              variant: "destructive",
            });
          }
        } catch (error) {
          // Remove optimistic entries on error
          setPurchaseReturns((prev) => prev.filter((r: any) => !r._optimistic));
          console.error("Error creating purchase return:", error);
          const errorMsg =
            (error as any)?.response?.data?.error ||
            (error as any)?.response?.data?.message ||
            (error as any)?.message ||
            "Failed to create purchase return";
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
        } finally {
          setSubmitting(false);
        }
        break;
      // ... rest of your cases remain the same
    }

    closeModal();
  };

  const handleDelete = async (type, id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    switch (type) {
      case "product":
        console.log("Deleting product with id:", id);
        await inventoryService.delete(id);
        setProducts(products.filter((p) => p.id !== id));
        break;
      case "sale":
        try {
          await invoiceService.delete(id);
          await loadSales(); // Reload the sales list
          toast({
            title: "Sale Deleted",
            description: "Sale record deleted successfully",
          });
        } catch (error) {
          console.error("Error deleting sale:", error);
          toast({
            title: "Error",
            description: "Failed to delete sale",
            variant: "destructive",
          });
        }
        break;
      case "purchase":
        try {
          await purchaseService.delete(id);
          // Reload purchases to get updated list
          await loadPurchases();
          toast({
            title: "Purchase Deleted",
            description: "Purchase deleted successfully",
          });
        } catch (error) {
          console.error("Error deleting purchase:", error);
          toast({
            title: "Error",
            description: "Failed to delete purchase",
            variant: "destructive",
          });
        }
        break;
        break;
    }
  };
  console.log("Products data:", products);
  const lowStockItems = products.filter(
    (item) => getStockStatus(item.quantity, item.reorderLevel) === "low"
  ).length;
  const totalValue = products.reduce(
    (sum, item) => sum + item.quantity * item.selling_price,
    0
  );
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + (sale.total_amount || 0),
    0
  );

  const stats = [
    { label: "Total Items", value: products.length, icon: Package },
    {
      label: "Low Stock Items",
      value: lowStockItems,
      icon: AlertTriangle,
      color: "text-red-500",
    },
    {
      label: "Total Stock Value",
      value: `AED ${totalValue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Total Sales Today",
      value: `AED ${totalRevenue.toLocaleString()}`,
      icon: ShoppingCart,
      color: "text-blue-500",
    },
  ];

  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((product) => {
    const name = product?.name ?? "";
    const barcode = product?.barcode ?? "";
    const category = product?.category ?? "";

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barcode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === "All" || category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Inventory Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Complete grocery store inventory system
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatsCard key={index} stat={stat} />
          ))}
        </div>

        <LowStockAlert count={lowStockItems} />

        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "stock" && (
          <StockView
            products={filteredProducts}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            categories={categories}
            openModal={openModal}
            handleDelete={(id) => handleDelete("product", id)}
            getStockStatus={getStockStatus}
            getStockColor={getStockColor}
            getStockPercentage={getStockPercentage}
            isLoading={isLoading}
          />
        )}

        {activeTab === "sales" && (
          <SalesView
            sales={sales}
            openModal={openModal}
            handleDelete={handleDelete}
          />
        )}

        {activeTab === "purchases" && (
          <PurchasesView
            purchases={purchases}
            openModal={openModal}
            handleDelete={handleDelete}
          />
        )}

        {activeTab === "returns" && (
          <ReturnsView
            salesReturns={salesReturns}
            purchaseReturns={purchaseReturns}
            openModal={openModal}
          />
        )}

        {activeTab === "adjustments" && (
          <AdjustmentsView
            stockAdjustments={stockAdjustments}
            openModal={openModal}
          />
        )}
      </div>

      <Modal
        showModal={showModal}
        modalType={modalType}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        products={products}
        sales={sales}
        saleProducts={saleProducts}
        setSaleProducts={setSaleProducts}
        purchaseProducts={purchaseProducts}
        setPurchaseProducts={setPurchaseProducts}
        returnItems={returnItems}
        setReturnItems={setReturnItems}
        onClose={closeModal}
        onSubmit={handleSubmit}
        productCatalog={productCatalog}
        submitting={submitting} // ADD THIS
      />
    </div>
  );
};

export default GroceryInventory;
