import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Package, Edit, Trash2, Loader2 } from "lucide-react";
import { SearchFilter } from "@/pages/inventory/components/refactored/SmallComponents";

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
export const StockView = ({
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
  productsTotalRecords,
}) => {
  React.useEffect(() => {
    try {
      console.log("StockView props:", {
        productsLength: Array.isArray(products) ? products.length : products,
        productsTotalRecords,
      });
    } catch (e) {
      /* ignore */
    }
  }, [products, productsTotalRecords]);

  return (
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
            {(() => {
              const totalRecords =
                typeof productsTotalRecords === "number" &&
                productsTotalRecords > 0
                  ? productsTotalRecords
                  : products.length;
              return `Stock Inventory (${totalRecords} Records)`;
            })()}
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
};
