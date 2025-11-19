import axios from "axios";
import tenantsData from "@/data/tenants.json";
import reportsData from "@/data/reports.json";

// Base URLs
 const API_URL = "https://billingbackend-1vei.onrender.com";
// const API_URL = "http://localhost:5000";

// Create an Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor to attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    // ensure headers object exists (safer for some axios/TS setups)
    // header typing can vary, cast to any for assignment here
    if (!config.headers) config.headers = {} as any;
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===============================
// TENANT API
// ===============================
export const tenantAPI = {
  getTenants: async () => (await api.get("/api/tenants")).data,

  getTenant: async (id) => (await api.get(`/api/tenants/${id}`)).data,

  createTenant: async (tenantData) =>
    (await api.post("/api/tenants", tenantData)).data,

  updateTenant: async (id, tenantData) =>
    (await api.put(`/api/tenants/${id}`, tenantData)).data,

  deleteTenant: async (id) => (await api.delete(`/tenants/${id}`)).data,
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
    (await api.put(`/api/notification/${tenantId}/notifications`, payload)).data,
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
      const userPayload = {
        id: data.user?.id,
        name: data.user?.full_name ?? data.user?.name,
        email: data.user?.email,
        role: data.user?.role,
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
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${
          data.user?.full_name ?? data.user?.name
        }`,
      },
    };
  },

  logout: async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
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
  getTenantModules: async (tenantId) =>
    (await api.get(`/api/tenants/${tenantId}/modules`)).data,

  updateTenantModules: async (tenantId, modules) =>
    (await api.put(`/api/tenants/${tenantId}`, { modules })).data,
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
  updateAMC: async (id, amcData) => (await api.put(`/api/amc/${id}`, amcData)).data,
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
    const url = name ? `/api/plans?name=${encodeURIComponent(name)}` : "/api/plans";
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
    const res = await api.put(`/api/plans/${encodeURIComponent(name)}`, payload);
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
  getAll: async () => (await api.get("/api/products")).data,
  getById: async (id) => (await api.get(`/api/products/${id}`)).data,
  create: async (data) => (await api.post("/api/products", data)).data,
  update: async (id, data) => (await api.put(`/api/products/${id}`, data)).data,
  delete: async (id) => (await api.delete(`/api/products/${id}`)).data,
};

export const inventoryService = {
  // ✅ Get all inventory items (joined with product details)
  getAll: async () => (await api.get("/api/inventory")).data,

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

// In your services/api.js
export const purchaseService = {
  getAll: () => api.get('api/purchases'),
  getById: (id) => api.get(`api/purchases/${id}`),
  create: (data) => api.post('api/purchases', data),
  update: (id, data) => api.put(`api/purchases/${id}`, data),
  delete: (id) => api.delete(`api/purchases/${id}`),
};

// services/api.js - Add invoice service
export const invoiceService = {
  getAll: () => api.get('api/invoices'),
  getById: (id) => api.get(`api/invoices/${id}`),
  create: (data) => api.post('api/invoices', data),
  delete: (id) => api.delete(`api/invoices/${id}`),
  getStats: () => api.get('api/invoices/stats'),
};

// ===============================
// STAFF API
// ===============================
export const staffService = {
  // Get all staff users belonging to the current tenant
  getAll: async (search = "") => {
    const params = {};
    if (search) params.search = search;
    return (await api.get("/api/staff", { params })).data;
  },

  // Get single staff detail
  getById: async (id) => (await api.get(`/api/staff/${id}`)).data,

  // Create staff user
  create: async (data) => (await api.post("/api/staff", data)).data,

  // Update staff user
  update: async (id, data) => (await api.put(`/api/staff/${id}`, data)).data,

  // Delete staff user
  delete: async (id) => (await api.delete(`/api/staff/${id}`)).data,
};
