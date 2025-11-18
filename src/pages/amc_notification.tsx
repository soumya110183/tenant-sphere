// src/pages/amc_notification.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import tenantsData from "@/data/tenants.json";
import { tenantAPI, amcAPI, planAPI } from "@/services/api";

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

/* ========= Constants & pure helpers ========= */

// AMC annual rates per plan
const amcAnnualRates: Record<string, number> = {
  trial: 0,
  basic: 100,
  professional: 250,
  enterprise: 350,
  proffection: 250, // tolerate common alias
  enterprice: 350, // tolerate common alias
};

// calculateAmcAmount will be defined inside the component so it can use dynamic plan defaults

function calculateExpireDate(
  startDate: string,
  frequency: BillingFrequency
): string {
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

function classifyTenantsByExpiry(
  tenants: Tenant[],
  amcs: AMCRecord[]
): Buckets {
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
  const last = path.includes(".")
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

    // Avoid accidentally displaying sensitive values (passwords, tokens, API keys).
    // We treat any path that contains these keywords as sensitive and omit them.
    const sensitiveRe =
      /pass(word|wd)?|secret|token|api[_-]?key|auth(_|-)?token|credential/i;

    for (const entry of flat) {
      // skip sensitive entries entirely
      if (sensitiveRe.test(entry.path)) continue;

      // also skip bare `id` fields (e.g. `id`, `tenant.id`, `modules[0].id`)
      const lastPart = entry.path.split(".").pop() ?? entry.path;
      const lastKey = lastPart.replace(/\[\d+\]$/, "");
      if (String(lastKey).toLowerCase() === "id") continue;

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
        return (
          <pre className="text-xs whitespace-pre-wrap leading-snug">
            {formatted}
          </pre>
        );
      }
      return <span>{formatted}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0)
        return <span className="text-muted-foreground">[]</span>;

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
          {sub && (
            <div className="text-[11px] text-muted-foreground">{sub}</div>
          )}
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

  // AMC editable fields
  const [amcAmount, setAmcAmount] = useState<string>("");
  const [billingFrequency, setBillingFrequency] =
    useState<BillingFrequency>("1_year");
  const [amcNumber, setAmcNumber] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [expireDate, setExpireDate] = useState<string>("");

  // AMC record from backend
  const [amcRecord, setAmcRecord] = useState<AMCRecord | null>(null);

  // Cache of all AMC records (for lists and bucketing)
  const [allAmcs, setAllAmcs] = useState<AMCRecord[]>([]);

  // Full tenant payload by id
  const [selectedFull, setSelectedFull] = useState<Tenant | null>(null);
  const [selectedFullLoading, setSelectedFullLoading] =
    useState<boolean>(false);
  const [selectedFullError, setSelectedFullError] = useState<string | null>(
    null
  );

  // Map of plan key -> plan row (used to get amc_amount defaults)
  const [planMap, setPlanMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res: any = await planAPI.getPlans(undefined);
        const plans = Array.isArray(res) ? res : res?.plans ?? res?.data ?? [];
        const map: Record<string, any> = {};
        for (const p of plans) {
          const name = String(p.name ?? p.plan ?? p.id ?? "");
          const key =
            name.toLowerCase().split(/[-_\s]/)[0] || name.toLowerCase();
          map[key] = p;
        }
        setPlanMap(map);
      } catch {
        // ignore
      }
    };
    void loadPlans();
  }, []);

  function calculateAmcAmount(
    plan: string | undefined,
    frequency: BillingFrequency
  ): number {
    const planKey = (plan ?? "").toLowerCase().split(/[-_\s]/)[0];
    const planRow = planMap[planKey];
    const annualRate =
      (planRow && Number(planRow.amc_amount)) ?? amcAnnualRates[planKey] ?? 0;
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

  // Load tenants on mount
  useEffect(() => {
    const loadTenants = async () => {
      setLoading(true);
      try {
        const data: unknown = await tenantAPI.getTenants();
        const tenantsList = Array.isArray(data)
          ? (data as Tenant[])
          : (data as any)?.tenants ?? [];
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
        const full: Tenant =
          (res && (res.tenant ?? res)) || (selected as Tenant);
        setSelectedFull(full);
      } catch (e: any) {
        setSelectedFull(selected as Tenant);
        setSelectedFullError(
          e?.message ?? "Failed to load full tenant details"
        );
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

      const tenantAMC = amcs.find(
        (amc) => String(amc.tenat_amcid) === String(tenantId)
      );

      if (tenantAMC) {
        setAmcRecord(tenantAMC);
        if (tenantAMC.amount != null) setAmcAmount(String(tenantAMC.amount));
        if (tenantAMC.billing_frequency)
          setBillingFrequency(tenantAMC.billing_frequency);
        if (tenantAMC.start_date) setDueDate(tenantAMC.start_date);
        if (tenantAMC.end_date) setExpireDate(tenantAMC.end_date);
      } else {
        setAmcRecord(null);
        const startDate =
          selected?.created_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0];
        setDueDate(startDate);
        const calculatedExpire = calculateExpireDate(
          startDate,
          billingFrequency
        );
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

    const calculatedAmount = calculateAmcAmount(
      selected.plan,
      billingFrequency
    );
    setAmcAmount(String(calculatedAmount));

    if (dueDate) {
      const calculatedExpireDate = calculateExpireDate(
        dueDate,
        billingFrequency
      );
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AMC Notification </h1>
        <p className="text-muted-foreground mt-1">
          View tenant plans and details
        </p>
      </div>

      {/* Redesigned Expiry Overview - 2x2 grid (two cards per row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            key: "green",
            title: "Active & Healthy",
            description: "Contracts in good standing",
            icon: CheckCircle2,
            titleColor: "text-emerald-700",
            badgeBg: "bg-green-600",
            tileBorder: "border-emerald-200",
            tileBg: "bg-emerald-50",
          },
          {
            key: "blue",
            title: "Upcoming Renewals",
            description: "11-100 days remaining",
            icon: Clock,
            titleColor: "text-blue-700",
            badgeBg: "bg-blue-600",
            tileBorder: "border-blue-200",
            tileBg: "bg-blue-50",
          },
          {
            key: "orange",
            title: "Urgent Action",
            description: "1-10 days remaining",
            icon: AlertTriangle,
            titleColor: "text-amber-700",
            badgeBg: "bg-amber-500",
            tileBorder: "border-amber-200",
            tileBg: "bg-amber-50",
          },
          {
            key: "red",
            title: "Expired",
            description: "Immediate attention required",
            icon: XCircle,
            titleColor: "text-red-700",
            badgeBg: "bg-red-600",
            tileBorder: "border-red-200",
            tileBg: "bg-red-50",
          },
        ].map((config) => {
          const Icon = config.icon as any;
          const tenants = (expiryBuckets as any)[config.key] || [];

          return (
            <Card key={config.key} className="h-full">
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg bg-white shadow-sm ${config.titleColor}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {config.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Badge
                    className={`text-white px-3 py-1 text-sm ${config.badgeBg} rounded-md shadow`}
                  >
                    {tenants.length}{" "}
                    {tenants.length === 1 ? "Tenant" : "Tenants"}
                  </Badge>
                </div>

                {/* Tenant tiles - fixed vertical space with own scrollbar */}
                <div className="mt-4 flex-1">
                  {tenants.length === 0 ? (
                    <div className="flex items-center justify-center py-6 border rounded-md border-dashed text-sm text-muted-foreground h-full">
                      No tenants in this category
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="grid grid-cols-1 gap-3">
                        {tenants.map((tenant: any) => {
                          const end = getEndDateForTenant(tenant, allAmcs);
                          const days = end ? daysUntil(end) : null;
                          const label =
                            days != null
                              ? days >= 0
                                ? `${days}d left`
                                : `${Math.abs(days)}d overdue`
                              : "No end date";

                          return (
                            <div
                              key={String(tenant.id)}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                // find canonical tenant object from tenants list and select it
                                const match =
                                  tenants && tenants.length
                                    ? tenants.find(
                                        (t: any) =>
                                          String(t.id) === String(tenant.id)
                                      )
                                    : null;
                                if (match) {
                                  setSelected(match as Tenant);
                                } else {
                                  setSelected(tenant as Tenant);
                                }
                                // scroll details into view when selected
                                try {
                                  document
                                    .getElementById("tenant-details")
                                    ?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start",
                                    });
                                } catch {}
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  (e.target as HTMLElement).click();
                                }
                              }}
                              className={`group relative p-3 border-2 ${config.tileBorder} rounded-lg transition-all duration-200 cursor-pointer min-h-[90px] ${config.tileBg} hover:shadow-md`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="truncate font-medium text-sm text-slate-800">
                                  {tenant.name}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-semibold border-slate-300 bg-white/80 shrink-0"
                                >
                                  {label}
                                </Badge>
                              </div>

                              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {label.includes("overdue")
                                    ? "Expired"
                                    : "Expires"}{" "}
                                  {end
                                    ? new Date(end).toLocaleDateString(
                                        "en-US",
                                        {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        }
                                      )
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
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
                <CardDescription>
                  Choose a tenant to view subscription details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={selected?.id?.toString() || ""}
                      onValueChange={(value) => {
                        const tenant = tenants.find(
                          (t) => String(t.id) === value
                        );
                        if (tenant) setSelected(tenant);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem
                            key={String(tenant.id)}
                            value={String(tenant.id)}
                          >
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
                    <div
                      key={plan}
                      className="flex items-center justify-between"
                    >
                      <div className="font-medium capitalize">{plan}</div>
                      <div className="text-muted-foreground">
                        {totalByPlan[plan]}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Tenant Details (auto-generated from full record) */}
          {selected && (
            <Card id="tenant-details">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Tenant Details</CardTitle>
                    <CardDescription>
                      Full payload for{" "}
                      <span className="font-medium">{selected.name}</span>
                    </CardDescription>
                  </div>
                  {selectedFullLoading && (
                    <Badge variant="outline">Loading…</Badge>
                  )}
                </div>
                {selectedFullError && (
                  <p className="text-sm text-red-600 mt-2">
                    {selectedFullError}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {selectedFull ? (
                  <>
                    {/* Key facts */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Name
                        </p>
                        <p className="font-semibold">
                          {String(selectedFull.name)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Category
                        </p>
                        <Badge variant="secondary">
                          {String(selectedFull.category ?? "—")}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Plan
                        </p>
                        <Badge>{String(selectedFull.plan ?? "—")}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Status
                        </p>
                        <Badge
                          variant={
                            selectedFull.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {String(selectedFull.status ?? "Active")}
                        </Badge>
                      </div>
                      {selectedFull.created_at && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Created
                          </p>
                          <p>
                            {new Date(
                              String(selectedFull.created_at)
                            ).toLocaleDateString("en-US", {
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
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Modules
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFull.modules ? (
                          Array.isArray(selectedFull.modules) ? (
                            selectedFull.modules.length > 0 ? (
                              selectedFull.modules.map((m: any) => (
                                <Badge
                                  key={String(m)}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {String(m)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                None
                              </span>
                            )
                          ) : (
                            Object.entries(
                              selectedFull.modules as Record<string, boolean>
                            )
                              .filter(([, on]) => on)
                              .map(([k]) => (
                                <Badge
                                  key={k}
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {k}
                                </Badge>
                              ))
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            None
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Technical flat view */}
                    <DetailsPanel
                      data={selectedFull}
                      title="Tenant Details (all fields)"
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tenant selected.
                  </p>
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
