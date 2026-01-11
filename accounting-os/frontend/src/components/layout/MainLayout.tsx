import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

export const MainLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Enable Global Shortcuts
  useGlobalShortcuts();

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div
        className={cn(
          "transition-all duration-200",
          isSidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <TopBar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
