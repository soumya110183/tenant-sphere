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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import tenantsData from "@/data/tenants.json";
import {
  paymentsAPI,
  tenantAPI,
  amcAPI,
  planAPI,
  subscriptionAmountsAPI,
} from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Calendar,
  Users,
  Loader2,
  Bell,
  CreditCard,
} from "lucide-react";

/* -------------------------
   Helpers (kept from original)
   ------------------------- */

const priceMap: Record<string, number> = {
  trial: 0,
  basic: 1000,
  professional: 2500,
  proffection: 2500,
  enterprise: 3500,
  enterprice: 3500,
};

const amcMonthlyRates: Record<string, number> = {
  trial: 0,
  basic: 100,
  professional: 250,
  enterprise: 350,
};

const calculateExpireDate = (startDate: string, frequency: string): string => {
  const start = new Date(startDate);
  let expireDate = new Date(start);

  switch (frequency) {
    case "1_year":
      expireDate.setFullYear(expireDate.getFullYear() + 1);
      break;
    case "3_year":
      expireDate.setFullYear(expireDate.getFullYear() + 3);
      break;
    case "6_year":
      expireDate.setFullYear(expireDate.getFullYear() + 6);
      break;
    case "10_year":
      expireDate.setFullYear(expireDate.getFullYear() + 10);
      break;
    default:
      expireDate.setMonth(expireDate.getMonth() + 1);
  }

  return expireDate.toISOString().split("T")[0];
};

const parsePlanPrice = (name: string) => {
  if (!name) return { price: 0, currency: "INR" };
  const m = name.match(/-(\d[\d,\.]*)\s*([A-Za-z]{2,4})?$/i);
  if (m) {
    const raw = m[1].replace(/,/g, "");
    const price = Number(raw) || 0;
    return { price, currency: (m[2] || "INR").toUpperCase() };
  }
  const key = name.toLowerCase().split(/[-_\s]/)[0];
  return { price: priceMap[key] ?? 0, currency: "INR" };
};

/* -------------------------
   Utility: flatten + display helpers (copied/adapted from amc_notification)
   ------------------------- */

const DEFAULT_HIDDEN_KEYS = new Set<string>(["_id", "__v"]);

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

function DetailsPanel({
  data,
  title = "Tenant Details (all fields)",
  hiddenByDefault = DEFAULT_HIDDEN_KEYS,
}: {
  data: any;
  title?: string;
  hiddenByDefault?: Set<string>;
}) {
  const [showHidden, setShowHidden] = useState(false);

  const rows = useMemo(() => {
    const flat = flattenObject(data);
    flat.sort((a, b) => a.path.localeCompare(b.path));
    const visible: typeof flat = [];
    const hidden: typeof flat = [];

    const sensitiveRe =
      /pass(word|wd)?|secret|token|api[_-]?key|auth(_|-)?token|credential/i;

    for (const entry of flat) {
      if (sensitiveRe.test(entry.path)) continue;

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
    if (typeof value === "number")
      return <span className="tabular-nums">{value}</span>;
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
      if (simple)
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <span key={i} className="px-2 py-0.5 rounded border text-xs">
                {typeof v === "string" ? v : JSON.stringify(v)}
              </span>
            ))}
          </div>
        );
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

/* -------------------------
   Component
   ------------------------- */

