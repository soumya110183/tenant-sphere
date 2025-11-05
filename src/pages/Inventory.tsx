import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Package, Plus, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, RotateCcw, Edit, Trash2, Search, X, Save } from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { inventoryService, productService } from '@/services/api';
import {StatsCard} from '../components/InventoryComponent/StatsCard.jsx';
import {LowStockAlert,SearchFilter,TabNavigation} from '../components/InventoryComponent/SmallComponents.jsx';
import{Modal} from '../components/InventoryComponent/Modal.jsx';
import { useToast } from '@/hooks/use-toast';



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
const StockView = ({ products, searchTerm, setSearchTerm, filterCategory, setFilterCategory, categories, openModal, handleDelete, getStockStatus, getStockColor, getStockPercentage }) => (
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
              {products.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-8 text-muted-foreground text-sm">
                    No inventory items found. Add your first inventory item to get started!
                  </td>
                </tr>
              ) : (
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
const SalesView = ({ sales, openModal, handleDelete }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Sales Transactions ({sales.length})
        </CardTitle>
        <Button onClick={() => openModal('sale')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Sale
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Sale ID</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date & Time</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Customer</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Products</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Payment</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Total</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Profit</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Staff</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-muted-foreground text-sm">
                  No sales recorded yet. Create your first sale!
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 sm:px-4 font-medium text-sm">#{sale.id}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{sale.date}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{sale.customerName || sale.customerId || 'Walk-in'}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">
                    {sale.products.map(p => `${p.name} (${p.qty})`).join(', ')}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <Badge variant="outline">{sale.paymentType}</Badge>
                  </td>
                  <td className="py-3 px-2 sm:px-4 font-semibold text-sm">AED {sale.total}</td>
                  <td className="py-3 px-2 sm:px-4 text-green-600 font-medium text-sm">AED {sale.profit}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{sale.staffId}</td>
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
const PurchasesView = ({ purchases, openModal, handleDelete }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <TrendingDown className="h-5 w-5 text-primary" />
          Purchase Records ({purchases.length})
        </CardTitle>
        <Button onClick={() => openModal('purchase')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Purchase
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Purchase ID</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Supplier</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Invoice No</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Products</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Payment</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Total</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Status</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-muted-foreground text-sm">
                  No purchases recorded yet. Create your first purchase!
                </td>
              </tr>
            ) : (
              purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 sm:px-4 font-medium text-sm">#{purchase.id}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{purchase.supplierName || `Supplier-${purchase.supplierId}`}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{purchase.invoiceNo}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">{purchase.date}</td>
                  <td className="py-3 px-2 sm:px-4 text-sm">
                    {purchase.products.map(p => `${p.name} (${p.qty})`).join(', ')}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <Badge variant="outline">{purchase.paymentMode}</Badge>
                  </td>
                  <td className="py-3 px-2 sm:px-4 font-semibold text-sm">AED {purchase.total}</td>
                  <td className="py-3 px-2 sm:px-4">
                    <Badge className={purchase.status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>
                      {purchase.status}
                    </Badge>
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
const [productCatalog,setProductCatalog] = useState([]);
 const { toast } = useToast();
 useEffect(() => {
      loadProducts();
      loadInventory();
    }, []);

      const loadProducts = async () => {
    // TODO: Replace with actual API call
    const data = await productService.getAll();
    setProductCatalog(data.data);
   
  };
      const loadInventory = async () => {
    // TODO: Replace with actual API call
    const data = await inventoryService.getAll();
    console.log("inventory data:",data.data);
    setProducts(data.data);
    console.log(products);
   
  };


  

  const [sales, setSales] = useState([
    { id: 1, date: '2025-10-28 10:30', customerId: 'C001', customerName: 'Rajesh Kumar', products: [{productId: 1, name: 'Basmati Rice', qty: 5, price: 100, tax: 5}], paymentType: 'UPI', total: 525, profit: 100, staffId: 'S001' },
    { id: 2, date: '2025-10-28 11:15', customerId: 'C002', customerName: 'Priya Sharma', products: [{productId: 2, name: 'Coca Cola', qty: 6, price: 40, tax: 12}], paymentType: 'Cash', total: 269, profit: 60, staffId: 'S001' },
  ]);

  const [purchases, setPurchases] = useState([
    { id: 1, supplierId: 1, supplierName: 'ABC Distributors', invoiceNo: 'INV-2025-001', date: '2025-10-25', products: [{productId: 1, name: 'Basmati Rice', qty: 50, cost: 80}], paymentMode: 'Credit', total: 4000, status: 'Unpaid' },
    { id: 2, supplierId: 2, supplierName: 'XYZ Wholesale', invoiceNo: 'INV-2025-002', date: '2025-10-26', products: [{productId: 2, name: 'Coca Cola', qty: 100, cost: 30}], paymentMode: 'Cash', total: 3000, status: 'Paid' },
  ]);

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
      setFormData(item);
    } else {
      switch(type) {
        case 'inventory':
          setFormData({ productId: '', name: '', category: '', brand: '', quantity: 0, unit: '', costPrice: 0, sellingPrice: 0, tax: 0, reorderLevel: 0, maxStock: 0, location: '', barcode: '', expiryDate: '', supplierId: 1 });
          break;
        case 'sale':
          setFormData({ customerId: '', customerName: '', paymentType: 'Cash', staffId: 'S001' });
          setSaleProducts([{ productId: '', qty: 1 }]);
          break;
        case 'purchase':
          setFormData({ supplierId: 1, supplierName: '', invoiceNo: '', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash', status: 'Unpaid' });
          setPurchaseProducts([{ productId: '', qty: 1 }]);
          break;
        case 'salesReturn':
          setFormData({ originalSaleId: '', refundType: 'Cash' });
          setReturnItems([{ productId: '', qty: 1, reason: '' }]);
          break;
        case 'purchaseReturn':
          setFormData({ supplierId: 1, supplierName: '' });
          setReturnItems([{ productId: '', qty: 1, reason: '' }]);
          break;
        case 'adjustment':
          setFormData({ productId: '', type: 'Add', quantity: 0, reason: '' });
          break;
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

  const handleSubmit =async (e) => {
    e.preventDefault();
    
    switch(modalType) {
     case 'inventory':
        if (editingItem) {
          
          // ✅ Update inventory item in backend
         const response = await inventoryService.update(editingItem.id, {
      product_id: formData.productId,
      quantity: formData.quantity,
      cost_price: formData.costPrice,
      selling_price: formData.sellingPrice,
      reorder_level: formData.reorderLevel,
      expiry_date: formData.expiryDate || null,
      max_stock: formData.maxStock || 0,
    });

    
if (response.success) {
  await loadInventory(); // ✅ Re-fetch full joined data from backend
  toast({ title: "Inventory Added", description: "New item added successfully." });
} else {
  toast({ title: "Error", description: response.error, variant: "destructive" });
}
          // ✅ Update local state with backend response
          setProducts(products.map(p => p.id === editingItem.id ? response.data : p));
        } else {
          console.log("creating item:",formData);
          // ✅ Create new inventory item in backend
        const response = await inventoryService.create({
      product_id: formData.productId,
      quantity: formData.quantity,
      cost_price: formData.costPrice,
      selling_price: formData.sellingPrice,
      reorder_level: formData.reorderLevel,
      expiry_date: formData.expiryDate || null,
      max_stock: formData.maxStock || 0,
    });
          // ✅ Add the new item to local state
          setProducts([...products, response.data]);
        }
        break;
        
      case 'sale':
        const saleProductsData = saleProducts
          .filter(sp => sp.productId)
          .map(sp => {
            const product = products.find(p => p.id === parseInt(sp.productId));
            return {
              productId: product.id,
              name: product.name,
              qty: parseInt(sp.qty),
              price: product.sellingPrice,
              tax: product.tax
            };
          });
        
        const saleTotal = saleProductsData.reduce((sum, p) => {
          const taxAmount = (p.price * p.qty * p.tax) / 100;
          return sum + (p.price * p.qty) + taxAmount;
        }, 0);
        
        const saleProfit = saleProductsData.reduce((sum, p) => {
          const product = products.find(pr => pr.id === p.productId);
          return sum + ((p.price - product.costPrice) * p.qty);
        }, 0);
        
        const newSale = { 
          ...formData, 
          id: Math.max(...sales.map(s => s.id), 0) + 1,
          date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          products: saleProductsData,
          total: Math.round(saleTotal),
          profit: Math.round(saleProfit)
        };
        setSales([...sales, newSale]);
        
        saleProductsData.forEach(p => {
          setProducts(products.map(pr => 
            pr.id === p.productId ? { ...pr, quantity: pr.quantity - p.qty } : pr
          ));
        });
        break;
        
      case 'purchase':
        const purchaseProductsData = purchaseProducts
          .filter(pp => pp.productId)
          .map(pp => {
            const product = products.find(p => p.id === parseInt(pp.productId));
            return {
              productId: product.id,
              name: product.name,
              qty: parseInt(pp.qty),
              cost: product.costPrice
            };
          });
        
        const purchaseTotal = purchaseProductsData.reduce((sum, p) => sum + (p.qty * p.cost), 0);
        
        const newPurchase = { 
          ...formData, 
          id: Math.max(...purchases.map(p => p.id), 0) + 1,
          products: purchaseProductsData,
          total: purchaseTotal
        };
        setPurchases([...purchases, newPurchase]);
        
        purchaseProductsData.forEach(p => {
          setProducts(products.map(pr => 
            pr.id === p.productId ? { ...pr, quantity: pr.quantity + p.qty } : pr
          ));
        });
        break;
        
      case 'salesReturn':
        const returnItemsData = returnItems
          .filter(ri => ri.productId)
          .map(ri => {
            const product = products.find(p => p.id === parseInt(ri.productId));
            return {
              productId: product.id,
              name: product.name,
              qty: parseInt(ri.qty),
              reason: ri.reason
            };
          });
        
        const originalSale = sales.find(s => s.id === parseInt(formData.originalSaleId));
        const refundTotal = returnItemsData.reduce((sum, i) => {
          const saleProduct = originalSale?.products.find(p => p.productId === i.productId);
          if (saleProduct) {
            const taxAmount = (saleProduct.price * i.qty * saleProduct.tax) / 100;
            return sum + (saleProduct.price * i.qty) + taxAmount;
          }
          return sum;
        }, 0);
        
        const newSalesReturn = { 
          ...formData, 
          id: Math.max(...salesReturns.map(r => r.id), 0) + 1,
          date: new Date().toISOString().split('T')[0],
          items: returnItemsData,
          totalRefund: Math.round(refundTotal)
        };
        setSalesReturns([...salesReturns, newSalesReturn]);
        
        returnItemsData.forEach(i => {
          if (i.reason !== 'Damaged') {
            setProducts(products.map(p => 
              p.id === i.productId ? { ...p, quantity: p.quantity + i.qty } : p
            ));
          }
        });
        break;
        
      case 'purchaseReturn':
        const purchaseReturnItemsData = returnItems
          .filter(ri => ri.productId)
          .map(ri => {
            const product = products.find(p => p.id === parseInt(ri.productId));
            return {
              productId: product.id,
              name: product.name,
              qty: parseInt(ri.qty),
              reason: ri.reason
            };
          });
        
        const adjustedAmount = purchaseReturnItemsData.reduce((sum, i) => {
          const product = products.find(p => p.id === i.productId);
          return sum + (product.costPrice * i.qty);
        }, 0);
        
        const newPurchaseReturn = { 
          ...formData, 
          id: Math.max(...purchaseReturns.map(r => r.id), 0) + 1,
          date: new Date().toISOString().split('T')[0],
          items: purchaseReturnItemsData,
          amountAdjusted: adjustedAmount
        };
        setPurchaseReturns([...purchaseReturns, newPurchaseReturn]);
        
        purchaseReturnItemsData.forEach(i => {
          setProducts(products.map(p => 
            p.id === i.productId ? { ...p, quantity: Math.max(0, p.quantity - i.qty) } : p
          ));
        });
        break;
        
      case 'adjustment':
        const product = products.find(p => p.id === parseInt(formData.productId));
        const newAdjustment = { 
          ...formData, 
          id: Math.max(...stockAdjustments.map(a => a.id), 0) + 1,
          productName: product.name,
          date: new Date().toISOString().split('T')[0]
        };
        setStockAdjustments([...stockAdjustments, newAdjustment]);
        
        if (product) {
          const newQty = formData.type === 'Add' 
            ? product.quantity + parseInt(formData.quantity)
            : Math.max(0, product.quantity - parseInt(formData.quantity));
          setProducts(products.map(p => 
            p.id === product.id ? { ...p, quantity: newQty } : p
          ));
        }
        break;
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
        setSales(sales.filter(s => s.id !== id));
        break;
      case 'purchase':
        setPurchases(purchases.filter(p => p.id !== id));
        break;
    }
  };

  const lowStockItems = products.filter(item => getStockStatus(item.quantity, item.reorderLevel) === 'low').length;
  const totalValue = products.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

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


  const stats = [
    { label: 'Total Products', value: products.length, icon: Package },
    { label: 'Low Stock Items', value: lowStockItems, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Total Stock Value', value: `AED ${totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Total Sales Today', value: `AED ${totalRevenue.toLocaleString()}`, icon: ShoppingCart, color: 'text-blue-500' },
  ];

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