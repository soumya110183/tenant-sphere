import axios from "axios";
import tenantsData from "@/data/tenants.json";
import reportsData from "@/data/reports.json";
import { report } from "process";

// Base URLs
// const API_URL = "https://billingbackend-1vei.onrender.com";
// const API_URL = "https://billingbackend-1vei.onrender.com";
const API_URL = "https://billingbackend-1vei.onrender.com"; // Update with your backend URL
// Alias to maintain legacy references expecting API_BASE
const API_BASE = API_URL;

// Create an Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor to attach Bearer token to every request
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("auth_token");
    const tenantId = localStorage.getItem("tenant_id");
    // ensure headers object exists
    if (!config.headers) config.headers = {} as any;
    if (token) (config.headers as any).Authorization = `Bearer ${token}`;
    // NOTE: do NOT set a custom `X-Tenant-Id` header here because some
    // backends do not allow that header in CORS preflight's
    // Access-Control-Allow-Headers. We send tenant via query param below.

    // If caller explicitly opted out (set `skip_tenant: true` in params),
    // do not add tenant_id. Remove the flag before sending to avoid
    // leaking internal params to the backend.
    const skipTenant = config.params?.skip_tenant === true;
    if (skipTenant) {
      // create a shallow copy without the skip flag
      const { skip_tenant, ...rest } = config.params || {};
      config.params = rest as any;
    } else {
      // if request params do not include tenant_id, and we have one, add as query param
      if (tenantId) {
        config.params = {
          ...(config.params || {}),
          tenant_id: config.params?.tenant_id ?? tenantId,
        };
      }
    }

    // lightweight debug so we can see failing requests in console
    // avoid noisy logs in production by checking hostname
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "localhost"
    ) {
      console.debug(
        "API request:",
        config.method,
        config.url,
        "params:",
        config.params,
        "headers:",
        config.headers
      );
    }
  } catch (e) {
    // swallow storage access errors
  }
  return config;
});

// Response interceptor to surface auth failures in console for easier debugging
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err && err.response) {
      const status = err.response.status;
      if (status === 401 || status === 403) {
        console.warn("API auth error:", status, err.response.data);
      }
    }
    return Promise.reject(err);
  }
);

// ===============================
// TENANT API
// ===============================
export const tenantAPI = {
  // Accept optional params: { page, limit, search }
  getTenants: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenants", { params })).data,

  getTenant: async (id) => (await api.get(`/api/tenants/${id}`)).data,

  createTenant: async (tenantData) =>
    (await api.post("/api/tenants", tenantData)).data,

  updateTenant: async (id, tenantData) =>
    (await api.put(`/api/tenants/${id}`, tenantData)).data,

  deleteTenant: async (id) => (await api.delete(`/api/tenants/${id}`)).data,
};

// ===============================
// NOTIFICATIONS (per-tenant JSONB)
// ===============================
export const notificationAPI = {
  // Returns merged preferences (server returns defaults overlaid with DB values)
  getTenantNotifications: async (tenantId) =>
    (await api.get(`/api/notification/${tenantId}/notifications`)).data,

  // Partially update preferences (only whitelisted keys accepted server-side)
  updateTenantNotifications: async (tenantId, payload) =>
    (await api.put(`/api/notification/${tenantId}/notifications`, payload))
      .data,
};

// ===============================
// AUTH API
// ===============================
export const authAPI = {
  login: async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    // persist token and user info so other calls/refreshes work automatically
    try {
      localStorage.setItem("auth_token", data.token);

      // Store tenant_id separately for easy access
      if (data.user?.tenant_id) {
        localStorage.setItem("tenant_id", data.user.tenant_id.toString());
      }

      const userPayload = {
        id: data.user?.id,
        name: data.user?.full_name ?? data.user?.name,
        email: data.user?.email,
        role: data.user?.role,
        tenant_id: data.user?.tenant_id,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${
          data.user?.full_name ?? data.user?.name
        }`,
      };
      localStorage.setItem("user_data", JSON.stringify(userPayload));
    } catch (e) {
      // ignore localStorage errors (e.g., quota or sandboxed env)
    }

    return {
      success: true,
      token: data.token,
      user: {
        id: data.user?.id,
        name: data.user?.full_name ?? data.user?.name,
        email: data.user?.email,
        role: data.user?.role,
        tenant_id: data.user?.tenant_id,
        tenantId: data.user?.tenant_id,
        tenantName: data.user?.tenant_name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${
          data.user?.full_name ?? data.user?.name
        }`,
      },
    };
  },

  logout: async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("tenant_id");
    return { success: true };
  },

  getCurrentUser: () => {
    const userData = localStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  },
};

