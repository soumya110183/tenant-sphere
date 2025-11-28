import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Loader2 } from "lucide-react";
import StockTableRow from "./StockTableRow";
import SearchFilter from "../common/SearchFilter";

const StockView = ({
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
  isLoading
}) => {
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
            Stock Inventory ({filteredProducts.length} items)
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
                  <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-8 text-muted-foreground text-sm">
                      No inventory items found. Add your first inventory item to get started!
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((item) => (
                    <StockTableRow
                      key={item.id}
                      item={item}
                      getStockStatus={getStockStatus}
                      getStockColor={getStockColor}
                      getStockPercentage={getStockPercentage}
                      onEdit={(item) => openModal("inventory", item)}
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
};

export default StockView;