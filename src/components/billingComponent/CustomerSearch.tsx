import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  onClearCustomer,
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onClearCustomer: () => void;
}) => {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>(
    []
  );
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close suggestions when clicking outside or pressing Escape
  useEffect(() => {
    if (!showCustomerSuggestions) return;

    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCustomerSuggestions(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showCustomerSuggestions]);

  // 🔥 Show all customers if input is empty
  const handleSearchChange = (val: string) => {
    setCustomerSearch(val);

    if (!val.trim()) {
      setCustomerSuggestions(customers); // show all
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
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
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
    setHighlightedIndex(customerSearch.trim() ? 0 : -1);
  };

  const handleClearClick = () => {
    setCustomerSearch("");
    setCustomerSuggestions([]);
    setShowCustomerSuggestions(false);
    onClearCustomer();
  };

  return (
    <div className="space-y-2 w-full" ref={containerRef}>
      {/* <Label>Customer (for loyalty & coupons)</Label> */}

      <div className="relative">
        <Input
          className="pr-10 w-full"
          placeholder="Search customer by name or phone"
          value={customerSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!showCustomerSuggestions) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex((h) =>
                h < customerSuggestions.length - 1 ? h + 1 : 0
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex((h) =>
                h > 0 ? h - 1 : customerSuggestions.length - 1
              );
            } else if (e.key === "Enter") {
              e.preventDefault();
              const highlighted = customerSuggestions[highlightedIndex];
              if (highlighted) {
                handleCustomerSelect(highlighted);
              } else {
                // try exact match by name
                const exact = customers.find(
                  (c) =>
                    String(c.name || "")
                      .trim()
                      .toLowerCase() ===
                    String(customerSearch || "")
                      .trim()
                      .toLowerCase()
                );
                if (exact) handleCustomerSelect(exact);
              }
            } else if (e.key === "Escape") {
              setShowCustomerSuggestions(false);
            }
          }}
        />

        {/* Clear / Close button inside input */}
        {customerSearch && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={handleClearClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {showCustomerSuggestions && customerSuggestions.length > 0 && (
          <div className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg w-full z-[999] max-h-60 overflow-y-auto mt-1">
            {customerSuggestions.map((c, idx) => (
              <div
                key={c.id}
                className={`p-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 ${
                  idx === highlightedIndex
                    ? "bg-gray-100 dark:bg-gray-700"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  handleCustomerSelect(c);
                }}
              >
                <p className="font-semibold text-sm text-foreground dark:text-white">
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.phone || "No phone"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected customer details */}
      {selectedCustomer && (
        <div className="mt-2 text-sm bg-blue-50 dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-gray-700 text-foreground dark:text-white">
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
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
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
