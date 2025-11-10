import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Package, Plus, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, RotateCcw, Edit, Trash2, Search, X, Save, Loader2 } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { inventoryService, invoiceService, productService, purchaseService } from '@/services/api';
import {StatsCard} from '../components/InventoryComponent/StatsCard.jsx';
import {LowStockAlert,SearchFilter,TabNavigation} from '../components/InventoryComponent/SmallComponents.jsx';
// import{Modal} from '../components/InventoryComponent/Modal.jsx';
import { useToast } from '@/hooks/use-toast';


const Modal = ({ showModal, modalType, editingItem, formData, setFormData, products, sales, saleProducts, setSaleProducts, purchaseProducts, setPurchaseProducts, returnItems, setReturnItems, onClose, onSubmit,productCatalog }) => {
  if (!showModal) return null;
console.log("modal:",productCatalog);
  // const [productCatalog,setProductCatalog] = useState([]);

  const getModalTitle = () => {
    const titles = {
      inventory: editingItem ? 'Update Inventory' : 'Add Inventory',
      sale: 'New Sale Transaction',
      purchase: 'New Purchase Order',
      salesReturn: 'New Sales Return',
      purchaseReturn: 'New Purchase Return',
      adjustment: 'Stock Adjustment'
    };
    return titles[modalType];
  };

  // Sample product catalog - in real scenario, this would come from your product database


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-background z-10">
          <h2 className="text-lg sm:text-xl font-bold">{getModalTitle()}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
          {modalType === 'inventory' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Product *</label>
                <select
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.productId || ''}
                 // In your modal component, update the product selection handler:
onChange={(e) => {
  const selectedProduct = productCatalog.find(p => p.id === parseInt(e.target.value));
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
      tax: selectedProduct.tax_percent || 0
    });
  } else {
    // Clear product details if no product selected
    setFormData({
      ...formData,
      productId: '',
      name: '',
      brand: '',
      category: '',
      unit: '',
      costPrice: 0,
      sellingPrice: 0,
      tax: 0
    });
  }
}}
                  disabled={editingItem}
                >
                  <option value="">Choose a product...</option>
                  {productCatalog.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.brand} - AED {product.sellingPrice}
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
                    <h4 className="font-medium text-sm mb-2">Product Details</h4>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Product Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.name || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Brand</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.brand || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Category</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.category || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Unit</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.unit || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Cost Price (AED)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      value={formData.costPrice || 0}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Selling Price (AED)</label>
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
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.quantity || 0}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reorder Level *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.reorderLevel || 0}
                    onChange={(e) => setFormData({...formData, reorderLevel: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.maxStock || 0}
                    onChange={(e) => setFormData({...formData, maxStock: parseInt(e.target.value) || 0})}
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
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.expiryDate || ''}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
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

          {modalType === 'sale' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer ID</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.customerId || ''}
                    onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.customerName || ''}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Type *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.paymentType || 'Cash'}
                    onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Staff ID *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.staffId || 'S001'}
                    onChange={(e) => setFormData({...formData, staffId: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium text-sm">Products *</label>
                  <Button type="button" size="sm" onClick={() => setSaleProducts([...saleProducts, { productId: '', qty: 1 }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Product
                  </Button>
                </div>
                {saleProducts.map((sp, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
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
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - AED {p.sellingPrice} ({p.quantity} {p.unit} available)</option>
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

          {modalType === 'purchase' && (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Supplier ID *</label>
        <input
          type="number"
          required
          min="1"
          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          value={formData.supplier_id || 1}
          onChange={(e) => setFormData({...formData, supplier_id: parseInt(e.target.value) || 1})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Invoice Number</label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          value={formData.invoice_number || ''}
          onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
          placeholder="Leave empty for auto-generation"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Will auto-generate if left empty
        </p>
      </div>
    </div>
    
        <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-3">
        <label className="font-medium text-sm">Purchase Items *</label>
        <Button 
          type="button" 
          size="sm" 
          onClick={() => setPurchaseProducts([...purchaseProducts, { 
            product_id: '', 
            quantity: 1, 
            cost_price: 0,
            expiry_date: '',
            reorder_level: 0,
            max_stock: 0
          }])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Item
        </Button>
      </div>
      
      {purchaseProducts.map((pp, idx) => (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4 p-4 border rounded-lg bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Product *</label>
              <select
                required
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={pp.product_id}
                onChange={(e) => {
                  const selectedProduct = productCatalog.find(p => p.id === parseInt(e.target.value)); // CHANGE: use productCatalog
                  const updated = [...purchaseProducts];
                  updated[idx].product_id = e.target.value;
                  if (selectedProduct) {
                    updated[idx].cost_price = selectedProduct.cost_price || 0;
                  }
                  setPurchaseProducts(updated);
                }}
              >
                <option value="">Select Product</option>
                {productCatalog.map(product => ( // CHANGE: use productCatalog
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.brand} - AED {product.cost_price} per {product.unit}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Quantity *</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={pp.quantity}
                onChange={(e) => {
                  const updated = [...purchaseProducts];
                  updated[idx].quantity = parseFloat(e.target.value) || 1;
                  setPurchaseProducts(updated);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Cost Price (AED) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={pp.cost_price}
                onChange={(e) => {
                  const updated = [...purchaseProducts];
                  updated[idx].cost_price = parseFloat(e.target.value) || 0;
                  setPurchaseProducts(updated);
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={pp.expiry_date || ''}
                onChange={(e) => {
                  const updated = [...purchaseProducts];
                  updated[idx].expiry_date = e.target.value;
                  setPurchaseProducts(updated);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={pp.reorder_level || 0}
                onChange={(e) => {
                  const updated = [...purchaseProducts];
                  updated[idx].reorder_level = parseInt(e.target.value) || 0;
                  setPurchaseProducts(updated);
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Max Stock</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={pp.max_stock || 0}
                onChange={(e) => {
                  const updated = [...purchaseProducts];
                  updated[idx].max_stock = parseInt(e.target.value) || 0;
                  setPurchaseProducts(updated);
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const updated = purchaseProducts.filter((_, i) => i !== idx);
                setPurchaseProducts(updated);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove Item
            </Button>
          </div>
        </div>
      ))}
      
      {purchaseProducts.length > 0 && (
        <div className="mt-4 p-3 bg-primary/5 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount:</span>
            <span className="font-bold text-lg">
              AED {purchaseProducts.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
)}

          {modalType === 'salesReturn' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Original Sale ID *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.originalSaleId || ''}
                    onChange={(e) => setFormData({...formData, originalSaleId: e.target.value})}
                  >
                    <option value="">Select Sale</option>
                    {sales.map(s => (
                      <option key={s.id} value={s.id}>Sale #{s.id} - {s.date} - AED {s.total}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Refund Type *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.refundType || 'Cash'}
                    onChange={(e) => setFormData({...formData, refundType: e.target.value})}
                  >
                    <option>Cash</option>
                    <option>Replacement</option>
                    <option>Credit</option>
                  </select>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium text-sm">Return Items *</label>
                  <Button type="button" size="sm" onClick={() => setReturnItems([...returnItems, { productId: '', qty: 1, reason: '' }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                {returnItems.map((ri, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
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
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
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

          {modalType === 'purchaseReturn' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier ID *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.supplierId || 1}
                    onChange={(e) => setFormData({...formData, supplierId: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.supplierName || ''}
                    onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium text-sm">Return Items *</label>
                  <Button type="button" size="sm" onClick={() => setReturnItems([...returnItems, { productId: '', qty: 1, reason: '' }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                {returnItems.map((ri, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
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
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
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

          {modalType === 'adjustment' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product *</label>
                <select
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.productId || ''}
                  onChange={(e) => setFormData({...formData, productId: e.target.value})}
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - Current: {p.quantity} {p.unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.type || 'Add'}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Add">Add</option>
                  <option value="Remove">Remove</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.quantity || 0}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Damage, Expiry, Loss"
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {editingItem ? 'Update' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
// Tab Navigation Component


// Stock Table Row Component
const StockTableRow = ({ item, getStockStatus, getStockColor, getStockPercentage, onEdit, onDelete }) => {
  const status = getStockStatus(item.quantity, item.reorderLevel);
  const percentage = getStockPercentage(item.quantity, item.maxStock);
  const margin = item.selling_price - item.cost_price;
  const marginPercent = ((margin / item.cost_price) * 100).toFixed(1);
  
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-2 sm:px-4 font-medium text-sm">{item.name}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">{item.category}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">{item.brand}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">{item.quantity} {item.unit}</td>
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
        <Badge className={getStockColor(status)}>
          {status}
        </Badge>
      </td>
      <td className="py-3 px-2 sm:px-4 text-xs">{item.expiryDate || 'N/A'}</td>
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
const StockView = ({ products, searchTerm, setSearchTerm, filterCategory, setFilterCategory, categories, openModal, handleDelete, getStockStatus, getStockColor, getStockPercentage,isLoading }) => (
  <div className="space-y-4">
    <SearchFilter
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      filterCategory={filterCategory}
      setFilterCategory={setFilterCategory}
      categories={categories}
      onAddProduct={() => openModal('inventory')}
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
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Product Name</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Category</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Brand</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Quantity</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Stock Level</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Cost</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Selling</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Margin</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Status</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Expiry</th>
                <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Actions</th>
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
                  <td colSpan="11" className="text-center py-8 text-muted-foreground text-sm">
                    No inventory items found. Add your first inventory item to get started!
                  </td>
                </tr>
              ) : ( // Show products when loaded
                products.map((item) => (
                  <StockTableRow
                    key={item.id}
                    item={item}
                    getStockStatus={getStockStatus}
                    getStockColor={getStockColor}
                    getStockPercentage={getStockPercentage}
                    onEdit={(item) => openModal('inventory', item)}
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
const SalesView = ({ sales, openModal, handleDelete }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Sales Transactions ({sales.length})
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Invoice No</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date & Time</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Payment Method</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Total Amount</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-muted-foreground text-sm">
                  No sales recorded yet.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 sm:px-4 font-medium text-sm">#{sale.invoice_number}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <Badge variant="outline" className="capitalize">
                      {sale.payment_method}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 sm:px-4 font-semibold text-sm">
                    AED {sale.total_amount?.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <div className="flex gap-1 sm:gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleDelete('sale', sale.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

// Purchases View Component
// Purchases View Component
// Purchases View Component - Updated with your actual data structure
const PurchasesView = ({ purchases, openModal, handleDelete }) => {
  const safePurchases = Array.isArray(purchases) ? purchases : [];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TrendingDown className="h-5 w-5 text-primary" />
            Purchase Records ({safePurchases.length})
          </CardTitle>
          <Button onClick={() => openModal('purchase')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Purchase ID</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Invoice No</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Supplier ID</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Items</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Total Amount</th>
                <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safePurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-muted-foreground text-sm">
                    No purchases recorded yet. Create your first purchase!
                  </td>
                </tr>
              ) : (
                safePurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">#{purchase.id}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm font-mono">{purchase.invoice_number}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">Supplier #{purchase.supplier_id}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      <div className="max-w-xs">
                        {purchase.items && purchase.items.slice(0, 2).map((item, index) => (
                          <div key={item.id} className="text-xs">
                            {item.product_name} ({item.quantity} {item.product_unit})
                          </div>
                        ))}
                        {purchase.items_count > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{purchase.items_count - 2} more items
                          </div>
                        )}
                        {(!purchase.items || purchase.items.length === 0) && (
                          <div className="text-xs text-muted-foreground">No items</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-semibold text-sm">
                      AED {purchase.total_amount?.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleDelete('purchase', purchase.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
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
const ReturnsView = ({ salesReturns, purchaseReturns, openModal }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <RotateCcw className="h-5 w-5 text-primary" />
            Sales Returns ({salesReturns.length})
          </CardTitle>
          <Button onClick={() => openModal('salesReturn')} className="w-full sm:w-auto">
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
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Return ID</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Original Sale</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Returned Items</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Refund Type</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Total Refund</th>
              </tr>
            </thead>
            <tbody>
              {salesReturns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-muted-foreground text-sm">
                    No sales returns yet.
                  </td>
                </tr>
              ) : (
                salesReturns.map((ret) => (
                  <tr key={ret.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">SR-#{ret.id}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">#{ret.originalSaleId}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">{ret.date}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {ret.items.map(i => `${i.name} (${i.qty}) - ${i.reason}`).join(', ')}
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <Badge variant="outline">{ret.refundType}</Badge>
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-semibold text-red-600 text-sm">AED {ret.totalRefund}</td>
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
          <Button onClick={() => openModal('purchaseReturn')} className="w-full sm:w-auto">
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
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Return ID</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Supplier</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Returned Items</th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Amount Adjusted</th>
              </tr>
            </thead>
            <tbody>
              {purchaseReturns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-muted-foreground text-sm">
                    No purchase returns yet.
                  </td>
                </tr>
              ) : (
                purchaseReturns.map((ret) => (
                  <tr key={ret.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">PR-#{ret.id}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">{ret.supplierName || `Supplier-${ret.supplierId}`}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">{ret.date}</td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {ret.items.map(i => `${i.name} (${i.qty}) - ${i.reason}`).join(', ')}
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-semibold text-green-600 text-sm">AED {ret.amountAdjusted}</td>
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

// Adjustments View Component
const AdjustmentsView = ({ stockAdjustments, openModal }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Edit className="h-5 w-5 text-primary" />
          Stock Adjustments ({stockAdjustments.length})
        </CardTitle>
        <Button onClick={() => openModal('adjustment')} className="w-full sm:w-auto">
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
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Adjustment ID</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Product</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Type</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Quantity</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Reason</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {stockAdjustments.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-muted-foreground text-sm">
                  No stock adjustments yet.
                </td>
              </tr>
            ) : (
              stockAdjustments.map((adj) => (
                <tr key={adj.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 sm:px-4 font-medium text-sm">ADJ-#{adj.id}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{adj.productName}</td>
                  <td className="py-3 px-2 sm:px-4">
                    <Badge className={adj.type === 'Add' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
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
  const [activeTab, setActiveTab] = useState('stock');
  const [ products, setProducts ] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
const [productCatalog,setProductCatalog] = useState([]);
const [purchases, setPurchases] = useState([]);
const [sales, setSales] = useState([]);

// Add function to load purchases
// Update your loadPurchases function to match the actual API response

const loadSales = async () => {
  try {
    const response = await invoiceService.getAll();
    console.log("Invoices API response:", response);
    
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
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
      variant: "destructive"
    });
  }
};
const loadPurchases = async () => {
  try {
    const response = await purchaseService.getAll();
    console.log("Purchases API response:", response);
    
    // Based on your response structure: { success: true, data: [...] }
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
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
      variant: "destructive"
    });
  }
};
 const { toast } = useToast();
 useEffect(() => {
      loadProducts();
      loadInventory();
      loadPurchases();
      loadSales();
    }, []);

      const loadProducts = async () => {
    // TODO: Replace with actual API call
    const data = await productService.getAll();
    setProductCatalog(data.data);
   
  };
      const loadInventory = async () => {
    setIsLoading(true); // Start loading
    try {
      const data = await inventoryService.getAll();
      console.log("inventory data:", data.data);
      setProducts(data.data);
    } catch (error) {
      console.error("Error loading inventory:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false); // End loading
    }
  };


  

  // const [sales, setSales] = useState([
  //   { id: 1, date: '2025-10-28 10:30', customerId: 'C001', customerName: 'Rajesh Kumar', products: [{productId: 1, name: 'Basmati Rice', qty: 5, price: 100, tax: 5}], paymentType: 'UPI', total: 525, profit: 100, staffId: 'S001' },
  //   { id: 2, date: '2025-10-28 11:15', customerId: 'C002', customerName: 'Priya Sharma', products: [{productId: 2, name: 'Coca Cola', qty: 6, price: 40, tax: 12}], paymentType: 'Cash', total: 269, profit: 60, staffId: 'S001' },
  // ]);

  // const [purchases, setPurchases] = useState([
  //   { id: 1, supplierId: 1, supplierName: 'ABC Distributors', invoiceNo: 'INV-2025-001', date: '2025-10-25', products: [{productId: 1, name: 'Basmati Rice', qty: 50, cost: 80}], paymentMode: 'Credit', total: 4000, status: 'Unpaid' },
  //   { id: 2, supplierId: 2, supplierName: 'XYZ Wholesale', invoiceNo: 'INV-2025-002', date: '2025-10-26', products: [{productId: 2, name: 'Coca Cola', qty: 100, cost: 30}], paymentMode: 'Cash', total: 3000, status: 'Paid' },
  // ]);

  const [salesReturns, setSalesReturns] = useState([
    { id: 1, originalSaleId: 1, date: '2025-10-28', items: [{productId: 1, name: 'Basmati Rice', qty: 1, reason: 'Damaged packaging'}], refundType: 'Cash', totalRefund: 105 },
  ]);

  const [purchaseReturns, setPurchaseReturns] = useState([
    { id: 1, supplierId: 1, supplierName: 'ABC Distributors', date: '2025-10-27', items: [{productId: 1, name: 'Basmati Rice', qty: 5, reason: 'Poor quality'}], amountAdjusted: 400 },
  ]);

  const [stockAdjustments, setStockAdjustments] = useState([
    { id: 1, productId: 1, productName: 'Basmati Rice', type: 'Remove', quantity: 2, reason: 'Damage', date: '2025-10-27' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saleProducts, setSaleProducts] = useState([{ productId: '', qty: 1 }]);
  const [purchaseProducts, setPurchaseProducts] = useState([{ productId: '', qty: 1 }]);
  const [returnItems, setReturnItems] = useState([{ productId: '', qty: 1, reason: '' }]);

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity < reorderLevel) return 'low';
    if (quantity < reorderLevel * 1.5) return 'warning';
    return 'good';
  };

  const getStockColor = (status) => {
    switch (status) {
      case 'low': return 'bg-red-500/10 text-red-500';
      case 'warning': return 'bg-yellow-500/10 text-yellow-500';
      case 'good': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
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
      supplierId: item.supplierId
    });
  } else {
    switch(type) {
      case 'inventory':
        setFormData({ 
          productId: '', 
          name: '', 
          category: '', 
          brand: '', 
          quantity: 0, 
          unit: '', 
          costPrice: 0, 
          sellingPrice: 0, 
          tax: 0, 
          reorderLevel: 0, 
          maxStock: 0, 
          location: '', 
          barcode: '', 
          expiryDate: '', 
          supplierId: 1 
        });
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
    setSaleProducts([{ productId: '', qty: 1 }]);
    setPurchaseProducts([{ productId: '', qty: 1 }]);
    setReturnItems([{ productId: '', qty: 1, reason: '' }]);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  switch(modalType) {
    case 'inventory':
      try {
        // ✅ Prepare the data - only include fields that exist in inventory table
        const inventoryData = {
          product_id: parseInt(formData.productId || formData.product_id),
          quantity: parseInt(formData.quantity) || 0,
          reorder_level: parseInt(formData.reorderLevel) || 0,
          max_stock: parseInt(formData.maxStock) || 0,
          expiry_date: formData.expiryDate || null
          // Remove cost_price and selling_price - they belong to products table
        };

        console.log("Sending to backend:", inventoryData);

        let response;
        if (editingItem) {
          // ✅ UPDATE existing inventory item
          response = await inventoryService.update(editingItem.id, inventoryData);
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
            description: editingItem ? "Item updated successfully." : "New item added successfully." 
          });
          closeModal();
        } else {
          toast({ 
            title: "Error", 
            description: response.error || "Unknown error occurred", 
            variant: "destructive" 
          });
        }
      } catch (error) {
        console.error("Error saving inventory:", error);
        console.error("Error details:", error.response?.data);
        toast({ 
          title: "Error", 
          description: error.response?.data?.error || error.message || "Failed to save inventory item", 
          variant: "destructive" 
        });
      }
      break;
      case 'purchase':
  try {
    const purchaseData = {
      supplier_id: parseInt(formData.supplier_id) || 1,
      invoice_number: formData.invoice_number || '',
      items: purchaseProducts
        .filter(item => item.product_id && item.quantity > 0)
        .map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity) || 1,
          cost_price: parseFloat(item.cost_price) || 0,
          expiry_date: item.expiry_date || null,
          reorder_level: parseInt(item.reorder_level) || 0,
          max_stock: parseInt(item.max_stock) || 0
        }))
    };

    // Validate at least one item
    if (purchaseData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product to the purchase",
        variant: "destructive"
      });
      return;
    }

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
        variant: "destructive"
      });
    }
  } catch (error) {
    console.error("Error creating purchase:", error);
    toast({
      title: "Error",
      description: error.response?.data?.error || error.message || "Failed to create purchase",
      variant: "destructive"
    });
  }
  break;
    // ... rest of your cases remain the same
  }
  
  closeModal();
};

  const handleDelete =async  (type, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    switch(type) {
      case 'product':
        console.log("Deleting product with id:",id);
         await inventoryService.delete(id);
        setProducts(products.filter(p => p.id !== id));
        break;
        case 'sale':
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
          variant: "destructive"
        });
      }
      break;
    case 'purchase':
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
      variant: "destructive"
    });
  }
  break;
        break;
    }
  };

  const lowStockItems = products.filter(item => getStockStatus(item.quantity, item.reorderLevel) === 'low').length;
  const totalValue = products.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

const stats = [
  { label: 'Total Products', value: products.length, icon: Package },
  { label: 'Low Stock Items', value: lowStockItems, icon: AlertTriangle, color: 'text-red-500' },
  { label: 'Total Stock Value', value: `AED ${totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500' },
  { label: 'Total Sales Today', value: `AED ${totalRevenue.toLocaleString()}`, icon: ShoppingCart, color: 'text-blue-500' },
];

  const categories = ['All', ...new Set(products.map(p => p.category))];
  
const filteredProducts = products.filter(product => {
  const name = product?.name ?? '';
  const barcode = product?.barcode ?? '';
  const category = product?.category ?? '';

  const matchesSearch =
    name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barcode.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesCategory =
    filterCategory === 'All' || category === filterCategory;

  return matchesSearch && matchesCategory;
});



  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Complete grocery store inventory system</p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatsCard key={index} stat={stat} />
          ))}
        </div>

        <LowStockAlert count={lowStockItems} />

        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'stock' && (
          <StockView
            products={filteredProducts}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            categories={categories}
            openModal={openModal}
            handleDelete={(id) => handleDelete('product', id)}
            getStockStatus={getStockStatus}
            getStockColor={getStockColor}
            getStockPercentage={getStockPercentage}
            isLoading={isLoading}
          />
        )}
        
        {activeTab === 'sales' && (
          <SalesView
            sales={sales}
            openModal={openModal}
            handleDelete={handleDelete}
          />
        )}
        
        {activeTab === 'purchases' && (
          <PurchasesView
            purchases={purchases}
            openModal={openModal}
            handleDelete={handleDelete}
          />
        )}
        
        {activeTab === 'returns' && (
          <ReturnsView
            salesReturns={salesReturns}
            purchaseReturns={purchaseReturns}
            openModal={openModal}
          />
        )}
        
        {activeTab === 'adjustments' && (
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
      />
    </div>
  );
};

export default GroceryInventory;