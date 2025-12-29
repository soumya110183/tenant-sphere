import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Save,
  Plus,
  DollarSign,
  Package,
  Search,
  Trash2,
} from "lucide-react";
import { PurchaseModal } from "@/pages/inventory/components/refactored/PurchaseModal";
import { invoiceService, purchaseService } from "@/services/api";

export const Modal = ({
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
  const [invoiceFocused, setInvoiceFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  // Purchase search (modal-local) for Purchase Return -> server-side search with debounce
  const [purchaseQuery, setPurchaseQuery] = useState("");
  const [purchaseResults, setPurchaseResults] = useState<any[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseFocused, setPurchaseFocused] = useState(false);
  const [purchaseHighlightedIndex, setPurchaseHighlightedIndex] = useState<number>(-1);
  const purchaseListRef = useRef<HTMLDivElement | null>(null);
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
  // Debounce live search for invoices when user types
  useEffect(() => {
    let mounted = true;
    const q = (invoiceQuery || "").trim();
    if (!q) {
      setInvoiceResults([]);
      setHighlightedIndex(-1);
      return;
    }
    const tid = setTimeout(async () => {
      if (!mounted) return;
      await searchInvoices(q);
      setHighlightedIndex(0);
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(tid);
    };
  }, [invoiceQuery]);
  // Ref for invoice results container to keep highlighted item visible
  const invoiceListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightedIndex < 0) return;
    const container = invoiceListRef.current;
    if (!container) return;
    const el = container.querySelector(
      `[data-idx="${highlightedIndex}"]`
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [highlightedIndex]);
  // Debounced search for purchases when user types in Purchase Order field
  useEffect(() => {
    let mounted = true;
    const tid = setTimeout(async () => {
      const q = (purchaseQuery || "").trim();
      if (!q) {
        if (mounted) setPurchaseResults([]);
        return;
      }
      try {
        if (mounted) setPurchaseLoading(true);
        const tenantId = localStorage.getItem("tenant_id");
        const apiKey = localStorage.getItem("search_api_key") || undefined;
        const params: Record<string, any> = { search: q, limit: 50, page: 1 };
        if (tenantId) params.tenant_id = tenantId;
        if (apiKey) params.api_key = apiKey;
        // restrict to supplier if selected
        if (formData?.supplierId) params.supplier_id = formData.supplierId;
        const resp = await purchaseService.getAll(params);
        const data = resp?.data ?? resp;
        let raw: any[] = [];
        if (data && Array.isArray(data.data)) raw = data.data;
        else if (data && Array.isArray(data.purchases)) raw = data.purchases;
        else if (Array.isArray(data)) raw = data;
        if (mounted) setPurchaseResults(raw.slice(0, 50));
      } catch (err) {
        console.warn("Purchase search failed:", err);
        if (mounted) setPurchaseResults([]);
      } finally {
        if (mounted) setPurchaseLoading(false);
      }
    }, 350);
    return () => {
      mounted = false;
      clearTimeout(tid);
    };
  }, [purchaseQuery, formData?.supplierId]);
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
                        onFocus={() => setInvoiceFocused(true)}
                        onBlur={() =>
                          setTimeout(() => setInvoiceFocused(false), 150)
                        }
                        onKeyDown={(e) => {
                          if (!invoiceResults || invoiceResults.length === 0)
                            return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setHighlightedIndex((i) =>
                              Math.min(
                                (i < 0 ? 0 : i) + 1,
                                invoiceResults.length - 1
                              )
                            );
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlightedIndex((i) =>
                              Math.max((i < 0 ? 0 : i) - 1, 0)
                            );
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const idx =
                              highlightedIndex >= 0 ? highlightedIndex : 0;
                            const sel = invoiceResults[idx];
                            if (sel) {
                              // select highlighted
                              const idStr = String(sel.id);
                              setFormData({
                                ...formData,
                                originalSaleId: idStr,
                              });
                              setSelectedInvoiceLocal(sel.raw || sel);
                              setReturnItems([]);
                              setInvoiceResults([]);
                              setInvoiceQuery(
                                sel.invoice_number ?? String(sel.id)
                              );
                              setInvoiceFocused(false);
                              setHighlightedIndex(-1);
                            }
                          } else if (e.key === "Escape") {
                            setInvoiceFocused(false);
                            setHighlightedIndex(-1);
                          }
                        }}
                        placeholder="Search invoices by number, customer, or product"
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                    <div
                      ref={invoiceListRef}
                      className="max-h-48 overflow-y-auto border rounded-md bg-white mt-2"
                      style={{
                        display:
                          invoiceFocused ||
                          invoiceResults.length > 0 ||
                          invoiceLoading
                            ? undefined
                            : "none",
                      }}
                    >
                      {invoiceLoading ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Searching...
                        </div>
                      ) : invoiceResults.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No invoices
                        </div>
                      ) : (
                        invoiceResults.map((s, idx) => {
                          const isActive = idx === highlightedIndex;
                          return (
                            <button
                              key={s.id}
                              data-idx={idx}
                              type="button"
                              onMouseDown={(e) => {
                                // use onMouseDown to avoid input blur before click
                                e.preventDefault();
                                const idStr = String(s.id);
                                setFormData({
                                  ...formData,
                                  originalSaleId: idStr,
                                });
                                setSelectedInvoiceLocal(s.raw || s);
                                setReturnItems([]);
                                setInvoiceResults([]);
                                setInvoiceQuery(
                                  s.invoice_number ?? String(s.id)
                                );
                                setInvoiceFocused(false);
                                setHighlightedIndex(-1);
                              }}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center ${
                                isActive
                                  ? "bg-primary/10 dark:bg-primary/600 text-foreground dark:text-white"
                                  : "hover:bg-muted/30"
                              }`}
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
                                  {s.customer_name
                                    ? ` • ${s.customer_name}`
                                    : ""}
                                </div>
                              </div>
                              <div className="text-sm font-semibold">
                                AED {Number(s.total_amount || 0).toFixed(2)}
                              </div>
                            </button>
                          );
                        })
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
                        // reset purchase search state when supplier changes
                        setPurchaseQuery("");
                        setPurchaseResults([]);
                        setPurchaseLoading(false);
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
                      <div>
                        <input
                          type="search"
                          placeholder="Search purchase orders by invoice # or reference"
                          className="w-full px-3 py-2 mb-2 border rounded-md bg-background text-sm"
                          value={purchaseQuery}
                          onChange={(e) => setPurchaseQuery(e.target.value)}
                          onFocus={() => setPurchaseFocused(true)}
                          onBlur={() => setTimeout(() => setPurchaseFocused(false), 150)}
                          onKeyDown={(e) => {
                            const list = purchaseResults || [];
                            if (list.length === 0) return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setPurchaseHighlightedIndex((i) =>
                                Math.min((i < 0 ? 0 : i) + 1, list.length - 1)
                              );
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setPurchaseHighlightedIndex((i) =>
                                Math.max((i < 0 ? 0 : i) - 1, 0)
                              );
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              const idx = purchaseHighlightedIndex >= 0 ? purchaseHighlightedIndex : 0;
                              const sel = list[idx];
                              if (sel) {
                                setFormData({ ...formData, purchaseId: String(sel.id) });
                                setPurchaseQuery(sel.invoice_number ?? String(sel.id));
                                setPurchaseResults([]);
                                setPurchaseFocused(false);
                                setPurchaseHighlightedIndex(-1);
                              }
                            } else if (e.key === "Escape") {
                              setPurchaseFocused(false);
                              setPurchaseHighlightedIndex(-1);
                            }
                          }}
                        />

                        {((purchaseQuery && (purchaseFocused || purchaseResults.length > 0)) || purchaseFocused) ? (
                          <div
                            ref={purchaseListRef}
                            className="max-h-48 overflow-y-auto border rounded-md bg-white mt-2"
                            style={{ display: purchaseLoading || purchaseResults.length > 0 ? undefined : "none" }}
                          >
                            {purchaseLoading ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                            ) : purchaseResults.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No purchases</div>
                            ) : (
                              purchaseResults.map((p, idx) => {
                                const isActive = idx === purchaseHighlightedIndex;
                                const sid = p.supplier_id ?? p.supplierId ?? p.Suppliers_id ?? p.supplier?.id;
                                if (String(sid) !== String(formData.supplierId)) return null;
                                return (
                                  <button
                                    key={p.id}
                                    data-idx={idx}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFormData({ ...formData, purchaseId: String(p.id) });
                                      setPurchaseQuery(p.invoice_number ?? String(p.id));
                                      setPurchaseResults([]);
                                      setPurchaseFocused(false);
                                      setPurchaseHighlightedIndex(-1);
                                    }}
                                    onMouseEnter={() => setPurchaseHighlightedIndex(idx)}
                                    className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center ${
                                      isActive ? "bg-primary/10 dark:bg-primary/600 text-foreground dark:text-white" : "hover:bg-muted/30"
                                    }`}
                                  >
                                    <div>
                                      <div className="font-medium">PO #{p.invoice_number ?? p.id}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "N/A"}
                                      </div>
                                    </div>
                                    <div className="text-sm font-semibold">AED {Number(p.total_amount || p.total || 0).toFixed(2)}</div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        ) : (
                          <select
                            required
                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            value={formData.purchaseId || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, purchaseId: e.target.value })
                            }
                          >
                            <option value="">Select Purchase...</option>
                            {(purchases || [])
                              .filter((p: any) => {
                                const sid = p.supplier_id ?? p.supplierId ?? p.Suppliers_id ?? p.supplier?.id ?? p.supplier_id;
                                return String(sid) === String(formData.supplierId);
                              })
                              .map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  PO #{p.invoice_number || p.id}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
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
