import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
  return (
    <div className="relative min-h-[100dvh] bg-background">
      {/* Fixed/off-canvas sidebar (handles its own mobile state) */}
      <Sidebar />

      {/* Content wrapper */}
      <div
        className={
          // On desktop, reserve space for expanded sidebar width (w-64).
          // On mobile, no left padding; the Sidebar becomes an overlay drawer.
          "min-h-[100dvh] lg:pl-64 flex flex-col"
        }
      >
        {/* Top navbar (optional: make it sticky if you want) */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <Navbar />
        </div>

        {/* Main content area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
