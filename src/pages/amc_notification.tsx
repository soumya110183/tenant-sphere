// src/pages/amc_notification.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import tenantsData from "@/data/tenants.json";
import { paymentsAPI, tenantAPI, amcAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Users } from "lucide-react";

/* ========= Types ========= */
type BillingFrequency = "1_year" | "3_year" | "6_year" | "10_year";

interface Tenant {
  id: string | number;
  name: string;
  category?: string;
  plan?: string;
  status?: string;
  created_at?: string;
  modules?: string[] | Record<string, boolean>;
  email?: string;
  phone?: string;
  address?: string;
  amc_amount?: number;
  billing_frequency?: BillingFrequency;
  amc_number?: string;
  due_date?: string;
  expire_date?: string;
  [key: string]: unknown;
}

interface Payment {
  id: string | number;
  plan?: string;
  payment_date: string;
  amount: number | string;
  status?: string;
}

interface ExpirationInfo {
  is_expired?: boolean;
  status_message?: string;
}

interface AMCRecord {
  id?: string | number;
  client_name?: string;
  plan?: string;
  start_date?: string;
  end_date?: string;
  status?: boolean;
  amount?: number;
  billing_frequency?: BillingFrequency;
  tenat_amcid?: string | number;
  expiration_info?: ExpirationInfo;
}

type Buckets = {
  green: Tenant[];
  blue: Tenant[];
  orange: Tenant[];
  red: Tenant[];
};

/* ========= Constants & pure helpers (module scope) ========= */

// AMC annual rates per plan
const amcAnnualRates: Record<string, number> = {
  trial: 0,
  basic: 100,
  professional: 250,
  enterprise: 350,
  proffection: 250, // tolerate common alias
  enterprice: 350, // tolerate common alias
};

function calculateAmcAmount(
  plan: string | undefined,
  frequency: BillingFrequency
): number {
  const planKey = (plan ?? "").toLowerCase().split(/[-_\s]/)[0];
  const annualRate = amcAnnualRates[planKey] ?? 0;
  if (!annualRate) return 0;

  switch (frequency) {
    case "1_year":
      return annualRate;
    case "3_year":
      return annualRate * 3;
    case "6_year":
      return annualRate * 6;
    case "10_year":
      return annualRate * 10;
    default:
      return annualRate;
  }
}

function calculateExpireDate(startDate: string, frequency: BillingFrequency): string {
  const start = new Date(startDate);
  const expireDate = new Date(start);
  switch (frequency) {
    case "1_year":
      expireDate.setMonth(expireDate.getMonth() + 12);
      break;
    case "3_year":
      expireDate.setMonth(expireDate.getMonth() + 36);
      break;
    case "6_year":
      expireDate.setMonth(expireDate.getMonth() + 72);
      break;
    case "10_year":
      expireDate.setMonth(expireDate.getMonth() + 120);
      break;
    default:
      expireDate.setMonth(expireDate.getMonth() + 12);
  }
  return expireDate.toISOString().split("T")[0];
}

function getEndDateForTenant(tenant: Tenant, amcs: AMCRecord[]): string | null {
  const amc = amcs.find((a) => String(a.tenat_amcid) === String(tenant.id));
  const end = amc?.end_date ?? tenant.expire_date ?? null;
  return end ?? null;
}

function daysUntil(isoDate: string): number {
  const end = new Date(isoDate);
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function classifyTenantsByExpiry(tenants: Tenant[], amcs: AMCRecord[]): Buckets {
  const buckets: Buckets = { green: [], blue: [], orange: [], red: [] };
  for (const t of tenants) {
    const end = getEndDateForTenant(t, amcs);
    if (!end) {
      buckets.green.push(t);
      continue;
    }
    const d = daysUntil(end);
    if (d > 100) buckets.green.push(t);
    else if (d >= 11) buckets.blue.push(t);
    else if (d >= 1) buckets.orange.push(t);
    else buckets.red.push(t);
  }
  return buckets;
}

/* ========= Helpers for Additional Fields table ========= */
const HIDDEN_KEYS = new Set<string>([
  "id",
  "name",
  "category",
  "plan",
  "status",
  "created_at",
  "modules",
  "email",
  "phone",
  "address",
  "amc_amount",
  "billing_frequency",
  "amc_number",
  "due_date",
  "expire_date",
  "_id",
  "__v",
]);

function titleCaseKey(k: string): string {
  return k.replace(/[_\-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function renderValue(v: unknown): string {
  if (v == null) return "—";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function extractDisplayPairs(full: Tenant): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(full)) {
    if (HIDDEN_KEYS.has(k)) continue;
    pairs.push([titleCaseKey(k), renderValue(v)]);
  }
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  return pairs;
}

/* ========= Raw JSON viewer helpers ========= */
const SENSITIVE_KEYS = ["password", "secret", "token", "apiKey", "api_key", "authorization", "auth"];

function redactDeep(value: any, keys: string[] = SENSITIVE_KEYS): any {
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, keys));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (keys.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
        out[k] = "•••";
      } else {
        out[k] = redactDeep(v, keys);
      }
    }
    return out;
  }
  return value;
}

