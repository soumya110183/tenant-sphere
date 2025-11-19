// DownloadReportButton.tsx
import React, { useState } from "react";
import { reportsAPI } from "@/services/api";

type Props = {
  report: "all-data" | "tenants" | "users" | "payments" | "revenue";
  apiBase?: string; // optional override
  token?: string; // optional Bearer token
  useCredentials?: boolean; // if you use cookies
  label?: string;
};

export default function DownloadReportButton({
  report = "all-data",
  apiBase,
  token,
  useCredentials = false,
  label,
}: Props) {
  const [loading, setLoading] = useState(false);
  const base = apiBase || (import.meta.env?.VITE_API_URL ?? (window as any).__API_BASE__) || "https://billingbackend-1vei.onrender.com";

  async function download() {
    try {
      setLoading(true);
      // Use the existing reportsAPI which calls `/api/reports/export` and
      // handles responseType and auth via the shared axios instance.
      await reportsAPI.exportReport(report, "pdf", {});
    } catch (err: any) {
      console.error("download error", err);
      alert("Download failed: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  // Render a non-button wrapper so this component can be placed inside
  // another button (e.g. the UI `Button` component) without nesting
  // interactive elements. Use a focusable `span` with role="button"
  // and keyboard handling for accessibility.
  return (
    <span
      role="button"
      tabIndex={loading ? -1 : 0}
      aria-disabled={loading}
      onClick={(e) => {
        if (loading) return;
        e.stopPropagation();
        void download();
      }}
      onKeyDown={(e) => {
        if (loading) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          void download();
        }
      }}
      style={{ display: "inline-block" }}
    >
      {loading
        ? "Preparing..."
        : label || `Download ${report.toUpperCase()} PDF`}
    </span>
  );
}
