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
    <div className="min-h-screen bg-background font-sans antialiased flex">
      {/* Mobile Overlay */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:translate-x-0",
        isSidebarCollapsed ? "-translate-x-full md:translate-x-0 md:w-16" : "translate-x-0 w-64"
      )}>
        <AppSidebar
          isCollapsed={isSidebarCollapsed && window.innerWidth >= 768} // Only collapse visually on desktop
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-200 min-h-screen",
          isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        {/* Mobile Header Toggle */}
        <div className="md:hidden p-4 border-b flex items-center bg-background sticky top-0 z-30">
          <button onClick={() => setIsSidebarCollapsed(false)} className="p-2">
            <svg width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
          </button>
          <span className="font-semibold ml-2">AccountingOS</span>
        </div>

        <TopBar />
        <main className="p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
