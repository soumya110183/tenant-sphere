import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingCart, 
  TrendingDown, 
  RotateCcw, 
  Edit 
} from "lucide-react";

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "stock", label: "Stock", icon: Package },
    { id: "sales", label: "Sales", icon: ShoppingCart },
    { id: "purchases", label: "Purchases", icon: TrendingDown },
    { id: "returns", label: "Returns", icon: RotateCcw },
    { id: "adjustments", label: "Adjustments", icon: Edit },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b pb-2">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <IconComponent className="h-4 w-4" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
};

export default TabNavigation;