import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Try to load the PWA plugin only if it's installed. This allows
  // the dev server to start even when the dependency is not present.
  let pwaPlugin = null;
  try {
    // dynamic import so Vite won't throw if package is missing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mod = await import("vite-plugin-pwa");
    const { VitePWA } = mod;
    pwaPlugin = VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "robots.txt"],
      manifest: {
        name: "TenantSphere",
        short_name: "TenantSphere",
        description: "Multi-tenant SaaS billing and admin dashboard",
        theme_color: "#0ea5e9",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "https://via.placeholder.com/192",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "https://via.placeholder.com/512",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    });
  } catch (e) {
    // ignore if plugin not installed; server will start without PWA support
  }

  return {
    server: {
      host: "::",
      port: 8080,
      // Proxy backend report requests to avoid CORS during local development
      // Requests to /reports/* will be forwarded to http://localhost:5000/reports/*
      // This keeps frontend fetches relative (no CORS) and preserves cookies when needed.
    },
    plugins: [
      react(),
      pwaPlugin,
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    // Avoid generating dependency source maps for optimized deps — some
    // packages ship empty/invalid source maps which cause browser warnings.
    optimizeDeps: {
      esbuildOptions: {
        sourcemap: false,
      },
    },
    build: {
      sourcemap: false,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
