export interface RawSalesReturn {
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

export interface UISalesReturn {
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

export interface RawPurchaseReturn {
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

export interface UIPurchaseReturn {
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

export interface Product {
  id: number;
  product_id?: number;
  name: string;
  category: string;
  brand: string;
  quantity: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  tax_percent?: number;
  reorderLevel?: number;
  maxStock?: number;
  expiryDate?: string;
  location?: string;
  barcode?: string;
  supplierId?: number;
}

export interface ModalProps {
  showModal: boolean;
  modalType: string;
  editingItem: any;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  products: Product[];
  sales: any[];
  saleProducts: any[];
  setSaleProducts: (products: any[]) => void;
  purchaseProducts: any[];
  setPurchaseProducts: (products: any[]) => void;
  returnItems: any[];
  setReturnItems: (items: any[]) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  productCatalog: Product[];
  submitting: boolean;
}