function safeStringify(input: unknown, space = 2): string {
  const seen = new WeakSet();
  return JSON.stringify(
    input,
    (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val as object)) return "[Circular]";
        seen.add(val as object);
      }
      return val;
    },
    space
  );
}

function byteSize(text: string): number {
  return new Blob([text]).size;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ==== DetailsPanel helpers (flat key→value rendering) ====

const DEFAULT_HIDDEN_KEYS = new Set<string>(["_id", "__v"]); // show everything else

// Heuristic ISO date detection (YYYY-MM-DD or ISO timestamp)
function looksLikeISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$/.test(v);
}

function formatMaybeDate(v: string): string {
  if (!looksLikeISODate(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Flatten nested objects into dot paths; arrays stay arrays,
// but object items inside arrays get flattened with [index] in the path.
type FlatEntries = Array<{ path: string; value: unknown }>;

function flattenObject(input: unknown, prefix = ""): FlatEntries {
  const out: FlatEntries = [];
  if (Array.isArray(input)) {
    input.forEach((item, idx) => {
      const path = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      if (item && typeof item === "object" && !Array.isArray(item)) {
        out.push(...flattenObject(item, path));
      } else {
        out.push({ path, value: item });
      }
    });
    return out;
  }

  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out.push(...flattenObject(v, path));
      } else {
        out.push({ path, value: v });
      }
    }
    return out;
  }

  out.push({ path: prefix || "(value)", value: input });
  return out;
}

