// src/pages/Employees.tsx
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { employeeService } from "@/services/api";
import {
  Users,
  Clock,
  CreditCard,
  Tag,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  UserCheck,
  UserX,
  Download,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Loader2,
  Search,
  Eye,
  EyeOff,
  Package,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";

// Define TypeScript interfaces
interface Employee {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  username: string;
  discountPercent?: number;
  active: boolean;
  createdAt?: string;
}

interface Attendance {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  hours: number | null;
}

interface Salary {
  _id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  basic: number;
  allowances: number;
  deductions: number;
  total: number;
  paid: boolean;
}

interface Discount {
  _id: string;
  type: string;
  name: string;
  percentage: number;
  role?: string;
  employeeId?: string;
  active: boolean;
}

interface StatsCardProps {
  stat: {
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
  };
}

interface AlertProps {
  count: number;
  type?: "warning" | "danger" | "info";
}

interface SearchFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onAdd: () => void;
}

interface EmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: any) => void;
  initial: any;
  submitting?: boolean;
}

interface EmployeeTableRowProps {
  emp: Employee;
  onEdit: () => void;
  onDelete: () => void;
}

interface EmployeesViewProps {
  employees: Employee[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  openModal: (type: string, item?: Employee) => void;
  handleDelete: (emp: Employee) => void;
  isLoading: boolean;
}

interface AttendanceViewProps {
  attendance: Attendance[];
  employees: Employee[];
}

interface SalariesViewProps {
  salaries: Salary[];
  markSalaryPaid: (id: string) => void;
}

interface DiscountsViewProps {
  discounts: Discount[];
  employees: Employee[];
  updateDiscount: (id: string, updates: Partial<Discount>) => void;
}

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts?: Record<string, number>;
}

