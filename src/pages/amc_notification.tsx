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
  green: Tenant[];   // > 100 days OR no end date
  blue: Tenant[];    // 11..100 days
  orange: Tenant[];  // 1..10 days
  red: Tenant[];     // <= 0 days (expired)
};

/* ========= Constants & pure helpers (module scope) ========= */

// Annual AMC rates per plan
const amcAnnualRates: Record<string, number> = {
  trial: 0,
  basic: 100,
  professional: 250,
  enterprise: 350,
  // tolerate common aliases found in data
  proffection: 250,
  enterprice: 350,
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

// End date for a tenant; AMC record overrides tenant fields
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
        const local = (tenantsData as unknown) as Tenant[];
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

  // Memoized expiry buckets for the four status cards
  const expiryBuckets = useMemo(
    () => classifyTenantsByExpiry(tenants, allAmcs),
    [tenants, allAmcs]
  );

  // AMC helpers tied to selected tenant
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
        <p className="text-muted-foreground mt-1">
          View tenant plans and details
        </p>
      </div>

      {/* Expiry Overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {/* Green */}
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700">&gt; 100 days</CardTitle>
            <CardDescription>Healthy renewals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge className="bg-green-600">{expiryBuckets.green.length}</Badge>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
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
                      <Badge variant="outline" className="text-xs">{label}</Badge>
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

        {/* Blue */}
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-700">11–100 days</CardTitle>
            <CardDescription>Upcoming renewals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge className="bg-blue-600">{expiryBuckets.blue.length}</Badge>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
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
                      <Badge variant="outline" className="text-xs">{label}</Badge>
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
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700">1–10 days</CardTitle>
            <CardDescription>Urgent reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge className="bg-amber-600">{expiryBuckets.orange.length}</Badge>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
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
                      <Badge variant="outline" className="text-xs">{label}</Badge>
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
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700">Expired</CardTitle>
            <CardDescription>Action required</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Tenants</span>
              <Badge variant="destructive">{expiryBuckets.red.length}</Badge>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
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
                      <Badge variant="outline" className="text-xs">{label}</Badge>
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
                      <div className="text-muted-foreground">
                        {totalByPlan[plan]}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {selected && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tenant Details</CardTitle>
                    <CardDescription>
                      Complete information for {selected.name}
                    </CardDescription>
                  </div>
                  <Button
                    size="default"
                    onClick={async () => {
                      toast({
                        title: "Saving changes",
                        description: `Updating AMC details for ${selected.name}...`,
                      });

                      try {
                        const startDate =
                          dueDate ||
                          selected.created_at?.split("T")[0] ||
                          new Date().toISOString().split("T")[0];

                        const calculatedExpireDate = calculateExpireDate(
                          startDate,
                          billingFrequency
                        );
                        const endDate = expireDate || calculatedExpireDate;

                        const amcData: AMCRecord = {
                          client_name: selected.name,
                          plan: selected.plan,
                          start_date: startDate,
                          end_date: endDate,
                          status: true,
                          amount: Number(amcAmount) || 0,
                          billing_frequency: billingFrequency,
                          tenat_amcid: String(selected.id),
                        };

                        let updatedAMC: any;

                        if (amcRecord?.id) {
                          updatedAMC = await amcAPI.updateAMC(amcRecord.id, amcData);
                        } else {
                          updatedAMC = await amcAPI.createAMC(amcData);
                        }

                        setAmcRecord(updatedAMC.amc);

                        setDueDate(startDate);
                        setExpireDate(endDate);

                        const updatedTenantData: Tenant = {
                          ...selected,
                          amc_amount: Number(amcAmount) || 0,
                          billing_frequency: billingFrequency,
                          amc_number: amcNumber,
                          due_date: startDate,
                          expire_date: endDate,
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
                        toast({
                          title: "Update failed",
                          description: err?.message ?? String(err),
                        });
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Tenant ID
                      </p>
                      <p className="text-base font-semibold">{String(selected.id)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Tenant Name
                      </p>
                      <p className="text-base font-semibold">{selected.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Category
                      </p>
                      <Badge variant="secondary" className="text-sm">
                        {selected.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Subscription Information */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Current Plan
                      </p>
                      <Badge className="text-sm">{selected.plan}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Status
                      </p>
                      <Badge
                        variant={selected.status === "active" ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {selected.status || "Active"}
                      </Badge>
                    </div>
                    {selected.created_at && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Created Date
                        </p>
                        <p className="text-base">
                          {new Date(selected.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Modules Information */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Active Modules
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selected.modules ? (
                          Array.isArray(selected.modules) ? (
                            selected.modules.length > 0 ? (
                              selected.modules.map((mod) => (
                                <Badge key={mod} variant="outline" className="text-xs">
                                  {mod}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No modules</p>
                            )
                          ) : typeof selected.modules === "object" ? (
                            Object.keys(selected.modules)
                              .filter((key) => (selected.modules as Record<string, boolean>)[key])
                              .map((mod) => (
                                <Badge key={mod} variant="outline" className="text-xs capitalize">
                                  {mod}
                                </Badge>
                              ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No modules</p>
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">No modules</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AMC Billing Information */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    AMC Billing Details
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* AMC Amount */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        AMC Amount (Auto-calculated)
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                        <span className="font-semibold text-lg">
                          {new Intl.NumberFormat("en-AE", {
                            style: "currency",
                            currency: "AED",
                            maximumFractionDigits: 0,
                          }).format(Number(amcAmount) || 0)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({billingFrequency})
                        </span>
                      </div>
                    </div>

                    {/* Billing Frequency */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Billing Frequency
                      </label>
                      <Select
                        value={billingFrequency}
                        onValueChange={(v) => setBillingFrequency(v as BillingFrequency)}
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
                    </div>

                    {/* Expire Date */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Expire Date
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                        {expireDate ? (
                          new Date(expireDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </div>
                    </div>

                    {/* Latest Transaction Date */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Latest Transaction
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                        {payments && payments.length > 0 ? (
                          new Date(payments[0].payment_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        ) : (
                          <span className="text-muted-foreground">No transactions</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                {payments && payments.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-semibold">Recent Payments</h4>
                    </div>
                    <div className="space-y-2">
                      {payments.slice(0, 5).map((payment) => (
                        <div
                          key={String(payment.id)}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {payment.plan} Plan
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {new Intl.NumberFormat("en-AE", {
                                style: "currency",
                                currency: "AED",
                                maximumFractionDigits: 0,
                              }).format(Number(payment.amount))}
                            </p>
                            {payment.status && (
                              <Badge variant="outline" className="text-xs">
                                {payment.status}
                              </Badge>
                            )}
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

          {/* Active and Expired Subscriptions */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Active Subscriptions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-green-600 dark:text-green-400">
                      Active Subscriptions
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Active tenants (no expire date or expire date in future)
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-600">
                    {tenants.filter((t) => isActive(t)).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {tenants
                    .filter((t) => isActive(t))
                    .map((tenant) => {
                      const tenantAMC = getTenantAMC(tenant.id);
                      const startDate = tenantAMC?.start_date || tenant.created_at;
                      const endDate = tenantAMC?.end_date || tenant.expire_date;
                      const statusMsg = getExpirationStatus(tenant);

                      return (
                        <div
                          key={String(tenant.id)}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{tenant.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {tenant.category}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                  Plan:{" "}
                                  <span className="font-medium text-foreground capitalize">
                                    {tenant.plan}
                                  </span>
                                </p>
                                {startDate && (
                                  <p className="text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    Started:{" "}
                                    {new Date(startDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </p>
                                )}
                                {endDate && (
                                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    Expires:{" "}
                                    {new Date(endDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                    {statusMsg && ` (${statusMsg})`}
                                  </p>
                                )}
                                {tenant.email && (
                                  <p className="text-xs text-muted-foreground">
                                    Email: {tenant.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-green-600">Active</Badge>
                          </div>
                        </div>
                      );
                    })}
                  {tenants.filter((t) => isActive(t)).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No active subscriptions found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expired Subscriptions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-red-600 dark:text-red-400">
                      Expired Subscriptions
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Tenants with expire date passed
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">
                    {tenants.filter((t) => isExpired(t)).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {tenants
                    .filter((t) => isExpired(t))
                    .map((tenant) => {
                      const tenantAMC = getTenantAMC(tenant.id);
                      const startDate = tenantAMC?.start_date || tenant.created_at;
                      const endDate = tenantAMC?.end_date || tenant.expire_date;
                      const statusMsg = getExpirationStatus(tenant);

                      return (
                        <div
                          key={String(tenant.id)}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors opacity-75"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{tenant.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {tenant.category}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                  Plan:{" "}
                                  <span className="font-medium text-foreground capitalize">
                                    {tenant.plan}
                                  </span>
                                </p>
                                {startDate && (
                                  <p className="text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    Started:{" "}
                                    {new Date(startDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </p>
                                )}
                                {endDate && (
                                  <p className="text-xs text-red-600 font-bold">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    Expired:{" "}
                                    {new Date(endDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                    {statusMsg && ` (${statusMsg})`}
                                  </p>
                                )}
                                {tenant.email && (
                                  <p className="text-xs text-muted-foreground">
                                    Email: {tenant.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant="destructive">Expired</Badge>
                          </div>
                        </div>
                      );
                    })}
                  {tenants.filter((t) => isExpired(t)).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No expired subscriptions found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AMC_notification;
