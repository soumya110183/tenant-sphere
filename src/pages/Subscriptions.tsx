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
import { Badge } from "@/components/ui/badge";
import tenantsData from "@/data/tenants.json";
import { paymentsAPI, tenantAPI } from "@/services/api";
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

const Subscriptions: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const [payments, setPayments] = useState<any[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const { toast } = useToast();
  const [creatingPlan, setCreatingPlan] = useState<string | null>(null);

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

  const totalByPlan = tenants.reduce((acc: Record<string, number>, t: any) => {
    const key = (t.plan || "unknown").toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          View tenant plans and details
        </p>
      </div>

      {/* Debug info - remove after fixing */}
      {loading && (
        <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Subscriptions...</p>
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscription Plans</CardTitle>
                  <div className="mt-2">
                  <CardDescription>
                    Available plans and included features
                  </CardDescription>
                  </div>
                </div>

                {/* Save Changes Button */}
                <Button
                  size="default"
                  disabled={!selected || !selectedPlan || creatingPlan !== null}
                  onClick={async () => {
                    if (!selected) {
                      toast({
                        title: "No tenant selected",
                        description: "Please select a tenant before charging.",
                      });
                      return;
                    }

                    if (!selectedPlan) {
                      toast({
                        title: "No plan selected",
                        description: "Please select a plan before charging.",
                      });
                      return;
                    }

                    const planPrice = priceMap[selectedPlan] ?? 0;
                    const planTitle =
                      selectedPlan.charAt(0).toUpperCase() +
                      selectedPlan.slice(1);

                    toast({
                      title: "Processing payment",
                      description: `Charging ${selected.name} for ${planTitle}...`,
                    });
                    setCreatingPlan(selectedPlan);

                    try {
                      const payload = {
                        tenant_id: String(selected.id),
                        amount: planPrice,
                        currency: "USD",
                        plan: selectedPlan,
                        status: "paid",
                        transaction_id: `txn_${Date.now()}_${Math.random()
                          .toString(36)
                          .substr(2, 9)}`,
                      };

                      console.log("payments.createPayment payload:", payload);

                      const res = await paymentsAPI.createPayment(payload);
                      let created = res?.payment ?? res ?? null;
                      if (Array.isArray(created)) created = created[0];

                      console.log(
                        "payments.createPayment response:",
                        res,
                        "parsed->",
                        created
                      );

                      if (!created) {
                        console.warn(
                          "Backend returned null/empty response. Payment may still be created. Response:",
                          res
                        );

                        try {
                          const fresh = await paymentsAPI.getPaymentsByTenant(
                            String(selected.id)
                          );
                          const list = fresh?.payments ?? fresh ?? [];
                          setPayments(Array.isArray(list) ? list : []);
                        } catch (refetchErr) {
                          console.error(
                            "Refetch after createPayment failed:",
                            refetchErr
                          );
                        }

                        try {
                          await tenantAPI.updateTenant(selected.id, {
                            plan: selectedPlan,
                          });

                          setSelected({ ...selected, plan: selectedPlan });
                          setTenants((prev) =>
                            prev.map((t) =>
                              t.id === selected.id
                                ? { ...t, plan: selectedPlan }
                                : t
                            )
                          );
                        } catch (updateErr) {
                          console.error(
                            "Failed to update tenant plan:",
                            updateErr
                          );
                        }

                        toast({
                          title: "Payment submitted",
                          description: `${planPrice} USD payment submitted for ${selected.name}. Plan updated to ${planTitle}.`,
                        });
                        setSelectedPlan(null);
                        return;
                      }

                      setPayments((prev) => [created, ...(prev ?? [])]);

                      try {
                        await tenantAPI.updateTenant(selected.id, {
                          plan: selectedPlan,
                        });

                        setSelected({ ...selected, plan: selectedPlan });
                        setTenants((prev) =>
                          prev.map((t) =>
                            t.id === selected.id
                              ? { ...t, plan: selectedPlan }
                              : t
                          )
                        );
                      } catch (updateErr) {
                        console.error(
                          "Failed to update tenant plan:",
                          updateErr
                        );
                      }

                      toast({
                        title: "Payment recorded",
                        description: `${planPrice} USD recorded for ${selected.name}. Plan updated to ${planTitle}.`,
                      });

                      setSelectedPlan(null);
                    } catch (err: any) {
                      console.error("payments.createPayment error:", err);
                      toast({
                        title: "Payment failed",
                        description: err?.message ?? String(err),
                      });
                    } finally {
                      setCreatingPlan(null);
                    }
                  }}
                >
                  {creatingPlan !== null ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    key: "trial",
                    title: "Trial (7 days)",
                    
                    users: 0,
                    features: ["All features"],
                  },
                  {
                    key: "basic",
                    title: "Basic",
                    note: "",
                    users: 1,
                    features: ["Billing", "Reports", "1 user", "AMC 100 AED/month"],
                  },
                  {
                    key: "professional",
                    title: "Professional",
                    note: "",
                    users: 2,
                    features: ["Billing", "Reports", "Inventory", "2 users", "AMC 250 AED/month"],
                  },
                  {
                    key: "enterprise",
                    title: "Enterprise",
                    note: "",
                    users: 10,
                    features: ["Billing", "Reports", "Inventory", "10 users", "AMC 350 AED/month"],
                  },
                ].map((plan) => {
                  const isActive =
                    selected &&
                    selected.plan &&
                    selected.plan.toLowerCase().startsWith(plan.key);
                  const isSelected = selectedPlan === plan.key;
                  const planPrice = priceMap[plan.key] ?? 0;
                  const formattedPrice = new Intl.NumberFormat("en-AE", {
                    style: "currency",
                    currency: "AED",
                    maximumFractionDigits: 0,
                  }).format(planPrice);

                  return (
                    <div
                      key={plan.key}
                      onClick={() => setSelectedPlan(plan.key)}
                      className={`group relative p-6 border-2 rounded-xl transition-all duration-300 cursor-pointer ${
                        isActive
                          ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-md"
                          : isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg"
                          : "border-border hover:border-primary/50 hover:shadow-lg"
                      }`}
                    >
                      {/* Plan Header */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-foreground">
                            {plan.title}
                          </h3>
                          <div className="flex gap-2">
                            {isActive && (
                              <Badge
                                variant="default"
                                className="text-xs bg-green-600"
                              >
                                Current
                              </Badge>
                            )}
                            {isSelected && (
                              <Badge
                                variant="default"
                                className="text-xs bg-blue-600"
                              >
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                        {plan.note && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {plan.note}
                          </p>
                        )}
                      </div>

                      {/* Price Display */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-foreground">
                            {planPrice === 0
                              ? "Free"
                              : planPrice.toLocaleString()}
                          </span>
                          {planPrice > 0 && (
                            <span className="text-sm text-muted-foreground">
                              AED
                            </span>
                          )}
                        </div>
                        {plan.users > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>
                              {plan.users} {plan.users === 1 ? "user" : "users"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Features List */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          What's included:
                        </h4>
                        <ul className="space-y-2">
                          {plan.features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <svg
                                className="h-5 w-5 text-primary flex-shrink-0 mt-0.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Subscriptions;
