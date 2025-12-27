import React, { FC, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { customerService } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
} from "lucide-react";

// API handled by `customerService` in src/services/api.ts

type ID = string | number;

interface Customer {
  id?: ID;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  alternate_phone?: string;
  alternatePhone?: string;
  is_active?: boolean;
  isActive?: boolean;
  [key: string]: any;
}

interface ApiListResponse {
  success?: boolean;
  data?: Customer[] | any;
  total?: number;
  [key: string]: any;
}

interface ApiSingleResponse {
  success?: boolean;
  data?: Customer | any;
  [key: string]: any;
}

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  alternatePhone: string;
  isActive: boolean;
}

const initialForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  alternatePhone: "",
  isActive: true,
};

const normalizeFromServer = (data: Customer): Customer => ({
  id: data.id,
  name: data.name ?? "",
  phone: data.phone ?? "",
  email: data.email ?? "",
  address: data.address ?? "",
  alternatePhone: data.alternatePhone ?? data.alternate_phone ?? "",
  isActive: data.isActive ?? data.is_active ?? true,
});

const toPayload = (form: CustomerForm) => ({
  name: form.name || undefined,
  phone: form.phone || undefined,
  email: form.email || undefined,
  address: form.address || undefined,
  alternate_phone: form.alternatePhone || undefined,
  is_active: form.isActive,
});

