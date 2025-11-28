import { Card, CardContent } from "@/components/ui/card";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart,
  Edit, // Add any other icons you might use
  RotateCcw,
  TrendingDown
} from "lucide-react";

const iconMap = {
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Edit,
  RotateCcw,
  TrendingDown
  // Add any other icons you use in stats
};
const StatsCard = ({ stat }) => {
  const IconComponent = iconMap[stat.icon];

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${stat.color || 'text-foreground'}`}>
              {stat.value}
            </p>
          </div>
          <div className={`p-3 rounded-full ${stat.color ? stat.color.replace('text', 'bg') + '/10' : 'bg-primary/10'}`}>
            <IconComponent className={`h-5 w-5 ${stat.color || 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;