import { NavLink } from 'react-router-dom';
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
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const superAdminNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Modules', href: '/modules', icon: Puzzle },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'AMC_report', href: '/amc_report', icon: Package },
  // { name: 'Users', href: '/users', icon: Users },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const tenantNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  // { name: 'Orders', href: '/orders', icon: Package },
  { name: 'Billing', href: '/billing', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: ClipboardList },
  { name: 'Stocks', href: '/stock', icon: ClipboardList },
  { name: 'Reports', href: '/report', icon: BarChart3 },
  // { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Accounts', href: '/account', icon: CircleUser },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const staffNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: Package },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  // { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const navigation = 
    user?.role === 'superadmin' ? superAdminNavigation :
    user?.role === 'tenant' ? tenantNavigation :
    staffNavigation;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-sm">TS</span>
            </div>
            <span className="text-sidebar-foreground font-semibold text-lg">TenantSphere</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
            title={collapsed ? item.name : undefined}
          >
            <item.icon className={cn('flex-shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
