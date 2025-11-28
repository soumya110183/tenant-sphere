import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LowStockAlert = ({ count }) => {
  if (count === 0) return null;

  return (
    <Alert variant="destructive" className="bg-red-50 border-red-200">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <span className="font-semibold">{count} items</span> are running low on stock and need immediate attention.
      </AlertDescription>
    </Alert>
  );
};

export default LowStockAlert;