// TabNavigation Component (matching screenshot)
function TabNavigation({
  activeTab,
  setActiveTab,
  counts = {},
}: TabNavigationProps) {
  const tabs = [
    { id: "employees", label: "Employees" },
    { id: "attendance", label: "Attendance" },
    { id: "salaries", label: "Salaries" },
    { id: "discounts", label: "Discounts" },
  ];

  return (
    <div className="border-b border-border">
      <nav className="flex space-x-1 overflow-x-auto py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              className={`
                group relative flex items-center px-5 py-2 rounded-t-sm transition-all
                ${
                  isActive
                    ? "bg-background text-primary border-blue-800 "
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/0"
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="font-medium text-sm">{tab.label}</span>

              {count > 0 && (
                <span
                  className={`
                    ml-3 px-2.5 py-1 text-sm rounded-full
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {count}
                </span>
              )}

              {/* Active indicator - Light blue bottom border */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100"></div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Stats Card Component (matching inventory pattern)
 */
function StatsCard({ stat }: StatsCardProps) {
  const Icon = stat.icon;
  return (
    <Card className="rounded-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div
              className={`text-2xl font-bold ${stat.color || "text-primary"}`}
            >
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {stat.label}
            </div>
          </div>
          <div className="text-muted-foreground">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Alert Component (matching inventory pattern)
 */
function Alert({ count, type = "warning" }: AlertProps) {
  if (count === 0) return null;

  const config = {
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-600",
      icon: AlertTriangle,
      message: `${count} pending salary payment(s)`,
    },
    danger: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-600",
      icon: AlertTriangle,
      message: `${count} critical items need attention`,
    },
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-600",
      icon: TrendingUp,
      message: `${count} items require review`,
    },
  };

  const { bg, border, text, icon: Icon, message } = config[type];

  return (
    <div className={`${bg} ${border} rounded-lg p-4 mb-4`}>
      <div className="flex items-center gap-3">
        <div className={text}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <span className="font-semibold">{message}.</span> Process before
          month-end.
        </div>
      </div>
    </div>
  );
}

/**
 * Search Filter Component (matching inventory pattern)
 */
function SearchFilter({ searchTerm, setSearchTerm, onAdd }: SearchFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
            className="pl-9 w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" /> Add New
      </Button>
    </div>
  );
}

/**
 * Employee Form Modal (matching inventory modal pattern)
 */
function EmployeeModal({
  open,
  onClose,
  onSave,
  initial,
  submitting = false,
}: EmployeeModalProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    username: "",
    password: "",
    discountPercent: 0,
    active: true,
    ...initial,
  });

  useEffect(() => {
    if (initial) {
      setForm((f: any) => ({ ...f, ...initial }));
    }
  }, [initial]);

  if (!open) return null;

  function update(field: string, value: any) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.username) {
      alert("Name and username are required.");
      return;
    }
    onSave(form);
  }

  const modalTitle =
    initial && initial._id ? "Edit Employee" : "Register Employee";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-background z-10">
          <h2 className="text-lg sm:text-xl font-bold">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full name *
              </label>
              <input
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update("name", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update("email", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                type="email"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update("phone", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="+971 50 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.active ? "active" : "inactive"}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  update("active", e.target.value === "active")
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  update("role", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Username *
              </label>
              <input
                value={form.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update("username", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="johndoe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Discount %
              </label>
              <input
                value={String(form.discountPercent ?? 0)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update(
                    "discountPercent",
                    Math.max(0, Math.min(100, Number(e.target.value)))
                  )
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                type="number"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                value={form.password || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update("password", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                type="password"
                placeholder={
                  initial && initial._id
                    ? "Leave blank to keep current"
                    : "Enter password"
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {initial && initial._id
                  ? "Only enter if you want to change the password"
                  : "Minimum 6 characters"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={submitting}>
              <Save className="h-4 w-4 mr-2" />
              {submitting
                ? "Saving..."
                : initial && initial._id
                ? "Update"
                : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none"
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Employee Table Row Component
 */
function EmployeeTableRow({ emp, onEdit, onDelete }: EmployeeTableRowProps) {
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-2 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm">{emp.name}</div>
            <div className="text-xs text-muted-foreground">@{emp.username}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">
        <Badge
          className={
            emp.role === "admin"
              ? "bg-red-500/10 text-red-500"
              : emp.role === "manager"
              ? "bg-amber-500/10 text-amber-500"
              : "bg-muted text-muted-foreground"
          }
        >
          {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
        </Badge>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm">
        <div>{emp.email || "No email"}</div>
        <div className="text-xs text-muted-foreground">
          {emp.phone || "No phone"}
        </div>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm font-medium">
        {emp.discountPercent ?? 0}%
      </td>
      <td className="py-3 px-2 sm:px-4">
        <Badge
          className={
            emp.active
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }
        >
          {emp.active ? (
            <>
              <UserCheck className="h-3 w-3 mr-1 inline" />
              Active
            </>
          ) : (
            <>
              <UserX className="h-3 w-3 mr-1 inline" />
              Inactive
            </>
          )}
        </Badge>
      </td>
      <td className="py-3 px-2 sm:px-4">
        <div className="flex gap-1 sm:gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => onEdit()}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete()}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

/**
 * Employees View Component
 */
function EmployeesView({
  employees,
  searchTerm,
  setSearchTerm,
  openModal,
  handleDelete,
  isLoading,
}: EmployeesViewProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: string;
  }>({ key: null, direction: "asc" });

  const requestSort = (key: string) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data: Employee[]) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Employee];
      const bVal = b[sortConfig.key as keyof Employee];

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedEmployees = getSortedData(filteredEmployees);

  return (
    <div className="space-y-4">
      <SearchFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAdd={() => openModal("employee")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5 text-primary" />
            Employee Directory ({employees.length} employees)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th
                    className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium cursor-pointer"
                    onClick={() => requestSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortConfig.key === "name" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium cursor-pointer"
                    onClick={() => requestSort("role")}
                  >
                    <div className="flex items-center gap-1">
                      Role
                      {sortConfig.key === "role" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Contact
                  </th>
                  <th
                    className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium cursor-pointer"
                    onClick={() => requestSort("discountPercent")}
                  >
                    <div className="flex items-center gap-1">
                      Discount
                      {sortConfig.key === "discountPercent" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Status
                  </th>
                  <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    </td>
                  </tr>
                ) : sortedEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      {searchTerm ? (
                        <>
                          No employees found matching "{searchTerm}".{" "}
                          <Button
                            variant="link"
                            onClick={() => setSearchTerm("")}
                            className="text-xs h-auto p-0"
                          >
                            Clear search
                          </Button>
                        </>
                      ) : (
                        "No employees found. Add your first employee to get started!"
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedEmployees.map((emp) => (
                    <EmployeeTableRow
                      key={emp._id}
                      emp={emp}
                      onEdit={() => openModal("employee", emp)}
                      onDelete={() => handleDelete(emp)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Attendance View Component
 */
function AttendanceView({ attendance, employees }: AttendanceViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Clock className="h-5 w-5 text-primary" />
            Today's Attendance ({attendance.length})
          </CardTitle>
          <Button className="gap-2">
            <Clock className="h-4 w-4" /> Mark Attendance
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Employee
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Time In
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Time Out
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Hours
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No attendance records for today.
                  </td>
                </tr>
              ) : (
                attendance.map((a) => (
                  <tr key={a._id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                      {a.employeeName}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {a.timeIn || "-"}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {a.timeOut || "-"}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {a.hours ? `${a.hours.toFixed(2)} hrs` : "-"}
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <Badge
                        className={
                          a.status === "in"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {a.status === "in" ? "In Shift" : "Shift Ended"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Salaries View Component
 */
function SalariesView({ salaries, markSalaryPaid }: SalariesViewProps) {
  const pendingSalaries = salaries.filter((s) => !s.paid);
  const paidSalaries = salaries.filter((s) => s.paid);

  return (
    <div className="space-y-6">
      {pendingSalaries.length > 0 && (
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CreditCard className="h-5 w-5 text-red-500" />
              Pending Salaries ({pendingSalaries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                      Employee
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                      Month
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                      Total
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                      Status
                    </th>
                    <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSalaries.map((s) => (
                    <tr key={s._id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                        {s.employeeName}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">{s.month}</td>
                      <td className="py-3 px-2 sm:px-4 font-semibold text-sm">
                        AED {s.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <Badge className="bg-amber-500/10 text-amber-500">
                          Pending
                        </Badge>
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => markSalaryPaid(s._id)}
                          >
                            <CheckCircle className="h-3 w-3" /> Mark Paid
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <DollarSign className="h-5 w-5 text-primary" />
            Salary History ({paidSalaries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Employee
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Month
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Total
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paidSalaries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No salary history available.
                    </td>
                  </tr>
                ) : (
                  paidSalaries.map((s) => (
                    <tr key={s._id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                        {s.employeeName}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm">{s.month}</td>
                      <td className="py-3 px-2 sm:px-4 font-semibold text-sm">
                        AED {s.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <Badge className="bg-green-500/10 text-green-500">
                          <CheckCircle className="h-3 w-3 mr-1 inline" />
                          Paid
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Discounts View Component
 */
function DiscountsView({
  discounts,
  employees,
  updateDiscount,
}: DiscountsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Tag className="h-5 w-5 text-primary" />
          Discount Rules ({discounts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Type
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Name
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Discount
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Applicable To
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Status
                </th>
                <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {discounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No discount rules configured.
                  </td>
                </tr>
              ) : (
                discounts.map((d) => (
                  <tr key={d._id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      <Badge className="bg-muted text-muted-foreground">
                        {d.type.charAt(0).toUpperCase() + d.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-medium text-sm">
                      {d.name}
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-bold text-lg text-primary">
                      {d.percentage}%
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-sm">
                      {d.type === "global"
                        ? "All Staff"
                        : d.type === "role"
                        ? `${d.role}s`
                        : employees.find((e) => e._id === d.employeeId)?.name ||
                          "Employee"}
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <Badge
                        className={
                          d.active
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }
                      >
                        {d.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateDiscount(d._id, { active: !d.active })
                          }
                        >
                          {d.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Employees Component
 */
export default function Employees() {
  const [activeTab, setActiveTab] = useState<string>("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [kpiCounts, setKpiCounts] = useState({
    total: 0,
    activeShifts: 0,
    pendingSalaries: 0,
    staffDiscountAvg: 0,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      // Fetch from real API
      const empRes = await employeeService.getAll();
      const empData = Array.isArray(empRes?.data)
        ? empRes.data
        : empRes
        ? [empRes]
        : [];

      // Normalize employee data (map backend fields to frontend interface)
      const normalizedEmployees = empData.map((emp: any) => ({
        _id: emp.id || emp._id,
        name: emp.full_name || emp.name,
        email: emp.email || "",
        phone: emp.phone || "",
        role: emp.position || emp.role || "staff",
        username:
          emp.username ||
          emp.full_name?.toLowerCase().replace(/\s+/g, "") ||
          "",
        discountPercent:
          emp.salary?.discount_percent || emp.discountPercent || 0,
        active:
          emp.is_active !== undefined ? emp.is_active : emp.active ?? true,
        createdAt: emp.created_at || emp.createdAt,
      }));

      setEmployees(normalizedEmployees);

      // TODO: Fetch from real APIs for attendance, salaries, discounts
      // For now using empty arrays - these would come from separate endpoints
      setAttendance([]);
      setSalaries([]);
      setDiscounts([]);

      // Compute KPIs based on available data
      const activeShifts = 0; // Would come from attendance API
      const pendingSalaries = 0; // Would come from salaries API
      const avgDiscount =
        normalizedEmployees.length === 0
          ? 0
          : Math.round(
              normalizedEmployees.reduce(
                (s: number, e: any) => s + (e.discountPercent || 0),
                0
              ) / normalizedEmployees.length
            );

      setKpiCounts({
        total: normalizedEmployees.length,
        activeShifts,
        pendingSalaries,
        staffDiscountAvg: avgDiscount,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Failed to load employees data.");
    } finally {
      setLoading(false);
    }
  }

  function openModal(type: string, item: Employee | null = null) {
    setEditing(item);
    setModalOpen(true);
  }

  async function handleSave(payload: any) {
    setSubmitting(true);
    try {
      // Normalize form data to backend format
      const normalized = {
        full_name: payload.name,
        email: payload.email,
        phone: payload.phone,
        position: payload.role,
        username: payload.username,
        password: payload.password,
        is_active: payload.active,
      };

      if (payload._id) {
        // Update existing employee
        await employeeService.update(payload._id, normalized);
      } else {
        // Create new employee
        await employeeService.create(normalized);
      }
      setModalOpen(false);
      await fetchAll();
    } catch (err: any) {
      console.error("Error saving employee:", err);
      alert(
        `Failed to save employee: ${err.response?.data?.message || err.message}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Delete ${emp.name}? This action cannot be undone.`)) return;
    try {
      await employeeService.delete(emp._id);
      await fetchAll();
    } catch (err: any) {
      console.error("Error deleting employee:", err);
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  }

  async function markSalaryPaid(salaryId: string) {
    try {
      // TODO: Implement salary payment API call
      // await salaryService.markAsPaid(salaryId);
      console.warn("markSalaryPaid: API endpoint not yet implemented");
      await fetchAll();
    } catch (err: any) {
      console.error("Error marking salary as paid:", err);
      alert("Failed to mark salary as paid.");
    }
  }

  async function updateDiscount(id: string, updates: Partial<Discount>) {
    try {
      // TODO: Implement discount update API call
      // await employeeDiscountService.updateRule(id, updates);
      console.warn("updateDiscount: API endpoint not yet implemented");
      await fetchAll();
    } catch (err: any) {
      console.error("Error updating discount:", err);
      alert("Failed to update discount.");
    }
  }

  // Calculate tab counts
  const tabCounts = {
    employees: employees.length,
    attendance: attendance.length,
    salaries: salaries.filter((s) => !s.paid).length,
    discounts: discounts.length,
  };

  // Stats for KPI cards
  const stats = [
    {
      label: "Total Employees",
      value: kpiCounts.total,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Active Shifts",
      value: kpiCounts.activeShifts,
      icon: Clock,
      color: "text-green-600",
    },
    {
      label: "Avg Staff Discount",
      value: `Avg ${kpiCounts.staffDiscountAvg}%`,
      icon: Tag,
      color: "text-purple-600",
    },
    {
      label: "Pending Salaries",
      value: kpiCounts.pendingSalaries,
      icon: CreditCard,
      color:
        kpiCounts.pendingSalaries > 0
          ? "text-amber-600"
          : "text-muted-foreground",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <div className="text-muted-foreground">Loading employee data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Employee Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage staff, attendance, salaries & discounts
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatsCard key={index} stat={stat} />
          ))}
        </div>

        <Alert count={kpiCounts.pendingSalaries} type="warning" />

        <TabNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={tabCounts}
        />

        {activeTab === "employees" && (
          <EmployeesView
            employees={employees}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            openModal={openModal}
            handleDelete={handleDelete}
            isLoading={loading}
          />
        )}

        {activeTab === "attendance" && (
          <AttendanceView attendance={attendance} employees={employees} />
        )}

        {activeTab === "salaries" && (
          <SalariesView salaries={salaries} markSalaryPaid={markSalaryPaid} />
        )}

        {activeTab === "discounts" && (
          <DiscountsView
            discounts={discounts}
            employees={employees}
            updateDiscount={updateDiscount}
          />
        )}
      </div>

      <EmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing || {}}
        submitting={submitting}
      />
    </div>
  );
}
