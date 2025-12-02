// src/pages/Employees.jsx
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

// TabNavigation Component (matching screenshot)
function TabNavigation({ activeTab, setActiveTab, counts = {} }) {
  const tabs = [
    { id: 'employees', label: 'Employees' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'salaries', label: 'Salaries' },
    { id: 'discounts', label: 'Discounts' }
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
            ${isActive
              ? 'bg-background text-primary border-blue-800 '
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/0'
            }
          `}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="font-medium text-sm">{tab.label}</span>
          
          {count > 0 && (
            <span
              className={`
                ml-3 px-2.5 py-1 text-sm rounded-full
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
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
function StatsCard({ stat }) {
  const Icon = stat.icon;
  return (
    <Card className="rounded-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${stat.color || "text-primary"}`}>
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
function Alert({ count, type = "warning" }) {
  if (count === 0) return null;
  
  const config = {
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-600",
      icon: AlertTriangle,
      message: `${count} pending salary payment(s)`
    },
    danger: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-600",
      icon: AlertTriangle,
      message: `${count} critical items need attention`
    },
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-600",
      icon: TrendingUp,
      message: `${count} items require review`
    }
  };
  
  const { bg, border, text, icon: Icon, message } = config[type];
  
  return (
    <div className={`${bg} ${border} rounded-lg p-4 mb-4`}>
      <div className="flex items-center gap-3">
        <div className={text}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <span className="font-semibold">{message}.</span> Process before month-end.
        </div>
      </div>
    </div>
  );
}

/**
 * Search Filter Component (matching inventory pattern)
 */
function SearchFilter({ searchTerm, setSearchTerm, onAdd }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
function EmployeeModal({ open, onClose, onSave, initial, submitting = false }) {
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
      setForm((f) => ({ ...f, ...initial }));
    }
  }, [initial]);

  if (!open) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.username) {
      alert("Name and username are required.");
      return;
    }
    onSave(form);
  }

  const modalTitle = initial && initial._id ? "Edit Employee" : "Register Employee";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
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
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                type="email"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="+971 50 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.active ? "active" : "inactive"}
                onChange={(e) => update("active", e.target.value === "active")}
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
                onChange={(e) => update("role", e.target.value)}
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
                onChange={(e) => update("username", e.target.value)}
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
                onChange={(e) =>
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
                onChange={(e) => update("password", e.target.value)}
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
              {submitting ? "Saving..." : (initial && initial._id ? "Update" : "Create")}
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
function EmployeeTableRow({ 
  emp, 
  onEdit, 
  onDelete,
}) {
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
        <div className="text-xs text-muted-foreground">{emp.phone || "No phone"}</div>
      </td>
      <td className="py-3 px-2 sm:px-4 text-sm font-medium">
        {emp.discountPercent ?? 0}%
      </td>
      <td className="py-3 px-2 sm:px-4">
        <Badge className={emp.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
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
          <Button variant="outline" size="sm" onClick={() => onEdit(emp)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(emp)}>
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
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
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
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
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
function AttendanceView({ attendance, employees }) {
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
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
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
                      <Badge className={a.status === "in" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}>
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
function SalariesView({ salaries, markSalaryPaid }) {
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
                    <td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
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
function DiscountsView({ discounts, employees, updateDiscount }) {
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
                  <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
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
                        : employees.find((e) => e._id === d.employeeId)?.name || "Employee"}
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <Badge className={d.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
                        {d.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateDiscount(d._id, { active: !d.active })}
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
 * Mock Data
 */
const mockEmployees = [
  {
    _id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+971 50 123 4567",
    role: "manager",
    username: "johnsmith",
    discountPercent: 10,
    active: true,
    createdAt: "2024-01-15",
  },
  {
    _id: "2",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "+971 55 234 5678",
    role: "staff",
    username: "sarahj",
    discountPercent: 5,
    active: true,
    createdAt: "2024-02-10",
  },
  {
    _id: "3",
    name: "Ahmed Hassan",
    email: "ahmed.h@example.com",
    phone: "+971 56 345 6789",
    role: "staff",
    username: "ahmedh",
    discountPercent: 8,
    active: true,
    createdAt: "2024-03-05",
  },
  {
    _id: "4",
    name: "Maria Rodriguez",
    email: "maria.r@example.com",
    phone: "+971 52 456 7890",
    role: "admin",
    username: "mariar",
    discountPercent: 15,
    active: false,
    createdAt: "2024-01-20",
  },
  {
    _id: "5",
    name: "David Wilson",
    email: "david.w@example.com",
    phone: "+971 54 567 8901",
    role: "staff",
    username: "davidw",
    discountPercent: 7,
    active: true,
    createdAt: "2024-03-15",
  },
];

const mockAttendance = [
  {
    _id: "a1",
    employeeId: "1",
    employeeName: "John Smith",
    date: new Date().toISOString(),
    timeIn: "08:45 AM",
    timeOut: "17:30 PM",
    status: "out",
    hours: 8.75,
  },
  {
    _id: "a2",
    employeeId: "2",
    employeeName: "Sarah Johnson",
    date: new Date().toISOString(),
    timeIn: "09:00 AM",
    timeOut: null,
    status: "in",
    hours: null,
  },
  {
    _id: "a3",
    employeeId: "3",
    employeeName: "Ahmed Hassan",
    date: new Date().toISOString(),
    timeIn: "08:30 AM",
    timeOut: "17:00 PM",
    status: "out",
    hours: 8.5,
  },
  {
    _id: "a4",
    employeeId: "5",
    employeeName: "David Wilson",
    date: new Date().toISOString(),
    timeIn: "09:15 AM",
    timeOut: null,
    status: "in",
    hours: null,
  },
];

const mockSalaries = [
  {
    _id: "s1",
    employeeId: "1",
    employeeName: "John Smith",
    month: "March 2024",
    basic: 7000,
    allowances: 1500,
    deductions: 0,
    total: 8500,
    paid: false,
  },
  {
    _id: "s2",
    employeeId: "2",
    employeeName: "Sarah Johnson",
    month: "March 2024",
    basic: 5000,
    allowances: 1000,
    deductions: 500,
    total: 6500,
    paid: false,
  },
  {
    _id: "s3",
    employeeId: "3",
    employeeName: "Ahmed Hassan",
    month: "March 2024",
    basic: 4800,
    allowances: 1200,
    deductions: 0,
    total: 6000,
    paid: true,
  },
  {
    _id: "s4",
    employeeId: "4",
    employeeName: "Maria Rodriguez",
    month: "March 2024",
    basic: 7500,
    allowances: 1500,
    deductions: 0,
    total: 9000,
    paid: false,
  },
];

const mockDiscounts = [
  {
    _id: "d1",
    type: "global",
    name: "Staff Discount",
    percentage: 5,
    active: true,
  },
  {
    _id: "d2",
    type: "role",
    name: "Manager Discount",
    percentage: 10,
    role: "manager",
    active: true,
  },
  {
    _id: "d3",
    type: "employee",
    name: "John's Special Discount",
    employeeId: "1",
    percentage: 15,
    active: true,
  },
];

/**
 * Mock API Functions
 */
const mockApi = {
  getEmployees: () => Promise.resolve({ data: [...mockEmployees] }),

  createEmployee: (payload) => {
    const newEmployee = {
      ...payload,
      _id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    mockEmployees.push(newEmployee);
    return Promise.resolve({ data: newEmployee });
  },

  updateEmployee: (id, payload) => {
    const index = mockEmployees.findIndex((emp) => emp._id === id);
    if (index !== -1) {
      mockEmployees[index] = { ...mockEmployees[index], ...payload };
    }
    return Promise.resolve({ data: mockEmployees[index] });
  },

  deleteEmployee: (id) => {
    const index = mockEmployees.findIndex((emp) => emp._id === id);
    if (index !== -1) {
      mockEmployees.splice(index, 1);
    }
    return Promise.resolve({ data: { success: true } });
  },

  getAttendance: () => Promise.resolve({ data: [...mockAttendance] }),

  getSalaries: () => Promise.resolve({ data: [...mockSalaries] }),

  getPendingSalaries: () =>
    Promise.resolve({
      data: mockSalaries.filter((s) => !s.paid),
    }),

  markSalaryPaid: (id) => {
    const salary = mockSalaries.find((s) => s._id === id);
    if (salary) {
      salary.paid = true;
    }
    return Promise.resolve({ data: salary });
  },

  getDiscounts: () => Promise.resolve({ data: [...mockDiscounts] }),

  updateDiscount: (id, payload) => {
    const discount = mockDiscounts.find((d) => d._id === id);
    if (discount) {
      Object.assign(discount, payload);
    }
    return Promise.resolve({ data: discount });
  },
};

/**
 * Main Employees Component
 */
export default function Employees() {
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [kpiCounts, setKpiCounts] = useState({
    total: 0,
    activeShifts: 0,
    pendingSalaries: 0,
    staffDiscountAvg: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [empRes, attRes, salRes, discRes] = await Promise.all([
        mockApi.getEmployees(),
        mockApi.getAttendance(),
        mockApi.getSalaries(),
        mockApi.getDiscounts(),
      ]);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      setEmployees(empRes.data);
      setAttendance(attRes.data);
      setSalaries(salRes.data);
      setDiscounts(discRes.data);

      // Compute KPIs
      const activeShifts = attRes.data.filter((a) => a.status === "in").length;
      const pendingSalaries = salRes.data.filter((s) => !s.paid).length;
      const avgDiscount =
        empRes.data.length === 0
          ? 0
          : Math.round(
              empRes.data.reduce((s, e) => s + (e.discountPercent || 0), 0) /
                empRes.data.length
            );

      setKpiCounts({
        total: empRes.data.length,
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

  function openModal(type, item = null) {
    setEditing(item);
    setModalOpen(true);
  }

  async function handleSave(payload) {
    setSubmitting(true);
    try {
      if (payload._id) {
        await mockApi.updateEmployee(payload._id, payload);
      } else {
        await mockApi.createEmployee(payload);
      }
      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      console.error("Error saving employee:", err);
      alert("Failed to save employee.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(emp) {
    if (!confirm(`Delete ${emp.name}? This action cannot be undone.`)) return;
    try {
      await mockApi.deleteEmployee(emp._id);
      await fetchAll();
    } catch (err) {
      console.error("Error deleting employee:", err);
      alert("Delete failed.");
    }
  }

  async function markSalaryPaid(salaryId) {
    try {
      await mockApi.markSalaryPaid(salaryId);
      await fetchAll();
    } catch (err) {
      console.error("Error marking salary as paid:", err);
      alert("Failed to mark salary as paid.");
    }
  }

  async function updateDiscount(id, updates) {
    try {
      await mockApi.updateDiscount(id, updates);
      await fetchAll();
    } catch (err) {
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
      color: kpiCounts.pendingSalaries > 0 ? "text-amber-600" : "text-muted-foreground",
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
          <AttendanceView
            attendance={attendance}
            employees={employees}
          />
        )}

        {activeTab === "salaries" && (
          <SalariesView
            salaries={salaries}
            markSalaryPaid={markSalaryPaid}
          />
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