function labelForPath(path: string): { title: string; sub?: string } {
  const last =
    path.includes(".")
      ? path.split(".").pop()!
      : path.includes("[")
      ? path.replace(/^.*\.(?=\[)/, "")
      : path;

  const title = last
    .replace(/[_\-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

  if (path === last) return { title };
  return { title, sub: path };
}

function isLongText(v: string): boolean {
  return v.length > 160 || /\n/.test(v);
}

/* ========= Child component: Raw JSON Panel ========= */
function RawJsonPanel({ data }: { data: any }) {
  const [pretty, setPretty] = React.useState(true);
  const [wrap, setWrap] = React.useState(false);
  const [redact, setRedact] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLPreElement | null>(null);

  const computed = React.useMemo(() => {
    const base = redact ? redactDeep(data) : data;
    const txt = safeStringify(base, pretty ? 2 : 0);
    const sizeBytes = byteSize(txt);
    const lines = pretty ? txt.split("\n").length : 1;
    return { txt, sizeBytes, lines };
  }, [data, pretty, redact]);

  const firstIndex = React.useMemo(() => {
    if (!query.trim()) return -1;
    return computed.txt.toLowerCase().indexOf(query.toLowerCase());
  }, [computed.txt, query]);

  React.useEffect(() => {
    if (firstIndex >= 0 && containerRef.current) {
      const before = computed.txt.slice(0, firstIndex);
      const approxLine = before.split("\n").length - 1;
      const lineHeightPx = 18;
      containerRef.current.scrollTop = Math.max(approxLine * lineHeightPx - 60, 0);
    }
  }, [firstIndex, computed.txt]);

  const onCopy = async () => {
    await copyToClipboard(computed.txt);
  };

  const onDownload = () => {
    const name =
      typeof data?.name === "string" && data.name.trim().length
        ? data.name.trim().toLowerCase().replace(/\s+/g, "-")
        : "tenant";
    const idPart = data?.id != null ? `-${String(data.id)}` : "";
    downloadText(`${name}${idPart}-payload.json`, computed.txt);
  };

  return (
    <div className="mt-6 pt-6 border-t">
      <details className="rounded-md bg-muted/30">
        <summary className="cursor-pointer text-sm font-medium px-3 py-2">
          Raw JSON payload
        </summary>

        <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={pretty}
                onChange={(e) => setPretty(e.target.checked)}
              />
              Pretty
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={wrap}
                onChange={(e) => setWrap(e.target.checked)}
              />
              Wrap
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={redact}
                onChange={(e) => setRedact(e.target.checked)}
              />
              Redact sensitive keys
            </label>
          </div>

          <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
            <span>{(computed.sizeBytes / 1024).toFixed(2)} KB</span>
            <span>•</span>
            <span>
              {computed.lines} {computed.lines === 1 ? "line" : "lines"}
            </span>
          </div>

          <div className="w-full flex flex-wrap items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in JSON…"
                className="h-8 w-56 rounded-md border bg-background px-2 text-sm"
              />
              {query && (
                <span className="text-xs text-muted-foreground">
                  {firstIndex >= 0 ? "Match found" : "No match"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onCopy} className="h-8 rounded-md border px-3 text-xs">
                Copy JSON
              </button>
              <button type="button" onClick={onDownload} className="h-8 rounded-md border px-3 text-xs">
                Download
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-md border bg-background w-full">
            <pre
              ref={containerRef}
              className={`text-xs leading-[1.15rem] p-3 max-h-[420px] overflow-auto ${
                wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
              }`}
            >
              {firstIndex >= 0 ? (
                <>
                  {computed.txt.slice(0, firstIndex)}
                  <mark className="bg-yellow-200">
                    {computed.txt.slice(firstIndex, firstIndex + query.length)}
                  </mark>
                  {computed.txt.slice(firstIndex + query.length)}
                </>
              ) : (
                computed.txt
              )}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}

/* ========= Child component: Details Panel (TOP-LEVEL) ========= */
function DetailsPanel({
  data,
  title = "Tenant Details (all fields)",
  hiddenByDefault = DEFAULT_HIDDEN_KEYS,
}: {
  data: any;
  title?: string;
  hiddenByDefault?: Set<string>;
}) {
  const [showHidden, setShowHidden] = React.useState(false);

  const rows = React.useMemo(() => {
    const flat = flattenObject(data);
    flat.sort((a, b) => a.path.localeCompare(b.path));

    const visible: typeof flat = [];
    const hidden: typeof flat = [];
    for (const entry of flat) {
      const rootKey = entry.path.split(".")[0].split("[")[0];
      if (hiddenByDefault.has(rootKey)) hidden.push(entry);
      else visible.push(entry);
    }
    return { visible, hidden };
  }, [data, hiddenByDefault]);

  const renderValueNode = (value: unknown) => {
    if (value == null) return <span className="text-muted-foreground">—</span>;

    if (typeof value === "boolean") {
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
            value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
          }`}
        >
          {String(value)}
        </span>
      );
    }

    if (typeof value === "number") {
      return <span className="tabular-nums">{value}</span>;
    }

    if (typeof value === "string") {
      const formatted = formatMaybeDate(value);
      if (isLongText(formatted)) {
        return <pre className="text-xs whitespace-pre-wrap leading-snug">{formatted}</pre>;
      }
      return <span>{formatted}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground">[]</span>;

      const simple = value.every(
        (v) => v == null || ["string", "number", "boolean"].includes(typeof v)
      );
      if (simple) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <span key={i} className="px-2 py-0.5 rounded border text-xs">
                {typeof v === "string" ? v : JSON.stringify(v)}
              </span>
            ))}
          </div>
        );
      }

      return (
        <pre className="text-xs whitespace-pre-wrap leading-snug">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return (
      <pre className="text-xs whitespace-pre-wrap leading-snug">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  };

  const renderRow = (path: string, value: unknown) => {
    const { title: t, sub } = labelForPath(path);
    return (
      <tr key={path} className="border-t">
        <td className="px-3 py-2 align-top w-[28%]">
          <div className="font-medium">{t}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </td>
        <td className="px-3 py-2 align-top">{renderValueNode(value)}</td>
      </tr>
    );
  };

  return (
    <div className="mt-6 pt-6 border-t">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <label className="text-xs flex items-center gap-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          Show technical keys
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Field</th>
              <th className="text-left px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.visible.map((e) => renderRow(e.path, e.value))}
            {showHidden && rows.hidden.map((e) => renderRow(e.path, e.value))}
            {!rows.visible.length && !rows.hidden.length && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={2}>
                  No fields to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========= Component ========= */
const AMC_notification: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState<boolean>(false);

  const { toast } = useToast();

  // AMC editable fields
  const [amcAmount, setAmcAmount] = useState<string>("");
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>("1_year");
  const [amcNumber, setAmcNumber] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [expireDate, setExpireDate] = useState<string>("");

  // AMC record from backend
  const [amcRecord, setAmcRecord] = useState<AMCRecord | null>(null);

  // Cache of all AMC records (for lists and bucketing)
  const [allAmcs, setAllAmcs] = useState<AMCRecord[]>([]);

  // Full tenant payload by id
  const [selectedFull, setSelectedFull] = useState<Tenant | null>(null);
  const [selectedFullLoading, setSelectedFullLoading] = useState<boolean>(false);
  const [selectedFullError, setSelectedFullError] = useState<string | null>(null);

  // Load tenants on mount
  useEffect(() => {
    const loadTenants = async () => {
      setLoading(true);
      try {
        const data: unknown = await tenantAPI.getTenants();
        const tenantsList = Array.isArray(data)
          ? (data as Tenant[])
          : ((data as any)?.tenants ?? []);
        setTenants(tenantsList);
        if (tenantsList.length > 0) setSelected(tenantsList[0]);
      } catch {
        const local = tenantsData as unknown as Tenant[];
        setTenants(local);
        if (local.length > 0) setSelected(local[0]);
      } finally {
        setLoading(false);
      }
    };
    void loadTenants();
  }, []);

  // Load payments when selected tenant changes
  useEffect(() => {
    const loadPayments = async () => {
      if (!selected?.id) {
        setPayments(null);
        return;
      }
      setPaymentsLoading(true);
      try {
        const res: any = await paymentsAPI.getPaymentsByTenant(String(selected.id));
        const list: Payment[] = (res?.payments ?? res ?? []) as Payment[];
        list.sort((a, b) => {
          const da = new Date(a.payment_date).getTime();
          const db = new Date(b.payment_date).getTime();
          return db - da;
        });
        setPayments(Array.isArray(list) ? list : []);
      } catch {
        setPayments([]);
      } finally {
        setPaymentsLoading(false);
      }
    };
    void loadPayments();
  }, [selected]);

  // Load full tenant details on selection
  useEffect(() => {
    const loadFull = async () => {
      if (!selected?.id) {
        setSelectedFull(null);
        return;
      }
      setSelectedFullLoading(true);
      setSelectedFullError(null);
      try {
        const res: any = await tenantAPI.getTenant(String(selected.id));
        const full: Tenant = (res && (res.tenant ?? res)) || (selected as Tenant);
        setSelectedFull(full);
      } catch (e: any) {
        setSelectedFull(selected as Tenant);
        setSelectedFullError(e?.message ?? "Failed to load full tenant details");
      } finally {
        setSelectedFullLoading(false);
      }
    };
    void loadFull();
  }, [selected]);

  // Load AMC record(s)
  const loadAMCRecord = async (tenantId: string) => {
    try {
      const response: any = await amcAPI.getAllAMCs();
      const amcs: AMCRecord[] = response?.amcs || [];
      setAllAmcs(amcs);

      const tenantAMC = amcs.find((amc) => String(amc.tenat_amcid) === String(tenantId));

      if (tenantAMC) {
        setAmcRecord(tenantAMC);
        if (tenantAMC.amount != null) setAmcAmount(String(tenantAMC.amount));
        if (tenantAMC.billing_frequency) setBillingFrequency(tenantAMC.billing_frequency);
        if (tenantAMC.start_date) setDueDate(tenantAMC.start_date);
        if (tenantAMC.end_date) setExpireDate(tenantAMC.end_date);
      } else {
        setAmcRecord(null);
        const startDate =
          selected?.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
        setDueDate(startDate);
        const calculatedExpire = calculateExpireDate(startDate, billingFrequency);
        setExpireDate(calculatedExpire);
      }
    } catch {
      setAmcRecord(null);
      setAllAmcs([]);
    }
  };

  // Populate AMC fields when tenant is selected
  useEffect(() => {
    if (!selected) return;

    const frequency: BillingFrequency =
      (selected.billing_frequency as BillingFrequency) || "1_year";
    setBillingFrequency(frequency);

    const calculatedAmount = calculateAmcAmount(selected.plan, frequency);
    setAmcAmount(String(calculatedAmount));

    const generatedAmcNumber =
      selected.amc_number ||
      `AMC-${String(selected.id).padStart(6, "0")}-${new Date().getFullYear()}`;
    setAmcNumber(generatedAmcNumber);

    setDueDate(selected.due_date || "");
    setExpireDate(selected.expire_date || "");

    void loadAMCRecord(String(selected.id));
  }, [selected]);

  // Recompute amount and expire date when frequency or due date changes
  useEffect(() => {
    if (!selected) return;

    const calculatedAmount = calculateAmcAmount(selected.plan, billingFrequency);
    setAmcAmount(String(calculatedAmount));

    if (dueDate) {
      const calculatedExpireDate = calculateExpireDate(dueDate, billingFrequency);
      setExpireDate(calculatedExpireDate);
    }
  }, [billingFrequency, selected, dueDate]);

  const totalByPlan = useMemo(() => {
    return tenants.reduce<Record<string, number>>((acc, t) => {
      const key = (t.plan || "unknown").toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [tenants]);

  const expiryBuckets = useMemo(
    () => classifyTenantsByExpiry(tenants, allAmcs),
    [tenants, allAmcs]
  );

  const getTenantAMC = (tenantId: Tenant["id"]): AMCRecord | undefined => {
    return allAmcs.find((amc) => String(amc.tenat_amcid) === String(tenantId));
  };

  const isExpired = (tenant: Tenant): boolean => {
    const tenantAMC = getTenantAMC(tenant.id);
    if (tenantAMC?.expiration_info?.is_expired !== undefined) {
      return Boolean(tenantAMC.expiration_info.is_expired);
    }
    const dateStr = tenantAMC?.end_date ?? tenant.expire_date;
    if (!dateStr) return false;
    const expire = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expire < today;
  };

  const isActive = (tenant: Tenant): boolean => {
    const tenantAMC = getTenantAMC(tenant.id);
    if (tenantAMC?.expiration_info?.is_expired !== undefined) {
      return !tenantAMC.expiration_info.is_expired;
    }
    const dateStr = tenantAMC?.end_date ?? tenant.expire_date;
    if (!dateStr) return true;
    const expire = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expire >= today;
  };

  const getExpirationStatus = (tenant: Tenant): string | null => {
    const tenantAMC = getTenantAMC(tenant.id);
    return tenantAMC?.expiration_info?.status_message ?? null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AMC Notification </h1>
        <p className="text-muted-foreground mt-1">View tenant plans and details</p>
      </div>

      {/* Expiry Overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {/* Green */}
        <Card className="border border-green-500/40 shadow-sm min-h-[450px] max-h-[550px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700">&gt; 100 days</CardTitle>
            <CardDescription>Healthy renewals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge className="bg-green-600">{expiryBuckets.green.length}</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2 text-left pr-2 mr-1">
              {expiryBuckets.green.length === 0 && (
                <p className="text-sm text-muted-foreground">No tenants</p>
              )}
              {expiryBuckets.green.map((t) => {
                const end = getEndDateForTenant(t, allAmcs);
                const label = end ? `${daysUntil(end)}d` : "No end date";
                return (
                  <div key={String(t.id)} className="p-2 rounded border border-green-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    </div>
                    {end && (
                      <p className="text-xs text-muted-foreground">
                        Expires{" "}
                        {new Date(end).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>


 {/* blue */}
        <Card className="border border-blue-500/40 shadow-sm min-h-[450px] max-h-[550px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-700">11 - 100 days</CardTitle>
            <CardDescription>Upcoming Renewals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge className="bg-blue-600">{expiryBuckets.blue.length}</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2 text-left pr-2 mr-1">
              {expiryBuckets.blue.length === 0 && (
                <p className="text-sm text-muted-foreground">No tenants</p>
              )}
              {expiryBuckets.blue.map((t) => {
                const end = getEndDateForTenant(t, allAmcs);
                const label = end ? `${daysUntil(end)}d` : "No end date";
                return (
                  <div key={String(t.id)} className="p-2 rounded border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    </div>
                    {end && (
                      <p className="text-xs text-muted-foreground">
                        Expires{" "}
                        {new Date(end).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>


        {/* Orange */}
        <Card className="border border-amber-500/40 shadow-sm min-h-[450px] max-h-[550px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700">1–10 days</CardTitle>
            <CardDescription>Urgent reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge className="bg-amber-600">{expiryBuckets.orange.length}</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2 text-left pr-2 mr-1">
              {expiryBuckets.orange.length === 0 && (
                <p className="text-sm text-muted-foreground">No tenants</p>
              )}
              {expiryBuckets.orange.map((t) => {
                const end = getEndDateForTenant(t, allAmcs);
                const label = end ? `${daysUntil(end)}d` : "No end date";
                return (
                  <div key={String(t.id)} className="p-2 rounded border border-amber-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    </div>
                    {end && (
                      <p className="text-xs text-muted-foreground">
                        Expires{" "}
                        {new Date(end).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Red */}
        <Card className="border border-red-500/40 shadow-sm min-h-[450px] max-h-[550px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700">Expired</CardTitle>
            <CardDescription>Action required</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge variant="destructive">{expiryBuckets.red.length}</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2 text-left pr-2 mr-1">
              {expiryBuckets.red.length === 0 && (
                <p className="text-sm text-muted-foreground">No tenants</p>
              )}
              {expiryBuckets.red.map((t) => {
                const end = getEndDateForTenant(t, allAmcs);
                const label = end ? `${daysUntil(end)}d` : "Expired";
                return (
                  <div key={String(t.id)} className="p-2 rounded border border-red-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    </div>
                    {end && (
                      <p className="text-xs text-muted-foreground">
                        Expired{" "}
                        {new Date(end).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading amc report...</p>
          </div>
        </div>
      )}

      {!loading && tenants.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          No tenants found. Check console for errors.
        </div>
      )}

      {!loading && tenants.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Select Tenant</CardTitle>
                <CardDescription>Choose a tenant to view subscription details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={selected?.id?.toString() || ""}
                      onValueChange={(value) => {
                        const tenant = tenants.find((t) => String(t.id) === value);
                        if (tenant) setSelected(tenant);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={String(tenant.id)} value={String(tenant.id)}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tenant.name}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-sm text-muted-foreground">
                                {tenant.category}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <Badge variant="outline" className="mt-1">
                        {selected?.category}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <Badge variant="outline" className="mt-1">
                        {selected?.plan}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.keys(totalByPlan).map((plan) => (
                    <div key={plan} className="flex items-center justify-between">
                      <div className="font-medium capitalize">{plan}</div>
                      <div className="text-muted-foreground">{totalByPlan[plan]}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Tenant Details (auto-generated from full record) */}
          {selected && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Tenant Details</CardTitle>
                    <CardDescription>
                      Full payload for <span className="font-medium">{selected.name}</span>
                    </CardDescription>
                  </div>
                  {selectedFullLoading && <Badge variant="outline">Loading…</Badge>}
                </div>
                {selectedFullError && (
                  <p className="text-sm text-red-600 mt-2">{selectedFullError}</p>
                )}
              </CardHeader>
              <CardContent>
                {selectedFull ? (
                  <>
                    {/* Key facts */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Name</p>
                        <p className="font-semibold">{String(selectedFull.name)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Category</p>
                        <Badge variant="secondary">{String(selectedFull.category ?? "—")}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Plan</p>
                        <Badge>{String(selectedFull.plan ?? "—")}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <Badge variant={selectedFull.status === "active" ? "default" : "secondary"}>
                          {String(selectedFull.status ?? "Active")}
                        </Badge>
                      </div>
                      {selectedFull.created_at && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Created</p>
                          <p>
                            {new Date(String(selectedFull.created_at)).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Modules */}
                    <div className="mt-6">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Modules</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFull.modules ? (
                          Array.isArray(selectedFull.modules) ? (
                            selectedFull.modules.length > 0 ? (
                              selectedFull.modules.map((m: any) => (
                                <Badge key={String(m)} variant="outline" className="text-xs">
                                  {String(m)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )
                          ) : (
                            Object.entries(selectedFull.modules as Record<string, boolean>)
                              .filter(([, on]) => on)
                              .map(([k]) => (
                                <Badge key={k} variant="outline" className="text-xs capitalize">
                                  {k}
                                </Badge>
                              ))
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>

                    

                    {/* Technical flat view + JSON */}
                    <DetailsPanel data={selectedFull} title="Tenant Details (all fields)" />
                    
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No tenant selected.</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AMC_notification;
