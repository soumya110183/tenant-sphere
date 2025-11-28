import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Type definitions for returns
const UISalesReturn = {};
const UIPurchaseReturn = {};

// Import modular components
import StatsSection from "./components/StatsSection.jsx/StatsSection";
import StockView from "./components/StockView/StockView";
import SalesView from "./components/SalesView/SalesView";
import { PurchasesView } from "@/components/inventory/components/PurchasesView";
import ReturnsView from "./components/ReturnsView/ReturnsView";
import AdjustmentsView from "./components/AdjustmentView/AdjustmentsView";
import Modal from "./components/Modal/Modal";
import TabNavigation from "./components/common/TabNavigation";
import LowStockAlert from "./components/common/LowStockAlert";

// Import your services
import {
  inventoryService,
  invoiceService,
  productService,
  purchaseService,
  salesReturnService,
  purchaseReturnService,
} from "@/services/api";

const GroceryInventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State from your original working code
  const [activeTab, setActiveTab] = useState("stock");
  const [products, setProducts] = useState([]);
  const [baseInventory, setBaseInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productCatalog, setProductCatalog] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [stockAdjustments] = useState([
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

  // Modal state from your original code
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saleProducts, setSaleProducts] = useState([{ productId: "", qty: 1 }]);
  const [purchaseProducts, setPurchaseProducts] = useState([
    { productId: "", qty: 1 },
  ]);
  const [returnItems, setReturnItems] = useState([
    { productId: "", qty: 1, reason: "" },
  ]);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Your original working functions
  const loadSales = async () => {
    try {
      const response = await invoiceService.getAll();
      console.log("Sales API Response:", response);
      if (response.data?.success && Array.isArray(response.data.data)) {
        console.log("Setting sales data:", response.data.data);
        setSales(response.data.data);
      } else {
        console.warn("Sales data not in expected format:", response);
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
      if (response.data?.success && Array.isArray(response.data.data)) {
        setPurchases(response.data.data);
      } else {
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

  const loadProducts = async () => {
    const data = await productService.getAll();
    setProductCatalog(data.data);
  };

  const loadSalesReturns = async () => {
    try {
      const tenantId = localStorage.getItem("tenant_id");
      const params = tenantId ? { tenant_id: tenantId } : {};
      console.log("Loading sales returns with params:", params);
      const response = await salesReturnService.getAll(params);
      console.log("Sales returns response:", response);
      const apiData = response?.data;
      let rawData = [];

      if (apiData?.success && Array.isArray(apiData.data)) {
        rawData = apiData.data;
      } else if (apiData?.success && Array.isArray(apiData.sales_returns)) {
        rawData = apiData.sales_returns;
      } else if (Array.isArray(apiData)) {
        rawData = apiData;
      }

      const formattedData = rawData.map((ret) => ({
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
        items: [
          {
            name: ret.product_name || ret.name || `Product #${ret.product_id}`,
            qty: ret.quantity,
            reason: ret.reason || ret.return_reason || "N/A",
          },
        ],
      }));

      setSalesReturns(formattedData);
    } catch (error) {
      console.error("Error loading sales returns:", error);
      console.error("Error response:", error?.response?.data);
      console.error("Error status:", error?.response?.status);
      // If endpoint doesn't exist (404/500), just set empty array without showing error
      if (error?.response?.status === 500 || error?.response?.status === 404) {
        console.log(
          "Sales returns endpoint not available or error, using empty array"
        );
        setSalesReturns([]);
      } else {
        setSalesReturns([]);
        toast({
          title: "Error",
          description: "Failed to load sales returns",
          variant: "destructive",
        });
      }
    }
  };

  const loadPurchaseReturns = async () => {
    try {
      const tenantId = localStorage.getItem("tenant_id");
      const params = tenantId ? { tenant_id: tenantId } : {};
      const response = await purchaseReturnService.getAll(params);
      const apiData = response?.data;
      let rawData = [];

      if (apiData && Array.isArray(apiData.purchase_returns)) {
        rawData = apiData.purchase_returns;
      } else if (Array.isArray(apiData)) {
        rawData = apiData;
      }

      const formattedData = rawData.map((ret) => {
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
          amountAdjusted: 0,
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

      setPurchaseReturns(formattedData);
    } catch (error) {
      console.error("Error loading purchase returns:", error);
      // If endpoint doesn't exist (404/500), just set empty array without showing error
      if (error?.response?.status === 500 || error?.response?.status === 404) {
        console.log(
          "Purchase returns endpoint not available, using empty array"
        );
        setPurchaseReturns([]);
      } else {
        setPurchaseReturns([]);
        toast({
          title: "Error",
          description: "Failed to load purchase returns",
          variant: "destructive",
        });
      }
    }
  };

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryService.getAll();
      const items = data.data || [];
      setBaseInventory(items);
      setProducts(items);
    } catch (error) {
      console.error("Error loading inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Your original modal functions
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);

    // Reset return items when opening return modals
    if (type === "salesReturn" || type === "purchaseReturn") {
      setReturnItems([{ productId: "", qty: 1, reason: "" }]);
      setFormData({});
    } else if (type === "purchase") {
      // Initialize purchase form data and items for the purchase modal
      setFormData({ supplier_id: 2, invoice_number: "" });
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
    } else if (item) {
      setFormData({
        productId: item.product_id,
        name: item.name,
        category: item.category,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        costPrice: item.cost_price,
        sellingPrice: item.selling_price,
        tax: item.tax_percent,
        reorderLevel: item.reorderLevel,
        maxStock: item.maxStock,
        expiryDate: item.expiryDate || item.expiry_date,
        location: item.location,
        barcode: item.barcode,
        supplierId: item.supplierId,
      });
    } else {
      setFormData({});
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

  // Your original handleSubmit function (preserve all the API logic)
  const handleSubmit = async (e) => {
    e.preventDefault();

    switch (modalType) {
      case "inventory":
        try {
          const inventoryData = {
            product_id: parseInt(formData.productId || formData.product_id),
            quantity: parseInt(formData.quantity) || 0,
            reorder_level: parseInt(formData.reorderLevel) || 0,
            max_stock: parseInt(formData.maxStock) || 0,
            expiry_date: formData.expiryDate || null,
          };

          console.log("Sending to backend:", inventoryData);

          let response;
          if (editingItem) {
            response = await inventoryService.update(
              editingItem.id,
              inventoryData
            );
          } else {
            response = await inventoryService.create(inventoryData);
          }

          console.log("Backend response:", response);

          if (response.success || response.data) {
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
          const purchaseData = {
            supplier_id: parseInt(formData.supplier_id) || 2,
            invoice_number: formData.invoice_number || "",
            items: purchaseProducts
              .filter((item) => item.product_id && item.quantity > 0)
              .map((item) => ({
                product_id: parseInt(item.product_id),
                quantity: parseFloat(item.quantity) || 1,
                cost_price: parseFloat(item.cost_price) || 0,
                expiry_date: item.expiry_date || null,
                reorder_level: parseInt(item.reorder_level) || 0,
                max_stock: parseInt(item.max_stock) || 0,
              })),
          };

          if (purchaseData.items.length === 0) {
            toast({
              title: "Error",
              description: "Please add at least one product to the purchase",
              variant: "destructive",
            });
            return;
          }

          const response = await purchaseService.create(purchaseData);
          console.log("Purchase creation response:", response);

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
        }
        break;

      case "salesReturn":
        try {
          setSubmitting(true);

          // Resolve tenant_id first
          let tenantId = user?.tenant_id || user?.tenantId;
          if (!tenantId) {
            const tenantIdRaw = localStorage.getItem("tenant_id");
            if (tenantIdRaw) {
              tenantId = /^\d+$/.test(tenantIdRaw)
                ? parseInt(tenantIdRaw)
                : tenantIdRaw;
            }
          }

          console.log("Sales Return - User:", user);
          console.log(
            "Sales Return - Resolved tenant_id:",
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

          // Optimistically add entries
          const nowISO = new Date().toISOString();
          const selectedSaleForSubmit = sales.find(
            (s) => String(s.id) === String(formData.originalSaleId)
          );

          console.log("Selected sale:", selectedSaleForSubmit);
          console.log("Invoice items:", selectedSaleForSubmit?.invoice_items);

          const optimisticEntries = itemsPayload.map((it, idx) => {
            const productMatch = products.find(
              (p) =>
                String(p.product_id) === String(it.product_id) ||
                String(p.id) === String(it.product_id)
            );
            const invoiceItemMatch = selectedSaleForSubmit?.invoice_items?.find(
              (ii) =>
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
            };
          });
          setSalesReturns((prev) => [...optimisticEntries, ...prev]);

          // Backend expects flat structure
          const firstItem = itemsPayload[0];
          console.log("Selected sale for submit:", selectedSaleForSubmit);
          console.log("First item to return:", firstItem);

          const firstInvoiceItemMatch =
            selectedSaleForSubmit?.invoice_items?.find(
              (ii) =>
                String(ii.product_id) === String(firstItem.product_id) ||
                String(ii.products?.id) === String(firstItem.product_id)
            );

          console.log("First invoice item match:", firstInvoiceItemMatch);

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

          console.log(
            "First net price:",
            firstNetPrice,
            "First refund amount:",
            firstRefundAmount
          );

          const payload = {
            sales_id: parseInt(formData.originalSaleId),
            product_id: firstItem.product_id,
            quantity: firstItem.quantity,
            reason: firstItem.reason,
            refund_type: formData.refundType || "Cash",
            total_refund: Number(firstRefundAmount.toFixed(2)) || 0,
            tenant_id: tenantId,
          };

          console.log(
            "Sales Return Payload:",
            JSON.stringify(payload, null, 2)
          );

          const response = await salesReturnService.create(payload);
          const ok = response?.data?.success !== false;

          if (ok) {
            // Handle multiple items
            if (itemsPayload.length > 1) {
              for (let i = 1; i < itemsPayload.length; i++) {
                const extra = itemsPayload[i];
                const extraInvoiceItemMatch =
                  selectedSaleForSubmit?.invoice_items?.find(
                    (ii) =>
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
                  total_refund: Number(extraRefundAmount.toFixed(2)) || 0,
                  tenant_id: tenantId,
                };
                try {
                  await salesReturnService.create(extraPayload);
                } catch (loopErr) {
                  console.error("Additional return item failed:", loopErr);
                }
              }
            }

            await loadInventory();
            await loadSalesReturns();

            toast({
              title: "Sales Return Created",
              description: "Returned items added back to inventory.",
            });
            closeModal();
          } else {
            setSalesReturns((prev) => prev.filter((r) => !r._optimistic));
            toast({
              title: "Error",
              description:
                response?.data?.error || "Failed to create sales return",
              variant: "destructive",
            });
          }
        } catch (error) {
          setSalesReturns((prev) => prev.filter((r) => !r._optimistic));
          console.error("Error creating sales return:", error);
          const errorMsg =
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
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

          let tenantId = user?.tenant_id || user?.tenantId;

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

          // Optimistically add entries
          const nowISO = new Date().toISOString();
          const optimisticEntries = itemsPayload.map((it, idx) => {
            const productMatch = products.find(
              (p) =>
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
            };
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

            await loadInventory();
            await loadPurchaseReturns();

            toast({
              title: "Purchase Return Created",
              description: "Returned items subtracted from inventory.",
            });
            closeModal();
          } else {
            setPurchaseReturns((prev) => prev.filter((r) => !r._optimistic));
            toast({
              title: "Error",
              description:
                response?.data?.error || "Failed to create purchase return",
              variant: "destructive",
            });
          }
        } catch (error) {
          setPurchaseReturns((prev) => prev.filter((r) => !r._optimistic));
          console.error("Error creating purchase return:", error);
          const errorMsg =
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
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

      default:
        console.warn("Unhandled modal type:", modalType);
    }
  };

  // Your original handleDelete function
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
          await loadSales();
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
    }
  };

  // Your original utility functions
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

  // Load data on component mount
  useEffect(() => {
    loadProducts();
    loadInventory();
    loadPurchases();
    loadSales();
    loadSalesReturns();
    loadPurchaseReturns();
  }, []);

  // Calculate stats
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
    { label: "Total Items", value: products.length, icon: "Package" },
    {
      label: "Low Stock Items",
      value: lowStockItems,
      icon: "AlertTriangle",
      color: "text-red-500",
    },
    {
      label: "Total Stock Value",
      value: `AED ${totalValue.toLocaleString()}`,
      icon: "TrendingUp",
      color: "text-green-500",
    },
    {
      label: "Total Sales Today",
      value: `AED ${totalRevenue.toLocaleString()}`,
      icon: "ShoppingCart",
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
        {/* Header */}
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

        {/* Stats Section */}
        <StatsSection stats={stats} />

        {/* Low Stock Alert */}
        <LowStockAlert count={lowStockItems} />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content */}
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
            {console.log(
              "Rendering SalesView, activeTab:",
              activeTab,
              "sales count:",
              sales.length
            )}
            <SalesView
              sales={sales}
              openModal={openModal}
              handleDelete={handleDelete}
            />
          </>
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

      {/* Modal */}
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
        submitting={submitting}
      />
    </div>
  );
};

export default GroceryInventory;
