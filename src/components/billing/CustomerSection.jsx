import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CustomerSection = ({
  selectedCustomer,
  searchValue,
  onSearch,
  onSelect,
  onAddNew,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Customer</Label>
        <Button size="sm" variant="outline" onClick={onAddNew}>
          + Add
        </Button>
      </div>

      <Input
        placeholder="Search customer"
        value={searchValue}
        onChange={(e) => onSearch(e.target.value)}
        className="mt-1"
      />

      {selectedCustomer && (
        <div className="text-sm bg-blue-50 p-2 rounded mt-2">
          <p>
            <strong>Name:</strong> {selectedCustomer.name}
          </p>
          <p>
            <strong>Phone:</strong> {selectedCustomer.phone}
          </p>
          <p>
            <strong>Points:</strong> {selectedCustomer.loyalty_points}
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerSection;
