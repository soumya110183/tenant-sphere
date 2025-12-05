import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { tenantAPI } from "@/services/api";

const API_URL = "https://billingbackend-1vei.onrender.com"; // unchanged

interface Tenant {
  id: string;
  name: string;
  email: string;
  category: string;
  plan: string;
  status: string;
  phone?: string;
  created_at?: string;
}

type FieldErrors = Record<string, string>;

const Tenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    plan: "",
    email: "",
    password: "",
    phone: "",
    status: "active",
  });

  // NEW: field-level errors and general error
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  // When searchQuery changes, reset to page 1 and request data from server.
  useEffect(() => {
    setCurrentPage(1);
    loadTenants(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  /**
   * parseApiError
   * Robustly extract a user-friendly error message and a map of field errors
   * from various error shapes (axios, fetch, thrown Error).
   * - returns { message, fieldErrors }
   */
  const parseApiError = async (
    error: any
  ): Promise<{
    message: string;
    fieldErrors: FieldErrors;
    status?: number;
    details?: string;
  }> => {
    // axios style: error.response && error.response.data
    try {
      if (error?.response && error.response.data) {
        const data = error.response.data;
        // Prefer backend's `error` field, then `message`, else stringify
        const message =
          data.error ||
          data.message ||
          data.details ||
          (typeof data === "string" ? data : "Request failed");
        const fieldErrors =
          data.errors && typeof data.errors === "object" ? data.errors : {};
        const details = data.details || data.detail;
        return { message, fieldErrors, status: error.response.status, details };
      }

      // If backend returned a Response-like object (fetch)
      if (error instanceof Response) {
        // try to parse JSON body for structured errors
        try {
          const data = await error.json();
          const message =
            data?.error ||
            data?.message ||
            data?.details ||
            error.statusText ||
            "Request failed";
          const fieldErrors =
            data?.errors && typeof data.errors === "object" ? data.errors : {};
          const details = data?.details || data?.detail;
          return { message, fieldErrors, status: error.status, details };
        } catch (_) {
          return {
            message: error.statusText || `HTTP ${error.status}`,
            fieldErrors: {},
            status: error.status,
          };
        }
      }

      // If thrown error has a .message (regular JS Error or axios fallback)
      if (error?.message) {
        return {
          message: error.message,
          fieldErrors: {},
          details: (error as any)?.details,
        };
      }

      // If error is plain object with message
      if (typeof error === "object") {
        const message = (error &&
          (error.message || error.error || JSON.stringify(error))) as string;
        const fieldErrors =
          error.errors && typeof error.errors === "object" ? error.errors : {};
        const details = (error as any)?.details;
        return { message, fieldErrors, details };
      }

      // fallback
      return { message: String(error), fieldErrors: {} };
    } catch (e) {
      return { message: "Unknown error occurred", fieldErrors: {} };
    }
  };

  const loadTenants = async (page = currentPage) => {
    try {
      setLoading(true);
      setGeneralError(null);
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();

      const resp = await tenantAPI.getTenants(params);

      // backend expected shape: { success, page, limit, totalRecords, totalPages, data }
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setTenants(list);
      setFilteredTenants(list);

      setCurrentPage(resp?.page || page);
      setTotalPages(
        resp?.totalPages ||
          Math.max(1, Math.ceil((resp?.totalRecords || 0) / PAGE_SIZE))
      );
      setTotalRecords(resp?.totalRecords || 0);
    } catch (error: any) {
      console.error("Load tenants error:", error);
      const parsed = await parseApiError(error);
      setGeneralError(parsed.message);
      toast({
        title: "Error loading tenants",
        description: parsed.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormErrors({});
    setGeneralError(null);

    // Basic client-side checks (optional but helps UX)
    const localErrors: FieldErrors = {};
    if (!formData.name?.trim()) localErrors.name = "Business name is required";
    if (!formData.category?.trim())
      localErrors.category = "Category is required";
    if (!formData.email?.trim()) localErrors.email = "Email is required";
    if (!editingTenant && !formData.password)
      localErrors.password = "Password is required";

    if (Object.keys(localErrors).length > 0) {
      setFormErrors(localErrors);
      toast({
        title: "Validation error",
        description: "Please fix the highlighted fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (editingTenant) {
        await tenantAPI.updateTenant(editingTenant.id, formData);
        toast({ title: "Success", description: "Tenant updated successfully" });
      } else {
        await tenantAPI.createTenant(formData);
        toast({ title: "Success", description: "Tenant created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      await loadTenants(); // reload tenant list
    } catch (error: any) {
      console.error("Submit error:", error);
      const parsed = await parseApiError(error);

      // Prefer field-level errors if provided by backend
      if (Object.keys(parsed.fieldErrors || {}).length > 0) {
        setFormErrors(parsed.fieldErrors);
        const joined = Object.entries(parsed.fieldErrors)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ");
        toast({
          title: parsed.message || "Validation errors",
          description: joined,
          variant: "destructive",
        });
      } else {
        // Heuristic: map duplicate key violations to specific fields
        const hay = `${parsed.message || ""} ${
          parsed.details || ""
        }`.toLowerCase();
        const isDuplicate = /duplicate|already exists|unique|23505/.test(hay);
        const duplicateEmail =
          isDuplicate &&
          (hay.includes("email") || hay.includes("tenants_email_key"));
        const duplicatePhone =
          isDuplicate &&
          (hay.includes("phone") || hay.includes("tenants_phone_key"));

        const inferredFieldErrors: FieldErrors = {};
        if (duplicateEmail) inferredFieldErrors.email = "Email already exists";
        if (duplicatePhone) inferredFieldErrors.phone = "Phone already exists";

        if (Object.keys(inferredFieldErrors).length > 0) {
          setFormErrors(inferredFieldErrors);
          const joined = Object.entries(inferredFieldErrors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ");
          toast({
            title: "Duplicate value",
            description: joined,
            variant: "destructive",
          });
        } else {
          // Fallback to general error if no field could be inferred
          setGeneralError(parsed.details || parsed.message);
          toast({
            title: "Error",
            description:
              parsed.details || parsed.message || "Failed to save tenant",
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      category: tenant.category,
      plan: tenant.plan,
      email: tenant.email,
      password: "", // don’t prefill password
      phone: tenant.phone || "",
      status: tenant.status,
    });

    // clear previous errors when editing
    setFormErrors({});
    setGeneralError(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    try {
      setLoading(true);
      await tenantAPI.deleteTenant(id);
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
      loadTenants();
    } catch (error: any) {
      console.error("Delete error:", error);
      const parsed = await parseApiError(error);
      toast({
        title: "Delete failed",
        description: parsed.message || "Failed to delete tenant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingTenant(null);
    setFormData({
      name: "",
      category: "",
      plan: "",
      email: "",
      password: "",
      phone: "",
      status: "active",
    });
    setFormErrors({});
    setGeneralError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "inactive":
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      case "suspended":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };
  // compute display bounds for pagination to avoid JSX parse issues
  const displayStart = Math.min(
    (currentPage - 1) * PAGE_SIZE + 1,
    totalRecords || 0
  );
  const displayEnd = Math.min(currentPage * PAGE_SIZE, totalRecords || 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-gray-500 mt-1">
            Manage your tenant organizations and subscriptions
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTenant ? "Edit Tenant" : "Add New Tenant"}
              </DialogTitle>
              <DialogDescription>
                {editingTenant
                  ? "Update tenant information"
                  : "Create a new tenant organization"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      aria-invalid={!!formErrors.name}
                      aria-describedby={
                        formErrors.name ? "error-name" : undefined
                      }
                    />
                    {formErrors.name && (
                      <p id="error-name" className="text-sm text-red-600">
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                      required
                      aria-invalid={!!formErrors.category}
                      aria-describedby={
                        formErrors.category ? "error-category" : undefined
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="grocery">Grocery</SelectItem>
                        <SelectItem value="salon">Salon</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.category && (
                      <p id="error-category" className="text-sm text-red-600">
                        {formErrors.category}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      aria-invalid={!!formErrors.email}
                      aria-describedby={
                        formErrors.email ? "error-email" : undefined
                      }
                    />
                    {formErrors.email && (
                      <p id="error-email" className="text-sm text-red-600">
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password{" "}
                      {editingTenant && "(leave blank to keep current)"}
                      {!editingTenant && " *"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={!editingTenant}
                      aria-invalid={!!formErrors.password}
                      aria-describedby={
                        formErrors.password ? "error-password" : undefined
                      }
                    />
                    {formErrors.password && (
                      <p id="error-password" className="text-sm text-red-600">
                        {formErrors.password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan">Subscription Plan *</Label>
                    <Select
                      value={formData.plan}
                      onValueChange={(value) =>
                        setFormData({ ...formData, plan: value })
                      }
                      required
                      aria-invalid={!!formErrors.plan}
                      aria-describedby={
                        formErrors.plan ? "error-plan" : undefined
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.plan && (
                      <p id="error-plan" className="text-sm text-red-600">
                        {formErrors.plan}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      aria-invalid={!!formErrors.phone}
                      aria-describedby={
                        formErrors.phone ? "error-phone" : undefined
                      }
                    />
                    {formErrors.phone && (
                      <p id="error-phone" className="text-sm text-red-600">
                        {formErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {editingTenant && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Show general error (non-field) */}
                {generalError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded">
                    <p className="text-sm text-red-700">{generalError}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? "Saving..."
                    : editingTenant
                    ? "Update Tenant"
                    : "Create Tenant"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search tenants by name, category, or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tenants Grid */}
      {loading && tenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading tenants...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                        <p className="text-sm text-gray-500 capitalize">
                          {tenant.category}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(tenant.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Plan</span>
                    <Badge variant="outline" className="capitalize">
                      {tenant.plan}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge className={getStatusColor(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500 truncate">
                        {tenant.email}
                      </span>
                    </div>
                    {tenant.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">{tenant.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Server-driven Pagination controls */}
          {totalRecords > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTenants(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>

                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    loadTenants(Math.min(currentPage + 1, totalPages))
                  }
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {displayStart}-{displayEnd} of {totalRecords}
              </div>
            </div>
          )}
        </>
      )}

      {filteredTenants.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tenants found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Get started by adding your first tenant"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tenants;
