import React, { useEffect, useState } from "react";
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
import { paymentsAPI, tenantAPI, amcAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Users, Loader2 } from "lucide-react";

const priceMap: Record<string, number> = {
  trial: 0,
  basic: 1000,
  professional: 2500,
  proffection: 2500,
  enterprise: 3500,
  enterprice: 3500,
};

// Monthly AMC rates per plan
const amcMonthlyRates: Record<string, number> = {
  trial: 0,
  basic: 100,
  professional: 250,
  enterprise: 350,
};

// Calculate AMC amount based on plan and billing frequency
const calculateAmcAmount = (plan: string, frequency: string): number => {
  const planKey = plan.toLowerCase().split(/[-_\s]/)[0];
  const monthlyRate = amcMonthlyRates[planKey] || 0;

  if (monthlyRate === 0) return 0;

  switch (frequency) {
    case "monthly":
      return monthlyRate;
    case "quarterly":
      return monthlyRate * 3;
    case "semi-annually":
      return monthlyRate * 6;
    case "annually":
      return monthlyRate * 12;
    default:
      return monthlyRate;
  }
};

// Calculate expire date based on start date and billing frequency
const calculateExpireDate = (startDate: string, frequency: string): string => {
  const start = new Date(startDate);
  let expireDate = new Date(start);

  switch (frequency) {
    case "monthly":
      expireDate.setMonth(expireDate.getMonth() + 1);
      break;
    case "quarterly":
      expireDate.setMonth(expireDate.getMonth() + 3);
      break;
    case "semi-annually":
      expireDate.setMonth(expireDate.getMonth() + 6);
      break;
    case "annually":
      expireDate.setFullYear(expireDate.getFullYear() + 1);
      break;
    default:
      expireDate.setMonth(expireDate.getMonth() + 1);
  }

  return expireDate.toISOString().split("T")[0];
};

const parsePlanPrice = (name: string) => {
  if (!name) return { price: 0, currency: "AED" };
  const m = name.match(/-(\d[\d,\.]*)\s*([A-Za-z]{2,4})?$/i);
  if (m) {
    const raw = m[1].replace(/,/g, "");
    const price = Number(raw) || 0;
    return { price, currency: (m[2] || "AED").toUpperCase() };
  }
  const key = name.toLowerCase().split(/[-_\s]/)[0];
  return { price: priceMap[key] ?? 0, currency: "AED" };
};

