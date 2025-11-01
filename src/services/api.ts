/**
 * API Service Layer
 *
 * This file simulates API calls with dummy data.
 * Replace these functions with actual HTTP requests to your backend.
 *
 * Example with fetch:
 * const response = await fetch(`${API_BASE_URL}/tenants`, {
 *   method: 'GET',
 *   headers: {
 *     'Authorization': `Bearer ${token}`,
 *     'Content-Type': 'application/json'
 *   }
 * });
 * return response.json();
 */

import tenantsData from "@/data/tenants.json";
import reportsData from "@/data/reports.json";

// API Base URL - replace with your actual backend URL
const API_BASE_URL = "https://api.tenantsphere.com";
const API_BASE = "https://billingbackend-1vei.onrender.com";
const API_URL = "https://billingbackend-1vei.onrender.com"; // Change to your backend URL

// Helper function to get token
const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  console.log("Using auth token:", token);
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

export const tenantAPI = {
  // Get all tenants
  getTenants: async () => {
    const res = await fetch(`${API_BASE}/tenants`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch tenants");
    return await res.json();
  },

  // Get single tenant by ID
  getTenant: async (id: number) => {
    const res = await fetch(`${API_BASE}/tenants/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch tenant");
    return await res.json();
  },

  // Create a new tenant
  createTenant: async (tenantData: any) => {
    const res = await fetch(`${API_BASE}/tenants`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(tenantData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create tenant");
    return data;
  },

  // Update existing tenant
  updateTenant: async (id: number, tenantData: any) => {
    const res = await fetch(`${API_BASE}/tenants/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(tenantData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update tenant");
    return data;
  },

  // Delete tenant by ID
  deleteTenant: async (id: number) => {
    const res = await fetch(`${API_BASE}/tenants/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete tenant");
    return data;
  },
};

// ============================================
// AUTH APIs
// ============================================

export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await fetch(
      "https://billingbackend-1vei.onrender.com/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

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

  getCurrentUser: async () => {
    const userData = localStorage.getItem("user_data");
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  },
};

// ============================================
// MODULE APIs
// ============================================

export const moduleAPI = {
  getTenantModules: async (tenantId: string) => {
    try {
      const response = await fetch(`${API_URL}/tenants/${tenantId}/modules`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch modules");
      return await response.json();
    } catch (error) {
      console.error("Get modules error:", error);
      throw error;
    }
  },

  updateTenantModules: async (
    tenantId: number,
    modules: Record<string, boolean>
  ) => {
    const res = await fetch(`${API_BASE}/tenants/${tenantId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ modules }),
    });

    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Failed to update tenant modules");
    return data;
  },
};

// ============================================
// REPORTS APIs
// ============================================

export const reportsAPI = {
  getDashboardStats: async () => {
    try {
      const response = await fetch(`${API_URL}/reports/dashboard`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      const data = await response.json();
      console.log("Dashboard Stats:", data);
      return data;
    } catch (error) {
      console.error("Dashboard stats error:", error);
      throw error;
    }
  },

  getRevenueTrends: async (
    period: "daily" | "monthly" | "yearly" = "monthly",
    year?: number
  ) => {
    try {
      const params = new URLSearchParams();
      if (period) params.append("period", period);
      if (year) params.append("year", year.toString());

      const response = await fetch(
        `${API_URL}/reports/revenue?${params.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch revenue trends");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Revenue trends error:", error);
      throw error;
    }
  },

  getTenantGrowth: async (
    period: "monthly" | "yearly" = "monthly",
    limit: number = 12
  ) => {
    try {
      const params = new URLSearchParams();
      params.append("period", period);
      params.append("limit", limit.toString());

      const response = await fetch(
        `${API_URL}/reports/tenant-growth?${params.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tenant growth");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Tenant growth error:", error);
      throw error;
    }
  },

  getCategoryDistribution: async () => {
    try {
      const response = await fetch(`${API_URL}/reports/categories`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch category distribution");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Category distribution error:", error);
      throw error;
    }
  },

  getPlanDistribution: async () => {
    try {
      const response = await fetch(`${API_URL}/reports/plans`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch plan distribution");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Plan distribution error:", error);
      throw error;
    }
  },

  exportReport: async (
    reportType: string,
    format: "csv" | "pdf" | "excel",
    filters?: { from?: string; to?: string; category?: string }
  ) => {
    try {
      const params = new URLSearchParams();
      params.append("type", format);
      params.append("report", reportType);

      if (filters?.from) params.append("from", filters.from);
      if (filters?.to) params.append("to", filters.to);
      if (filters?.category) params.append("category", filters.category);

      const response = await fetch(
        `${API_URL}/reports/export?${params.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}_${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true, message: `Report exported as ${format}` };
    } catch (error) {
      console.error("Export report error:", error);
      throw error;
    }
  },
};

// ============================================
// ACTIVITY APIs
// ============================================

export const activityAPI = {
  getRecentActivity: async (limit: number = 10) => {
    return [
      { id: 1, user: "Maria Bella", action: "upgraded plan", target: "Professional", time: "5 minutes ago", type: "upgrade" },
      { id: 2, user: "John Davis", action: "created new branch", target: "Downtown Location", time: "12 minutes ago", type: "create" },
      { id: 3, user: "Sarah Thompson", action: "enabled module", target: "Appointments", time: "23 minutes ago", type: "update" },
      { id: 4, user: "Michael Chen", action: "added users", target: "3 new users", time: "1 hour ago", type: "create" },
      { id: 5, user: "Li Wei", action: "submitted support ticket", target: "Payment Issue", time: "2 hours ago", type: "support" },
      { id: 6, user: "Emma Wilson", action: "renewed subscription", target: "Annual Plan", time: "3 hours ago", type: "payment" },
      { id: 7, user: "Robert Brown", action: "updated settings", target: "Tax Configuration", time: "4 hours ago", type: "update" },
      { id: 8, user: "James Rodriguez", action: "requested feature", target: "SMS Integration", time: "5 hours ago", type: "feature" },
    ].slice(0, limit);
  },
};

// ============================================
// USER APIs
// ============================================

export const userAPI = {
  getUsers: async () => {
    return [
      { id: 1, name: "Super Admin", email: "admin@tenantsphere.com", role: "Super Admin", status: "Active", lastLogin: "2024-10-23" },
      { id: 2, name: "Jane Smith", email: "jane@tenantsphere.com", role: "Admin", status: "Active", lastLogin: "2024-10-22" },
      { id: 3, name: "Tom Wilson", email: "tom@tenantsphere.com", role: "Support", status: "Active", lastLogin: "2024-10-23" },
    ];
  },
};

// ============================================
// PAYMENTS APIs
// ============================================

export const paymentsAPI = {
  getPaymentsByTenant: async (tenantId: string) => {
    try {
      const res = await fetch(`${API_URL}/subscriber/${tenantId}/payments`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch payments");
      }
      return await res.json();
    } catch (error) {
      console.error("paymentsAPI.getPaymentsByTenant error:", error);
      throw error;
    }
  },

  createPayment: async (payload: any) => {
    try {
      const res = await fetch(`${API_URL}/subscriber/payments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("Raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      if (!res.ok) throw new Error(data.error || "Failed to create payment");
      return data;
    } catch (error) {
      console.error("paymentsAPI.createPayment error:", error);
      throw error;
    }
  },

  getAllPayments: async () => {
    try {
      const res = await fetch(`${API_URL}/subscriber/payments`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch payments");
      }
      return await res.json();
    } catch (error) {
      console.error("paymentsAPI.getAllPayments error:", error);
      throw error;
    }
  },
};

// ============================================
// AMC APIs
// ============================================

export const amcAPI = {
  getAllAMCs: async () => {
    try {
      const res = await fetch(`${API_BASE}/amc`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch AMC records");
      }
      return await res.json();
    } catch (error) {
      console.error("amcAPI.getAllAMCs error:", error);
      throw error;
    }
  },

  getAMCById: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/amc/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch AMC record");
      }
      return await res.json();
    } catch (error) {
      console.error("amcAPI.getAMCById error:", error);
      throw error;
    }
  },

  createAMC: async (amcData: {
    client_name: string;
    plan: string;
    start_date: string;
    end_date: string;
    status?: boolean;
    amount?: number;
    billing_frequency?: string;
    tenat_amcid?: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/amc`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(amcData),
      });

      const text = await res.text();
      console.log("Raw AMC create response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned non-JSON response: ${text.substring(0, 100)}`
        );
      }

      if (!res.ok) throw new Error(data.error || "Failed to create AMC");
      return data;
    } catch (error) {
      console.error("amcAPI.createAMC error:", error);
      throw error;
    }
  },

  updateAMC: async (id: string, amcData: any) => {
    try {
      const res = await fetch(`${API_BASE}/amc/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(amcData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update AMC");
      return data;
    } catch (error) {
      console.error("amcAPI.updateAMC error:", error);
      throw error;
    }
  },

  deleteAMC: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/amc/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete AMC");
      return data;
    } catch (error) {
      console.error("amcAPI.deleteAMC error:", error);
      throw error;
    }
  },
};
