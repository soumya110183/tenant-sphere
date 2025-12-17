import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
  total_refund?: number;
  refund_amount?: number;
  amount?: number;
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
  DollarSign,
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
  supplierService,
} from "@/services/api";
import { normalizeItems } from "@/lib/utils";
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
  purchases,
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
  submitting, // ADD THIS
}) => {
  if (!showModal) return null;

  console.log("modal:", productCatalog);
  // const [productCatalog,setProductCatalog] = useState([]);

  // Purchased products (for purchase return flow) derived from selected purchase
  const [purchaseReturnProducts, setPurchaseReturnProducts] = useState<any[]>(
    []
  );

  // Sales-return invoice search (modal-local) using invoices API and optional api key
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceResults, setInvoiceResults] = useState<any[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoiceLocal, setSelectedInvoiceLocal] = useState<any>(null);

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
    // Resolve selected invoice from (1) loaded `sales`, (2) recent `invoiceResults`, or (3) local selected invoice
    const foundInSales = sales.find(
      (s: any) => String(s.id) === String(formData.originalSaleId)
    );
    const foundInResults = invoiceResults.find(
      (r) => String(r.id) === String(formData.originalSaleId)
    )?.raw;
    selectedSale = foundInSales || foundInResults || selectedInvoiceLocal;

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
        // Calculate line total based on return quantity, not original sale quantity
        const lineTotal = netPrice * qty;
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

  const searchInvoices = async (q: string) => {
    try {
      setInvoiceLoading(true);
      setInvoiceResults([]);
      const tenantId = localStorage.getItem("tenant_id");
      const apiKey = localStorage.getItem("search_api_key") || undefined;
      const params: Record<string, any> = {
        search: q || "",
        limit: 20,
        page: 1,
      };
      if (tenantId) params.tenant_id = tenantId;
      if (apiKey) params.api_key = apiKey;
      const resp = await invoiceService.getAll(params);
      const data = resp?.data ?? resp;
      let raw: any[] = [];
      if (data && Array.isArray(data.data)) raw = data.data;
      else if (data && Array.isArray(data.invoices)) raw = data.invoices;
      else if (Array.isArray(data)) raw = data;

      const mapped = raw.map((s: any) => ({
        id: s.id ?? s._id ?? s.number,
        invoice_number: s.invoice_number ?? s.number ?? s.id,
        created_at: s.created_at ?? s.date ?? s.invoice_date,
        total_amount: Number(s.total_amount ?? s.total ?? s.final_amount ?? 0),
        customer_name:
          s.customer_name || s.customers?.name || s.customer?.name || "",
        invoice_items: s.invoice_items ?? s.items ?? s.lines ?? [],
        raw: s,
      }));

      setInvoiceResults(mapped.slice(0, 50));
    } catch (err) {
      console.error("Invoice search failed:", err);
      setInvoiceResults([]);
    } finally {
      setInvoiceLoading(false);
    }
  };
  useEffect(() => {
    if (modalType !== "purchaseReturn") return;
    const purchaseId = formData.purchaseId;
    if (!purchaseId) {
      setPurchaseReturnProducts([]);
      return;
    }
    const found = purchases.find(
      (p: any) => String(p.id) === String(purchaseId)
    );
    const items = found?.purchase_items || found?.items;
    if (Array.isArray(items) && items.length) {
      setPurchaseReturnProducts(
        items.map((it: any) => ({
          product_id: it.product_id,
          name:
            it.products?.name || it.product_name || `Product #${it.product_id}`,
          quantityPurchased: Number(it.quantity || 0),
          cost_price: Number(it.cost_price || it.unit_cost || 0),
          tax_percent: Number(it.tax_percent || it.tax || 0),
        }))
      );
      return;
    }
    // Fallback remote fetch if local purchase object doesn't contain items
    (async () => {
      try {
        const resp = await purchaseService.getById(purchaseId);
        const remote = resp?.data?.data;
        const remoteItems = remote?.purchase_items || remote?.items;
        if (Array.isArray(remoteItems) && remoteItems.length) {
          setPurchaseReturnProducts(
            remoteItems.map((it: any) => ({
              product_id: it.product_id,
              name:
                it.products?.name ||
                it.product_name ||
                `Product #${it.product_id}`,
              quantityPurchased: Number(it.quantity || 0),
              cost_price: Number(it.cost_price || it.unit_cost || 0),
              tax_percent: Number(it.tax_percent || it.tax || 0),
            }))
          );
        } else setPurchaseReturnProducts([]);
      } catch (err) {
        console.error("Failed to fetch purchase items", err);
        setPurchaseReturnProducts([]);
      }
    })();
  }, [modalType, formData.purchaseId, purchases]);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                      step="1"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.quantity ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity:
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value) || 0,
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
                      step="1"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.reorderLevel ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reorderLevel:
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value) || 0,
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
                      step="1"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.maxStock ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxStock:
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value) || 0,
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
                        step="1"
                        placeholder="Qty"
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        value={sp.qty}
                        onChange={(e) => {
                          const updated = [...saleProducts];
                          updated[idx].qty =
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value) || 1;
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
                {/* Step 1: Select Invoice */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Original Invoice *
                  </label>

                  {/* Searchable invoice picker: calls invoices API (supports api key via localStorage 'search_api_key') */}
                  <div>
                    <div className="flex items-center w-full sm:w-64">
                      <input
                        type="search"
                        value={invoiceQuery}
                        onChange={(e) => setInvoiceQuery(e.target.value)}
                        placeholder="Search invoices by number, customer, or product"
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => searchInvoices(invoiceQuery)}
                        className="ml-2 flex-shrink-0 flex items-center px-3"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Search</span>
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-md bg-white mt-2">
                      {invoiceLoading ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Searching...
                        </div>
                      ) : invoiceResults.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No invoices
                        </div>
                      ) : (
                        invoiceResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const idStr = String(s.id);
                              setFormData({
                                ...formData,
                                originalSaleId: idStr,
                              });
                              // keep a local copy of the selected invoice from search results
                              setSelectedInvoiceLocal(s.raw || s);
                              setReturnItems([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-muted/30 text-sm flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">
                                Invoice #{s.invoice_number}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {s.created_at
                                  ? new Date(s.created_at).toLocaleDateString(
                                      "en-GB",
                                      { day: "2-digit", month: "short" }
                                    )
                                  : "N/A"}
                                {s.customer_name ? ` • ${s.customer_name}` : ""}
                              </div>
                            </div>
                            <div className="text-sm font-semibold">
                              AED {Number(s.total_amount || 0).toFixed(2)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 2: Show Invoice Items if invoice selected */}
                {formData.originalSaleId &&
                  (() => {
                    // try to resolve the selected invoice from multiple sources:
                    // 1) `sales` prop (loaded list), 2) local invoiceResults search, 3) selectedInvoiceLocal
                    const selectedInvoice =
                      sales.find(
                        (s) => String(s.id) === String(formData.originalSaleId)
                      ) ||
                      invoiceResults.find(
                        (r) => String(r.id) === String(formData.originalSaleId)
                      )?.raw ||
                      selectedInvoiceLocal;

                    const invoiceItems =
                      selectedInvoice?.invoice_items ||
                      selectedInvoice?.items ||
                      [];

                    return invoiceItems.length > 0 ? (
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Items from this Sale
                        </h3>
                        <div className="space-y-2">
                          {invoiceItems.map((item, idx) => {
                            const productId =
                              item.product_id || item.products?.id;
                            const productName =
                              item.products?.name ||
                              item.product_name ||
                              `Product #${productId}`;
                            const qtySold = Number(item.quantity || 0);
                            const itemPrice = Number(
                              item.net_price ||
                                item.price ||
                                item.selling_price ||
                                0
                            );
                            const itemTotal = Number(
                              item.total || itemPrice * qtySold
                            );

                            // Check if this item is in returnItems
                            const returnItemIndex = returnItems.findIndex(
                              (ri) => String(ri.productId) === String(productId)
                            );
                            const isSelected = returnItemIndex >= 0;
                            const returnItem = isSelected
                              ? returnItems[returnItemIndex]
                              : null;

                            return (
                              <div
                                key={idx}
                                className={`grid grid-cols-12 gap-2 p-3 border rounded-md items-center ${
                                  isSelected
                                    ? "bg-primary/5 border-primary"
                                    : "bg-background"
                                }`}
                              >
                                {/* Checkbox */}
                                <div className="col-span-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setReturnItems([
                                          ...returnItems,
                                          {
                                            productId: String(productId),
                                            qty: 1,
                                            reason: "",
                                          },
                                        ]);
                                      } else {
                                        setReturnItems(
                                          returnItems.filter(
                                            (ri) =>
                                              String(ri.productId) !==
                                              String(productId)
                                          )
                                        );
                                      }
                                    }}
                                    className="w-4 h-4 cursor-pointer"
                                  />
                                </div>

                                {/* Product Info */}
                                <div className="col-span-5">
                                  <div className="font-medium text-sm">
                                    {productName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Sold: {qtySold} @ AED {itemPrice.toFixed(2)}{" "}
                                    = AED {itemTotal.toFixed(2)}
                                  </div>
                                </div>

                                {/* Return Qty Input */}
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max={qtySold}
                                    step="1"
                                    disabled={!isSelected}
                                    value={returnItem?.qty ?? ""}
                                    onChange={(e) => {
                                      const updated = [...returnItems];
                                      const value =
                                        e.target.value === ""
                                          ? ""
                                          : parseInt(e.target.value) || 1;
                                      updated[returnItemIndex].qty =
                                        value === ""
                                          ? ""
                                          : Math.min(value, qtySold);
                                      setReturnItems(updated);
                                    }}
                                    placeholder="Qty"
                                    className="w-full px-2 py-1 border rounded text-sm"
                                  />
                                </div>

                                {/* Reason Input */}
                                <div className="col-span-4">
                                  <input
                                    type="text"
                                    disabled={!isSelected}
                                    required={isSelected}
                                    value={returnItem?.reason || ""}
                                    onChange={(e) => {
                                      const updated = [...returnItems];
                                      updated[returnItemIndex].reason =
                                        e.target.value;
                                      setReturnItems(updated);
                                    }}
                                    placeholder="Reason (e.g., damaged, expired)"
                                    className="w-full px-2 py-1 border rounded text-sm"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {returnItems.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-2 text-center">
                            Select items above to return
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-lg p-4 bg-muted/20 text-center text-sm text-muted-foreground">
                        No items found in this invoice
                      </div>
                    );
                  })()}

                {/* Step 3: Refund Method Selection */}
                {formData.originalSaleId && returnItems.length > 0 && (
                  <div className="border rounded-lg p-4 bg-background">
                    <h3 className="font-semibold text-sm mb-3">
                      Refund Method *
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <input
                          type="radio"
                          name="refundType"
                          value="cash"
                          checked={formData.refundType === "cash"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              refundType: e.target.value,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Cash Refund</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <input
                          type="radio"
                          name="refundType"
                          value="credit_note"
                          checked={formData.refundType === "credit_note"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              refundType: e.target.value,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Credit Note</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <input
                          type="radio"
                          name="refundType"
                          value="replacement"
                          checked={formData.refundType === "replacement"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              refundType: e.target.value,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Replacement</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 4: Refund Summary */}
                {formData.originalSaleId && returnItems.length > 0 && (
                  <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Refund Summary
                    </h3>
                    <div className="space-y-2">
                      {refundComputation.length > 0 && (
                        <div className="text-xs space-y-1 pb-2 border-b">
                          {refundComputation.map((line, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-muted-foreground">
                                {line.name} × {line.qty} @ AED{" "}
                                {line.netPrice.toFixed(2)}
                              </span>
                              <span className="font-medium">
                                AED {line.lineTotal.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-bold">Total Refund Amount:</span>
                        <span className="font-bold text-xl text-primary">
                          AED {totalRefund.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modalType === "purchaseReturn" && (
              <div className="space-y-4">
                {/* Supplier & Purchase Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Supplier *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.supplierId || ""}
                      onChange={(e) => {
                        const sup = suppliers.find(
                          (s: any) => String(s.id) === e.target.value
                        );
                        setFormData({
                          ...formData,
                          supplierId: e.target.value,
                          supplierName: sup?.name || "",
                          purchaseId: "",
                        });
                        setReturnItems([]);
                      }}
                    >
                      <option value="">Select Supplier...</option>
                      {suppliers.map((sup: any) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.supplierId && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Purchase Order *
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                        value={formData.purchaseId || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchaseId: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Purchase...</option>
                        {purchases
                          .filter(
                            (p: any) =>
                              String(p.supplier_id) ===
                              String(formData.supplierId)
                          )
                          .map((p: any) => (
                            <option key={p.id} value={p.id}>
                              PO #{p.invoice_number || p.id}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Return Items */}
                {formData.purchaseId && (
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Return Items *</h3>
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
                    {returnItems.map((ri, idx) => {
                      const purchased = purchaseReturnProducts.find(
                        (pr: any) =>
                          String(pr.product_id) === String(ri.productId)
                      );
                      const inventoryMatch = products.find(
                        (p: any) =>
                          String(p.product_id) === String(ri.productId) ||
                          String(p.id) === String(ri.productId)
                      );
                      const maxReturn = Math.min(
                        Number(purchased?.quantityPurchased || 0),
                        Number(inventoryMatch?.quantity || 0)
                      );
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 p-3 border rounded-md bg-background"
                        >
                          <div className="col-span-12 sm:col-span-5">
                            <select
                              required
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                              value={ri.productId}
                              onChange={(e) => {
                                const upd = [...returnItems];
                                upd[idx].productId = e.target.value;
                                upd[idx].qty = 1;
                                setReturnItems(upd);
                              }}
                            >
                              <option value="">Select Product</option>
                              {purchaseReturnProducts.map((pr: any) => (
                                <option
                                  key={pr.product_id}
                                  value={pr.product_id}
                                >
                                  {pr.name} (Purchased: {pr.quantityPurchased})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <input
                              type="number"
                              min={1}
                              max={maxReturn || 1}
                              step="1"
                              disabled={!ri.productId}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                              value={ri.qty ?? ""}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ""
                                    ? ""
                                    : parseInt(e.target.value) || 1;
                                const upd = [...returnItems];
                                upd[idx].qty =
                                  val === ""
                                    ? ""
                                    : Math.min(val, maxReturn || 1);
                                setReturnItems(upd);
                              }}
                            />
                            {ri.productId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Max: {maxReturn}
                              </p>
                            )}
                          </div>
                          <div className="col-span-6 sm:col-span-4">
                            <select
                              required
                              disabled={!ri.productId}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                              value={ri.reason}
                              onChange={(e) => {
                                const upd = [...returnItems];
                                upd[idx].reason = e.target.value;
                                setReturnItems(upd);
                              }}
                            >
                              <option value="">Reason...</option>
                              <option value="damaged">Damaged</option>
                              <option value="expired">Expired</option>
                              <option value="wrong_product">
                                Wrong Product
                              </option>
                              <option value="excess_stock">Excess Stock</option>
                              <option value="quality_issue">
                                Quality Issue
                              </option>
                            </select>
                          </div>
                          <div className="col-span-12 sm:col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setReturnItems(
                                  returnItems.filter((_, i) => i !== idx)
                                )
                              }
                              className="w-full"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {returnItems.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Click "Add Item" to start adding return items
                      </p>
                    )}
                  </div>
                )}

                {/* Refund Method */}
                {formData.purchaseId && returnItems.length > 0 && (
                  <div className="border rounded-lg p-4 bg-background space-y-2">
                    <h3 className="font-semibold text-sm mb-2">
                      Refund Method *
                    </h3>
                    {["cash", "credit_note", "account"].map((m) => (
                      <label
                        key={m}
                        className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50 text-sm"
                      >
                        <input
                          type="radio"
                          name="refundMethod"
                          value={m}
                          checked={formData.refundMethod === m}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              refundMethod: e.target.value,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="capitalize">
                          {m.replace("_", " ")}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Refund Summary */}
                {formData.purchaseId && returnItems.length > 0 && (
                  <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Refund Summary
                    </h3>
                    {(() => {
                      let refundTotal = 0;
                      let lines: {
                        name: string;
                        qty: number;
                        cost: number;
                        vat: number;
                        subtotal: number;
                      }[] = [];
                      returnItems.forEach((ri) => {
                        if (!ri.productId || !ri.qty) return;
                        const purchased = purchaseReturnProducts.find(
                          (pi: any) =>
                            String(pi.product_id) === String(ri.productId)
                        );
                        const fallback = products.find(
                          (p: any) =>
                            String(p.product_id) === String(ri.productId) ||
                            String(p.id) === String(ri.productId)
                        );
                        const name =
                          purchased?.name ||
                          fallback?.name ||
                          `Product #${ri.productId}`;
                        const cost = Number(
                          purchased?.cost_price ||
                            fallback?.cost_price ||
                            fallback?.costPrice ||
                            0
                        );
                        const taxP = Number(
                          purchased?.tax_percent ||
                            fallback?.tax_percent ||
                            fallback?.tax ||
                            0
                        );
                        const qty = Number(ri.qty);
                        const subtotal = cost * qty;
                        const vat = (subtotal * taxP) / 100;
                        refundTotal += subtotal + vat;
                        lines.push({ name, qty, cost, vat, subtotal });
                      });
                      const totalVat = lines.reduce((s, l) => s + l.vat, 0);
                      return (
                        <div className="space-y-2 text-xs">
                          {lines.map((l, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-muted-foreground">
                                {l.name} × {l.qty} @ AED {l.cost.toFixed(2)}
                              </span>
                              <span className="font-medium">
                                AED {l.subtotal.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {totalVat > 0 && (
                            <div className="flex justify-between border-t pt-1">
                              <span className="text-muted-foreground">
                                VAT Reversal
                              </span>
                              <span className="font-medium">
                                AED {totalVat.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center border-t pt-1">
                            <span className="font-bold">Total Refund:</span>
                            <span className="font-bold text-primary text-lg">
                              AED {refundTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
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
                    step="1"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.quantity ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity:
                          e.target.value === ""
                            ? ""
                            : parseInt(e.target.value) || 0,
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
// Inline searchable invoice picker component used inside Modal
const InvoicePicker = ({ sales, value, onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      // If user hasn't typed, show provided sales list (limited)
      if (!query || query.trim() === "") {
        setResults((sales || []).slice(0, 20));
        return;
      }
      setLoading(true);
      try {
        const tenantId = localStorage.getItem("tenant_id");
        const params: Record<string, any> = { search: query, limit: 20 };
        if (tenantId) params.tenant_id = tenantId;
        const resp = await invoiceService.getAll(params);
        const data = resp?.data ?? resp;
        let raw: any[] = [];
        if (data && Array.isArray(data.data)) raw = data.data;
        else if (data && Array.isArray(data.invoices)) raw = data.invoices;
        else if (Array.isArray(data)) raw = data;
        // Map to a consistent shape
        const mapped = raw.map((s: any) => ({
          id: s.id,
          invoice_number: s.invoice_number ?? s.invoiceNo ?? s.number ?? s.id,
          created_at: s.created_at ?? s.date,
          total_amount: Number(
            s.total_amount ?? s.total ?? s.final_amount ?? 0
          ),
          customer_name:
            s.customer_name || s.customers?.name || s.customer?.name,
          invoice_items: s.invoice_items ?? s.items ?? s.lines ?? [],
        }));
        if (mounted) setResults(mapped.slice(0, 50));
      } catch (err) {
        console.error("Invoice search failed:", err);
        if (mounted) setResults([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 350);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, sales]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search invoice number, customer or date"
        className="w-full px-3 py-2 border rounded-md bg-background text-sm mb-2"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
        {loading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Searching...
          </div>
        ) : results.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No invoices
          </div>
        ) : (
          results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(String(s.id))}
              className="w-full text-left px-3 py-2 hover:bg-muted/30 text-sm flex justify-between items-center"
            >
              <div>
                <div className="font-medium">Invoice #{s.invoice_number}</div>
                <div className="text-xs text-muted-foreground">
                  {s.created_at
                    ? new Date(s.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "N/A"}
                  {s.customer_name ? ` • ${s.customer_name}` : ""}
                </div>
              </div>
              <div className="text-sm font-semibold">
                AED {Number(s.total_amount || 0).toFixed(2)}
              </div>
            </button>
          ))
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
  onEdit = () => {},
  onDelete = () => {},
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
          {/* <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3 w-3" />
          </Button> */}
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
                {/* <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Actions
                </th> */}
              </tr>
            </thead>
            <tbody>
              {isLoading ? ( // Show spinner when loading
                <tr>
                  <td colSpan={11} className="text-center py-12">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? ( // Show empty message when no products
                <tr>
                  <td
                    colSpan={11}
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
                    // onEdit={(item) => openModal("inventory", item)}
                    // onDelete={handleDelete}
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
const SalesView = ({
  sales,
  openModal,
  handleDelete,
  salesQuery,
  setSalesQuery,
  loadSales,
  salesPage,
  salesTotalPages,
  salesTotalRecords,
  pageSize,
}) => {
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

  // local salesQuery live-binding to parent state via DOM - parent handles fetching
  // no-op here; parent Inventory will manage actual search

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Sales Transactions ({sales.length})
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="relative flex-1 sm:flex-none">
              <input
                value={salesQuery}
                onChange={(e) => setSalesQuery(e.target.value)}
                placeholder="Search invoices by number, customer, or product"
                className="w-full sm:w-64 px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                onClick={() => loadSales(salesQuery)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
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
                    colSpan={6}
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
                          {/* <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete("sale", sale.id)}
                            title="Delete sale"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button> */}
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(sale.id) && sale.invoice_items && (
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="py-3 px-2 sm:px-4">
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
// Debounce salesQuery changes to avoid too-frequent API calls
function useDebouncedEffect(value, delay, callback) {
  useEffect(() => {
    const id = setTimeout(() => callback(value), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
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
                      colSpan={6}
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
                        {Array.isArray(ret.items) && ret.items.length
                          ? ret.items
                              .map((i) => `${i.name} (${i.qty})`)
                              .join(", ")
                          : `${ret.productName || "—"} (${ret.quantity || 0})` +
                            (ret.reason ? ` - ${ret.reason}` : "")}
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
                      colSpan={5}
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
                  colSpan={6}
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
  const navigate = useNavigate();
  const location = useLocation();

  // Read tab from URL path
  const getInitialTab = () => {
    const path = location.pathname;
    // Valid tabs: stock, sales, purchases, sales returns, purchase returns, adjustments
    if (path.includes("/inventory/sales-returns")) return "sales returns";
    if (path.includes("/inventory/purchase-returns")) return "purchase returns";
    if (path.includes("/inventory/sales")) return "sales";
    if (path.includes("/inventory/purchases")) return "purchases";
    if (path.includes("/inventory/adjustments")) return "adjustments";
    return "stock"; // default to stock
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Update URL when tab changes
  useEffect(() => {
    const tabRoutes = {
      stock: "/inventory",
      sales: "/inventory/sales",
      purchases: "/inventory/purchases",
      "sales returns": "/inventory/sales-returns",
      "purchase returns": "/inventory/purchase-returns",
      adjustments: "/inventory/adjustments",
    };
    const currentRoute = tabRoutes[activeTab] || "/inventory";
    if (location.pathname !== currentRoute) {
      navigate(currentRoute, { replace: true });
    }
  }, [activeTab, navigate, location.pathname]);
  const [products, setProducts] = useState([]);
  const [baseInventory, setBaseInventory] = useState([]); // raw inventory snapshot prior to derived adjustments
  const [isLoading, setIsLoading] = useState(true);
  const [productCatalog, setProductCatalog] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [salesQuery, setSalesQuery] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [salesTotalRecords, setSalesTotalRecords] = useState(0);
  const SALES_PAGE_SIZE = 10;
  const [salesReturns, setSalesReturns] = useState([]);
  const [salesReturnsPage, setSalesReturnsPage] = useState(1);
  const [salesReturnsTotalPages, setSalesReturnsTotalPages] = useState(1);
  const [salesReturnsTotalRecords, setSalesReturnsTotalRecords] = useState(0);
  const SALES_RETURNS_PAGE_SIZE = 10;
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesTotalPages, setPurchasesTotalPages] = useState(1);
  const [purchasesTotalRecords, setPurchasesTotalRecords] = useState(0);
  const PURCHASES_PAGE_SIZE = 10;
  const [purchaseReturnsPage, setPurchaseReturnsPage] = useState(1);
  const [purchaseReturnsTotalPages, setPurchaseReturnsTotalPages] = useState(1);
  const [purchaseReturnsTotalRecords, setPurchaseReturnsTotalRecords] =
    useState(0);
  const PURCHASE_RETURNS_PAGE_SIZE = 10;
  const [purchaseReturns, setPurchaseReturns] = useState<UIPurchaseReturn[]>(
    []
  );
  const [submitting, setSubmitting] = useState(false);

  // Add function to load purchases
  // Update your loadPurchases function to match the actual API response

  const loadSales = async (search = "", page = 1) => {
    try {
      // Build params for backend pagination
      const tenantId = localStorage.getItem("tenant_id");
      const params: Record<string, any> = {
        page,
        limit: SALES_PAGE_SIZE,
      };
      if (search) params.search = search;
      if (tenantId) params.tenant_id = tenantId;

      console.log("Loading sales with params:", params);

      // invoiceService.getAll accepts params object
      const response = await invoiceService.getAll(params);
      console.log("Invoices API response:", response);

      const apiData = response?.data ?? response;
      let rawData: any[] = [];

      // Normalize common shapes
      if (apiData && apiData.success && Array.isArray(apiData.data)) {
        rawData = apiData.data;
      } else if (apiData && Array.isArray(apiData.invoices)) {
        rawData = apiData.invoices;
      } else if (Array.isArray(apiData)) {
        rawData = apiData;
      } else if (apiData && Array.isArray(apiData.data?.data)) {
        rawData = apiData.data.data;
      }

      // Format into UI-friendly shape
      const formatted = rawData.map((s: any) => ({
        id: s.id,
        invoice_number: s.invoice_number ?? s.invoiceNo ?? s.number ?? s.id,
        created_at: s.created_at ?? s.date,
        invoice_items: s.invoice_items ?? s.items ?? s.lines ?? [],
        total_amount: Number(s.total_amount ?? s.total ?? s.final_amount ?? 0),
        payment_method: s.payment_method ?? s.payment ?? s.method ?? "",
        ...s,
      }));

      setSales(formatted);

      // Extract pagination metadata if present
      const total =
        apiData?.totalRecords ?? apiData?.total ?? apiData?.count ?? 0;
      const totalPages =
        apiData?.totalPages ??
        Math.max(1, Math.ceil((total || 0) / SALES_PAGE_SIZE));
      setSalesPage(apiData?.page || page);
      setSalesTotalPages(totalPages);
      setSalesTotalRecords(total || 0);

      console.log("Sales Pagination State:", {
        salesPage: apiData?.page || page,
        salesTotalPages: totalPages,
        salesTotalRecords: total || 0,
        SALES_PAGE_SIZE,
      });

      if (formatted.length === 0) {
        // optional: show toast for empty
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
  // call initial load
  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search input -> call loadSales
  useEffect(() => {
    const id = setTimeout(() => {
      loadSales(salesQuery);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesQuery]);
  const loadPurchases = async (page = 1) => {
    try {
      const tenantId = localStorage.getItem("tenant_id");
      const params: Record<string, any> = { page, limit: PURCHASES_PAGE_SIZE };
      if (tenantId) params.tenant_id = tenantId;

      const response = await purchaseService.getAll(params);
      console.log("Purchases API response:", response);

      const apiData = response?.data;
      let rawData: any[] = [];

      if (apiData && Array.isArray(apiData.data)) {
        rawData = apiData.data;
      } else if (apiData && Array.isArray(apiData.purchases)) {
        rawData = apiData.purchases;
      } else if (Array.isArray(apiData)) {
        rawData = apiData;
      }

      // If backend already formatted items as in your controller, use them directly
      const formatted = rawData.map((p: any) => ({
        id: p.id,
        invoice_number: p.invoice_number || p.invoiceNo || p.invoice_number,
        supplier_id: p.supplier_id || p.supplierId,
        total_amount: p.total_amount || p.total || 0,
        created_at: p.created_at || p.date,
        items: p.items || p.purchase_items || p.purchase_items || [],
        items_count:
          p.items_count ?? (p.purchase_items ? p.purchase_items.length : 0),
      }));

      setPurchases(formatted);

      const total = apiData?.totalRecords ?? apiData?.count ?? 0;
      const totalPages =
        apiData?.totalPages ??
        Math.max(1, Math.ceil((total || 0) / PURCHASES_PAGE_SIZE));
      setPurchasesPage(apiData?.page || page);
      setPurchasesTotalPages(totalPages);
      setPurchasesTotalRecords(total || 0);

      if (formatted.length === 0) {
        toast({
          title: "No Purchases",
          description: "Fetched 0 purchase records.",
        });
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
    loadSuppliers();
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
      // productService.getAll normalizes and returns an array, but some callers
      // may return an object with a `data` property. Handle both shapes.
      const catalog = data?.data ?? data ?? [];
      console.log("Product catalog loaded:", catalog);
      setProductCatalog(Array.isArray(catalog) ? catalog : []);
    } catch (error) {
      console.error("Error loading products:", error);
      setProductCatalog([]);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await supplierService.getAll();
      console.log("Suppliers loaded:", response);
      setSuppliers(response.data || []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      setSuppliers([]);
    }
  };

  const loadSalesReturns = async (page = 1) => {
    try {
      const params: Record<string, any> = {
        page,
        limit: SALES_RETURNS_PAGE_SIZE,
      };
      const tenantId = localStorage.getItem("tenant_id");
      if (tenantId) params.tenant_id = tenantId;

      const response = await salesReturnService.getAll(params);
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
              const formattedFallback = fbData.map((ret: any) => {
                // prefer detailed items when backend provides them
                const items =
                  Array.isArray(ret.sales_return_items) &&
                  ret.sales_return_items.length
                    ? ret.sales_return_items.map((it: any) => ({
                        name:
                          it?.products?.name ??
                          it?.name ??
                          it?.product_name ??
                          `Product #${
                            it?.product_id ?? it?.products?.id ?? ""
                          }`,
                        qty: Number(it?.quantity ?? it?.qty ?? 0),
                        reason: it?.reason || it?.return_reason || "N/A",
                      }))
                    : [
                        {
                          name:
                            ret.product_name ||
                            ret.name ||
                            `Product #${ret.product_id}`,
                          qty: Number(ret.quantity || 0),
                          reason: ret.reason || ret.return_reason || "N/A",
                        },
                      ];

                return {
                  id: ret.id,
                  originalSaleId: ret.sales_id,
                  date:
                    ret.created_at ||
                    ret.return_date ||
                    ret.date ||
                    new Date().toISOString().split("T")[0],
                  productName: items[0]?.name || `Product #${ret.product_id}`,
                  productId: ret.product_id,
                  quantity: items.reduce(
                    (s: number, it: any) => s + (Number(it.qty) || 0),
                    0
                  ),
                  reason:
                    items
                      .map((it: any) => it.reason)
                      .filter(Boolean)
                      .join("; ") || "N/A",
                  refundType: ret.refund_type || ret.type || "Cash",
                  totalRefund:
                    ret.total_refund || ret.refund_amount || ret.amount || 0,
                  items,
                };
              });
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
        // If backend provides detailed sales_return_items, use them
        const items =
          Array.isArray(ret.sales_return_items) && ret.sales_return_items.length
            ? ret.sales_return_items.map((it: any) => ({
                name:
                  it?.products?.name ??
                  it?.name ??
                  it?.product_name ??
                  `Product #${it?.product_id ?? it?.products?.id ?? ""}`,
                qty: Number(it?.quantity ?? it?.qty ?? 0),
                reason: it?.reason || it?.return_reason || "N/A",
              }))
            : [
                {
                  name:
                    ret.product_name ||
                    ret.name ||
                    `Product #${ret.product_id}`,
                  qty: Number(ret.quantity || 0),
                  reason: ret.reason || ret.return_reason || "N/A",
                },
              ];

        return {
          id: ret.id,
          originalSaleId: ret.sales_id,
          date:
            ret.created_at ||
            ret.return_date ||
            ret.date ||
            new Date().toISOString().split("T")[0],
          productName: items[0]?.name || `Product #${ret.product_id}`,
          productId: ret.product_id,
          quantity: items.reduce(
            (s: number, it: any) => s + (Number(it.qty) || 0),
            0
          ),
          reason:
            items
              .map((it: any) => it.reason)
              .filter(Boolean)
              .join("; ") || "N/A",
          refundType: ret.refund_type || ret.type || "Cash",
          totalRefund: ret.total_refund || ret.refund_amount || ret.amount || 0,
          items,
        };
      });

      console.log("Sales Returns formatted (UI) objects:", formattedData);
      setSalesReturns(formattedData);

      // set pagination metadata if provided by backend
      const total = apiData?.totalRecords ?? apiData?.count ?? 0;
      const totalPages =
        apiData?.totalPages ??
        Math.max(1, Math.ceil((total || 0) / SALES_RETURNS_PAGE_SIZE));
      setSalesReturnsPage(apiData?.page || page);
      setSalesReturnsTotalPages(totalPages);
      setSalesReturnsTotalRecords(total || 0);

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

  const loadPurchaseReturns = async (page = 1) => {
    try {
      const params: Record<string, any> = {
        page,
        limit: PURCHASE_RETURNS_PAGE_SIZE,
      };

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

        // Get amount from backend fields
        const amount = Number(
          ret.total_refund || ret.refund_amount || ret.amount || 0
        );

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
          amountAdjusted: amount,
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

      // Set pagination metadata if available from backend
      const total = apiData?.totalRecords ?? apiData?.count ?? 0;
      const totalPages =
        apiData?.totalPages ??
        Math.max(1, Math.ceil((total || 0) / PURCHASE_RETURNS_PAGE_SIZE));
      setPurchaseReturnsPage(apiData?.page || page);
      setPurchaseReturnsTotalPages(totalPages);
      setPurchaseReturnsTotalRecords(total || 0);

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
      // backend may return { data: [...] } or an array directly
      const raw = data?.data ?? (Array.isArray(data) ? data : []);

      // Normalize inventory item shape to what StockView expects
      const items = raw.map((it: any, idx: number) => {
        const productObj = it.products ?? it.product ?? {};

        const categoryName =
          (it.categories &&
            (it.categories.name ??
              (Array.isArray(it.categories) && it.categories[0]?.name))) ||
          productObj.categories?.name ||
          productObj.category ||
          it.category ||
          "Uncategorized";

        const name = it.name ?? productObj.name ?? it.product_name ?? "";
        const brand = it.brand ?? productObj.brand ?? "";
        const unit = it.unit ?? productObj.unit ?? "";
        const quantity = Number(it.quantity ?? it.qty ?? it.available ?? 0);
        const reorderLevel = Number(
          it.reorderLevel ?? it.reorder_level ?? it.reorder ?? 0
        );
        const maxStock = Number(it.maxStock ?? it.max_stock ?? it.max ?? 0);
        const cost_price = Number(
          it.cost_price ??
            it.costPrice ??
            productObj.cost_price ??
            productObj.unit_cost ??
            0
        );
        const selling_price = Number(
          it.selling_price ??
            it.sellingPrice ??
            productObj.selling_price ??
            productObj.price ??
            0
        );
        const expiryDate = it.expiryDate ?? it.expiry_date ?? it.expiry ?? "";

        return {
          // canonical ids
          id: it.id ?? it.product_id ?? productObj.id ?? `inv-${idx}`,
          product_id: it.product_id ?? productObj.id ?? undefined,
          // normalized display fields
          name,
          brand,
          category: categoryName,
          unit,
          quantity,
          reorderLevel,
          maxStock,
          cost_price,
          selling_price,
          expiryDate,
          sku: it.sku ?? productObj.sku ?? "",
          // include raw payload for any downstream needs
          _raw: it,
        } as any;
      });

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

  // use shared `normalizeItems` from utils

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
          break;
        case "purchaseReturn":
          setFormData({
            purchaseId: "",
            supplierId: "",
            refundMethod: "cash",
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
        default:
          break;
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
          // Accept multiple possible shapes for returnItems (qty/quantity, productId/product_id, reason/return_reason)
          const itemsPayload = (returnItems || [])
            .map((it) => ({
              product_id:
                parseInt(
                  it.productId ?? it.product_id ?? it.product?.id ?? ""
                ) || undefined,
              quantity: parseInt(String(it.qty ?? it.quantity ?? 0)) || 0,
              reason: it.reason ?? it.return_reason ?? it.refund_reason ?? "",
            }))
            .filter((it) => it.product_id && it.quantity > 0);

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
            const lineRefund = netPrice * it.quantity;
            return {
              id: Date.now() + idx,
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
          const firstRefundAmount = firstNetPrice * firstItem.quantity;
          // Backend expects invoice_id and an items[] array. Build items payload.
          const tenantId = localStorage.getItem("tenant_id");
          const itemsForPayload = itemsPayload.map((it: any) => {
            const invoiceItemMatch = selectedSaleForSubmit?.invoice_items?.find(
              (ii: any) =>
                String(ii.product_id) === String(it.product_id) ||
                String(ii.products?.id) === String(it.product_id)
            );
            const productMatch = products.find(
              (p: any) =>
                String(p.product_id) === String(it.product_id) ||
                String(p.id) === String(it.product_id)
            );
            const netPriceRaw =
              invoiceItemMatch?.net_price ??
              invoiceItemMatch?.price ??
              invoiceItemMatch?.selling_price ??
              (invoiceItemMatch?.total && invoiceItemMatch?.quantity
                ? invoiceItemMatch.total / invoiceItemMatch.quantity
                : 0);
            const netPrice = Number(netPriceRaw) || 0;
            const taxPercent = Number(
              invoiceItemMatch?.tax_percent ?? invoiceItemMatch?.tax ?? 0
            );
            const lineRefund = netPrice * it.quantity;
            return {
              product_id: it.product_id,
              product_name:
                productMatch?.name ||
                invoiceItemMatch?.products?.name ||
                `Product #${it.product_id}`,
              sku: productMatch?.sku || invoiceItemMatch?.products?.sku || "",
              quantity: it.quantity,
              unit_price: Number(netPrice.toFixed(2)),
              tax_percent: taxPercent,
              // include multiple reason key variants for backend compatibility
              reason: it.reason || "",
              return_reason: it.reason || "",
              refund_reason: it.reason || "",
              total_refund: Number(lineRefund.toFixed(2)),
              line_total: Number(lineRefund.toFixed(2)),
            };
          });

          console.log(
            "itemsForPayload:",
            JSON.stringify(itemsForPayload, null, 2)
          );

          const totalRefundSum = itemsForPayload.reduce(
            (s: number, it: any) => s + (Number(it.total_refund) || 0),
            0
          );

          const payload = {
            invoice_id: parseInt(formData.originalSaleId),
            invoice_number:
              selectedSaleForSubmit?.invoice_number ||
              selectedSaleForSubmit?.number ||
              null,
            customer_id:
              selectedSaleForSubmit?.customer_id ||
              selectedSaleForSubmit?.customer?.id ||
              selectedSaleForSubmit?.customers?.id ||
              null,
            items: itemsForPayload,
            // overall totals for convenience / compatibility
            total_refund: Number(totalRefundSum.toFixed(2)),
            refund_amount: Number(totalRefundSum.toFixed(2)),
            // include a top-level reason and refund_type for backends that expect them
            reason:
              (itemsForPayload &&
                itemsForPayload.length === 1 &&
                itemsForPayload[0].reason) ||
              formData.reason ||
              (itemsForPayload || [])
                .map((i: any) => i.reason)
                .filter(Boolean)
                .join("; ") ||
              "",
            refund_type: formData.refundType || formData.refund_type || "cash",
            processed_by: user?.id ?? user?.user_id ?? null,
            created_by: user?.id ?? null,
            ...(tenantId ? { tenant_id: tenantId } : {}),
          };

          console.log(
            "Sales Return Payload:",
            JSON.stringify(payload, null, 2)
          );

          // Submit to backend - backend performs atomic inventory update
          const response = await salesReturnService.create(payload);
          const ok =
            response?.data?.success !== false && response?.status < 400;

          if (ok) {
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
          // Log server response body when available to aid debugging
          console.error(
            "Server response body:",
            (error as any)?.response?.data
          );
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

          if (!formData.supplierId) {
            toast({
              title: "Missing Supplier",
              description: "Please select the supplier.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }
          if (!formData.purchaseId) {
            toast({
              title: "Missing Purchase Order",
              description: "Please select the original purchase order.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          const itemsPayload = (returnItems || [])
            .filter((it) => it.productId && it.qty)
            .map((it) => ({
              product_id: parseInt(it.productId),
              quantity: parseInt(String(it.qty) || "0"),
              reason: it.reason || "",
            }));

          if (itemsPayload.length === 0) {
            toast({
              title: "No Items",
              description: "Add at least one return item.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }

          // Optimistic UI entries with cost+VAT calculation
          const nowISO = new Date().toISOString();
          const optimisticEntries = itemsPayload.map((it, idx) => {
            const productMatch = products.find(
              (p: any) =>
                String(p.product_id) === String(it.product_id) ||
                String(p.id) === String(it.product_id)
            );
            const costPrice = Number(
              productMatch?.cost_price || productMatch?.costPrice || 0
            );
            const taxPercent = Number(
              productMatch?.tax_percent || productMatch?.tax || 0
            );
            const lineSubtotal = costPrice * it.quantity;
            const lineVat = (lineSubtotal * taxPercent) / 100;
            const lineTotal = lineSubtotal + lineVat;
            return {
              id: Date.now() + idx,
              supplierId: parseInt(formData.supplierId),
              supplierName:
                formData.supplierName || `Supplier #${formData.supplierId}`,
              date: nowISO,
              productName: productMatch?.name || `Product #${it.product_id}`,
              productId: it.product_id,
              quantity: it.quantity,
              reason: it.reason || "N/A",
              refundMethod: formData.refundMethod || "cash",
              amountAdjusted: lineTotal,
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
          const firstProduct = products.find(
            (p: any) =>
              String(p.product_id) === String(firstItem.product_id) ||
              String(p.id) === String(firstItem.product_id)
          );
          const firstCostPrice = Number(
            firstProduct?.cost_price || firstProduct?.costPrice || 0
          );
          const firstTaxPercent = Number(
            firstProduct?.tax_percent || firstProduct?.tax || 0
          );
          const firstSubtotal = firstCostPrice * firstItem.quantity;
          const firstVat = (firstSubtotal * firstTaxPercent) / 100;
          const firstTotalRefund = firstSubtotal + firstVat;

          const payload = {
            purchase_id: parseInt(formData.purchaseId),
            supplier_id: parseInt(formData.supplierId),
            product_id: firstItem.product_id,
            quantity: firstItem.quantity,
            refund_method: (formData.refundMethod || "cash").toLowerCase(),
            reason: firstItem.reason || "",
            total_refund: Number(firstTotalRefund.toFixed(2)),
          };

          console.log(
            "Purchase Return Payload:",
            JSON.stringify(payload, null, 2)
          );
          const response = await purchaseReturnService.create(payload);
          const ok = response?.data?.purchase_return || response?.data;
          if (ok) {
            if (itemsPayload.length > 1) {
              for (let i = 1; i < itemsPayload.length; i++) {
                const extra = itemsPayload[i];
                const extraProduct = products.find(
                  (p: any) =>
                    String(p.product_id) === String(extra.product_id) ||
                    String(p.id) === String(extra.product_id)
                );
                const extraCostPrice = Number(
                  extraProduct?.cost_price || extraProduct?.costPrice || 0
                );
                const extraTaxPercent = Number(
                  extraProduct?.tax_percent || extraProduct?.tax || 0
                );
                const extraSubtotal = extraCostPrice * extra.quantity;
                const extraVat = (extraSubtotal * extraTaxPercent) / 100;
                const extraTotalRefund = extraSubtotal + extraVat;
                const extraPayload = {
                  purchase_id: parseInt(formData.purchaseId),
                  supplier_id: parseInt(formData.supplierId),
                  product_id: extra.product_id,
                  quantity: extra.quantity,
                  refund_method: (
                    formData.refundMethod || "cash"
                  ).toLowerCase(),
                  reason: extra.reason || "",
                  total_refund: Number(extraTotalRefund.toFixed(2)),
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
            await loadInventory();
            await loadPurchaseReturns();
            toast({
              title: "Purchase Return Created",
              description: "Returned items subtracted from inventory.",
            });
            closeModal();
          } else {
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
          <>
            <SalesView
              sales={sales}
              openModal={openModal}
              handleDelete={handleDelete}
              salesQuery={salesQuery}
              setSalesQuery={setSalesQuery}
              loadSales={loadSales}
              salesPage={salesPage}
              salesTotalPages={salesTotalPages}
              salesTotalRecords={salesTotalRecords}
              pageSize={SALES_PAGE_SIZE}
            />
            {salesTotalRecords > SALES_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      loadSales(salesQuery, Math.max(1, salesPage - 1))
                    }
                    disabled={salesPage === 1}
                  >
                    Prev
                  </Button>

                  <span className="text-sm text-gray-500">
                    Page {salesPage} of {salesTotalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      loadSales(
                        salesQuery,
                        Math.min(salesPage + 1, salesTotalPages)
                      )
                    }
                    disabled={salesPage >= salesTotalPages}
                  >
                    Next
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {Math.min(
                    (salesPage - 1) * SALES_PAGE_SIZE + 1,
                    salesTotalRecords
                  )}
                  -{Math.min(salesPage * SALES_PAGE_SIZE, salesTotalRecords)} of{" "}
                  {salesTotalRecords}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "purchases" && (
          <PurchasesView
            purchases={purchases}
            openModal={openModal}
            handleDelete={handleDelete}
          />
        )}
        {activeTab === "purchases" &&
          purchasesTotalRecords > PURCHASES_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPurchases(Math.max(1, purchasesPage - 1))}
                  disabled={purchasesPage === 1}
                >
                  Prev
                </Button>

                <span className="text-sm text-gray-500">
                  Page {purchasesPage} of {purchasesTotalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    loadPurchases(
                      Math.min(purchasesPage + 1, purchasesTotalPages)
                    )
                  }
                  disabled={purchasesPage >= purchasesTotalPages}
                >
                  Next
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing{" "}
                {Math.min(
                  (purchasesPage - 1) * PURCHASES_PAGE_SIZE + 1,
                  purchasesTotalRecords
                )}
                -
                {Math.min(
                  purchasesPage * PURCHASES_PAGE_SIZE,
                  purchasesTotalRecords
                )}{" "}
                of {purchasesTotalRecords}
              </div>
            </div>
          )}

        {activeTab === "sales returns" && (
          <>
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
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Date
                        </th>
                        {/* <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Invoice ID
                        </th> */}
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Products
                        </th>
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Refund Type
                        </th>
                        <th className="text-right py-3 px-2 sm:px-4 font-semibold text-sm">
                          Total Refund
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReturns.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No sales returns found
                          </td>
                        </tr>
                      ) : (
                        salesReturns.map((ret) => (
                          <tr
                            key={ret.id}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="py-3 px-2 sm:px-4 text-sm">
                              {ret.date}
                            </td>
                            {/* <td className="py-3 px-2 sm:px-4 text-sm">
                              #{ret.originalSaleId}
                            </td> */}
                            <td className="py-3 px-2 sm:px-4 text-sm">
                              {normalizeItems(ret).length === 0 ? (
                                <div className="text-muted-foreground">
                                  No items
                                </div>
                              ) : (
                                normalizeItems(ret).map((item, idx) => (
                                  <div key={idx}>
                                    {item.name} (x{item.qty})
                                  </div>
                                ))
                              )}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-sm capitalize">
                              {ret.refundType}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-right text-sm font-medium">
                              AED {ret.totalRefund.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            {/* Sales Returns Pagination */}
            {salesReturnsTotalRecords > SALES_RETURNS_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      loadSalesReturns(Math.max(1, salesReturnsPage - 1))
                    }
                    disabled={salesReturnsPage === 1}
                  >
                    Prev
                  </Button>

                  <span className="text-sm text-gray-500">
                    Page {salesReturnsPage} of {salesReturnsTotalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      loadSalesReturns(
                        Math.min(salesReturnsPage + 1, salesReturnsTotalPages)
                      )
                    }
                    disabled={salesReturnsPage >= salesReturnsTotalPages}
                  >
                    Next
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {Math.min(
                    (salesReturnsPage - 1) * SALES_RETURNS_PAGE_SIZE + 1,
                    salesReturnsTotalRecords
                  )}
                  -
                  {Math.min(
                    salesReturnsPage * SALES_RETURNS_PAGE_SIZE,
                    salesReturnsTotalRecords
                  )}{" "}
                  of {salesReturnsTotalRecords}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "purchase returns" && (
          <>
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
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Date
                        </th>
                        {/* <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Supplier
                        </th> */}
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Products
                        </th>
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-sm">
                          Refund Method
                        </th>
                        <th className="text-right py-3 px-2 sm:px-4 font-semibold text-sm">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseReturns.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No purchase returns found
                          </td>
                        </tr>
                      ) : (
                        purchaseReturns.map((ret) => (
                          <tr
                            key={ret.id}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="py-3 px-2 sm:px-4 text-sm">
                              {ret.date}
                            </td>
                            {/* <td className="py-3 px-2 sm:px-4 text-sm">
                              {ret.supplierName}
                            </td> */}
                            <td className="py-3 px-2 sm:px-4 text-sm">
                              {normalizeItems(ret).length === 0 ? (
                                <div className="text-muted-foreground">
                                  No items
                                </div>
                              ) : (
                                normalizeItems(ret).map((item, idx) => (
                                  <div key={idx}>
                                    {item.name} (x{item.qty})
                                  </div>
                                ))
                              )}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-sm capitalize">
                              {ret.refundMethod}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-right text-sm font-medium">
                              AED {ret.amountAdjusted.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            {/* Purchase Returns Pagination */}
            {purchaseReturnsTotalRecords > PURCHASE_RETURNS_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      loadPurchaseReturns(Math.max(1, purchaseReturnsPage - 1))
                    }
                    disabled={purchaseReturnsPage === 1}
                  >
                    Prev
                  </Button>

                  <span className="text-sm text-gray-500">
                    Page {purchaseReturnsPage} of {purchaseReturnsTotalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      loadPurchaseReturns(
                        Math.min(
                          purchaseReturnsPage + 1,
                          purchaseReturnsTotalPages
                        )
                      )
                    }
                    disabled={purchaseReturnsPage >= purchaseReturnsTotalPages}
                  >
                    Next
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {Math.min(
                    (purchaseReturnsPage - 1) * PURCHASE_RETURNS_PAGE_SIZE + 1,
                    purchaseReturnsTotalRecords
                  )}
                  -
                  {Math.min(
                    purchaseReturnsPage * PURCHASE_RETURNS_PAGE_SIZE,
                    purchaseReturnsTotalRecords
                  )}{" "}
                  of {purchaseReturnsTotalRecords}
                </div>
              </div>
            )}
          </>
        )}

        {/* {activeTab === "adjustments" && (
          <AdjustmentsView
            stockAdjustments={stockAdjustments}
            openModal={openModal}
          />
        )} */}
      </div>

      <Modal
        showModal={showModal}
        modalType={modalType}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        products={products}
        sales={sales}
        purchases={purchases}
        saleProducts={saleProducts}
        setSaleProducts={setSaleProducts}
        purchaseProducts={purchaseProducts}
        setPurchaseProducts={setPurchaseProducts}
        returnItems={returnItems}
        setReturnItems={setReturnItems}
        onClose={closeModal}
        onSubmit={handleSubmit}
        productCatalog={productCatalog}
        suppliers={suppliers}
        submitting={submitting} // ADD THIS
      />
    </div>
  );
};

export default GroceryInventory;
