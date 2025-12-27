import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  Tag,
  DollarSign,
  BarChart,
  Layers,
  Loader2,
  AlertCircle,
} from "lucide-react";

// API Configuration
const API_BASE_URL = "http://localhost:5000/api/products";

// Use centralized productService from services/api
import { productService } from "../services/api";

// runtime holder for categories to avoid JSX prop typing friction
let productModalCategories: any[] = [];

// Product Stats Card Component (dynamic icon rendering, optional click)
const ProductStatsCard = ({ stat, onClick = undefined }: any) => {
  const Icon = stat.icon;
  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div
              className={`text-2xl font-bold ${
                stat.color || "text-foreground"
              }`}
            >
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
          {Icon ? (
            <Icon
              className={`h-8 w-8 ${stat.color || "text-muted-foreground"}`}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

// Search and Filter Component for Products
const ProductSearchFilter = ({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  categories,
  onAddProduct,
  onAddCategory,
  isLoading,
}) => (
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
    <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search by product name..."
        className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={isLoading}
      />
    </div>
    <select
      className="px-4 py-2 border rounded-md bg-background text-sm"
      value={filterCategory}
      onChange={(e) => setFilterCategory(e.target.value)}
      disabled={isLoading}
    >
      <option value="All">All Categories</option>
      {categories.map((cat) => (
        <option key={cat?.id ?? cat} value={cat?.name ?? cat}>
          {cat?.name ?? cat}
        </option>
      ))}
    </select>
    <div className="flex items-center gap-2">
      <Button onClick={onAddProduct} disabled={isLoading}>
        <Plus className="h-4 w-4 mr-2" />
        Add Product
      </Button>
      <Button onClick={onAddCategory} variant="outline" disabled={isLoading}>
        + Add Category
      </Button>
    </div>
  </div>
);

// Product Table Row Component
const ProductTableRow = ({ product, onEdit, onDelete, isDeleting }) => {
  const margin = (product.selling_price || 0) - (product.cost_price || 0);
  const marginPercent = product.cost_price
    ? ((margin / product.cost_price) * 100).toFixed(1)
    : "0.0";

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div>{product.name}</div>
            <div className="text-xs text-muted-foreground">
              SKU: {product.sku || "N/A"}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">{product.brand || "N/A"}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">
        <Badge variant="outline">{product.category || "Uncategorized"}</Badge>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">{product.unit || "N/A"}</td>
      <td className="py-3 px-2 sm:px-4 text-sm">
        AED {product.cost_price || 0}
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">
        AED {product.selling_price || 0}
      </td>
      <td className="py-3 px-2 sm:px-4">
        <span
          className={`font-medium text-xs sm:text-sm ${
            margin >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          AED {margin.toFixed(2)} ({marginPercent}%)
        </span>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">{product.tax || 0}%</td>
      <td className="py-3 px-2 sm:px-4">
        <Badge
          className={
            product.status === "Active"
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }
        >
          {product.status}
        </Badge>
      </td>
      <td className="py-3 px-2 sm:px-4">
        <div className="flex gap-1 sm:gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(product)}
            disabled={isDeleting}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(product.id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
};

// Product Modal Component
type ProductModalProps = {
  showModal: any;
  editingProduct?: any;
  formData: any;
  setFormData: any;
  onClose: any;
  onSubmit: any;
  isSubmitting: any;
  categories?: any[];
};
const ProductModal = (props: ProductModalProps) => {
  const {
    showModal,
    editingProduct,
    formData,
    setFormData,
    onClose,
    onSubmit,
    isSubmitting,
  } = props;
  const categories = (props as any).categories ?? productModalCategories;
  if (!showModal) return null;

  const units = [
    "kg",
    "g",
    "litre",
    "ml",
    "piece",
    "pack",
    "bottle",
    "can",
    "box",
    "dozen",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-background z-10">
          <h2 className="text-lg sm:text-xl font-bold">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={isSubmitting}
          >
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
                <label className="block text-sm font-medium mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter product name"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.brand || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  placeholder="Enter brand name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.category || ""}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const catObj = (categories || []).find(
                        (c) => (c?.name ?? c) === selected
                      );
                      setFormData({
                        ...formData,
                        category: selected,
                        category_id: catObj
                          ? catObj.id ?? catObj._id ?? catObj
                          : undefined,
                      });
                    }}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option
                        key={cat && (cat.id ?? cat._id ?? cat.name ?? cat)}
                        value={cat.name ?? cat}
                      >
                        {cat.name ?? cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.unit || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Select Unit</option>
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.sku || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="e.g., PROD-001"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.barcode || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Optional barcode"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Product description (optional)"
                  disabled={isSubmitting}
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
                  <label className="block text-sm font-medium mb-1">
                    Cost Price (AED)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.cost_price ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost_price:
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Selling Price (AED)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.selling_price ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        selling_price:
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.tax ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tax:
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.status || "Active"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    disabled={isSubmitting}
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
                      AED{" "}
                      {(
                        (formData.selling_price || 0) -
                        (formData.cost_price || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin %:</span>
                    <div className="font-semibold text-green-600">
                      {(
                        (((formData.selling_price || 0) -
                          (formData.cost_price || 0)) /
                          (formData.cost_price || 1)) *
                        100
                      ).toFixed(1)}
                      %
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
                  <label className="block text-sm font-medium mb-1">
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.supplier_code || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        supplier_code: e.target.value,
                      })
                    }
                    placeholder="e.g., SUP-001"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={formData.hsn_code || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, hsn_code: e.target.value })
                    }
                    placeholder="For tax purposes"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Product Features
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.features || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, features: e.target.value })
                  }
                  placeholder="Key features (optional)"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingProduct ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingProduct ? "Update Product" : "Add Product"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Category Modal Component
const CategoryModal = ({
  showModal,
  formData,
  setFormData,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  if (!showModal) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
      <div
        className="bg-background rounded-lg w-full max-w-lg max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-background z-10">
          <h2 className="text-lg sm:text-xl font-bold">Add Category</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Category Name *
            </label>
            <input
              required
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Error Alert Component
const ErrorAlert = ({ message, onClose }) => (
  <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
    <Card className="bg-red-50 border-red-200">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 text-sm">Error</h3>
            <p className="text-sm text-red-700 mt-1">{message}</p>
          </div>
          <button onClick={onClose} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Main Product Catalog Component
const ProductCatalog = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [categoryForm, setCategoryForm] = useState<any>({});
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [PRODUCTS_PAGE_SIZE] = useState(10);
  const [productsTotalRecords, setProductsTotalRecords] = useState(0);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [jumpInput, setJumpInput] = useState<string>(String(productsPage));

  // Load products on component mount
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setProductsPage(1);
      loadProducts(searchTerm, 1);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Reload when page changes
  useEffect(() => {
    loadProducts(searchTerm, productsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsPage]);

  const loadProducts = async (search = "", page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      // centralized productService.getAll() returns all products
      const params: Record<string, any> = { page, limit: PRODUCTS_PAGE_SIZE };
      if (search) params.search = search;
      const data = await productService.getAll(params);
      // support both shapes: array or { data: [...], meta... }
      const rawProducts: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      // extract total records/pages when available (support Supabase controller fields)
      let total =
        Number(
          data?.totalRecords ??
            data?.meta?.total ??
            data?.total ??
            data?.pagination?.total ??
            0
        ) || 0;
      // fallback to array length when backend returns plain array (no pagination meta)
      if (!total) total = rawProducts.length;

      const totalPages =
        Number(
          data?.totalPages ??
            data?.meta?.last_page ??
            Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE))
        ) || Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));

      // if backend provided page info, reflect it (keeps UI in sync)
      const backendPage =
        Number(data?.page ?? data?.currentPage ?? page) || page;

      setProductsTotalRecords(total);
      setProductsTotalPages(totalPages);
      setProductsPage(backendPage);

      // if a search term is provided, filter client-side (name match)
      const filtered = search
        ? rawProducts.filter((p) =>
            String(p?.name || "")
              .toLowerCase()
              .includes(search.toLowerCase())
          )
        : rawProducts;
      setProducts(filtered);
    } catch (err) {
      console.error("Error loading products:", err);
      setError(
        err.message ||
          "Failed to load products. Please check your connection and authentication."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand,
        category: product.category,
        category_id:
          product.category_id ??
          product.categoryId ??
          categoriesList.find((c) => (c.name ?? c) === product.category)?.id ??
          undefined,
        unit: product.unit,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        tax: product.tax,
        sku: product.sku,
        barcode: product.barcode,
        status: product.status,
        description: product.description,
        supplier_code: product.supplier_code,
        hsn_code: product.hsn_code,
        features: product.features,
      });
    } else {
      setFormData({
        name: "",
        brand: "",
        category: "",
        category_id: undefined,
        unit: "",
        cost_price: 0,
        selling_price: 0,
        tax: 0,
        sku: "",
        barcode: "",
        status: "Active",
        description: "",
        supplier_code: "",
        hsn_code: "",
        features: "",
      });
    }
    setShowModal(true);
  };

  const openCategoryModal = () => {
    setCategoryForm({ name: "", description: "" });
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryForm({});
  };

  const handleCategorySave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!categoryForm.name || !String(categoryForm.name).trim()) {
      setError("Category name is required");
      return;
    }

    setIsCategorySubmitting(true);
    try {
      const apiRoot = API_BASE_URL.replace(/\/api\/products\/?$/, "");
      const payload = {
        name: categoryForm.name,
        description: categoryForm.description || "",
      };

      const res = await fetch(`${apiRoot}/api/categories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(j?.message || j?.error || "Failed to create category");
      }

      const newCategory = j?.data || j;
      await loadCategories();
      if (newCategory && newCategory.name) {
        setFormData((prev) => ({
          ...(prev || {}),
          category: newCategory.name,
          category_id:
            newCategory.id ??
            newCategory._id ??
            newCategory.category_id ??
            undefined,
        }));
      }
      closeCategoryModal();
    } catch (err) {
      console.error("Create category failed:", err);
      setError(err.message || "Failed to create category");
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const loadCategories = async () => {
    try {
      const apiRoot = API_BASE_URL.replace(/\/api\/products\/?$/, "");
      const res = await fetch(`${apiRoot}/api/categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
      });
      if (!res.ok) {
        console.warn("Failed to fetch categories", res.status);
        return;
      }
      const j = await res.json().catch(() => null);
      const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      const normalized = list.map((c) => ({
        id: c.id ?? c._id ?? c.id,
        name: c.name ?? c,
        description: c.description ?? "",
      }));
      setCategoriesList(normalized);
    } catch (e) {
      console.warn("loadCategories error:", e);
    }
  };

  React.useEffect(() => {
    loadCategories();
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      let result;
      // Ensure payload always includes both category name and category_id
      const resolvedCategoryId =
        formData.category_id ??
        categoriesList.find((c) => (c.name ?? c) === formData.category)?.id ??
        categoriesList.find((c) => c.id === formData.category)?.id;

      const resolvedCategoryName =
        formData.category ||
        (categoriesList.find((c) => c.id === formData.category_id)?.name ??
          categoriesList.find((c) => c.id === resolvedCategoryId)?.name);

      const payload = {
        ...formData,
        category: resolvedCategoryName || formData.category || "",
        category_id: resolvedCategoryId ?? formData.category_id ?? undefined,
        // include alias in case backend expects `categoryId`
        categoryId: resolvedCategoryId ?? formData.category_id ?? undefined,
      };

      if (editingProduct) {
        result = await productService.update(editingProduct.id, payload);
        // Update existing product in state
        setProducts((prevProducts) =>
          prevProducts.map((p) =>
            p.id === editingProduct.id
              ? { ...result, id: editingProduct.id }
              : p
          )
        );
      } else {
        result = await productService.create(payload);
        // Add new product to state
        setProducts((prevProducts) => [
          ...prevProducts,
          { ...result, id: result.id },
        ]);
      }

      closeModal();
    } catch (err) {
      console.error("Error saving product:", err);
      setError(err.message || "Failed to save product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      setIsDeleting(true);
      setError(null);
      await productService.delete(id);
      await loadProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError(err.message || "Failed to delete product. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate statistics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === "Active").length;
  const averageMargin =
    products.length > 0
      ? products.reduce(
          (sum, p) =>
            sum + ((p.selling_price - p.cost_price) / p.cost_price) * 100,
          0
        ) / products.length
      : 0;
  const categoriesCount = new Set(
    products.map((p) => p.category).filter(Boolean)
  ).size;

  const stats = [
    {
      label: "Total Products",
      value: totalProducts,
      icon: Package,
      color: "text-blue-500",
    },
    {
      label: "Active Products",
      value: activeProducts,
      icon: BarChart,
      color: "text-green-500",
    },
    {
      label: "Avg. Margin",
      value: `${averageMargin.toFixed(1)}%`,
      icon: DollarSign,
      color: "text-purple-500",
    },
    {
      label: "Categories",
      value: categoriesCount,
      icon: Layers,
      color: "text-orange-500",
    },
  ];

  // build category filter options from backend categoriesList when available
  const derivedCategoriesFromList = (categoriesList || [])
    .map((c) => c?.name)
    .filter(Boolean);
  const categories = [
    "All",
    ...new Set(
      derivedCategoriesFromList.length > 0
        ? derivedCategoriesFromList
        : products.map((p) => p.category).filter(Boolean)
    ),
  ];

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      filterCategory === "All" || product.category === filterCategory;
    return matchesCategory;
  });
  console.log(products);
  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Product Catalog
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your product database and master catalog
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

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
          onAddCategory={() => openCategoryModal()}
          isLoading={isLoading}
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
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                        Product
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                        Brand
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                        Category
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                        Unit
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
                        Tax
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                        Status
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="text-center py-8 text-muted-foreground text-sm"
                        >
                          {products.length === 0
                            ? "No products found. Add your first product to get started!"
                            : "No products match your search criteria."}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <ProductTableRow
                          key={product.id}
                          product={product}
                          onEdit={openModal}
                          onDelete={handleDelete}
                          isDeleting={isDeleting}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {productsTotalRecords > PRODUCTS_PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProductsPage(Math.max(1, productsPage - 1))}
                disabled={productsPage === 1}
              >
                Prev
              </Button>

              <span className="text-sm text-gray-500">
                Page {productsPage} of {productsTotalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setProductsPage(
                    Math.min(productsPage + 1, productsTotalPages)
                  )
                }
                disabled={productsPage >= productsTotalPages}
              >
                Next
              </Button>

              {/* Jump to page input */}
              <div className="flex items-center gap-2 ml-3">
                <input
                  type="text"
                  placeholder="page or 'next'/'prev'"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = (jumpInput || "")
                        .toString()
                        .trim()
                        .toLowerCase();
                      if (v === "next" || v === "n") {
                        setProductsPage((p) =>
                          Math.min(p + 1, productsTotalPages)
                        );
                      } else if (
                        v === "prev" ||
                        v === "previous" ||
                        v === "p"
                      ) {
                        setProductsPage((p) => Math.max(1, p - 1));
                      } else {
                        const num = Number(v);
                        if (!isNaN(num) && num >= 1) {
                          setProductsPage(
                            Math.min(
                              Math.max(1, Math.floor(num)),
                              productsTotalPages
                            )
                          );
                        }
                      }
                    }
                  }}
                  className="w-36 px-2 py-1 border rounded text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const v = (jumpInput || "").toString().trim().toLowerCase();
                    if (v === "next" || v === "n") {
                      setProductsPage((p) =>
                        Math.min(p + 1, productsTotalPages)
                      );
                    } else if (v === "prev" || v === "previous" || v === "p") {
                      setProductsPage((p) => Math.max(1, p - 1));
                    } else {
                      const num = Number(v);
                      if (!isNaN(num) && num >= 1) {
                        setProductsPage(
                          Math.min(
                            Math.max(1, Math.floor(num)),
                            productsTotalPages
                          )
                        );
                      }
                    }
                  }}
                >
                  Go
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing{" "}
              {Math.min(
                (productsPage - 1) * PRODUCTS_PAGE_SIZE + 1,
                productsTotalRecords
              )}
              -
              {Math.min(
                productsPage * PRODUCTS_PAGE_SIZE,
                productsTotalRecords
              )}{" "}
              of {productsTotalRecords}
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {/* expose categories to the modal via runtime holder to avoid JSX prop typing friction */}
      {(() => {
        productModalCategories = categoriesList || [];
        return null;
      })()}
      <ProductModal
        showModal={showModal}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Category Modal */}
      <CategoryModal
        showModal={showCategoryModal}
        formData={categoryForm}
        setFormData={setCategoryForm}
        onClose={closeCategoryModal}
        onSubmit={handleCategorySave}
        isSubmitting={isCategorySubmitting}
      />
    </div>
  );
};

export default ProductCatalog;
