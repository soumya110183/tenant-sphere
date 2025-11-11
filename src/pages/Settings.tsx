import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Palette, Save, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { notificationAPI, tenantAPI } from "@/services/api";

// runtime marker to help HMR/debugging — will appear in browser console when this module loads
console.log("[Settings] module loaded", new Date().toISOString());

export const Settings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // Profile settings
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
  });

  // Notification settings (UI state)
  const [notifications, setNotifications] = useState({
    email_notification: true,
    plan_expired: true,
    new_tenant_registration: true,
    system_updates: false,
  });

  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [tenantIdForPrefs, setTenantIdForPrefs] = useState<number | null>(null);

  const handleProfileSave = () => {
    // TODO: Replace with actual API call PUT /users/profile
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handleNotificationSave = async () => {
    // prefer resolved tenant id, fall back to user
    const fallbackTenantId = (user as any)?.tenantId ?? (user as any)?.id;
    const idToUse = tenantIdForPrefs ?? fallbackTenantId;

    if (!idToUse) {
      toast({
        title: "Unable to save",
        description: "No tenant context available for saving preferences.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingNotifications(true);
      await notificationAPI.updateTenantNotifications(idToUse, notifications);
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
      // keep tenantIdForPrefs if not set
      setTenantIdForPrefs(Number(idToUse));
    } catch (err: any) {
      console.error("Failed to save notifications", err);
      toast({
        title: "Save failed",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  // Load tenant notification preferences on mount / when user changes
  useEffect(() => {
    const load = async () => {
      // Prefer explicit tenantId on the user object
      let tenantId =
        (user as any)?.tenantId ?? (user as any)?.tenant_id ?? null;

      try {
        // If tenantId is missing, try to fetch tenants and pick one.
        if (!tenantId) {
          const tenants = await tenantAPI.getTenants();
          if (Array.isArray(tenants) && tenants.length > 0) {
            // Try to find tenant matching user's email
            const match = tenants.find((t: any) => {
              return (
                (t.email &&
                  user?.email &&
                  String(t.email).toLowerCase() ===
                    String(user.email).toLowerCase()) ||
                (t.contact &&
                  user?.email &&
                  String(t.contact).toLowerCase() ===
                    String(user.email).toLowerCase())
              );
            });
            tenantId = match ? match.id : tenants[0].id;
          }
        }

        if (!tenantId) {
          console.warn(
            "No tenant id available for loading notification preferences"
          );
          return;
        }

        setTenantIdForPrefs(Number(tenantId));

        setLoadingNotifications(true);
        const data = await notificationAPI.getTenantNotifications(tenantId);
        // server returns merged prefs object (defaults overlaid)
        if (data && typeof data === "object") {
          setNotifications((prev) => ({ ...prev, ...data }));
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          console.warn(
            "Notification endpoint not found (404) — using defaults"
          );
        } else {
          console.warn("Failed to load notification preferences", err);
        }
      } finally {
        setLoadingNotifications(false);
      }
    };

    load();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>
            Update your personal information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-2xl">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                Change Avatar
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, GIF or PNG. Max size of 2MB.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleProfileSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize how TenantSphere looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                {theme === "light"
                  ? "Light mode is active"
                  : "Dark mode is active"}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="email-notifications" className="cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your account
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.email_notification}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    email_notification: checked,
                  })
                }
                disabled={loadingNotifications || savingNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="plan-expiry" className="cursor-pointer">
                  Plan Expiry Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when tenant plans are about to expire
                </p>
              </div>
              <Switch
                id="plan-expiry"
                checked={notifications.plan_expired}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, plan_expired: checked })
                }
                disabled={loadingNotifications || savingNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="new-tenants" className="cursor-pointer">
                  New Tenant Registrations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alert when new tenants sign up
                </p>
              </div>
              <Switch
                id="new-tenants"
                checked={notifications.new_tenant_registration}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    new_tenant_registration: checked,
                  })
                }
                disabled={loadingNotifications || savingNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="system-updates" className="cursor-pointer">
                  System Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notifications about new features and updates
                </p>
              </div>
              <Switch
                id="system-updates"
                checked={notifications.system_updates}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    system_updates: checked,
                  })
                }
                disabled={loadingNotifications || savingNotifications}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleNotificationSave}
              disabled={savingNotifications}
              aria-busy={savingNotifications}
            >
              <Save className="mr-2 h-4 w-4" />
              {savingNotifications ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Change Password</Label>
            <Button variant="outline">Update Password</Button>
          </div>

          <Separator />
        </CardContent>
      </Card>
    </div>
  );
};

// default export left for existing imports
export default Settings;