const AMC_report: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [payments, setPayments] = useState<any[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const { toast } = useToast();

  const [planMap, setPlanMap] = useState<Record<string, number>>({});

  // Table state
  const [query, setQuery] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // existing AMC state (kept)
  const [amcAmount, setAmcAmount] = useState<string>("");
  const [billingFrequency, setBillingFrequency] = useState<string>("1_year");
  const [amcNumber, setAmcNumber] = useState<string>("");
  // canonical end date state (replaces previous dueDate)
  const [endDate, setEndDate] = useState<string>("");
  // used to display computed/selected expiry
  const [expireDate, setExpireDate] = useState<string>("");
  const [amcRecord, setAmcRecord] = useState<any>(null);
  const [amcLoading, setAmcLoading] = useState(false);
  const [allAmcs, setAllAmcs] = useState<any[]>([]);
  const [creatingPlan, setCreatingPlan] = useState<string | null>(null);
  // Full tenant payload (for details panel)
  const [selectedFull, setSelectedFull] = useState<any | null>(null);
  const [selectedFullLoading, setSelectedFullLoading] =
    useState<boolean>(false);
  const [selectedFullError, setSelectedFullError] = useState<string | null>(
    null
  );

  /* -------------------------
     Load plan defaults
     ------------------------- */
  useEffect(() => {
    const loadPlans = async () => {
      try {
        // Try subscription_amount_plans endpoint exposed by backend
        try {
          const res: any = await subscriptionAmountsAPI.getAll();
          const list = Array.isArray(res)
            ? res
            : res?.plans ?? res?.data ?? res?.rows ?? [];
          const map: Record<string, number> = {};
          for (const r of list) {
            const key = (r.plan || r.name || r.key || "")
              .toString()
              .toLowerCase()
              .split(/[-_\s]/)[0];
            map[key] = Number(r.amc ?? r.amc_amount ?? r.amount ?? 0) || 0;
          }
          // if we have entries, use them and return early
          if (Object.keys(map).length > 0) {
            setPlanMap(map);
            return;
          }
        } catch (subErr) {
          console.warn(
            "subscription_amount_plans endpoint not available, falling back to plans API:",
            subErr
          );
        }

        // Fallback: query plans API
        const res2: any = await planAPI.getPlans(undefined);
        const list2 = Array.isArray(res2) ? res2 : res2?.plans ?? [];
        const map2: Record<string, number> = {};
        for (const p of list2) {
          const key = (p.name || p.key || "").toLowerCase().split(/[-_\s]/)[0];
          map2[key] = Number(p.amc_amount ?? p.amount ?? p.price ?? 0) || 0;
        }
        setPlanMap(map2);
      } catch (err) {
        console.warn("Failed to load plan defaults:", err);
      }
    };

    void loadPlans();
  }, []);

  /* -------------------------
     Load tenants
     ------------------------- */
  useEffect(() => {
    const loadTenants = async () => {
      setLoading(true);
      try {
        const resp = await tenantAPI.getTenants();
        // Backend returns paginated: {success, page, limit, totalRecords, totalPages, data: [...]}
        const tenantsList = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp)
          ? resp
          : [];
        setTenants(tenantsList);
        if (tenantsList.length > 0) {
          setSelected(tenantsList[0]);
        }
      } catch (error) {
        console.error("Failed to load tenants from API:", error);
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };
    loadTenants();
  }, []);

  /* -------------------------
     Load payments for selected tenant
     ------------------------- */
  useEffect(() => {
    const loadPayments = async () => {
      if (!selected?.id) {
        setPayments(null);
        return;
      }
      setPaymentsLoading(true);
      setPaymentsError(null);
      try {
        const res = await paymentsAPI.getPaymentsByTenant(String(selected.id));
        const list = res?.payments ?? res ?? [];
        setPayments(Array.isArray(list) ? list : []);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(
          "Payments not loaded (endpoint may not be available):",
          errorMsg
        );
        setPaymentsError(errorMsg);
        setPayments([]);
      } finally {
        setPaymentsLoading(false);
      }
    };
    loadPayments();
  }, [selected]);

  /* -------------------------
     Calculate AMC amount using planMap
     ------------------------- */
  const calculateAmcAmount = (plan: string, frequency: string): number => {
    const planKey = (plan || "").toLowerCase().split(/[-_\s]/)[0];
    const base = planMap[planKey] ?? amcMonthlyRates[planKey] ?? 0;
    if (!base) return 0;

    switch (frequency) {
      case "1_year":
        return base;
      case "3_year":
        return base * 3;
      case "6_year":
        return base * 6;
      case "10_year":
        return base * 10;
      default:
        return base;
    }
  };

  /* -------------------------
     Load single tenant's AMC record
     ------------------------- */
  const loadAMCRecord = async (tenantId: string) => {
    setAmcLoading(true);
    try {
      const response = await amcAPI.getAllAMCs();
      const amcs = response?.amcs || [];
      setAllAmcs(amcs);

      const tenantAMC = amcs.find(
        (amc: any) => String(amc.tenat_amcid) === String(tenantId)
      );

      if (tenantAMC) {
        setAmcRecord(tenantAMC);
        if (tenantAMC.amount) setAmcAmount(tenantAMC.amount.toString());
        if (tenantAMC.billing_frequency)
          setBillingFrequency(tenantAMC.billing_frequency);

        // Prefer the AMC record's end_date as the canonical end date.
        if (tenantAMC.end_date) {
          setEndDate(tenantAMC.end_date);
          setExpireDate(tenantAMC.end_date);
        } else if (selected?.expire_date) {
          // fallback to tenant.expire_date if available
          setEndDate(selected.expire_date);
          setExpireDate(selected.expire_date);
        } else if (tenantAMC.start_date) {
          // last resort: use start_date as an interim value (not ideal)
          setEndDate(tenantAMC.start_date);
          const calcExpire = calculateExpireDate(
            tenantAMC.start_date,
            tenantAMC.billing_frequency || billingFrequency
          );
          setExpireDate(calcExpire);
        } else {
          setEndDate("");
        }
      } else {
        setAmcRecord(null);
        // no AMC record — use tenant-level expire_date or created_at as fallback
        const fallbackStart =
          selected?.created_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0];
        // keep endDate empty to indicate no explicit AMC end exists yet
        setEndDate(selected?.expire_date ?? "");
        const calculatedExpire = calculateExpireDate(
          fallbackStart,
          billingFrequency
        );
        setExpireDate(calculatedExpire);
      }
    } catch (error) {
      console.warn("Failed to load AMC record:", error);
      setAmcRecord(null);
      setAllAmcs([]);
    } finally {
      setAmcLoading(false);
    }
  };

  /* -------------------------
     Update fields when selected tenant changes
     ------------------------- */
  useEffect(() => {
    if (selected) {
      const frequency = selected.billing_frequency || "1_year";
      setBillingFrequency(frequency);

      const calculatedAmount = calculateAmcAmount(
        selected.plan || "",
        frequency
      );
      setAmcAmount(calculatedAmount.toString());

      const generatedAmcNumber =
        selected.amc_number ||
        `AMC-${String(selected.id).padStart(
          6,
          "0"
        )}-${new Date().getFullYear()}`;
      setAmcNumber(generatedAmcNumber);

      // Use explicit tenant expire_date if set; actual AMC end_date will be set in loadAMCRecord if present
      setEndDate(selected.expire_date || selected.due_date || "");
      setExpireDate(selected.expire_date || "");

      void loadAMCRecord(selected.id);
      // load full tenant payload
      const loadFull = async () => {
        setSelectedFullLoading(true);
        setSelectedFullError(null);
        try {
          const res: any = await tenantAPI.getTenant(String(selected.id));
          const full = (res && (res.tenant || res)) || selected;
          setSelectedFull(full);
        } catch (e: any) {
          setSelectedFull(selected);
          setSelectedFullError(
            e?.message ?? "Failed to load full tenant details"
          );
        } finally {
          setSelectedFullLoading(false);
        }
      };
      void loadFull();
    }
  }, [selected, planMap]);

  /* -------------------------
     Recalculate amount & expire date when frequency or endDate changes
     ------------------------- */
  useEffect(() => {
    if (selected && selected.plan) {
      const calculatedAmount = calculateAmcAmount(
        selected.plan,
        billingFrequency
      );
      setAmcAmount(calculatedAmount.toString());

      // expireDate should come from an explicit endDate when available.
      // If there's no explicit endDate, compute expire from a start date.
      if (endDate) {
        // if user/AMC provided an explicit endDate, use it directly
        setExpireDate(endDate);
      } else {
        // fallback: compute expireDate from tenant.created_at or today
        const start =
          selected.created_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0];
        const calculatedExpireDate = calculateExpireDate(
          start,
          billingFrequency
        );
        setExpireDate(calculatedExpireDate);
      }
    }
  }, [billingFrequency, selected, endDate]);

  /* -------------------------
     Helper: get tenant AMC from allAmcs
     ------------------------- */
  const getTenantAMC = (tenantId: string) => {
    return allAmcs.find(
      (amc: any) => String(amc.tenat_amcid) === String(tenantId)
    );
  };

  /* -------------------------
     Helper: expired / active check (kept)
     ------------------------- */
  const isExpired = (tenant: any): boolean => {
    const tenantAMC = getTenantAMC(tenant.id);
    if (tenantAMC && tenantAMC.end_date) {
      const expireDate = new Date(tenantAMC.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (tenantAMC.expiration_info?.is_expired !== undefined) {
        return tenantAMC.expiration_info.is_expired;
      }

      return expireDate < today;
    }

    if (!tenant.expire_date) return false;
    const expireDate = new Date(tenant.expire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expireDate < today;
  };

  const isActive = (tenant: any): boolean => {
    const tenantAMC = getTenantAMC(tenant.id);
    if (tenantAMC && tenantAMC.end_date) {
      const expireDate = new Date(tenantAMC.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (tenantAMC.expiration_info?.is_expired !== undefined) {
        return !tenantAMC.expiration_info.is_expired;
      }
      return expireDate >= today;
    }

    if (!tenant.expire_date) return true;
    const expireDate = new Date(tenant.expire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expireDate >= today;
  };

  const getExpirationStatus = (tenant: any): string | null => {
    const tenantAMC = getTenantAMC(tenant.id);
    if (tenantAMC?.expiration_info?.status_message) {
      return tenantAMC.expiration_info.status_message;
    }
    return null;
  };

  /* -------------------------
     Table helpers
     ------------------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t: any) => (t.name || "").toLowerCase().includes(q));
  }, [tenants, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* -------------------------
     Utility - days remaining
     ------------------------- */
  const daysRemaining = (tenant: any) => {
    const tenantAMC = getTenantAMC(tenant.id);
    const dateStr = tenantAMC?.end_date || tenant.expire_date;
    if (!dateStr) return null;
    const diff = Math.ceil(
      (new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  /* -------------------------
     Actions
     ------------------------- */
  const handleSendReminder = async (tenant: any) => {
    try {
      // If backend supports a dedicated reminder endpoint:
      if (amcAPI?.sendReminder) {
        await amcAPI.sendReminder({ tenantId: tenant.id });
        toast({
          title: "Reminder sent",
          description: `Reminder sent to ${tenant.name}`,
        });
      } else {
        // Fallback: notify user
        toast({
          title: "Reminder",
          description: `No backend reminder endpoint available. (Would send reminder to ${tenant.name})`,
        });
      }
    } catch (err: any) {
      console.error("Failed to send reminder:", err);
      toast({
        title: "Reminder failed",
        description: err?.message ?? String(err),
      });
    }
  };

  const handleMakePayment = async (tenant: any) => {
    try {
      // Create an AMC record (1-year) rather than a generic payment record.
      // Use the planMap / calculateAmcAmount to compute the amount if tenant has no explicit amc_amount.
      const frequency = "1_year";
      const startDate = new Date().toISOString().split("T")[0];
      const endDateLocal = calculateExpireDate(startDate, frequency);

      const calculatedAmount =
        Number(tenant.amc_amount ?? 0) ||
        calculateAmcAmount(tenant.plan || "", frequency);

      const amcData = {
        client_name: tenant.name,
        plan: tenant.plan,
        start_date: startDate,
        end_date: endDateLocal,
        status: true,
        amount: Number(calculatedAmount) || 0,
        billing_frequency: frequency,
        tenat_amcid: String(tenant.id),
      };

      console.log("Creating AMC record:", amcData);

      const created = await amcAPI.createAMC(amcData);

      // created may be { amc: {...} } or the record itself
      const createdRecord = (created && (created.amc || created)) || created;

      // Update tenant row with AMC details
      const updatedTenantData = {
        ...tenant,
        amc_amount: Number(amcData.amount),
        billing_frequency: amcData.billing_frequency,
        amc_number:
          tenant.amc_number ||
          `AMC-${String(tenant.id).padStart(
            6,
            "0"
          )}-${new Date().getFullYear()}`,
        // store due_date as the AMC end date (plan end)
        due_date: amcData.end_date,
        expire_date: amcData.end_date,
      };

      try {
        await tenantAPI.updateTenant(tenant.id, updatedTenantData);
        // update local state
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? updatedTenantData : t))
        );
        if (selected?.id === tenant.id) setSelected(updatedTenantData);
      } catch (uErr) {
        console.warn("Failed to update tenant after creating AMC:", uErr);
      }

      // Refresh local AMC record cache
      try {
        await loadAMCRecord(String(tenant.id));
      } catch {}

      toast({
        title: "AMC created",
        description: `1-year AMC recorded for ${tenant.name}.`,
      });
    } catch (err: any) {
      console.error("Failed to create AMC record:", err);
      const serverMsg =
        err?.response?.data?.message || err?.response?.data || err?.message;
      toast({ title: "AMC creation failed", description: String(serverMsg) });
    }
  };

  /* -------------------------
     Save changes button handler (kept, slightly adapted)
     ------------------------- */
  const handleSaveChanges = async () => {
    if (!selected) return;
    toast({
      title: "Saving changes",
      description: `Updating AMC details for ${selected.name}...`,
    });

    try {
      // Determine start_date and end_date explicitly:
      // - prefer existing amcRecord.start_date
      // - otherwise use tenant.created_at as start
      const startDate =
        (amcRecord && (amcRecord.start_date || amcRecord.startDate)) ||
        selected.created_at?.split("T")[0] ||
        new Date().toISOString().split("T")[0];

      // endDate (state) is the canonical end; if not provided, compute from start + freq
      const computedExpireFromStart = calculateExpireDate(
        startDate,
        billingFrequency
      );
      const finalEndDate = endDate || expireDate || computedExpireFromStart;

      const amcData = {
        client_name: selected.name,
        plan: selected.plan,
        start_date: startDate,
        end_date: finalEndDate,
        status: true,
        amount: Number(amcAmount) || 0,
        billing_frequency: billingFrequency,
        tenat_amcid: String(selected.id),
      };

      let updatedAMC;
      if (amcRecord && amcRecord.id) {
        updatedAMC = await amcAPI.updateAMC(amcRecord.id, amcData);
      } else {
        updatedAMC = await amcAPI.createAMC(amcData);
      }

      setAmcRecord(updatedAMC?.amc ?? updatedAMC ?? null);
      setEndDate(finalEndDate);
      setExpireDate(finalEndDate);

      const updatedTenantData = {
        ...selected,
        amc_amount: Number(amcAmount),
        billing_frequency: billingFrequency,
        amc_number: amcNumber,
        // store end_date as the canonical tenant expiry
        due_date: finalEndDate,
        expire_date: finalEndDate,
      };

      await tenantAPI.updateTenant(selected.id, updatedTenantData);

      setSelected(updatedTenantData);
      setTenants((prev) =>
        prev.map((t) => (t.id === selected.id ? updatedTenantData : t))
      );

      toast({
        title: "Changes saved",
        description: `AMC details updated successfully for ${selected.name}.`,
      });
    } catch (err: any) {
      console.error("Failed to update AMC:", err);
      toast({
        title: "Update failed",
        description: err?.message ?? String(err),
      });
    }
  };

  /* -------------------------
     Render
     ------------------------- */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AMC Management</h1>
        <p className="text-muted-foreground mt-1">
          Track Annual Maintenance Contract status for all tenants
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin mr-2" />
          <span className="text-muted-foreground">Loading tenants...</span>
        </div>
      )}

      {!loading && tenants.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          No tenants found. Check console for errors.
        </div>
      )}

      {!loading && tenants.length > 0 && (
        <>
          {/* Top controls: search + pageSize */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle>Tenants</CardTitle>
                  <CardDescription>
                    Search, view and take action on tenant AMCs
                  </CardDescription>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-72">
                    <Input
                      placeholder="Search tenants..."
                      value={query}
                      onChange={(e: any) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>

                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="text-sm text-muted-foreground">
                      <th className="text-left py-3 px-4">Tenant Name</th>
                      <th className="text-left py-3 px-4">Plan</th>
                      <th className="text-left py-3 px-4">AMC Cost</th>
                      <th className="text-left py-3 px-4">Due Date</th>
                      <th className="text-left py-3 px-4">Days Remaining</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((tenant: any) => {
                      const tenantAMC = getTenantAMC(tenant.id);
                      // Derive AMC amount in this order of precedence:
                      // 1. tenant-specific amc_amount (explicit)
                      // 2. plan amount from subscription table (planMap)
                      // 3. fallback parsing from plan name / static price map
                      const planKey = (tenant.plan || "")
                        .toString()
                        .toLowerCase()
                        .split(/[-_\s]/)[0];
                      const amt =
                        tenant.amc_amount !== undefined &&
                        tenant.amc_amount !== null
                          ? Number(tenant.amc_amount)
                          : Number(
                              planMap[planKey] ??
                                parsePlanPrice(tenant.plan).price ??
                                0
                            );
                      const curr =
                        tenant.currency ??
                        parsePlanPrice(tenant.plan).currency ??
                        "INR";
                      // Display the end date (AMC end or tenant expiry). Fallback to created_at if nothing else.
                      const due =
                        tenantAMC?.end_date ||
                        tenant.expire_date ||
                        tenant.due_date ||
                        tenant.created_at;
                      const expire =
                        tenantAMC?.end_date || tenant.expire_date || null;
                      const days = daysRemaining(tenant);
                      return (
                        <tr
                          key={tenant.id}
                          className={`border-t cursor-pointer focus:outline-none ${
                            selected?.id === tenant.id
                              ? "bg-slate-50 dark:bg-slate-800"
                              : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelected(tenant);
                            // scroll tenant details into view if present
                            setTimeout(() => {
                              const el =
                                document.getElementById("tenant-details");
                              if (el)
                                el.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                            }, 50);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSelected(tenant);
                              setTimeout(() => {
                                const el =
                                  document.getElementById("tenant-details");
                                if (el)
                                  el.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                              }, 50);
                            }
                          }}
                        >
                          <td className="py-4 px-4">
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {tenant.category}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="text-sm capitalize"
                            >
                              {tenant.plan}
                            </Badge>
                          </td>

                          <td className="py-4 px-4">
                            <div className="font-semibold">
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: curr,
                                maximumFractionDigits: 0,
                              }).format(Number(amt))}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {due ? (
                              new Date(due).toLocaleDateString("en-GB")
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {days === null ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <span
                                className={
                                  days <= 30
                                    ? "text-red-600 font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {days} days
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {/* status derived from expire / tenant.status */}
                            {isExpired(tenant) ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge className="bg-green-600">Good</Badge>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  handleSendReminder(tenant);
                                }}
                                title="Send reminder"
                              >
                                <Bell className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">
                                  Send Reminder
                                </span>
                              </Button>

                              <Button
                                size="sm"
                                variant="default"
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  handleMakePayment(tenant);
                                }}
                                title="Make payment"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">
                                  Payment
                                </span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {pageItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 px-4 text-center text-muted-foreground"
                        >
                          No tenants match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}{" "}
                  - {Math.min(page * pageSize, filtered.length)} of{" "}
                  {filtered.length}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    ‹
                  </Button>
                  <div className="px-3 py-1 border rounded text-sm">
                    {page} / {totalPages}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keep the Tenant Details card if selected (unchanged except Save Changes handler) */}
          {selected && (
            <Card id="tenant-details">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tenant Details</CardTitle>
                    <CardDescription>
                      Complete information for {selected.name}
                    </CardDescription>
                  </div>
                  {/* <Button onClick={handleSaveChanges}>Save Changes</Button> */}
                </div>
              </CardHeader>

              <CardContent>
                {/* retained original Tenant Details layout (abbreviated here for brevity) */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Tenant Name
                    </p>
                    <p className="text-base font-semibold">{selected.name}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Current Plan
                    </p>
                    <Badge>{selected.plan}</Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </p>
                    <Badge
                      variant={
                        selected.status === "active" ? "default" : "secondary"
                      }
                    >
                      {selected.status || "Active"}
                    </Badge>
                  </div>
                </div>

                {/* AMC Billing Details (kept as before) */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> AMC Billing Details
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        AMC Amount (Auto-calculated)
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                        <span className="font-semibold text-lg">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: selected.currency ?? "INR",
                            maximumFractionDigits: 0,
                          }).format(Number(amcAmount) || 0)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({billingFrequency})
                        </span>
                      </div>
                    </div>

                    {/* <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Billing Frequency
                      </label>
                      <Select
                        value={billingFrequency}
                        onValueChange={setBillingFrequency}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_year">1 Year</SelectItem>
                          <SelectItem value="3_year">3 Year</SelectItem>
                          <SelectItem value="6_year">6 Year</SelectItem>
                          <SelectItem value="10_year">10 Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div> */}

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        <Calendar className="h-3 w-3 inline mr-1" /> Expire Date
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                        {expireDate ? (
                          new Date(expireDate).toLocaleDateString("en-GB")
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full tenant payload details (flattened) */}
                {selectedFull ? (
                  <>
                    {selectedFullLoading && (
                      <div className="mt-3">
                        <Badge variant="outline">Loading…</Badge>
                      </div>
                    )}
                    {selectedFullError && (
                      <p className="text-sm text-red-600 mt-2">
                        {selectedFullError}
                      </p>
                    )}
                    <DetailsPanel
                      data={selectedFull}
                      title={`All Tenant Details — ${
                        selectedFull.name || selected.name
                      }`}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tenant details available.
                  </p>
                )}

                {/* Payment history (kept) */}
                {payments && payments.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-semibold">Recent Payments</h4>
                    </div>
                    <div className="space-y-2">
                      {payments.slice(0, 5).map((payment: any) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {payment.plan} Plan
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                payment.payment_date
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: payment.currency ?? "INR",
                                maximumFractionDigits: 0,
                              }).format(Number(payment.amount))}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paymentsLoading && (
                  <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
                    Loading payment history...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AMC_report;
