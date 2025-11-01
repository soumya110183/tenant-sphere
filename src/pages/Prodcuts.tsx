import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Plus, Edit, Trash2, Search, X, Save, Tag, DollarSign, BarChart, Layers } from 'lucide-react';

// Product Stats Card Component
const ProductStatsCard = ({ stat }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${stat.color || 'text-foreground'}`}>
            {stat.value}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
        </div>
        <stat.icon className={`h-8 w-8 ${stat.color || 'text-muted-foreground'}`} />
      </div>
    </CardContent>
  </Card>
);

// Search and Filter Component for Products
const ProductSearchFilter = ({ searchTerm, setSearchTerm, filterCategory, setFilterCategory, categories, onAddProduct }) => (
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
    <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search by product name, brand, or barcode..."
        className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
    <select
      className="px-4 py-2 border rounded-md bg-background text-sm"
      value={filterCategory}
      onChange={(e) => setFilterCategory(e.target.value)}
    >
      <option value="All">All Categories</option>
      {categories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
    <select
      className="px-4 py-2 border rounded-md bg-background text-sm"
      defaultValue="All"
    >
      <option value="All">All Brands</option>
      <option value="Amul">Amul</option>
      <option value="Coca Cola">Coca Cola</option>
      <option value="India Gate">India Gate</option>
      <option value="Fortune">Fortune</option>
      <option value="Colgate">Colgate</option>
      <option value="Britannia">Britannia</option>
      <option value="Head & Shoulders">Head & Shoulders</option>
    </select>
    <Button onClick={onAddProduct} className="whitespace-nowrap">
      <Plus className="h-4 w-4 mr-2" />
      Add Product
    </Button>
  </div>
);

// Product Table Row Component
const ProductTableRow = ({ product, onEdit, onDelete }) => {
  const margin = product.sellingPrice - product.costPrice;
  const marginPercent = ((margin / product.costPrice) * 100).toFixed(1);
  
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div>{product.name}</div>
            <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">{product.brand}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">
        <Badge variant="outline">{product.category}</Badge>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">{product.unit}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">AED {product.costPrice}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">AED {product.sellingPrice}</td>
      <td className="py-3 px-2 sm:px-4">
        <span className={`font-medium text-xs sm:text-sm ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          AED {margin} ({marginPercent}%)
        </span>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">{product.tax}%</td>
      <td className="py-3 px-2 sm:px-4">
        <Badge className={product.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
          {product.status}
        </Badge>
      </td>
      <td className="py-3 px-2 sm:px-4">
        <div className="flex gap-1 sm:gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(product.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

// Product Modal Component
const ProductModal = ({ showModal, editingProduct, formData, setFormData, onClose, onSubmit }) => {
  if (!showModal) return null;

  const categories = [
    'Grocery', 'Beverage', 'Dairy', 'Bakery', 'Personal Care', 
    'Household', 'Frozen Foods', 'Snacks', 'Baby Care', 'Health & Wellness'
  ];

  const units = ['kg', 'g', 'litre', 'ml', 'piece', 'pack', 'bottle', 'can', 'box', 'dozen'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-background z-10">
          <h2 className="text-lg sm:text-xl font-bold">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Basic Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter product name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Brand *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  placeholder="Enter brand name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="">Select Unit</option>
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="e.g., PROD-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    placeholder="Optional barcode"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Product description (optional)"
                />
              </div>
            </div>

            {/* Pricing & Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing & Status
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Price (AED) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.costPrice || 0}
                    onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price (AED) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.sellingPrice || 0}
                    onChange={(e) => setFormData({...formData, sellingPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tax Rate (%) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.tax || 0}
                    onChange={(e) => setFormData({...formData, tax: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.status || 'Active'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>
              
              {/* Margin Display */}
              <div className="p-3 bg-muted/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Profit Margin</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Profit:</span>
                    <div className="font-semibold text-green-600">
                      AED {((formData.sellingPrice || 0) - (formData.costPrice || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin %:</span>
                    <div className="font-semibold text-green-600">
                      {((formData.sellingPrice || 0) - (formData.costPrice || 0)) / (formData.costPrice || 1) * 100 || 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <h3 className="font-semibold text-sm flex items-center gap-2 pt-2">
                <Layers className="h-4 w-4" />
                Additional Information
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Code</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.supplierCode || ''}
                    onChange={(e) => setFormData({...formData, supplierCode: e.target.value})}
                    placeholder="e.g., SUP-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">HSN Code</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.hsnCode || ''}
                    onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                    placeholder="For tax purposes"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Product Features</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.features || ''}
                  onChange={(e) => setFormData({...formData, features: e.target.value})}
                  placeholder="Key features (optional)"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {editingProduct ? 'Update Product' : 'Add Product'}
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

// Main Product Catalog Component
const ProductCatalog = () => {
  // Sample initial product data
  const [products, setProducts] = useState([
    {
      id: 101,
      name: 'Basmati Rice',
      brand: 'India Gate',
      category: 'Grocery',
      unit: 'kg',
      costPrice: 80,
      sellingPrice: 100,
      tax: 5,
      sku: 'RIC-001',
      barcode: '8901234567890',
      status: 'Active',
      description: 'Premium quality basmati rice',
      supplierCode: 'SUP-001',
      hsnCode: '1006',
      features: 'Long grain, aromatic'
    },
    {
      id: 102,
      name: 'Coca Cola',
      brand: 'Coca Cola',
      category: 'Beverage',
      unit: 'ml',
      costPrice: 30,
      sellingPrice: 40,
      tax: 12,
      sku: 'BEV-001',
      barcode: '8901234567891',
      status: 'Active',
      description: 'Carbonated soft drink',
      supplierCode: 'SUP-002',
      hsnCode: '2202',
      features: '330ml can'
    },
    {
      id: 103,
      name: 'Sunflower Oil',
      brand: 'Fortune',
      category: 'Grocery',
      unit: 'litre',
      costPrice: 180,
      sellingPrice: 220,
      tax: 5,
      sku: 'OIL-001',
      barcode: '8901234567892',
      status: 'Active',
      description: 'Pure sunflower cooking oil',
      supplierCode: 'SUP-003',
      hsnCode: '1507',
      features: '1 litre bottle, cholesterol free'
    },
    {
      id: 104,
      name: 'Toothpaste',
      brand: 'Colgate',
      category: 'Personal Care',
      unit: 'piece',
      costPrice: 45,
      sellingPrice: 65,
      tax: 18,
      sku: 'PTC-001',
      barcode: '8901234567893',
      status: 'Active',
      description: 'Fluoride toothpaste for cavity protection',
      supplierCode: 'SUP-004',
      hsnCode: '3306',
      features: '150g tube, fresh mint'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({});

  const openModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: '',
        brand: '',
        category: '',
        unit: '',
        costPrice: 0,
        sellingPrice: 0,
        tax: 0,
        sku: '',
        barcode: '',
        status: 'Active',
        description: '',
        supplierCode: '',
        hsnCode: '',
        features: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingProduct) {
      // Update existing product
      setProducts(products.map(p => 
        p.id === editingProduct.id ? { ...formData, id: editingProduct.id } : p
      ));
    } else {
      // Add new product
      const newProduct = {
        ...formData,
        id: Math.max(...products.map(p => p.id), 0) + 1
      };
      setProducts([...products, newProduct]);
    }
    
    closeModal();
  };

  const handleDelete = (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setProducts(products.filter(p => p.id !== id));
  };

  // Calculate statistics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'Active').length;
  const averageMargin = products.length > 0 
    ? products.reduce((sum, p) => sum + ((p.sellingPrice - p.costPrice) / p.costPrice * 100), 0) / products.length 
    : 0;
  const categoriesCount = new Set(products.map(p => p.category)).size;

  const stats = [
    { 
      label: 'Total Products', 
      value: totalProducts, 
      icon: Package,
      color: 'text-blue-500'
    },
    { 
      label: 'Active Products', 
      value: activeProducts, 
      icon: BarChart,
      color: 'text-green-500'
    },
    { 
      label: 'Avg. Margin', 
      value: `${averageMargin.toFixed(1)}%`, 
      icon: DollarSign,
      color: 'text-purple-500'
    },
    { 
      label: 'Categories', 
      value: categoriesCount, 
      icon: Layers,
      color: 'text-orange-500'
    },
  ];

  const categories = ['All', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Product Catalog</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your product database and master catalog
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <ProductStatsCard key={index} stat={stat} />
          ))}
        </div>

        {/* Search and Filters */}
        <ProductSearchFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          categories={categories}
          onAddProduct={() => openModal()}
        />

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Package className="h-5 w-5 text-primary" />
              Product Catalog ({filteredProducts.length} products)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Product</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Brand</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Category</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Unit</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Cost</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Selling</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Margin</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Tax</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Status</th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-8 text-muted-foreground text-sm">
                        {products.length === 0 
                          ? 'No products found. Add your first product to get started!' 
                          : 'No products match your search criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <ProductTableRow
                        key={product.id}
                        product={product}
                        onEdit={openModal}
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

      {/* Product Modal */}
      <ProductModal
        showModal={showModal}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default ProductCatalog;