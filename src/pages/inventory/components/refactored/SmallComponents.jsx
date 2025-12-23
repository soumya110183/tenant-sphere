import { AlertTriangle, Search, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const LowStockAlert = ({ count }) => {
  if (count === 0) return null;

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="font-semibold text-sm sm:text-base">
            {count} item(s) are running low on stock and need immediate
            reordering
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Tab Navigation Component
export const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "stock", path: "/inventory" },
    { id: "sales", path: "/inventory/sales" },
    { id: "purchases", path: "/inventory/purchases" },
    { id: "sales returns", path: "/inventory/sales-returns" },
    { id: "purchase returns", path: "/inventory/purchase-returns" },
  ];

  return (
    <div className="border-b overflow-x-auto">
      <nav className="flex gap-2 sm:gap-4 min-w-max">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-3 sm:px-4 border-b-2 transition-colors capitalize text-sm sm:text-base whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.id}
          </Link>
        ))}
      </nav>
    </div>
  );
};

// Search and Filter Component
export const SearchFilter = ({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  categories,
  onAddProduct,
}) => (
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
    <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search by product name or barcode..."
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
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  </div>
);
