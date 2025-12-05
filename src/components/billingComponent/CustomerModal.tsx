// src/components/CustomerModal.tsx
import React, { FC } from "react";
import { User, Mail, Phone, MapPin, X, Loader2, Save, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";

type FormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  alternatePhone: string;
  isActive: boolean;
};

export type FormErrors = Record<string, string>;

export interface CustomerModalProps {
  show: boolean;
  editing?: boolean;
  formData: FormState;
  setFormData: (next: FormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving?: boolean;
  formErrors?: FormErrors;
}

export const initialFormState: FormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  alternatePhone: "",
  isActive: true,
};

export const CustomerModal: FC<CustomerModalProps> = ({
  show,
  editing = false,
  formData,
  setFormData,
  onClose,
  onSubmit,
  saving = false,
  formErrors = {},
}) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="font-bold text-lg">{editing ? "Edit Customer" : "Add Customer"}</h2>
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {formErrors.name && <div className="text-red-600 text-sm mt-1">{formErrors.name}</div>}
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
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            {formErrors.phone && <div className="text-red-600 text-sm mt-1">{formErrors.phone}</div>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Alternate Phone</label>
            <div className="flex items-center border rounded-md px-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <input
                disabled={saving}
                className="w-full px-2 py-2 bg-transparent text-sm outline-none"
                placeholder="Enter alternate phone"
                value={formData.alternatePhone || ""}
                onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            {formErrors.email && <div className="text-red-600 text-sm mt-1">{formErrors.email}</div>}
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
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              disabled={saving}
              className="w-full px-3 py-2 border rounded-md text-sm bg-transparent"
              value={formData.isActive ? "Active" : "Inactive"}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "Active" })}
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
    </div>
  );
};
