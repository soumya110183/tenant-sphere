import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Puzzle,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Package,
  CircleUser,
  ClipboardList,
  FileText,
  CreditCard,
  ShoppingCart,
  Truck,
  Star,
  Ticket,
  Wallet,
  UserCheck,
  Store,
  Shield,
  Cog,
  PieChart,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Super Admin Navigation - Platform Management
const superAdminNavigation = [
  {
    category: "Platform Management",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Tenants", href: "/tenants", icon: Building2 },
      { name: "Modules", href: "/modules", icon: Puzzle },
      { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
    ],
  },
  {
    category: "Reports & Analytics",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "AMC Reports", href: "/amc_report", icon: PieChart },
    ],
  },
  {
    category: "System",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

// Tenant Admin Navigation - Store Operations
const tenantNavigation = [
  {
    category: "Core Operations",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Billing", href: "/billings", icon: ShoppingCart },
      { name: "Inventory", href: "/inventory", icon: Package },
      { name: "Stocks", href: "/stock", icon: ClipboardList },
    ],
  },
  {
    category: "People Management",
    items: [
      { name: "Staff", href: "/staff", icon: Users },
      { name: "Customers", href: "/customers", icon: UserCheck },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    category: "Marketing & Loyalty",
    items: [
      { name: "Discounts", href: "/discounts", icon: Ticket },
      { name: "Coupons", href: "/coupons", icon: CreditCard },
      { name: "Loyalty", href: "/loyalty", icon: Star },
    ],
  },
  {
    category: "Finance & Reports",
    items: [
      { name: "Accounts", href: "/account", icon: Wallet },
      { name: "Reports", href: "/report", icon: BarChart3 },
    ],
  },
  {
    category: "System",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

// Staff Navigation - Limited Access
const staffNavigation = [
  {
    category: "Daily Operations",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Billing", href: "/billing", icon: ShoppingCart },
      { name: "Inventorys", href: "/inventorys", icon: Package },
    ],
  },
  {
    category: "Tasks & Management",
    items: [
      { name: "Tasks", href: "/tasks", icon: ClipboardList },
      { name: "Customers", href: "/customers", icon: UserCheck },
    ],
  },
  {
    category: "System",
    items: [{ name: "Settings", href: "/settings", icon: Cog }],
  },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const navigation =
    user?.role === "superadmin"
      ? superAdminNavigation
      : user?.role === "tenant"
      ? tenantNavigation
      : staffNavigation;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-sm">TS</span>
            </div>
            <span className="text-sidebar-foreground font-semibold text-lg">
              TenantSphere
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <div className="space-y-6">
          {navigation.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-2">
              {/* Section Header - Only show when not collapsed */}
              {!collapsed && section.category && (
                <div className="px-4">
                  <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    {section.category}
                  </h3>
                </div>
              )}

              {/* Navigation Items */}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 mx-2 px-2 py-2.5 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        "flex-shrink-0",
                        collapsed ? "h-5 w-5" : "h-4 w-4"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </NavLink>
                ))}
              </div>

              {/* Separator between sections (except last) */}
              {sectionIndex < navigation.length - 1 && !collapsed && (
                <div className="px-4">
                  <div className="border-t border-sidebar-border/50 my-2"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* User Profile Section */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <CircleUser className="h-4 w-4 text-sidebar-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                {user?.role || "User"}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
