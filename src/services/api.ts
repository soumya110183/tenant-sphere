import axios from "axios";
import tenantsData from "@/data/tenants.json";
import reportsData from "@/data/reports.json";

// Base URLs
//const API_URL = "http://localhost:5000";
const API_URL = "https://billingbackend-1vei.onrender.com";
// Create an Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor to attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===============================
// TENANT API
// ===============================
export const tenantAPI = {
  getTenants: async () => (await api.get("/tenants")).data,

  getTenant: async (id) => (await api.get(`/tenants/${id}`)).data,

  createTenant: async (tenantData) =>
    (await api.post("/tenants", tenantData)).data,

  updateTenant: async (id, tenantData) =>
    (await api.put(`/tenants/${id}`, tenantData)).data,

  deleteTenant: async (id) => (await api.delete(`/tenants/${id}`)).data,
};

// ===============================
// AUTH API
// ===============================
export const authAPI = {
  login: async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    return {
      success: true,
      token: data.token,
      user: {
        id: data.user.id,
        name: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.full_name}`,
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
    (await api.get(`/tenants/${tenantId}/modules`)).data,

  updateTenantModules: async (tenantId, modules) =>
    (await api.put(`/tenants/${tenantId}`, { modules })).data,
};

// ===============================
// REPORTS API
// ===============================
export const reportsAPI = {
  getDashboardStats: async () => (await api.get("/reports/dashboard")).data,

  getRevenueTrends: async (period = "monthly", year) => {
    const params = { period, ...(year && { year }) };
    return (await api.get("/reports/revenue", { params })).data;
  },

  getTenantGrowth: async (period = "monthly", limit = 12) =>
    (await api.get("/reports/tenant-growth", { params: { period, limit } }))
      .data,

  getCategoryDistribution: async () =>
    (await api.get("/reports/categories")).data,

  getPlanDistribution: async () => (await api.get("/reports/plans")).data,

  exportReport: async (reportType, format, filters) => {
    const params = { type: format, report: reportType, ...filters };
    const { data } = await api.get("/reports/export", {
      params,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};

// ===============================
// ACTIVITY API (Dummy)
// ===============================
export const activityAPI = {
  getRecentActivity: async (limit = 10) => [
    { id: 1, user: "Maria Bella", action: "upgraded plan", target: "Professional", time: "5m ago", type: "upgrade" },
    { id: 2, user: "John Davis", action: "created new branch", target: "Downtown", time: "12m ago", type: "create" },
    { id: 3, user: "Sarah Thompson", action: "enabled module", target: "Appointments", time: "23m ago", type: "update" },
  ].slice(0, limit),
};

// ===============================
// USER API (Dummy)
// ===============================
export const userAPI = {
  getUsers: async () => [
    { id: 1, name: "Super Admin", email: "admin@tenantsphere.com", role: "Super Admin", status: "Active", lastLogin: "2024-10-23" },
    { id: 2, name: "Jane Smith", email: "jane@tenantsphere.com", role: "Admin", status: "Active", lastLogin: "2024-10-22" },
  ],
};

// ===============================
// PAYMENTS API
// ===============================
export const paymentsAPI = {
  getPaymentsByTenant: async (tenantId) =>
    (await api.get(`/subscriber/${tenantId}/payments`)).data,

  createPayment: async (payload) =>
    (await api.post(`/subscriber/payments`, payload)).data,

  getAllPayments: async () => (await api.get(`/subscriber/payments`)).data,
};

// ===============================
// AMC API
// ===============================
export const amcAPI = {
  getAllAMCs: async () => (await api.get("/amc")).data,
  getAMCById: async (id) => (await api.get(`/amc/${id}`)).data,
  createAMC: async (amcData) => (await api.post("/amc", amcData)).data,
  updateAMC: async (id, amcData) => (await api.put(`/amc/${id}`, amcData)).data,
  deleteAMC: async (id) => (await api.delete(`/amc/${id}`)).data,
};

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
  update: async (id, data) => (await api.put(`/api/inventory/${id}`, data)).data,

  // ✅ Delete inventory record
  delete: async (id) => (await api.delete(`/api/inventory/${id}`)).data,
};