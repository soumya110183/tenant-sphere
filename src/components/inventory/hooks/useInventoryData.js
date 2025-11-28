import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  inventoryService,
  invoiceService,
  productService,
  purchaseService,
  salesReturnService,
  purchaseReturnService,
} from "@/services/api";

export const useInventoryData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState([]);
  const [baseInventory, setBaseInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productCatalog, setProductCatalog] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);

  const loadProducts = async () => {
    const data = await productService.getAll();
    setProductCatalog(data.data);
  };

  const loadSales = async () => {
    try {
      const response = await invoiceService.getAll();
      if (response.data?.success && Array.isArray(response.data.data)) {
        setSales(response.data.data);
      } else {
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

  const loadSalesReturns = async () => {
    try {
      const response = await salesReturnService.getAll();
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
        date: ret.created_at || ret.return_date || ret.date || new Date().toISOString().split("T")[0],
        productName: ret.product_name || ret.name || `Product #${ret.product_id}`,
        productId: ret.product_id,
        quantity: ret.quantity,
        reason: ret.reason || ret.return_reason || "N/A",
        refundType: ret.refund_type || ret.type || "Cash",
        totalRefund: ret.total_refund || ret.refund_amount || ret.amount || 0,
        items: [{
          name: ret.product_name || ret.name || `Product #${ret.product_id}`,
          qty: ret.quantity,
          reason: ret.reason || ret.return_reason || "N/A",
        }],
      }));

      setSalesReturns(formattedData);
    } catch (error) {
      console.error("Error loading sales returns:", error);
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
      const apiData = response?.data;
      let rawData = [];

      if (apiData && Array.isArray(apiData.purchase_returns)) {
        rawData = apiData.purchase_returns;
      } else if (Array.isArray(apiData)) {
        rawData = apiData;
      }

      const formattedData = rawData.map((ret) => ({
        id: ret.id,
        supplierId: ret.Suppliers_id || null,
        supplierName: ret.Suppliers_id ? `Supplier #${ret.Suppliers_id}` : "N/A",
        date: ret.created_at || new Date().toISOString().split("T")[0],
        productName: ret.products?.name || ret.select_product || `Product #${ret.product_id}`,
        productId: ret.product_id,
        quantity: ret.quantity,
        reason: ret.reason || "N/A",
        refundMethod: ret.refund_method || "N/A",
        amountAdjusted: 0,
        items: [{
          name: ret.products?.name || ret.select_product || `Product #${ret.product_id}`,
          qty: ret.quantity,
          reason: ret.reason || "N/A",
          productId: ret.product_id,
        }],
      }));

      setPurchaseReturns(formattedData);
    } catch (error) {
      console.error("Error loading purchase returns:", error);
      setPurchaseReturns([]);
      toast({
        title: "Error",
        description: "Failed to load purchase returns",
        variant: "destructive",
      });
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

  const refreshAll = () => {
    loadProducts();
    loadInventory();
    loadPurchases();
    loadSales();
    loadSalesReturns();
    loadPurchaseReturns();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  return {
    products,
    baseInventory,
    isLoading,
    productCatalog,
    purchases,
    sales,
    salesReturns,
    purchaseReturns,
    refreshAll,
    loadInventory,
    loadSales,
    setProducts
  };
};