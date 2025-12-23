import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, ShoppingCart, TrendingUp } from "lucide-react";
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
import { StatsCard } from "./inventory/components/refactored/StatsCard";
import {
  LowStockAlert,
  TabNavigation,
} from "./inventory/components/refactored/SmallComponents";
import { useToast } from "@/hooks/use-toast";
import { StockView } from "./inventory/components/refactored/StockView";
import { SalesView } from "./inventory/components/refactored/SalesView";
import { PurchasesView } from "./inventory/components/refactored/PurchasesView";
import { SalesReturnView } from "./inventory/components/refactored/SalesReturnView";
import { PurchaseReturnView } from "./inventory/components/refactored/PurchaseReturnView";
import { AdjustmentsView } from "./inventory/components/refactored/AdjustmentsView";
import { Modal } from "./inventory/components/refactored/Modal";

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

function useDebouncedEffect(value, delay, callback) {
  useEffect(() => {
    const id = setTimeout(() => callback(value), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

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

  // Stock pagination state
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryTotalPages, setInventoryTotalPages] = useState(1);
  const [inventoryTotalRecords, setInventoryTotalRecords] = useState(0);
  const [inventoryHasMore, setInventoryHasMore] = useState(false);
  const STOCK_PAGE_SIZE = 20;

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
    loadInventory(inventoryPage, searchTerm);
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
      loadInventory(inventoryPage, searchTerm);
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

  const loadInventory = async (page = 1, search = "") => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: STOCK_PAGE_SIZE,
        skip_tenant: true,
      };
      if (search) params.search = search;

      const response = await inventoryService.getAll(params);
      console.log("Inventory API response:", response);

      // `inventoryService.getAll` returns the response body (which may have
      // a `data` array property). Treat `body` as the response object and
      // extract the raw items array from common shapes.
      const body = response ?? {};
      let raw: any[] = [];
      if (body && Array.isArray(body.data)) raw = body.data;
      else if (Array.isArray(body)) raw = body;
      else if (body && Array.isArray(body.results)) raw = body.results;
      else if (body && Array.isArray(body.items)) raw = body.items;

      // Attempt to read total records from payload or response headers
      const headerCount =
        response?.headers?.["x-total-count"] ||
        response?.headers?.["x-total-records"] ||
        response?.headers?.["X-Total-Count"] ||
        response?.headers?.["X-Total-Records"];

      const totalRecords =
        (body?.totalRecords ??
          body?.total ??
          body?.count ??
          Number(headerCount)) ||
        0;
      const totalPages =
        body?.totalPages ??
        Math.max(1, Math.ceil((totalRecords || 0) / STOCK_PAGE_SIZE));

      const items = (raw || []).map((it: any, idx: number) => {
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
          id: it.id ?? it.product_id ?? productObj.id ?? `inv-${idx}`,
          product_id: it.product_id ?? productObj.id ?? undefined,
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
          _raw: it,
        } as any;
      });

      // Debug: log what we received and what we'll set into state
      console.log(
        "loadInventory: page, body.page, totalRecords, raw.length, items.length",
        {
          requestedPage: page,
          apiPage: body?.page,
          totalRecords,
          rawLength: (raw || []).length,
          itemsLength: (items || []).length,
        }
      );

      setBaseInventory(items);
      setProducts(items);
      setInventoryPage(body?.page || page);
      setInventoryTotalPages(totalPages);
      setInventoryTotalRecords(totalRecords || 0);
      // If backend doesn't include totals, indicate whether there are more pages
      setInventoryHasMore(((raw || []).length || 0) >= STOCK_PAGE_SIZE);
    } catch (error: any) {
      console.error("Error loading inventory:", error);
      try {
        // Axios network errors may not have response; log useful fields
        console.error("Inventory load details:", {
          message: error.message,
          code: error.code,
          url: error?.config?.url,
          method: error?.config?.method,
          status: error?.response?.status,
          responseData: error?.response?.data,
        });
      } catch (e) {}

      const errMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load inventory";
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Derive current stock from base inventory minus sold quantities plus purchases and sales returns
  useEffect(() => {
    setProducts(baseInventory);
  }, [baseInventory]);

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
            await loadInventory(inventoryPage, searchTerm);
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
            await loadInventory(inventoryPage, searchTerm);

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
            await loadInventory(inventoryPage, searchTerm);
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
            await loadInventory(inventoryPage, searchTerm);
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

  // For stock we perform search server-side; local filter only applies category
  const filteredProducts = products.filter((product) => {
    const category = product?.category ?? "";
    const matchesCategory =
      filterCategory === "All" || category === filterCategory;
    return matchesCategory;
  });

  // Debounced server-side search for inventory
  useDebouncedEffect(searchTerm, 350, (val) => {
    setInventoryPage(1);
    loadInventory(1, val);
  });

  // If backend doesn't supply totals, paginate locally as a fallback
  const localStart = (inventoryPage - 1) * STOCK_PAGE_SIZE;
  const localEnd = localStart + STOCK_PAGE_SIZE;
  const displayedProducts =
    inventoryTotalRecords > 0
      ? filteredProducts
      : filteredProducts.slice(localStart, localEnd);
  const hasNextLocal = filteredProducts.length > localEnd;

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
            products={displayedProducts}
            productsTotalRecords={inventoryTotalRecords}
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
        {activeTab === "stock" && (inventoryPage > 1 || inventoryHasMore) && (
          <div className="flex items-center justify-between mt-4 mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  loadInventory(Math.max(1, inventoryPage - 1), searchTerm)
                }
                disabled={inventoryPage === 1}
              >
                Prev
              </Button>

              <span className="text-sm text-gray-500">
                Page {inventoryPage}
                {inventoryTotalRecords > 0 ? ` of ${inventoryTotalPages}` : ""}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  loadInventory(
                    inventoryTotalRecords > 0
                      ? Math.min(inventoryTotalPages, inventoryPage + 1)
                      : inventoryPage + 1,
                    searchTerm
                  )
                }
                disabled={
                  inventoryTotalRecords > 0
                    ? inventoryPage >= inventoryTotalPages
                    : !inventoryHasMore
                }
              >
                Next
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {inventoryTotalRecords > 0 ? (
                <>
                  Showing{" "}
                  {Math.min(
                    (inventoryPage - 1) * STOCK_PAGE_SIZE + 1,
                    inventoryTotalRecords
                  )}
                  -
                  {Math.min(
                    inventoryPage * STOCK_PAGE_SIZE,
                    inventoryTotalRecords
                  )}{" "}
                  of {inventoryTotalRecords}
                </>
              ) : (
                <>
                  Showing {(inventoryPage - 1) * STOCK_PAGE_SIZE + 1}-
                  {Math.min(
                    inventoryPage * STOCK_PAGE_SIZE,
                    products.length || inventoryPage * STOCK_PAGE_SIZE
                  )}
                </>
              )}
            </div>
          </div>
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
            purchasesTotalRecords={purchasesTotalRecords}
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
          <SalesReturnView
            salesReturns={salesReturns}
            openModal={openModal}
            salesReturnsTotalRecords={salesReturnsTotalRecords}
            SALES_RETURNS_PAGE_SIZE={SALES_RETURNS_PAGE_SIZE}
            loadSalesReturns={loadSalesReturns}
            salesReturnsPage={salesReturnsPage}
            salesReturnsTotalPages={salesReturnsTotalPages}
          />
        )}

        {activeTab === "purchase returns" && (
          <PurchaseReturnView
            purchaseReturns={purchaseReturns}
            openModal={openModal}
            purchaseReturnsTotalRecords={purchaseReturnsTotalRecords}
            PURCHASE_RETURNS_PAGE_SIZE={PURCHASE_RETURNS_PAGE_SIZE}
            loadPurchaseReturns={loadPurchaseReturns}
            purchaseReturnsPage={purchaseReturnsPage}
            purchaseReturnsTotalPages={purchaseReturnsTotalPages}
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
