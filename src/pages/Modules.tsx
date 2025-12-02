import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { tenantAPI, moduleAPI } from "@/services/api";
import { Building2, Save, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const Modules = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      loadModules();
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const resp = await tenantAPI.getTenants();
      // Backend returns paginated: {success, page, limit, totalRecords, totalPages, data: [...]}
      const data = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];
      setTenants(data);
      if (data.length > 0) {
        setSelectedTenant(data[0]);
      }
    } catch (e) {
      console.error("Failed to load tenants", e);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    if (!selectedTenant) return;

    // show loading indicator while fetching modules for the selected tenant
    setLoading(true);

    try {
      // Backend returns: { available: [...], enabled: {...} }
      const response = await moduleAPI.getTenantModules(selectedTenant.id);

      const available: string[] = Array.isArray(response?.available)
        ? response.available
        : [];
      const enabledMap = response?.enabled || {};

      // Convert enabled object map to array of enabled keys
      const enabled: string[] = available.filter((key) => !!enabledMap[key]);

      setAvailableModules(available);
      setEnabledModules(enabled);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to load modules:", error);
      toast({
        title: "Error",
        description: "Failed to load modules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (module: string, checked: boolean) => {
    if (checked) {
      setEnabledModules((prev) => [...prev, module]);
    } else {
      setEnabledModules((prev) => prev.filter((m) => m !== module));
    }
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      // Convert enabledModules array into object mapping (backend expects {modules: {key: boolean}})
      const payload = availableModules.reduce(
        (acc: Record<string, boolean>, key) => {
          acc[key] = enabledModules.includes(key);
          return acc;
        },
        {}
      );

      // Backend expects { modules } in request body; response: { message, tenant }
      const resp = await moduleAPI.updateTenantModules(
        selectedTenant.id,
        payload
      );
      const updatedTenant = resp?.tenant
        ? resp.tenant
        : { ...selectedTenant, module_settings: payload };

      toast({
        title: "Modules updated",
        description: "Module configuration has been saved successfully.",
      });

      setHasChanges(false);

      // Update tenant in list with new module_settings
      const updatedTenants = tenants.map((t) =>
        t.id === selectedTenant.id ? updatedTenant : t
      );
      setTenants(updatedTenants);
      setSelectedTenant(updatedTenant);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save module configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getModuleDescription = (module: string) => {
    const descriptions: Record<string, string> = {
      POS: "Point of Sale system for billing and transactions",
      "Table Management": "Manage tables, reservations, and seating",
      KOT: "Kitchen Order Ticket system for order management",
      "Kitchen Display": "Real-time kitchen display system",
      Reservations: "Table reservation and booking management",
      Inventory: "Track stock levels and inventory",
      Reports: "Analytics and reporting dashboard",
      "Multi-branch": "Support for multiple location management",
      "Barcode Scanning": "Scan products using barcode reader",
      "Batch Tracking": "Track product batches and expiry dates",
      "Supplier Management": "Manage suppliers and purchase orders",
      "Purchase Orders": "Create and track purchase orders",
      Appointments: "Schedule and manage appointments",
      "Staff Management": "Manage staff schedules and permissions",
      "Service Packages": "Create service bundles and packages",
      "Warranty Tracking": "Track product warranties and claims",
      // common keys used in your tenant.modules column
      users: "User accounts and access control",
      billing: "Billing and invoicing features",
      reports: "Reporting and analytics tools",
      inventory: "Inventory management and stock tracking",
    };
    // Nice fallback: Title-case the key if no description defined
    return (
      descriptions[module] ||
      module.replace(/(^|\s)\S/g, (t) => t.toUpperCase()) ||
      "Module for enhanced functionality"
    );
  };

  // show global loading spinner first (covers both tenants and modules fetch)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tenants available</h3>
          <p className="text-muted-foreground">
            Add tenants first to configure modules
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading module...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Module Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Enable or disable modules for each tenant
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Tenant Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tenant</CardTitle>
          <CardDescription>
            Choose a tenant to configure their modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedTenant?.id?.toString() || ""}
                onValueChange={(value) => {
                  const tenant = tenants.find((t) => t.id.toString() === value);
                  if (tenant) {
                    setSelectedTenant(tenant);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tenant.name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">
                          {tenant.category}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline" className="mt-1">
                  {selectedTenant?.category}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <Badge variant="outline" className="mt-1">
                  {selectedTenant?.plan}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableModules.map((module) => {
          const isEnabled = enabledModules.includes(module);

          return (
            <Card key={module} className={isEnabled ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{module}</CardTitle>
                      {isEnabled && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      {getModuleDescription(module)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={`module-${module}`}
                    className="text-sm cursor-pointer"
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch
                    id={`module-${module}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleModuleToggle(module, checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Module Summary</CardTitle>
          <CardDescription>
            Current module configuration for {selectedTenant?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                Total Available Modules
              </span>
              <Badge variant="outline">{availableModules.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">Enabled Modules</span>
              <Badge className="bg-primary text-primary-foreground">
                {enabledModules.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Disabled Modules</span>
              <Badge variant="outline">
                {availableModules.length - enabledModules.length}
              </Badge>
            </div>
          </div>

          {hasChanges && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning font-medium">
                You have unsaved changes
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Save Changes" to apply the new module configuration
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Modules;