const AMC_report: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const [payments, setPayments] = useState<any[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const { toast } = useToast();
  const [creatingPlan, setCreatingPlan] = useState<string | null>(null);

  // AMC specific editable fields
  const [amcAmount, setAmcAmount] = useState<string>("");
  const [billingFrequency, setBillingFrequency] = useState<string>("monthly");
  const [amcNumber, setAmcNumber] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [expireDate, setExpireDate] = useState<string>("");

  // AMC record from backend
  const [amcRecord, setAmcRecord] = useState<any>(null);
  const [amcLoading, setAmcLoading] = useState(false);

  // Store all AMC records for filtering active/expired
  const [allAmcs, setAllAmcs] = useState<any[]>([]);

  // Load tenants from backend on mount
  useEffect(() => {
    const loadTenants = async () => {
      console.log("Loading tenants...");
      setLoading(true);
      try {
        const data = await tenantAPI.getTenants();
        console.log("Tenants loaded from API:", data);

        // Handle different response formats
        const tenantsList = Array.isArray(data) ? data : data?.tenants || [];
        setTenants(tenantsList);

        if (tenantsList.length > 0) {
          setSelected(tenantsList[0]);
          console.log("Selected first tenant:", tenantsList[0]);
        }
      } catch (error) {
        console.error(
          "Failed to load tenants from API, using fallback:",
          error
        );
        // Fallback to local data on error
        setTenants(tenantsData);
        if (tenantsData.length > 0) {
          setSelected(tenantsData[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadTenants();
  }, []);

  // Load payments when selected tenant changes
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
        // Don't log error if it's just that the endpoint doesn't exist yet
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

  // Populate AMC fields when tenant is selected
  useEffect(() => {
    if (selected) {
      const frequency = selected.billing_frequency || "monthly";
      setBillingFrequency(frequency);

      // Auto-calculate AMC amount based on plan and billing frequency
      const calculatedAmount = calculateAmcAmount(
        selected.plan || "",
        frequency
      );
      setAmcAmount(calculatedAmount.toString());

      // Auto-generate AMC number if not exists
      const generatedAmcNumber =
        selected.amc_number ||
        `AMC-${String(selected.id).padStart(
          6,
          "0"
        )}-${new Date().getFullYear()}`;
      setAmcNumber(generatedAmcNumber);

      setDueDate(selected.due_date || "");
      setExpireDate(selected.expire_date || "");

      // Try to load existing AMC record for this tenant
      loadAMCRecord(selected.id);
    }
  }, [selected]);

  // Load AMC record from backend
  const loadAMCRecord = async (tenantId: string) => {
    setAmcLoading(true);
    try {
      // Get all AMCs and find the one for this tenant
      const response = await amcAPI.getAllAMCs();
      const amcs = response?.amcs || [];

      // Store all AMC records for active/expired filtering
      setAllAmcs(amcs);

      const tenantAMC = amcs.find(
        (amc: any) => String(amc.tenat_amcid) === String(tenantId)
      );

      if (tenantAMC) {
        setAmcRecord(tenantAMC);
        // Update fields from AMC record
        if (tenantAMC.amount) setAmcAmount(tenantAMC.amount.toString());
        if (tenantAMC.billing_frequency)
          setBillingFrequency(tenantAMC.billing_frequency);
        // Use start_date as due date
        if (tenantAMC.start_date) setDueDate(tenantAMC.start_date);
        // Use end_date as expire date
        if (tenantAMC.end_date) setExpireDate(tenantAMC.end_date);
      } else {
        setAmcRecord(null);
        // If no AMC record, calculate dates
        const startDate =
          selected.created_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0];
        setDueDate(startDate);
        const calculatedExpire = calculateExpireDate(
          startDate,
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

  // Recalculate AMC amount and expire date when billing frequency changes
  useEffect(() => {
    if (selected && selected.plan) {
      const calculatedAmount = calculateAmcAmount(
        selected.plan,
        billingFrequency
      );
      setAmcAmount(calculatedAmount.toString());

      // Recalculate expire date based on start date and billing frequency
      if (dueDate) {
        const calculatedExpireDate = calculateExpireDate(
          dueDate,
          billingFrequency
        );
        setExpireDate(calculatedExpireDate);
      }
    }
  }, [billingFrequency, selected, dueDate]);

  const totalByPlan = tenants.reduce((acc: Record<string, number>, t: any) => {
    const key = (t.plan || "unknown").toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Helper function to get AMC record for a tenant
  const getTenantAMC = (tenantId: string) => {
    return allAmcs.find(
      (amc: any) => String(amc.tenat_amcid) === String(tenantId)
    );
  };

  // Helper function to check if tenant is expired based on AMC end_date
  const isExpired = (tenant: any): boolean => {
    // Get AMC record for this tenant
    const tenantAMC = getTenantAMC(tenant.id);

    // If AMC record exists, use its end_date
    if (tenantAMC && tenantAMC.end_date) {
      const expireDate = new Date(tenantAMC.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Use backend's expiration_info if available
      if (tenantAMC.expiration_info?.is_expired !== undefined) {
        return tenantAMC.expiration_info.is_expired;
      }

      // Otherwise calculate manually
      return expireDate < today;
    }

    // Fallback to tenant's expire_date field
    if (!tenant.expire_date) return false;

    const expireDate = new Date(tenant.expire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expireDate < today;
  };

  // Helper function to check if tenant is active
  const isActive = (tenant: any): boolean => {
    // Get AMC record for this tenant
    const tenantAMC = getTenantAMC(tenant.id);

    // If AMC record exists, use its end_date
    if (tenantAMC && tenantAMC.end_date) {
      const expireDate = new Date(tenantAMC.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Use backend's expiration_info if available
      if (tenantAMC.expiration_info?.is_expired !== undefined) {
        return !tenantAMC.expiration_info.is_expired;
      }

      // Otherwise calculate manually - active if today or future
      return expireDate >= today;
    }

    // If no AMC end_date, check tenant's expire_date
    if (!tenant.expire_date) return true; // No expire date = active

    const expireDate = new Date(tenant.expire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return expireDate >= today;
  };

  // Helper function to get expiration status message
  const getExpirationStatus = (tenant: any): string | null => {
    const tenantAMC = getTenantAMC(tenant.id);

    if (tenantAMC?.expiration_info?.status_message) {
      return tenantAMC.expiration_info.status_message;
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AMC Report</h1>
        <p className="text-muted-foreground mt-1">
          View tenant plans and details
        </p>
      </div>

      {/* Debug info - remove after fixing */}
      {loading && (
       <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
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
                          (t: any) => t.id.toString() === value
                        );
                        if (tenant) setSelected(tenant);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant: any) => (
                          <SelectItem
                            key={tenant.id}
                            value={tenant.id.toString()}
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

          {/* Detailed Tenant Information */}
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
                        // Use created_at as start date, or current date if not available
                        const startDate =
                          dueDate ||
                          selected.created_at?.split("T")[0] ||
                          new Date().toISOString().split("T")[0];

                        // Calculate expire date based on start date and billing frequency
                        const calculatedExpireDate = calculateExpireDate(
                          startDate,
                          billingFrequency
                        );
                        const endDate = expireDate || calculatedExpireDate;

                        // Prepare AMC data for backend
                        const amcData = {
                          client_name: selected.name,
                          plan: selected.plan,
                          start_date: startDate,
                          end_date: endDate,
                          status: true,
                          amount: Number(amcAmount) || 0,
                          billing_frequency: billingFrequency,
                          tenat_amcid: String(selected.id),
                        };

                        let updatedAMC;

                        // If AMC record exists, update it; otherwise create new one
                        if (amcRecord && amcRecord.id) {
                          updatedAMC = await amcAPI.updateAMC(
                            amcRecord.id,
                            amcData
                          );
                          console.log("AMC updated:", updatedAMC);
                        } else {
                          updatedAMC = await amcAPI.createAMC(amcData);
                          console.log("AMC created:", updatedAMC);
                        }

                        // Update AMC record state
                        setAmcRecord(updatedAMC.amc);

                        // Update local date states to reflect saved values
                        setDueDate(startDate);
                        setExpireDate(endDate);

                        // Also update tenant with AMC fields
                        const updatedTenantData = {
                          ...selected,
                          amc_amount: Number(amcAmount),
                          billing_frequency: billingFrequency,
                          amc_number: amcNumber,
                          due_date: startDate,
                          expire_date: endDate,
                        };

                        await tenantAPI.updateTenant(
                          selected.id,
                          updatedTenantData
                        );

                        // Update local state
                        setSelected(updatedTenantData);
                        setTenants((prev) =>
                          prev.map((t) =>
                            t.id === selected.id ? updatedTenantData : t
                          )
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
                      <p className="text-base font-semibold">{selected.id}</p>
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
                        variant={
                          selected.status === "active" ? "default" : "secondary"
                        }
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
                          {new Date(selected.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
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
                              selected.modules.map((mod: string) => (
                                <Badge
                                  key={mod}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {mod}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No modules
                              </p>
                            )
                          ) : typeof selected.modules === "object" ? (
                            Object.keys(selected.modules)
                              .filter((key) => selected.modules[key] === true)
                              .map((mod) => (
                                <Badge
                                  key={mod}
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {mod}
                                </Badge>
                              ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No modules
                            </p>
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No modules
                          </p>
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
                    {/* AMC Number (Auto-generated, read-only) */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        AMC Number (Auto-generated)
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm font-mono font-semibold">
                        {amcNumber || "Not generated"}
                      </div>
                    </div>

                    {/* AMC Amount (Auto-calculated based on plan and frequency) */}
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
                        onValueChange={setBillingFrequency}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi-annually">
                            Semi-Annually
                          </SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date (Display only) */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Due Date
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                        {dueDate ? (
                          new Date(dueDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </div>
                    </div>

                    {/* Expire Date (Display only) */}
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

                    {/* Latest Transaction Date (Read-only from payments) */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Latest Transaction
                      </label>
                      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
                        {payments && payments.length > 0 ? (
                          new Date(payments[0].payment_date).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )
                        ) : (
                          <span className="text-muted-foreground">
                            No transactions
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mt-6 pt-6 border-t">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {selected.contact && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Contact
                        </p>
                        <p className="text-sm">{selected.contact}</p>
                      </div>
                    )}
                    {selected.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Email
                        </p>
                        <p className="text-sm">{selected.email}</p>
                      </div>
                    )}
                    {selected.phone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Phone
                        </p>
                        <p className="text-sm">{selected.phone}</p>
                      </div>
                    )}
                    {selected.address && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Address
                        </p>
                        <p className="text-sm">{selected.address}</p>
                      </div>
                    )}
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
                              {new Intl.NumberFormat("en-AE", {
                                style: "currency",
                                currency: "AED",
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
                    {tenants.filter((t: any) => isActive(t)).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {tenants
                    .filter((t: any) => isActive(t))
                    .map((tenant: any) => (
                      <div
                        key={tenant.id}
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
                              {(() => {
                                const tenantAMC = getTenantAMC(tenant.id);
                                const startDate =
                                  tenantAMC?.start_date || tenant.created_at;
                                const expireDate =
                                  tenantAMC?.end_date || tenant.expire_date;
                                const statusMsg = getExpirationStatus(tenant);

                                return (
                                  <>
                                    {startDate && (
                                      <p className="text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3 inline mr-1" />
                                        Started:{" "}
                                        {new Date(startDate).toLocaleDateString(
                                          "en-US",
                                          {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          }
                                        )}
                                      </p>
                                    )}
                                    {expireDate && (
                                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        <Calendar className="h-3 w-3 inline mr-1" />
                                        Expires:{" "}
                                        {new Date(
                                          expireDate
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                        {statusMsg && ` (${statusMsg})`}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
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
                    ))}
                  {tenants.filter((t: any) => isActive(t)).length === 0 && (
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
                    {tenants.filter((t: any) => isExpired(t)).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {tenants
                    .filter((t: any) => isExpired(t))
                    .map((tenant: any) => (
                      <div
                        key={tenant.id}
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
                              {(() => {
                                const tenantAMC = getTenantAMC(tenant.id);
                                const startDate =
                                  tenantAMC?.start_date || tenant.created_at;
                                const expireDate =
                                  tenantAMC?.end_date || tenant.expire_date;
                                const statusMsg = getExpirationStatus(tenant);

                                return (
                                  <>
                                    {startDate && (
                                      <p className="text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3 inline mr-1" />
                                        Started:{" "}
                                        {new Date(startDate).toLocaleDateString(
                                          "en-US",
                                          {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          }
                                        )}
                                      </p>
                                    )}
                                    {expireDate && (
                                      <p className="text-xs text-red-600 font-bold">
                                        <Calendar className="h-3 w-3 inline mr-1" />
                                        Expired:{" "}
                                        {new Date(
                                          expireDate
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                        {statusMsg && ` (${statusMsg})`}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
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
                    ))}
                  {tenants.filter((t: any) => isExpired(t)).length === 0 && (
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

export default AMC_report;
