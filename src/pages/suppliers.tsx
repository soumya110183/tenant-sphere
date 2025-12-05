import React, { FC, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  X,
  Save,
  Building2,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const API_BASE = "http://localhost:5000";

interface Supplier {
  id?: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}

interface SupplierForm {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}

const initialForm: SupplierForm = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
};

// =========================
//        MODAL
// =========================
const SupplierModal: FC<any> = ({
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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="font-bold text-lg">
            {editing ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <button disabled={saving} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {formErrors.general && (
            <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700 flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              {formErrors.general}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <div className="flex items-center border rounded-md px-2">
              <User className="h-4 w-4 text-gray-400" />
              <input
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            {formErrors.name && (
              <div className="text-red-600 text-sm mt-1">{formErrors.name}</div>
            )}
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Contact Person
            </label>
            <div className="flex items-center border rounded-md px-2">
              <User className="h-4 w-4 text-gray-400" />
              <input
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contact_person: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <div className="flex items-center border rounded-md px-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <input
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="flex items-center border rounded-md px-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <input
                type="email"
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <div className="flex items-start border rounded-md px-2 py-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <textarea
                className="w-full px-2 bg-transparent text-sm resize-none outline-none"
                rows={3}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={onSubmit} className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// =========================
//     MAIN PAGE
// =========================
const SupplierPage: FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  // ============ GET SUPPLIERS =============
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/api/suppliers`, {
        params: { search: q },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(resp.data.data ?? []);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    } finally {
      setLoading(false);
    }
  }, [q, token]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ============ Open Create Modal ============
  const openCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setForm(initialForm);
    setModalOpen(true);
  };

  // ============ Open Edit Modal ============
  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id ?? null);
    setForm({
      name: supplier.name ?? "",
      contact_person: supplier.contact_person ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
    });
    setModalOpen(true);
  };

  // ============ Validation ============
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============ SAVE / UPDATE ============
  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);

    try {
      if (editingId) {
        await axios.put(`${API_BASE}/api/suppliers/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE}/api/suppliers`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      console.error("Save failed", err);
      setFormErrors({ general: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  // ============ DELETE ============
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this supplier?")) return;
    setDeleting(id);

    try {
      await axios.delete(`${API_BASE}/api/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSuppliers();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Supplier Management</h1>
        <p className="text-gray-600 mt-1">Manage supplier records</p>
      </div>

      {/* Search + Add Button */}
         <div className="flex justify-between gap-3 flex-col sm:flex-row">
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            placeholder="Search suppliers..."
                            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm bg-background"
                            value={q}
                    onChange={(e) => setQ(e.target.value)}
                          />
                        </div>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      {/* Supplier Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Suppliers ({suppliers.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-sm">Name</th>
                    <th className="py-3 text-left text-sm">Contact Person</th>
                    <th className="py-3 text-left text-sm">Phone</th>
                    <th className="py-3 text-left text-sm">Email</th>
                    <th className="py-3 text-left text-sm">Address</th>
                    <th className="py-3 text-right text-sm">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-6 text-gray-500"
                      >
                        No suppliers found
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-2">{supplier.name}</td>
                        <td className="py-2">{supplier.contact_person}</td>
                        <td className="py-2 text-sm">{supplier.phone}</td>
                        <td className="py-2 text-sm">
                          {supplier.email || "—"}
                        </td>
                        <td className="py-2 text-sm">
                          {supplier.address || "—"}
                        </td>

                        <td className="py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(supplier)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={deleting === supplier.id}
                              onClick={() => handleDelete(supplier.id!)}
                            >
                              {deleting === supplier.id ? (
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

      {/* Modal */}
      <SupplierModal
        show={modalOpen}
        editing={!!editingId}
        formData={form}
        setFormData={setForm}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        saving={saving}
        formErrors={formErrors}
      />
    </div>
  );
};

export default SupplierPage;
