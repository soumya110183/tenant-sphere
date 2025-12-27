import React, { useEffect, useState } from "react";
import { invoiceService } from "@/services/api";

export const InvoicePicker = ({ sales, value, onSelect }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      let mounted = true;
      const timer = setTimeout(async () => {
        // If user hasn't typed, show provided sales list (limited)
        if (!query || query.trim() === "") {
          setResults((sales || []).slice(0, 20));
          return;
        }
        setLoading(true);
        try {
          const tenantId = localStorage.getItem("tenant_id");
          const params: Record<string, any> = { search: query, limit: 20 };
          if (tenantId) params.tenant_id = tenantId;
          const resp = await invoiceService.getAll(params);
          const data = resp?.data ?? resp;
          let raw: any[] = [];
          if (data && Array.isArray(data.data)) raw = data.data;
          else if (data && Array.isArray(data.invoices)) raw = data.invoices;
          else if (Array.isArray(data)) raw = data;
          // Map to a consistent shape
          const mapped = raw.map((s: any) => ({
            id: s.id,
            invoice_number: s.invoice_number ?? s.invoiceNo ?? s.number ?? s.id,
            created_at: s.created_at ?? s.date,
            total_amount: Number(
              s.total_amount ?? s.total ?? s.final_amount ?? 0
            ),
            customer_name:
              s.customer_name || s.customers?.name || s.customer?.name,
            invoice_items: s.invoice_items ?? s.items ?? s.lines ?? [],
          }));
          if (mounted) setResults(mapped.slice(0, 50));
        } catch (err) {
          console.error("Invoice search failed:", err);
          if (mounted) setResults([]);
        } finally {
          if (mounted) setLoading(false);
        }
      }, 350);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }, [query, sales]);
  
    return (
      <div>
        <input
          type="search"
          placeholder="Search invoice number, customer or date"
          className="w-full px-3 py-2 border rounded-md bg-background text-sm mb-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No invoices
            </div>
          ) : (
            results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(String(s.id))}
                className="w-full text-left px-3 py-2 hover:bg-muted/30 text-sm flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">Invoice #{s.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "N/A"}
                    {s.customer_name ? ` • ${s.customer_name}` : ""}
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  AED {Number(s.total_amount || 0).toFixed(2)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };