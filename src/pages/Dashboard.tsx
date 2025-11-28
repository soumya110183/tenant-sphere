import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reportsAPI, activityAPI, paymentsAPI } from "@/services/api";
import {
  Building2,
  DollarSign,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";

// ---- helpers ----------------------------------------------------

function clampPercent(v: number) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

function computePercentChange(current: number, previous: number) {
  // returns signed integer percent e.g. 12 or -5. Handles previous === 0.
  current = Number(current || 0);
  previous = Number(previous || 0);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) {
    if (current === 0) return 0;
    // previous 0 -> choose a sensible bounded indicator rather than Infinity.
    return current > 0 ? 100 : -100;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

// Return stable keys like "2025-11"
function toMonthKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}
function prettyMonth(key: string) {
  // key: "YYYY-MM"
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

type RevenuePoint = { month: string; revenue: number }; // month is pretty label in the chart
type GrowthPoint = { month: string; tenants: number };

const Dashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    activeUsers: 0,
    totalRevenue: 0,
    expiringPlans: 0,
    // optional fields the backend could provide to make trend computation exact
    prevTotalTenants: undefined as number | undefined,
    prevActiveTenants: undefined as number | undefined,
  });
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [tenantGrowth, setTenantGrowth] = useState<GrowthPoint[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    void loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Single aggregated call (server should shape this)
      const dashboardData = await reportsAPI.getDashboardStats();

      setStats((prev) => ({ ...prev, ...(dashboardData.stats ?? {}) }));
      setTenantGrowth(
        (dashboardData.tenantGrowth ?? []).map((d: any) => ({
          month: d.month,
          tenants: Number(d.tenants ?? 0),
        }))
      );
      setCategoryDistribution(dashboardData.categoryDistribution ?? []);
      setPlanDistribution(dashboardData.planDistribution ?? []);
      setRevenueData(
        (dashboardData.revenueData ?? []).map((d: any) => ({
          month: d.month,
          revenue: Number(d.revenue ?? 0),
        }))
      );

      // Payments → robust monthly series + total
      try {
        const paymentsResponse = await paymentsAPI.getAllPayments();
        const payments = paymentsResponse?.payments || [];

        const monthlyMap = new Map<string, number>(); // key: YYYY-MM
        let runningTotal = 0;

        for (const p of payments) {
          const amount = Number(p?.amount) || 0;
          if (amount) runningTotal += amount;

          const dt = p?.payment_date ? new Date(p.payment_date) : null;
          if (dt && !isNaN(dt.getTime())) {
            const key = toMonthKey(dt);
            monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + amount);
          }
        }

        setTotalRevenue(runningTotal);

        // sort keys ascending and take last 6
        const sortedKeys = [...monthlyMap.keys()].sort();
        const last6 = sortedKeys.slice(-6);
        const series =
          last6.length > 0
            ? last6.map((k) => ({
                month: prettyMonth(k),
                revenue: monthlyMap.get(k) ?? 0,
              }))
            : (dashboardData.revenueData ?? []).map((d: any) => ({
                month: d.month,
                revenue: Number(d.revenue ?? 0),
              }));

        setRevenueData(series);
      } catch {
        // Fall back to backend-provided series
        setTotalRevenue(Number(dashboardData?.stats?.totalRevenue ?? 0));
        setRevenueData(
          (dashboardData.revenueData ?? []).map((d: any) => ({
            month: d.month,
            revenue: Number(d.revenue ?? 0),
          }))
        );
      }

      // Recent activity is optional
      try {
        const activity = await activityAPI.getRecentActivity(8);
        setRecentActivity(Array.isArray(activity) ? activity : []);
      } catch {
        setRecentActivity([]);
      }
    } catch (error) {
      // You can surface a toast here if desired
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ========== Dynamic trend calculations ==========
  // We derive trends from available historical series where possible.
  // - Revenue: derived from the last two points in revenueData (most reliable)
  // - Tenants (displayed on cards): if backend provides prevTotalTenants / prevActiveTenants we use them;
  //   otherwise we use tenantGrowth (new tenants per month) as a proxy for month-over-month change.

  const revenueTrend = useMemo(() => {
    if (!Array.isArray(revenueData) || revenueData.length < 2) return 0;
    const last = Number(revenueData[revenueData.length - 1].revenue || 0);
    const prev = Number(revenueData[revenueData.length - 2].revenue || 0);
    return computePercentChange(last, prev);
  }, [revenueData]);

  const tenantsNewTrend = useMemo(() => {
    // percent change of new tenants per month (tenantGrowth array)
    if (!Array.isArray(tenantGrowth) || tenantGrowth.length < 2) return 0;
    const last = Number(tenantGrowth[tenantGrowth.length - 1].tenants || 0);
    const prev = Number(tenantGrowth[tenantGrowth.length - 2].tenants || 0);
    return computePercentChange(last, prev);
  }, [tenantGrowth]);

  const totalTenantsTrend = useMemo(() => {
    const prevTotal = (stats as any).prevTotalTenants;
    if (typeof prevTotal === "number") {
      return computePercentChange(Number(stats.totalTenants || 0), prevTotal);
    }
    // fallback: use tenantNewTrend as a proxy for total-tenants trend
    return tenantsNewTrend;
  }, [stats.totalTenants, (stats as any).prevTotalTenants, tenantsNewTrend]);

  const activeTenantsTrend = useMemo(() => {
    const prevActive = (stats as any).prevActiveTenants;
    if (typeof prevActive === "number") {
      return computePercentChange(Number(stats.activeTenants || 0), prevActive);
    }
    // fallback: also use tenantsNewTrend as a proxy
    return tenantsNewTrend;
  }, [stats.activeTenants, (stats as any).prevActiveTenants, tenantsNewTrend]);

  // trial tenants trend: if planDistribution has historical series this should be used.
  // Since we only have a current snapshot, default to 0 (no change).
  const trialTrend = useMemo(() => {
    // if backend later supplies planDistributionHistory, compute here.
    return 0;
  }, [planDistribution]);

  // derive trial plan value from planDistribution if present
  const trialValue = useMemo(() => {
    const p = (planDistribution ?? []).find((pl: any) => {
      const name = (pl?.name || "").toString().toLowerCase();
      return name.includes("trial");
    });
    return p ? Number(p.value || 0) : Number(stats.expiringPlans || 0);
  }, [planDistribution, stats.expiringPlans]);

  const getTrendDisplay = (signedPct: number) => {
    const up = signedPct >= 0;
    const absPct = Math.abs(signedPct);
    return { text: `${up ? "+" : "-"}${absPct}%`, up };
  };

  const statCards = useMemo(
    () => [
      {
        title: "Total Tenants",
        value: stats.totalTenants ?? 0,
        icon: Building2,
        trendPct: totalTenantsTrend,
      },
      {
        title: "Active Tenants",
        value: stats.activeTenants ?? 0,
        icon: Building2,
        trendPct: activeTenantsTrend,
      },
      {
        title: "Total Revenue",
        value: totalRevenue, // computed from payments
        icon: DollarSign,
        isCurrency: true,
        currency: "AED",
        trendPct: revenueTrend,
      },
      {
        title: "Trial tenants",
        value: trialValue,
        icon: AlertCircle,
        trendPct: trialTrend,
      },
    ],
    [
      stats.totalTenants,
      stats.activeTenants,
      totalRevenue,
      trialValue,
      totalTenantsTrend,
      activeTenantsTrend,
      revenueTrend,
      trialTrend,
    ]
  );

  const getActivityIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "upgrade":
        return <TrendingUp className={iconClass} />;
      case "create":
        return <Building2 className={iconClass} />;
      case "payment":
        return <DollarSign className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const total = Number(stats.totalTenants || 0);

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 space-y-6">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here is the current tenant and revenue overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const { text, up } = getTrendDisplay(Number(stat.trendPct || 0));
          return (
            <Card
              key={stat.title}
              className="hover:shadow-sm transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 min-w-0">
                <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="text-2xl font-bold truncate">
                  {stat.isCurrency
                    ? new Intl.NumberFormat("en-AE", {
                        style: "currency",
                        currency: stat.currency || "AED",
                        maximumFractionDigits: 0,
                      }).format(Number(stat.value) || 0)
                    : stat.value}
                </div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {up ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  )}
                  <span className={up ? "text-green-600" : "text-red-600"}>
                    {text}
                  </span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly revenue over the last 6 months
            </p>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[260px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Growth */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tenant Growth</CardTitle>
            <p className="text-sm text-muted-foreground">
              New tenants per month
            </p>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[260px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tenantGrowth}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="tenants"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="New Tenants"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Distributions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest tenant actions
            </p>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={
                      activity?.id ??
                      `${activity?.user ?? "u"}-${
                        activity?.time ?? Math.random()
                      }`
                    }
                    className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="mt-1 p-2 rounded-lg bg-muted shrink-0">
                      {getActivityIcon(activity?.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity?.user ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity?.action ?? "Action"}{" "}
                        <span className="font-medium">
                          {activity?.target ?? ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity?.time ?? ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tenant distribution by type
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryDistribution.map((cat, index) => {
                const value = Number(cat?.value ?? 0);
                const pct = total > 0 ? clampPercent((value / total) * 100) : 0;
                return (
                  <div
                    key={`${cat?.name ?? "cat"}-${index}`}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">
                        {cat?.name ?? "Unknown"}
                      </span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {categoryDistribution.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No categories yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Plans</CardTitle>
            <p className="text-sm text-muted-foreground">
              Subscription breakdown
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {planDistribution.map((plan, index) => {
                const value = Number(plan?.value ?? 0);
                const pct = total > 0 ? clampPercent((value / total) * 100) : 0;
                return (
                  <div
                    key={`${plan?.name ?? "plan"}-${index}`}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize truncate">
                        {plan?.name ?? "Unknown"}
                      </span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {planDistribution.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No plans yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3 min-w-0">
            <div className="min-w-0">
              <CardTitle>Quick Actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your platform
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/tenants")}>
              <Building2 className="mr-2 h-4 w-4" />
              View All Tenants
            </Button>
            <Button variant="outline" onClick={() => navigate("/reports")}>
              View Reports
            </Button>
            <Button variant="outline" onClick={() => navigate("/settings")}>
              Platform Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
