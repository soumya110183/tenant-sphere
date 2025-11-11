// DownloadReportButton.tsx
import React, { useState } from "react";

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
      // Use type=pdf for PDF (or type=csv for CSV)
      const url = `${base}/reports/export?type=pdf&report=${encodeURIComponent(report)}`;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "GET",
        headers,
        // if you're using cookie auth:
        credentials: useCredentials ? "include" : "same-origin",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Request failed: ${res.status} ${res.statusText} ${txt}`);
      }

      // parse filename from Content-Disposition (if present)
      const cd = res.headers.get("Content-Disposition") || "";
      let filename = `${report}-${Date.now()}.pdf`;
      if (cd) {
        // try filename*=UTF-8''encoded or filename="..."
        const m = /filename\\*=UTF-8''([^;\\n]+)|filename=\"([^\"\\n]+)\"/i.exec(cd);
        if (m) filename = decodeURIComponent(m[1] || m[2]);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("download error", err);
      alert("Download failed: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={download} disabled={loading}>
      {loading ? "Preparing..." : label || `Download ${report.toUpperCase()} PDF`}
    </button>
  );
}