// ===============================
// MODULE API
// ===============================
export const moduleAPI = {
  // Backend mount: /api/modules with routes ":id/modules"
  // Final paths: GET/PUT /api/modules/:id/modules
  getTenantModules: async (tenantId) =>
    (await api.get(`/api/modules/${tenantId}/modules`)).data,

  updateTenantModules: async (tenantId, modules) =>
    (await api.put(`/api/modules/${tenantId}/modules`, { modules })).data,
};

// ===============================
// REPORTS API
// ===============================
export const reportsAPI = {
  getDashboardStats: async () => (await api.get("/api/reports/dashboard")).data,

  getRevenueTrends: async (period = "monthly", year) => {
    const params = { period, ...(year && { year }) };
    return (await api.get("/api/reports/revenue", { params })).data;
  },

  getTenantGrowth: async (period = "monthly", limit = 12) =>
    (await api.get("/api/reports/tenant-growth", { params: { period, limit } }))
      .data,

  getCategoryDistribution: async () =>
    (await api.get("/api/reports/categories")).data,
  getPlanDistribution: async () => (await api.get("/api/reports/plans")).data,

  exportReport: async (reportType, format, filters) => {
    const params = { type: format, report: reportType, ...filters };
    // axios with responseType 'blob' returns response.data as a Blob
    const response = await api.get("/api/reports/export", {
      params,
      responseType: "blob",
    });

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // map logical format to a sensible extension
    const ext =
      format === "excel" || format === "xlsx" ? "xlsx" : String(format);
    a.download = `${reportType}_${
      new Date().toISOString().split("T")[0]
    }.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // cleanup
    window.URL.revokeObjectURL(url);
  },
};

// ===============================
// TENANT REPORT API (backend: /api/tenantreport)
// ===============================
export const tenantReportAPI = {
  getSummary: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenantreport/summary", { params })).data,
  getSalesChart: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenantreport/sales-chart", { params })).data,
  getPurchaseChart: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenantreport/purchase-chart", { params })).data,
  getStockReport: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenantreport/stock-report", { params })).data,
  getProfitReport: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenantreport/profit-report", { params })).data,
  getPaymentSummary: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenantreport/payment-summary", { params })).data,
  getAnalytics: async (params: Record<string, any> = {}) =>
    (await api.get("/api/tenantreport/analytics", { params })).data,
};

// tenantAPI report

function authHeader() {
  if (typeof window === "undefined") return {};
  const stored =
    localStorage.getItem("auth_token") || localStorage.getItem("token");
  return stored ? { Authorization: `Bearer ${stored}` } : {};
}

export async function getInvoices(tenantId?: string) {
  const q = tenantId ? `?tenant_id=${tenantId}` : "";
  const res = await fetch(`${API_BASE}/api/invoices${q}`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  return res.json();
}

export async function getPurchases(tenantId?: string) {
  const q = tenantId ? `?tenant_id=${tenantId}` : "";
  const res = await fetch(`${API_BASE}/api/purchases${q}`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  return res.json();
}

export async function getInventory() {
  const res = await fetch(`${API_BASE}/api/inventory`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  return res.json();
}

export async function getPayments(tenantId?: string) {
  // For tenant-specific payments, use GET /api/subscriber/:id/payments
  if (tenantId) {
    const res = await fetch(`${API_BASE}/api/subscriber/${tenantId}/payments`, {
      headers: { "Content-Type": "application/json", ...authHeader() },
    });
    return res.json();
  }
  // fallback to admin/all payments
  const res = await fetch(`${API_BASE}/api/subscriber/payments`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  return res.json();
}

export async function getTimeseries(
  startDate: string,
  endDate: string,
  granularity = "daily",
  tz = "UTC",
  exportFormat?: string
) {
  const params: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
    granularity,
    tz,
  };

  // Add tenant_id from localStorage if available
  const tenantId = localStorage.getItem("tenant_id");
  if (tenantId) {
    params.tenant_id = tenantId;
  }

  if (exportFormat) params.export = exportFormat;

  const q = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/api/reports/tenant?${q.toString()}`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`getTimeseries error (${res.status}):`, errorText);

    // If the unified reports endpoint forbids access for tenant-level tokens,
    // fall back to tenant-scoped endpoints (mounted at /api/tenantreport)
    // to assemble a compatible timeseries response. This avoids noisy 403s
    // in the console and lets the UI continue using tenant-scoped data.
    if (res.status === 403) {
      try {
        // Compute range params matching backend controller expectations
        const today = new Date().toISOString().split("T")[0];
        const s7 = new Date();
        s7.setDate(new Date().getDate() - 6);
        const start7 = s7.toISOString().split("T")[0];
        const s30 = new Date();
        s30.setDate(new Date().getDate() - 29);
        const start30 = s30.toISOString().split("T")[0];

        let rangeParams: Record<string, string> = {
          from: startDate,
          to: endDate,
        };
        if (startDate === start7 && endDate === today) {
          rangeParams = { range: "7d" };
        } else if (startDate === start30 && endDate === today) {
          rangeParams = { range: "30d" };
        }

        const [sales, purchases, stock, paymentSummary, summary] =
          await Promise.all([
            tenantReportAPI.getSalesChart(rangeParams).catch((e) => {
              console.warn("getSalesChart fallback failed:", e);
              return [];
            }),
            tenantReportAPI.getPurchaseChart(rangeParams).catch((e) => {
              console.warn("getPurchaseChart fallback failed:", e);
              return [];
            }),
            tenantReportAPI.getStockReport(rangeParams).catch((e) => {
              console.warn("getStockReport fallback failed:", e);
              return [];
            }),
            tenantReportAPI.getPaymentSummary(rangeParams).catch((e) => {
              console.warn("getPaymentSummary fallback failed:", e);
              return {};
            }),
            tenantReportAPI.getSummary(rangeParams).catch((e) => {
              console.warn("getSummary fallback failed:", e);
              return {};
            }),
          ]);

        // Build timeseries by merging sales and purchases by date
        const byDate: Record<string, any> = {};
        const salesArr = Array.isArray(sales) ? sales : [];
        const purchasesArr = Array.isArray(purchases) ? purchases : [];

        salesArr.forEach((s: any) => {
          const d = s.date ?? s.sale_date ?? s.day ?? "";
          if (!d) return;
          byDate[d] = byDate[d] || { date: d, sales: 0, purchase: 0 };
          // Accumulate sales when multiple rows share the same date
          byDate[d].sales += Number(
            s.sales ?? s.total ?? s.value ?? s.total_sales ?? s.totalSales ?? 0
          );
        });

        purchasesArr.forEach((p: any) => {
          const d =
            p.date ?? p.sale_date ?? p.day ?? (p.created_at || "").slice(0, 10);
          if (!d) return;
          byDate[d] = byDate[d] || { date: d, sales: 0, purchase: 0 };
          // Accumulate purchase totals when multiple rows share the same date
          byDate[d].purchase += Number(
            p.purchases ?? p.purchase ?? p.total ?? p.value ?? 0
          );
        });

        const timeseries = Object.values(byDate).sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Normalize stock items so later logic (which expects 'quantity' and 'cost_price') works
        const stockArr = Array.isArray(stock) ? stock : [];
        const stock_page_normalized = stockArr.map((it: any, idx: number) => {
          const quantity = Number(it.available ?? it.quantity ?? it.qty ?? 0);
          const value = Number(it.value ?? it.stock_value ?? 0);
          const cost_price =
            quantity > 0
              ? Number((value / quantity).toFixed(2))
              : Number(it.cost_price ?? 0);
          return {
            id: it.id ?? it.product_id ?? it.product ?? `s-${idx}`,
            product_id: it.product_id ?? undefined,
            product_name:
              it.product ?? it.product_name ?? it.products?.name ?? "",
            quantity,
            cost_price,
            reorder_level: it.reorder_level ?? it.reorder ?? 0,
            ...it,
          };
        });

        // Normalize payment summary into shape: { total_amount, modes: [{mode, total, count}] }
        let payment_summary_normalized: any = {};
        if (Array.isArray(paymentSummary)) {
          const modes = paymentSummary.map((m: any) => ({
            mode: m.mode || m.name || m.method || "Unknown",
            total: Number(m.amount ?? m.value ?? m.total ?? 0),
            count: m.count ?? 0,
          }));
          const total_amount = modes.reduce(
            (s: number, mm: any) => s + Number(mm.total || 0),
            0
          );
          payment_summary_normalized = { total_amount, modes };
        } else if (paymentSummary && typeof paymentSummary === "object") {
          // If server already returned an object with modes, normalize numbers
          const modes = (paymentSummary.modes || []).map((m: any) => ({
            mode: m.mode || m.name || m.method || "Unknown",
            total: Number(m.amount ?? m.total ?? m.value ?? 0),
            count: m.count ?? 0,
          }));
          const total_amount =
            paymentSummary.total_amount ??
            modes.reduce((s: number, mm: any) => s + Number(mm.total || 0), 0);
          payment_summary_normalized = { total_amount, modes };
        } else {
          payment_summary_normalized = { total_amount: 0, modes: [] };
        }

        return {
          timeseries,
          stock_page: stock_page_normalized,
          payment_summary: payment_summary_normalized,
          summary: summary ?? {},
        };
      } catch (fallbackErr) {
        console.warn(
          "getTimeseries fallback to tenantReport endpoints failed:",
          fallbackErr
        );
        throw new Error(
          `Failed to fetch report: ${res.status} ${res.statusText}`
        );
      }
    }

    throw new Error(`Failed to fetch report: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json;
}

// Invoice Payments API (from reports endpoints)
export async function getInvoicePayments(
  startDate?: string,
  endDate?: string,
  page = 1,
  limit = 100
) {
  const params: Record<string, string> = {
    start_date:
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    end_date: endDate || new Date().toISOString().split("T")[0],
    page: page.toString(),
    limit: limit.toString(),
  };

  const tenantId = localStorage.getItem("tenant_id");
  if (tenantId) {
    params.tenant_id = tenantId;
  }

  const q = new URLSearchParams(params);
  const res = await fetch(
    `${API_BASE}/api/reports/tenant/payments?${q.toString()}`,
    {
      headers: { "Content-Type": "application/json", ...authHeader() },
    }
  );

  if (!res.ok) {
    console.error(`getInvoicePayments error (${res.status})`);
    return [];
  }

  const json = await res.json();
  return json.data || [];
}

export async function getInvoicePaymentsSummary(
  startDate?: string,
  endDate?: string
) {
  const params: Record<string, string> = {
    start_date:
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    end_date: endDate || new Date().toISOString().split("T")[0],
  };

  const tenantId = localStorage.getItem("tenant_id");
  if (tenantId) {
    params.tenant_id = tenantId;
  }

  const q = new URLSearchParams(params);
  const res = await fetch(
    `${API_BASE}/api/reports/tenant/payments/summary?${q.toString()}`,
    {
      headers: { "Content-Type": "application/json", ...authHeader() },
    }
  );

  if (!res.ok) {
    console.error(`getInvoicePaymentsSummary error (${res.status})`);
    return { modes: [], total_amount: 0 };
  }

  const json = await res.json();
  return json;
}

// ...existing code...

// Removed duplicate simple pdfReportService declaration. Comprehensive version defined later below.
// ===============================
// PDF REPORTS API
// ===============================
export const pdfReportService = {
  /**
   * Generate Sales Return PDF Report
   * @param {Object} params - Filter parameters
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   * @param {number} params.tenantId - Optional tenant ID filter
   */
  generateSalesReturnPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/reports/pdf/sales-returns", {
        params,
        responseType: "blob",
      });

      // Create blob link to download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales_returns_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  },

  /**
   * Generate Purchase Return PDF Report
   */
  generatePurchaseReturnPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/reports/pdf/purchase-returns", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase_returns_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  },

  /**
   * Generate Inventory Stock PDF Report
   */
  generateInventoryPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/reports/pdf/inventory", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  },

  /**
   * Generate Sales PDF Report
   */
  generateSalesPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/reports/pdf/sales", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  },

  /**
   * Generate Purchase PDF Report
   */
  generatePurchasesPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/reports/pdf/purchases", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchases_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  },
  /**
   * Tenant PDF endpoints (created by tenantReportPdf router)
   */
  generateSummaryPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/tenantReportPdf/summary/pdf", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `summary_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("Summary PDF generation error:", error);
      throw error;
    }
  },

  generateStockPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/tenantReportPdf/stock/pdf", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stock_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("Stock PDF generation error:", error);
      throw error;
    }
  },

  generateProfitPDF: async (params = {}) => {
    try {
      const response = await api.get("/api/tenantReportPdf/profit/pdf", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `profit_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("Profit PDF generation error:", error);
      throw error;
    }
  },
};
// ===============================
// ACTIVITY API (Dummy)
// ===============================
export const activityAPI = {
  getRecentActivity: async (limit = 10) =>
    [
      {
        id: 1,
        user: "Maria Bella",
        action: "upgraded plan",
        target: "Professional",
        time: "5m ago",
        type: "upgrade",
      },
      {
        id: 2,
        user: "John Davis",
        action: "created new branch",
        target: "Downtown",
        time: "12m ago",
        type: "create",
      },
      {
        id: 3,
        user: "Sarah Thompson",
        action: "enabled module",
        target: "Appointments",
        time: "23m ago",
        type: "update",
      },
    ].slice(0, limit),
};

// ===============================
// USER API (Dummy)
// ===============================
export const userAPI = {
  getUsers: async () => [
    {
      id: 1,
      name: "Super Admin",
      email: "admin@tenantsphere.com",
      role: "Super Admin",
      status: "Active",
      lastLogin: "2024-10-23",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@tenantsphere.com",
      role: "Admin",
      status: "Active",
      lastLogin: "2024-10-22",
    },
  ],
  // Get a single user by id
  getUser: async (id) => (await api.get(`/users/${id}`)).data,
  // Update a user (by id) - backend should accept partial user payload
  updateUser: async (id, payload) =>
    (await api.put(`/api/users/${id}`, payload)).data,
  // Change password: backend should verify current password then update to new one
  changePassword: async (id, payload) =>
    (await api.post(`/api/settings/${id}/change-password`, payload)).data,
};

// ===============================
// PAYMENTS API
// ===============================
export const paymentsAPI = {
  getPaymentsByTenant: async (tenantId) =>
    (await api.get(`/api/subscriber/${tenantId}/payments`)).data,

  createPayment: async (payload) =>
    (await api.post(`/api/subscriber/payments`, payload)).data,

  getAllPayments: async () => (await api.get(`/api/subscriber/payments`)).data,
};

// ===============================
// AMC API
// ===============================
export const amcAPI = {
  getAllAMCs: async () => (await api.get("/api/amc")).data,
  getAMCById: async (id) => (await api.get(`/api/amc/${id}`)).data,
  createAMC: async (amcData) => (await api.post("/api/amc", amcData)).data,
  updateAMC: async (id, amcData) =>
    (await api.put(`/api/amc/${id}`, amcData)).data,
  deleteAMC: async (id) => (await api.delete(`/api/amc/${id}`)).data,
  // Send reminder email for a tenant's AMC
  // payload: { tenantId, email, subject, body }
  sendReminder: async (payload) =>
    (await api.post(`/api/amc/send-reminder`, payload)).data,
};

// ===============================
// SUBSCRIPTION AMOUNTS API
// ===============================
// This helper attempts to read the `subscription_amount_plan` table which
// stores AMC values per plan. It falls back to a plural route if needed.
export const subscriptionAmountsAPI = {
  // GET /subscription_amount_plan  OR  /subscription_amount_plans
  getAll: async () => {
    try {
      return (await api.get("/api/subscription_amount_plans")).data;
    } catch (err) {
      // try plural form before giving up
      return (await api.get("/api/subscription_amount_plans")).data;
    }
  },
};

// ===============================
// PLANS API
// ===============================
// ===============================
// PLANS API
// ===============================
export const planAPI = {
  /**
   * GET /plans or /plans?name=...
   * - if `name` provided will call /plans?name=<encoded>
   * - returns response.data (same pattern as other APIs)
   *
   * Example responses your controllers send:
   *  { plans: [...] }  OR  an array [...]
   */
  getPlans: async (name) => {
    const url = name
      ? `/api/plans?name=${encodeURIComponent(name)}`
      : "/api/plans";
    const res = await api.get(url);
    return res.data;
  },

  /**
   * POST /plans
   * payload example:
   * {
   *   name: "Basic",
   *   amount: 1000,
   *   billing: true,
   *   reports: false,
   *   inventory: false,
   *   user: 1,
   *   amc_amount: 100
   * }
   */
  createPlan: async (payload) => {
    const res = await api.post("/api/plans", payload);
    return res.data;
  },

  /**
   * PUT /plans/:name
   * Upsert behaviour in your backend: updates if exists else inserts.
   * name should be the plan identifier (string).
   */
  upsertPlanByName: async (name, payload) => {
    const res = await api.put(
      `/api/plans/${encodeURIComponent(name)}`,
      payload
    );
    return res.data;
  },

  /**
   * DELETE /plans/:name
   * Convenience: remove a plan by name if your backend supports deletion.
   */
  deletePlanByName: async (name) => {
    const res = await api.delete(`/api/plans/${encodeURIComponent(name)}`);
    return res.data;
  },
};
export const plansAPI = planAPI;
// ===============================
// PRODUCTS API
// ===============================
export const productService = {
  // getAll supports optional query params: { search, page, limit }
  // Normalizes product/category shapes so UI can rely on `category` (string) and `category_id`.
  getAll: async (params: Record<string, any> = {}) => {
    const res = await api.get("/api/products", { params });
    const payload = res.data;

    const raw = payload?.data ?? (Array.isArray(payload) ? payload : []);

    const normalize = (p: any) => {
      const categoryName =
        p.category ??
        p.category_name ??
        p.categories?.name ??
        (Array.isArray(p.categories) && p.categories[0]?.name) ??
        p.product_category?.name ??
        p.products?.category ??
        p.products?.categories?.name ??
        undefined;

      const categoryId =
        p.category_id ??
        p.categoryId ??
        p.categories?.id ??
        (Array.isArray(p.categories) && p.categories[0]?.id) ??
        p.product_category_id ??
        undefined;

      return {
        ...p,
        name: p.name ?? p.product_name ?? p.products?.name ?? "",
        category:
          typeof categoryName === "string"
            ? categoryName
            : categoryName?.toString() ?? "",
        category_id: categoryId ?? undefined,
        selling_price: Number(
          p.selling_price ?? p.sellingPrice ?? p.price ?? 0
        ),
        cost_price: Number(p.cost_price ?? p.costPrice ?? p.unit_cost ?? 0),
      } as any;
    };

    const normalized = raw.map(normalize);

    // Preserve pagination / meta when backend returns an object with `data` and metadata
    if (payload && payload.data) {
      return { ...payload, data: normalized };
    }

    return normalized;
  },

  getById: async (id) => (await api.get(`/api/products/${id}`)).data,

  // create/update accept either JSON or FormData (for images)
  create: async (data) => {
    if (typeof FormData !== "undefined" && data instanceof FormData) {
      const res = await api.post("/api/products", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    }
    const res = await api.post("/api/products", data);
    return res.data;
  },

  update: async (id, data) => {
    if (typeof FormData !== "undefined" && data instanceof FormData) {
      const res = await api.put(`/api/products/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    }
    const res = await api.put(`/api/products/${id}`, data);
    return res.data;
  },

  delete: async (id) => (await api.delete(`/api/products/${id}`)).data,
};

