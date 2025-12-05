import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  selling_price: number;
  tax_percent: number;
  quantity: number;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  loyalty_points: number;
  membership_tier: string;
};

export const CustomerSearch = ({
  customers,
  selectedCustomer,
  onCustomerSelect,
  onClearCustomer
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onClearCustomer: () => void;
}) => {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // 🔥 Show all customers if input is empty
  const handleSearchChange = (val: string) => {
    setCustomerSearch(val);

    if (!val.trim()) {
      setCustomerSuggestions(customers);     // show all
      setShowCustomerSuggestions(true);
      onClearCustomer();
      return;
    }

    // 🔍 Filter customers when typing
    const search = val.toLowerCase();
    const filtered = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        (c.phone && c.phone.toLowerCase().includes(search))
    );

    setCustomerSuggestions(filtered);
    setShowCustomerSuggestions(true);
  };

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setCustomerSearch(customer.name);
    setShowCustomerSuggestions(false);
  };

  const handleInputFocus = () => {
    // 👁️ Always show full list if input is empty
    if (!customerSearch.trim()) {
      setCustomerSuggestions(customers);
    }
    setShowCustomerSuggestions(true);
  };

  return (
    <div className="space-y-2">
      <Label>Customer (for loyalty & coupons)</Label>

      <div className="relative">
        <Input
          placeholder="Search customer by name or phone"
          value={customerSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleInputFocus}
        />

        {showCustomerSuggestions && customerSuggestions.length > 0 && (
          <div className="absolute bg-white border rounded-md shadow-lg w-full z-[999] max-h-60 overflow-y-auto mt-1">
            {customerSuggestions.map((c) => (
              <div
                key={c.id}
                className="p-2 cursor-pointer hover:bg-gray-100 border-b"
                onClick={() => handleCustomerSelect(c)}
              >
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{c.phone || "No phone"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected customer details */}
      {selectedCustomer && (
        <div className="mt-2 text-sm bg-blue-50 p-2 rounded border border-blue-200">
          <div className="flex justify-between">
            <span className="font-medium">Name:</span>
            <span>{selectedCustomer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Phone:</span>
            <span>{selectedCustomer.phone || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Points:</span>
            <span className="text-blue-600 font-semibold">
              {selectedCustomer.loyalty_points || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Tier:</span>
            <span>{selectedCustomer.membership_tier || "Bronze"}</span>
          </div>
        </div>
      )}
    </div>
  );
};
