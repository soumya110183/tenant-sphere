import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Normalize a variety of possible backend shapes into an array of { name, qty, reason? }
export function normalizeItems(record: any) {
  if (!record) return [];

  let raw: any[] = [];

  if (Array.isArray(record.items)) raw = record.items;
  else if (Array.isArray(record.purchase_items)) raw = record.purchase_items;
  else if (Array.isArray(record.invoice_items)) raw = record.invoice_items;
  else if (Array.isArray(record.products)) raw = record.products;

  // If the backend returned a flat object with product_name + quantity
  if (raw.length === 0 && (record.product_name || record.name)) {
    return [
      {
        name:
          record.product_name ||
          record.name ||
          String(record.product_id || record.productId || "Item"),
        qty: record.quantity ?? record.qty ?? 1,
        reason: record.reason || record.return_reason || null,
      },
    ];
  }

  return raw.map((it: any) => {
    if (typeof it === "string") return { name: it, qty: 1 };

    const qty = it.qty ?? it.quantity ?? it.count ?? it.amount ?? 1;

    let name =
      it.name ||
      it.product_name ||
      it.title ||
      it.productName ||
      it.label ||
      it.product ||
      null;

    const nestedCandidates = [
      "product",
      "products",
      "productInfo",
      "product_detail",
      "productDetail",
    ];
    for (const key of nestedCandidates) {
      const nested = it[key];
      if (!nested) continue;

      if (typeof nested === "string") {
        name = name || nested;
        break;
      }

      if (Array.isArray(nested)) {
        const first = nested[0];
        if (first) {
          name =
            name ||
            first.name ||
            first.product_name ||
            first.title ||
            first.productName ||
            first.label ||
            null;
          if (name) break;
        }
        continue;
      }

      name =
        name ||
        nested.name ||
        nested.product_name ||
        nested.title ||
        nested.productName ||
        nested.label ||
        nested.name_en ||
        null;
      if (name) break;
    }

    if (!name)
      name = `Item ${String(
        it.product_id ?? it.productId ?? it.id ?? ""
      )}`.trim();

    const reason = it.reason || it.return_reason || null;
    return { name, qty, reason };
  });
}