const ErrorAlert: FC<{ message: string | null; onClose: () => void }> = ({
  message,
  onClose,
}) => {
  if (!message) return null;
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 text-sm">Error</h3>
              <p className="text-sm text-red-700 mt-1">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CustomerModal: FC<any> = ({
  show,
  editing,
  formData,
  setFormData,
  onClose,
  onSubmit,
  saving,
  formErrors,
}) => {
  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[99999] p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="font-bold text-lg">
            {editing ? "Edit Customer" : "Add Customer"}
          </h2>
          <button disabled={saving} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {formErrors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {formErrors.general}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <div className="flex items-center border rounded-md px-2">
              <User className="h-4 w-4 text-gray-400" />
              <input
                required
                disabled={saving}
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                placeholder="Enter customer name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            {formErrors.name && (
              <div className="text-red-600 text-sm mt-1">{formErrors.name}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <div className="flex items-center border rounded-md px-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <input
                required
                disabled={saving}
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                placeholder="Enter phone number"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            {formErrors.phone && (
              <div className="text-red-600 text-sm mt-1">
                {formErrors.phone}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Alternate Phone
            </label>
            <div className="flex items-center border rounded-md px-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <input
                disabled={saving}
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                placeholder="Enter alternate phone"
                value={formData.alternatePhone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, alternatePhone: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="flex items-center border rounded-md px-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <input
                type="email"
                disabled={saving}
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                placeholder="Email address"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            {formErrors.email && (
              <div className="text-red-600 text-sm mt-1">
                {formErrors.email}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <div className="flex items-start border rounded-md px-2 py-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <textarea
                disabled={saving}
                className="w-full px-2 bg-transparent text-sm resize-none outline-none"
                placeholder="Enter address"
                rows={3}
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              disabled={saving}
              className="w-full px-3 py-2 border rounded-md text-sm bg-transparent"
              value={formData.isActive ? "Active" : "Inactive"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isActive: e.target.value === "Active",
                })
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <Button onClick={onSubmit} className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CustomerPage: FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<ID | null>(null);

  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<ID | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(
    async (pageToLoad = page) => {
      setLoadingList(true);
      try {
        const resp = await customerService.list({
          page: pageToLoad,
          limit,
          search: q,
        });
        const list: Customer[] = (
          Array.isArray(resp.data) ? resp.data : []
        ).map((d) => normalizeFromServer(d));
        setCustomers(list || []);
        setTotal(typeof resp.total === "number" ? resp.total : list.length);
      } catch (err) {
        console.error("Failed to load customers", err);
      } finally {
        setLoadingList(false);
      }
    },
    [q, page]
  );

  useEffect(() => {
    fetchCustomers(page);
  }, [fetchCustomers, page]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchCustomers(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  // axios auth handled by central `api` interceptor in services/api.ts

  const openCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setForm({ ...initialForm });
    setModalOpen(true);
  };

  const openEdit = async (id: ID) => {
    setEditingId(id);
    setFormErrors({});
    try {
      const resp = await customerService.getById(id);
      const data: Customer = resp?.data ?? resp ?? {};
      const normalized = normalizeFromServer(data);
      setForm({
        name: normalized.name ?? "",
        phone: normalized.phone ?? "",
        email: normalized.email ?? "",
        address: normalized.address ?? "",
        alternatePhone: normalized.alternatePhone ?? "",
        isActive: normalized.isActive ?? true,
      });
      setModalOpen(true);
    } catch (err) {
      console.error("Failed to load customer", err);
      setError("Unable to load customer");
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name || !form.name.trim()) errors.name = "Name is required";
    if (!form.phone || !form.phone.trim()) errors.phone = "Phone is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Invalid email";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e && typeof (e as any).preventDefault === "function")
      (e as any).preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingId) {
        await customerService.update(editingId, payload);
      } else {
        await customerService.create(payload);
      }
      setModalOpen(false);
      setEditingId(null);
      setForm(initialForm);
      setPage(1);
      await fetchCustomers(1);
    } catch (err: any) {
      console.error("Save failed", err);
      const serverErr = err?.response?.data ?? err?.response ?? null;
      if (serverErr && typeof serverErr === "object") {
        setFormErrors((prev) => ({
          ...prev,
          ...(serverErr.errors || serverErr),
        }));
      } else if (serverErr) {
        setFormErrors((prev) => ({ ...prev, general: String(serverErr) }));
      } else {
        setFormErrors((prev) => ({ ...prev, general: "Save failed" }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: ID) => {
    if (!confirm("Delete this customer?")) return;
    setDeleting(id);
    try {
      await customerService.delete(id);
      await fetchCustomers(page);
    } catch (err) {
      console.error("Delete failed", err);
      setError("Unable to delete customer");
    } finally {
      setDeleting(null);
    }
  };

  const handleActivate = async (id: ID) => {
    try {
      await customerService.update(id, { is_active: true, status: "active" });
      await fetchCustomers(page);
      window.alert("Customer activated");
    } catch (err) {
      console.error("Activate failed", err);
      setError("Activate failed");
    }
  };

  const gotoPrev = () => setPage((p) => Math.max(1, p - 1));
  const gotoNext = () => setPage((p) => p + 1);

  const filteredCustomers = customers.filter((c) =>
    String(c.name || "")
      .toLowerCase()
      .includes(String(q || "").toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage customer records
        </p>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      <div className="flex justify-between gap-3 flex-col sm:flex-row">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search customers..."
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm bg-background"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Customers ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loadingList ? (
            <div className="flex items-center justify-center h-[40vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">
                  Loading customers...
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 text-sm">Name</th>
                    <th className="text-left py-3 text-sm">Phone</th>
                    <th className="text-left py-3 text-sm">Email</th>
                    <th className="text-left py-3 text-sm">Address</th>
                    <th className="text-left py-3 text-sm">Status</th>
                    <th className="text-right py-3 text-sm">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-6 text-gray-500"
                      >
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr
                        key={String(customer.id ?? Math.random())}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-2">{customer.name}</td>
                        <td className="py-2 text-sm">{customer.phone}</td>
                        <td className="py-2 text-sm">
                          {customer.email || "—"}
                        </td>
                        <td className="py-2 text-sm">
                          {customer.address || "—"}
                        </td>
                        <td className="py-2">
                          <Badge
                            className={
                              customer.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {customer.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(customer.id ?? "")}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={deleting === customer.id}
                              onClick={() => handleDelete(customer.id ?? "")}
                            >
                              {deleting === customer.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerModal
        show={modalOpen}
        editing={!!editingId}
        formData={form}
        setFormData={setForm}
        onClose={() => setModalOpen(false)}
        onSubmit={() => handleSave()}
        saving={saving}
        formErrors={formErrors}
      />
    </div>
  );
};

export default CustomerPage;