export const inventoryService = {
  // ✅ Get all inventory items (joined with product details)
  // Accepts optional params object forwarded to axios (e.g., { search, page, limit })
  getAll: (params: Record<string, any> = {}) =>
    api.get("/api/inventory", { params }).then((r) => r.data),

  // ✅ Get single inventory item by ID
  getById: async (id) => (await api.get(`/api/inventory/${id}`)).data,

  // ✅ Create new inventory record
  create: async (data) => (await api.post("/api/inventory", data)).data,

  // ✅ Update existing inventory record
  update: async (id, data) =>
    (await api.put(`/api/inventory/${id}`, data)).data,

  // ✅ Delete inventory record
  delete: async (id) => (await api.delete(`/api/inventory/${id}`)).data,
};

// ===============================
// COUPON / REFERRAL / WALLET API
// ===============================
export const couponAPI = {
  validate: async (code, subtotal) => {
    const params = { code, subtotal };
    return (await api.get("/api/coupons/validate", { params })).data;
  },
};

export const referralAPI = {
  validate: async (code) => {
    const params = { code };
    return (await api.get("/api/referrals/validate", { params })).data;
  },
};

export const walletAPI = {
  getBalance: async (customerId) =>
    (await api.get(`/api/wallets/${customerId}`)).data,
};

