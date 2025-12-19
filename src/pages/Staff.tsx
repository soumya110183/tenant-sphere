import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  Loader2,
  Shield,
  Mail,
  User,
  AlertCircle,
} from "lucide-react";

import { staffService } from "@/services/api"; // <-- your api.js path
import {
  Pagination,
  PaginationContent,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

// --------------------------------------------
// Error Alert Component
// --------------------------------------------
const ErrorAlert = ({ message, onClose }) => (
  <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
    <Card className="bg-red-50 border-red-200">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 text-sm">Error</h3>
            <p className="text-sm text-red-700 mt-1">{message}</p>
          </div>
          <button onClick={onClose} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// --------------------------------------------
// Staff Modal Component
// --------------------------------------------
const StaffModal = ({
  show,
  editing,
  formData,
  setFormData,
  onClose,
  onSubmit,
  saving,
}) => {
  if (!show) return null;

  const roles = ["staff", "manager", "cashier", "admin"];

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[99999] p-4">
      <div
        className="bg-background rounded-lg w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="font-bold text-lg">
            {editing ? "Edit Staff" : "Add Staff"}
          </h2>
          <button disabled={saving} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Full Name *
            </label>
            <div className="flex items-center border rounded-md px-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                required
                disabled={saving}
                className="w-full px-2 py-2 bg-background text-sm"
                placeholder="Enter full name"
                value={formData.full_name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <div className="flex items-center border rounded-md px-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                required
                type="email"
                disabled={saving || editing}
                className="w-full px-2 py-2 bg-background text-sm"
                placeholder="Email address"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          {/* Password - only for creating */}
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Password *
              </label>
              <input
                required
                type="password"
                disabled={saving}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="Enter password"
                value={formData.password || ""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1">Role *</label>
            <div className="flex items-center border rounded-md px-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <select
                disabled={saving}
                className="w-full px-2 py-2 text-sm bg-background"
                value={formData.role || "staff"}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              disabled={saving}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              value={formData.is_active ? "Active" : "Inactive"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_active: e.target.value === "Active",
                })
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={saving}>
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
        </form>
      </div>
    </div>,
    document.body
  );
};

// --------------------------------------------
// Main Component
// --------------------------------------------
const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  // Fetch staff with pagination and search
  const loadStaff = async (pageToLoad = page) => {
    try {
      setLoading(true);
      setError(null);
      const resp = await staffService.getAll({
        page: pageToLoad,
        limit,
        search,
      });
      const payload = resp && resp.data ? resp.data : resp;
      const list = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.results ?? [];
      setStaff(list || []);

      const totalFromBody =
        typeof payload?.totalRecords === "number"
          ? payload.totalRecords
          : payload?.total ?? undefined;
      const resolvedTotal =
        typeof totalFromBody === "number"
          ? totalFromBody
          : Array.isArray(list)
          ? list.length
          : 0;
      setTotal(resolvedTotal);
      setTotalPages(Math.ceil(resolvedTotal / limit));
      setHasMore(
        resolvedTotal > pageToLoad * limit ||
          (Array.isArray(list) && list.length >= limit)
      );
    } catch (err) {
      setError(err.message || "Unable to load staff");
    } finally {
      setLoading(false);
    }
  };

  // Reload when page or search changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => loadStaff(page), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // Open modal
  const openModal = (item = null) => {
    setEditingData(item);
    setFormData(
      item || {
        full_name: "",
        email: "",
        password: "",
        role: "staff",
        is_active: true,
      }
    );
    setShowModal(true);
  };

  // Save / Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingData) {
        await staffService.update(editingData.id, formData);
      } else {
        await staffService.create(formData);
      }
      setShowModal(false);
      loadStaff();
    } catch (err) {
      setError(err.message || "Unable to save");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this staff member?")) return;
    try {
      setDeleting(id);
      await staffService.delete(id);
      loadStaff();
    } catch (err) {
      setError(err.message || "Unable to delete");
    } finally {
      setDeleting(null);
    }
  };

  const filteredStaff = Array.isArray(staff)
    ? staff.filter((s) =>
        s.full_name?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage staff accounts & roles
        </p>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {/* Search + Add */}
      <div className="flex justify-between gap-3 flex-col sm:flex-row">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search staff..."
            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Staff
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Staff ({filteredStaff.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 text-sm">Name</th>
                    <th className="text-left py-3 text-sm">Email</th>
                    <th className="text-left py-3 text-sm">Role</th>
                    <th className="text-left py-3 text-sm">Status</th>
                    <th className="text-right py-3 text-sm">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No staff found
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/30">
                        <td className="py-2">{user.full_name}</td>
                        <td className="py-2 text-sm">{user.email}</td>
                        <td className="py-2">
                          <Badge variant="outline">{user.role}</Badge>
                        </td>
                        <td className="py-2">
                          <Badge
                            className={
                              user.is_active
                                ? "bg-green-500/10 text-green-600"
                                : "bg-red-500/10 text-red-600"
                            }
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openModal(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={deleting === user.id}
                              onClick={() => handleDelete(user.id)}
                            >
                              {deleting === user.id ? (
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
      {/* Pagination Controls */}
      <div className="flex justify-center mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault();
                setPage((p) => Math.max(1, p - 1));
              }}
              className={page <= 1 ? "opacity-50 pointer-events-none" : ""}
            />

            <li className="flex items-center px-3 text-sm text-muted-foreground">
              Page {page}
              {totalPages ? ` of ${totalPages}` : ""} — Total: {total}
            </li>

            <PaginationNext
              onClick={(e) => {
                e.preventDefault();
                const canNext =
                  hasMore || (totalPages ? page < totalPages : true);
                if (canNext) setPage((p) => p + 1);
              }}
              className={
                !(hasMore || (totalPages ? page < totalPages : true))
                  ? "opacity-50 pointer-events-none"
                  : ""
              }
            />
          </PaginationContent>
        </Pagination>
      </div>

      {/* Modal Component */}
      <StaffModal
        show={showModal}
        editing={!!editingData}
        formData={formData}
        setFormData={setFormData}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        saving={saving}
      />
    </div>
  );
};

export default Staff;
