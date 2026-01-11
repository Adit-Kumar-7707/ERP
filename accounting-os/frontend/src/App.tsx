import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import CompanySetup from "./pages/onboarding/CompanySetup";
import VoucherEntry from "./pages/vouchers/VoucherEntry";
import LedgersPage from "./pages/ledgers/LedgersPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import VoucherTypes from "./pages/settings/VoucherTypes";
import StockItems from "./pages/inventory/StockItems";
import StockGroups from "./pages/inventory/StockGroups";
import CostCenters from "./pages/masters/CostCenters";
import PriceLevels from "./pages/masters/PriceLevels";
import FeatureToggles from "./pages/settings/FeatureToggles";
import CompanyProfile from "./pages/settings/CompanyProfile";
import Rules from "./pages/settings/Rules";
import UsersRoles from "./pages/settings/UsersRoles";
import UserProfile from "./pages/settings/UserProfile";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/settings/AuditLogs";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OrganizationProvider } from "./context/OrganizationContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <OrganizationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Onboarding */}
              <Route path="/setup" element={
                <ProtectedRoute>
                  <CompanySetup />
                </ProtectedRoute>
              } />

              {/* Main App with Layout */}
              <Route element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ledgers" element={<LedgersPage />} />
                <Route path="/vouchers/:type" element={<VoucherEntry />} />
                <Route path="/settings/voucher-types" element={<VoucherTypes />} />

                {/* Inventory */}
                <Route path="/inventory/items" element={<StockItems />} />
                <Route path="/inventory/groups" element={<StockGroups />} />

                {/* Masters */}
                <Route path="/masters/cost-centers" element={<CostCenters />} />
                <Route path="/masters/price-levels" element={<PriceLevels />} />


                {/* Settings */}
                <Route path="/settings/features" element={<FeatureToggles />} />
                <Route path="/settings/company" element={<CompanyProfile />} />
                <Route path="/settings/rules" element={<Rules />} />
                <Route path="/settings/users" element={<UsersRoles />} />
                <Route path="/settings/profile" element={<UserProfile />} />

                {/* Reports */}
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:type" element={<Reports />} />
                <Route path="/settings/audit-logs" element={<AuditLogs />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </OrganizationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