// In your services/api.js
export const purchaseService = {
  // Accept optional pagination params: { page, limit, tenant_id }
  getAll: (params: Record<string, any> = {}) =>
    api.get("/api/purchases", { params }),
  getById: (id) => api.get(`api/purchases/${id}`),
  create: (data) => api.post("api/purchases", data),
  update: (id, data) => api.put(`api/purchases/${id}`, data),
  delete: (id) => api.delete(`api/purchases/${id}`),
};

// services/api.js - Add invoice service
export const invoiceService = {
  // accept optional params object forwarded to axios (e.g., { search, page, limit })
  getAll: (params: Record<string, any> = {}) =>
    api.get("/api/invoices", { params }),
  getById: (id) => api.get(`/api/invoices/${id}`),
  create: (data) => api.post("/api/invoices", data),
  delete: (id) => api.delete(`/api/invoices/${id}`),
  getStats: () => api.get("/api/invoices/stats"),
};

// services/api.js - Add sales return service
export const salesReturnService = {
  // Accept optional params: { page, limit, invoice_id }
  getAll: (params: Record<string, any> = {}) =>
    api.get("/api/sales_returns", { params }),
  getById: (id) => api.get(`/api/sales_returns/${id}`),
  create: (data) => api.post("/api/sales_returns", data),
  update: (id, data) => api.put(`/api/sales_returns/${id}`, data),
  delete: (id) => api.delete(`/api/sales_returns/${id}`),
};

