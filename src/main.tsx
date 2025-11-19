import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register the PWA service worker. Use a dynamic (non-literal) import so
// Vite does not attempt to resolve `virtual:pwa-register` at dev time when
// the plugin isn't installed. Install `vite-plugin-pwa` to enable this.
(() => {
  const loadPwa = async () => {
    try {
      // Use a literal import so Vite can resolve the virtual module at
      // build/dev time. This avoids the browser attempting to fetch a
      // non-http specifier like `virtual:pwa-register` directly.
      // The import will throw if the plugin isn't installed; we catch and ignore.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const mod = await import("virtual:pwa-register");
      const registerSW = mod.registerSW ?? mod.default;
      if (typeof registerSW === "function") {
        registerSW({
          onRegistered(r) {
            console.log("Service worker registered:", r);
          },
          onRegisterError(err) {
            console.error("Service worker registration failed:", err);
          },
        });
      }
    } catch (e) {
      // plugin not present or registration failed — ignore silently in dev
    }
  };

  void loadPwa();
})();

createRoot(document.getElementById("root")!).render(<App />);
