import React, { useEffect, useState, useCallback } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const superAdminNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tenants", href: "/tenants", icon: Building2 },
  { name: "Modules", href: "/modules", icon: Puzzle },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "AMC_report", href: "/amc_report", icon: Package },
  { name: "amc_notification", href: "/amc_notification", icon: FileText },
  { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

const tenantNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Billing", href: "/billing", icon: Package },
  { name: "Inventory", href: "/inventory", icon: ClipboardList },
  { name: "Products", href: "/products", icon: ClipboardList },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Accounts", href: "/account", icon: CircleUser },
  { name: "Settings", href: "/settings", icon: Settings },
];

const staffNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: Package },
  { name: "Tasks", href: "/tasks", icon: ClipboardList },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation: NavItem[] =
    user?.role === "superadmin"
      ? superAdminNavigation
      : user?.role === "tenant"
      ? tenantNavigation
      : staffNavigation;

  // Robust body overflow handling: capture original and restore on unmount
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : original;
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  const closeOnEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    window.addEventListener("keydown", closeOnEsc);
    return () => window.removeEventListener("keydown", closeOnEsc);
  }, [mobileOpen, closeOnEsc]);

  return (
    <>
      {/* Mobile open button (visible below lg) */}
      <button
        type="button"
        aria-label="Open navigation"
        className="fixed left-3 top-3 z-40 inline-flex items-center justify-center rounded-md border bg-sidebar text-sidebar-foreground px-3 py-2 shadow-sm lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="fixed inset-0 z-40 pointer-events-none lg:static lg:inset-auto lg:pointer-events-auto">
        {/* Overlay for mobile */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity lg:hidden",
            mobileOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Sidebar panel */}
        <aside
          role="dialog"
          aria-modal={mobileOpen ? true : false}
          aria-label="Sidebar navigation"
          tabIndex={-1}
          className={cn(
            "pointer-events-auto absolute left-0 top-0 h-[100dvh] bg-sidebar border-r border-sidebar-border transition-all duration-300 will-change-transform",
            // width control
            collapsed ? "w-16" : "w-64",
            // positioning: off-canvas on mobile, fixed on desktop
            mobileOpen
              ? "translate-x-0 shadow-xl"
              : "-translate-x-full shadow-none",
            // On large screens keep the sidebar fixed to the left so it does not
            // flow above the page content (which caused the sidebar to appear at the top).
            "lg:translate-x-0 lg:fixed lg:left-0 lg:top-0 lg:h-[100dvh] lg:shadow-none lg:z-40"
          )}
        >
          {/* Header / Branding */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            <div
              className={cn(
                "flex items-center space-x-2 min-w-0",
                collapsed && "lg:hidden"
              )}
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">TS</span>
              </div>
              {!collapsed && (
                <span className="text-sidebar-foreground font-semibold text-lg truncate">
                  TenantSphere
                </span>
              )}
            </div>

            {/* Desktop collapse toggle */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="inline-flex lg:hidden p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
                title={collapsed ? item.name : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon
                  className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
};