// ===============================
// PURCHASE RETURNS API
// ===============================
export const purchaseReturnService = {
  getAll: (params = {}) => api.get("/api/purchase_returns", { params }),
  getById: (id) => api.get(`/api/purchase_returns/${id}`),
  create: (data) => api.post("/api/purchase_returns", data),
  update: (id, data) => api.put(`/api/purchase_returns/${id}`, data),
  delete: (id) => api.delete(`/api/purchase_returns/${id}`),
};

// ===============================
// STAFF API
// ===============================
export const staffService = {
  // Get all staff users belonging to the current tenant
  getAll: (params: Record<string, any> = {}) =>
    api.get("/api/staff", { params }),

  // Get single staff detail
  getById: async (id) => (await api.get(`/api/staff/${id}`)).data,

  // Create staff user
  create: async (data) => (await api.post("/api/staff", data)).data,

  // Update staff user
  update: async (id, data) => (await api.put(`/api/staff/${id}`, data)).data,

  // Delete staff user
  delete: async (id) => (await api.delete(`/api/staff/${id}`)).data,
};

// ===============================
// SUPPLIER API
// ===============================
export const supplierService = {
  // Get all suppliers
  getAll: async (search = "") => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    return (await api.get("/api/suppliers", { params })).data;
  },

  // Normalized list: always returns an array of supplier objects
  list: async (search = "") => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    const res = await api.get("/api/suppliers", { params });
    const payload = res.data;
    // backend may return { data: [...] } or an array directly
    return payload?.data ?? payload ?? [];
  },

  // Get single supplier detail
  getById: async (id) => (await api.get(`/api/suppliers/${id}`)).data,

  // Create supplier
  create: async (data) => (await api.post("/api/suppliers", data)).data,

  // Update supplier
  update: async (id, data) =>
    (await api.put(`/api/suppliers/${id}`, data)).data,

  // Delete supplier
  delete: async (id) => (await api.delete(`/api/suppliers/${id}`)).data,
};

