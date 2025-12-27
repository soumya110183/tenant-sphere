import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import { DashboardRouter } from "@/components/DashboardRouter";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { GroceryInventory } from "@/components/inventory";
import Login from "./pages/Login";
import AMC_notification from "./pages/amc_notification.js";
import AMC_report from "./pages/amc_management.js";
import Dashboard from "./pages/Dashboard";
import TenantDashboard from "./pages/TenantDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import Tenants from "./pages/Tenants";
import Modules from "./pages/Modules";
import Reports from "./pages/Reports";
import Subscriptions from "./pages/Subscriptions";
import AMC_reports from "./pages/amc_report";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Staff from "./pages/Staff";
import CustomerPage from "./pages/customer.js";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";
import BillingModule from "./pages/tenant/BillingModule.js";
import ReportsModule from "./pages/tenant/ReportsModule";
import AccountsModule from "./pages/tenant/AccountsModule.js";
import ProductCatalog from "./pages/Prodcuts.js";
import billing from "./pages/billing.js";
import SupplierPage from "./pages/suppliers.js";
import BillingPageUAE_TenantStyle from "./pages/billing.js";
import LoyaltySettings from "./pages/Loyality.js";
import Coupons from "./pages/Coupon.js";
import Discounts from "./pages/Discounts.js";
import Employees from "./pages/Employees.js";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <InventoryProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Login />} />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<DashboardRouter />} />
                  <Route
                    path="tenants"
                    element={
                      <RoleBasedRoute allowedRoles={["superadmin"]}>
                        <Tenants />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="modules"
                    element={
                      <RoleBasedRoute allowedRoles={["superadmin"]}>
                        <Modules />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <RoleBasedRoute allowedRoles={["superadmin"]}>
                        <Reports />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="amc_report"
                    element={
                      <RoleBasedRoute allowedRoles={["superadmin"]}>
                        <AMC_report />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="subscriptions"
                    element={
                      <RoleBasedRoute allowedRoles={["superadmin"]}>
                        <Subscriptions />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={
                      <RoleBasedRoute allowedRoles={["superadmin"]}>
                        <Users />
                      </RoleBasedRoute>
                    }
                  />
                  <Route path="settings" element={<Settings />} />
                  <Route
                    path="orders"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <Orders />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="inventory"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <Inventory />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="inventory/sales"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <Inventory />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="inventory/purchases"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <Inventory />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="inventory/sales-returns"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <Inventory />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="inventory/purchase-returns"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <Inventory />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="inventory/adjustments"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <Inventory />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="inventorys"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <GroceryInventory />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="report"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <ReportsModule />
                      </RoleBasedRoute>
                    }
                  />
                  {/* Explicit report subroutes so direct URLs work (tab routing) */}
                  <Route
                    path="report/sales"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <ReportsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="report/profit"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <ReportsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="report/purchases"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <ReportsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="report/stock"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <ReportsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="report/payments"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <ReportsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="report/analytics"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <ReportsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="account"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  {/* Explicit subroutes for Accounts (tab-based routing) */}
                  <Route
                    path="account/ledger"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="account/trial-balance"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="account/balance-sheet"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="account/vat"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="account/pal"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  {/* Legacy plural paths to support older links */}
                  <Route
                    path="accounts"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="accounts/ledger"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="accounts/trial-balance"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="accounts/balance-sheet"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="accounts/vat"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="accounts/pal"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <AccountsModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="billings"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <BillingModule />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="billingsss"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <BillingPageUAE_TenantStyle />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="stock"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant", "staff"]}>
                        <ProductCatalog />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="staff"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <Staff />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="customers"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <CustomerPage />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="suppliers"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <SupplierPage />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="loyalty"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <LoyaltySettings />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="coupons"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <Coupons />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="discounts"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <Discounts />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="employees"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <Employees />
                      </RoleBasedRoute>
                    }
                  />
                  {/* Explicit employee subroutes so direct URLs work (tab routing) */}
                  <Route
                    path="employees/salaries"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <Employees />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="employees/discounts"
                    element={
                      <RoleBasedRoute allowedRoles={["tenant"]}>
                        <Employees />
                      </RoleBasedRoute>
                    }
                  />
                  <Route
                    path="tasks"
                    element={
                      <RoleBasedRoute allowedRoles={["staff"]}>
                        <Tasks />
                      </RoleBasedRoute>
                    }
                  />
                </Route>

                {/* Catch all - redirect to login */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </InventoryProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
