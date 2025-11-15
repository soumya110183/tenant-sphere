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
import { notificationAPI, tenantAPI, userAPI } from "@/services/api";

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
    password: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Load full user record and password-change state
  const [loadingUserRecord, setLoadingUserRecord] = useState(false);
  const [userRecord, setUserRecord] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleProfileSave = async () => {
    // Save profile: update tenant record (name/email/phone) and user record (name/email/password)
    const tenantId = tenantIdForPrefs ?? (user as any)?.tenantId ?? null;
    const userId = (user as any)?.id ?? null;

    if (!tenantId && !userId) {
      toast({
        title: "Unable to save",
        description: "No tenant or user context available for saving profile.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingProfile(true);

      // Update tenant (if we have tenantId)
      if (tenantId) {
        const tenantPayload: any = {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
        };
        // diagnostic log: outgoing tenant payload
        // eslint-disable-next-line no-console
        console.log("[Settings] updateTenant ->", tenantId, tenantPayload);
        await tenantAPI.updateTenant(tenantId, tenantPayload);
      }

      // Update user record (if we have userId)
      if (userId) {
        // backend users table expects `full_name` column
        const userPayload: any = {
          full_name: profileData.name,
          email: profileData.email,
        };
        if (profileData.password && profileData.password.length > 0) {
          userPayload.password = profileData.password;
        }
        // diagnostic log: outgoing user payload
        // eslint-disable-next-line no-console
        console.log("[Settings] updateUser ->", userId, userPayload);
        try {
          await userAPI.updateUser(userId, userPayload);
        } catch (userErr: any) {
          // log full server response for debugging
          // eslint-disable-next-line no-console
          console.error("[Settings] user update failed", userErr);
          // include server response body if available
          // eslint-disable-next-line no-console
          console.error(
            "[Settings] user update response.data:",
            userErr?.response?.data
          );
          // rethrow so outer catch shows the toast
          throw userErr;
        }

        // update cached user_data in localStorage so future page loads reflect changes
        try {
          const stored = localStorage.getItem("user_data");
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.name = profileData.name;
            parsed.email = profileData.email;
            localStorage.setItem("user_data", JSON.stringify(parsed));
          }
        } catch (e) {
          // ignore
        }
      }

      toast({
        title: "Profile updated",
        description: "Profile saved successfully.",
      });
      // Clear password field after successful save
      setProfileData((p) => ({ ...p, password: "" }));
    } catch (err: any) {
      // surface richer information from the server (if present)
      // eslint-disable-next-line no-console
      console.error("Failed to save profile", err);
      // pull server details when axios error
      const serverMsg =
        err?.response?.data?.message || err?.response?.data || err?.message;
      toast({
        title: "Save failed",
        description: serverMsg ?? String(err),
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleNotificationSave = async () => {
    // prefer resolved tenant id, fall back to user
    const fallbackTenantId = (user as any)?.tenantId ?? (user as any)?.id;
    let idToUse = tenantIdForPrefs ?? fallbackTenantId;

    if (!idToUse) {
      // Try to resolve tenant id on-demand as a last resort
      try {
        const tenants = await tenantAPI.getTenants();
        if (Array.isArray(tenants) && tenants.length > 0) {
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
          const resolved = match ? match.id : tenants[0].id;
          setTenantIdForPrefs(Number(resolved));
          // continue and use the resolved id
          // eslint-disable-next-line no-var
          var idToUseResolved = resolved;
        }
      } catch (err) {
        console.warn(
          "Failed to resolve tenant id while saving preferences",
          err
        );
      }

      if (!idToUseResolved) {
        toast({
          title: "Unable to save",
          description: "No tenant context available for saving preferences.",
          variant: "destructive",
        });
        return;
      }

      // prefer the newly resolved id
      // @ts-ignore
      idToUse = idToUseResolved;
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

  const handleChangePassword = async () => {
    const userId = (user as any)?.id ?? (userRecord && userRecord.id);
    if (!userId) {
      toast({
        title: "Unable to change password",
        description: "No user context available.",
        variant: "destructive",
      });
      return;
    }

    if (!currentPassword) {
      toast({
        title: "Validation",
        description: "Enter your current password.",
        variant: "destructive",
      });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: "Validation",
        description: "New password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      setChangingPassword(true);
      // payload: current_password and new_password
      await userAPI.changePassword(userId, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast({
        title: "Password changed",
        description: "Your password has been updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password change failed", err);
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message;
      toast({
        title: "Change failed",
        description: serverMsg ?? String(err),
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
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

  // Load authoritative user record from backend when we have a user id
  useEffect(() => {
    const loadUser = async () => {
      const uid = (user as any)?.id;
      if (!uid) return;
      try {
        setLoadingUserRecord(true);
        const data = await userAPI.getUser(uid);
        // backend returns the user object directly
        if (data) {
          setUserRecord(data);
          setProfileData((p) => ({
            ...p,
            name: data.full_name ?? data.name ?? p.name,
            email: data.email ?? p.email,
            phone: data.phone ?? p.phone,
          }));
          // also set tenant id if available
          if (data.tenant_id) setTenantIdForPrefs(Number(data.tenant_id));
        }
      } catch (err) {
        console.warn("Failed to load user record", err);
      } finally {
        setLoadingUserRecord(false);
      }
    };

    loadUser();
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 555 555 5555"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
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

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex items-end justify-end">
                <Button
                  variant="outline"
                  className="w-fit"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  aria-busy={changingPassword}
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </div>

          <Separator />
        </CardContent>
      </Card>
    </div>
  );
};

// default export left for existing imports
export default Settings;