// ===============================
// EMPLOYEE API
// ===============================
// ===============================
// CUSTOMER API
// ===============================
export const customerService = {
  // list customers, supports pagination and search
  list: async ({ page = 1, limit = 50, search = "" } = {}) => {
    if (search && String(search).trim().length > 0) {
      const res = await api.get(
        `/api/customers/search/${encodeURIComponent(String(search))}`
      );
      const payload = res.data;
      const data = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : payload?.data ?? [];
      return { data, total: payload?.total ?? data.length };
    }

    const res = await api.get("/api/customers", { params: { page, limit } });
    const payload = res.data;
    const data = payload?.data ?? (Array.isArray(payload) ? payload : []);
    return {
      data,
      total: payload?.total ?? payload?.totalRecords ?? data.length,
    };
  },

  getById: async (id: string | number) => {
    const res = await api.get(`/api/customers/${id}`);
    return res.data;
  },

  create: async (payload: any) => {
    const res = await api.post(`/api/customers`, payload);
    return res.data;
  },

  update: async (id: string | number, payload: any) => {
    const res = await api.put(`/api/customers/${id}`, payload);
    return res.data;
  },

  delete: async (id: string | number) => {
    const res = await api.delete(`/api/customers/${id}`);
    return res.data;
  },
};

export const employeeService = {
  // Get all employees
  getAll: async (params: Record<string, any> = {}) =>
    (await api.get("/api/employees", { params })).data,

  // Get single employee details (with salary + attendance)
  getOne: async (id) => (await api.get(`/api/employees/${id}`)).data,

  // Create new employee
  create: async (data) => (await api.post("/api/employees", data)).data,

  // Update employee
  update: async (id, data) =>
    (await api.put(`/api/employees/${id}`, data)).data,

  // Delete employee
  delete: async (id) => (await api.delete(`/api/employees/${id}`)).data,
};

// ===============================
// EMPLOYEE SALARY API
// ===============================
export const salaryService = {
  // Pay salary for an employee
  pay: async (data) => (await api.post("/api/employees/salary/pay", data)).data,

  // Get salary history for all employees (scoped by tenant via verifyToken)
  getAll: async () => (await api.get("/api/employees/salary")).data,

  // Get salary history for a single employee
  getByEmployee: async (employeeId) =>
    (await api.get(`/api/employees/salary/${employeeId}`)).data,
};

// ===============================
// EMPLOYEE DISCOUNT API
// ===============================
export const employeeDiscountService = {
  // Set employee discount rule
  setRule: async (data) =>
    (await api.post("/api/employees/discount/rule", data)).data,

  // Get active discount rule
  getRule: async () => (await api.get("/api/employees/discount/rule")).data,

  // Apply employee discount during billing
  apply: async (data) =>
    (await api.post("/api/employees/discount/apply", data)).data,

  // Get employee discount usage history
  getUsage: async (employee_id) =>
    (await api.get(`/api/employees/discount/usage/${employee_id}`)).data,
};
