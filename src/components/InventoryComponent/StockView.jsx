import { SearchFilter } from "./SmallComponents";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { Package } from "lucide-react";
import { StockTableRow } from "./StockTableRow";


export const StockView = ({ products, searchTerm, setSearchTerm, filterCategory, setFilterCategory, categories, openModal, handleDelete, getStockStatus, getStockColor, getStockPercentage }) => (
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