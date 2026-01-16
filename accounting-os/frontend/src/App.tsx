import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import OnboardingWizard from "./pages/onboarding/OnboardingWizard";
import VoucherEntry from "./pages/vouchers/VoucherEntry";
import { RealVoucherForm } from "./components/vouchers/RealVoucherForm";
import LedgersPage from "./pages/ledgers/LedgersPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import VoucherTypes from "./pages/settings/VoucherTypes";
import Parties from "./pages/Parties";
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
import { OrganizationProvider, useOrganization } from "./context/OrganizationContext";
import { PeriodProvider } from "./contexts/PeriodContext";
import { ShortcutProvider } from "./contexts/ShortcutContext";
import { CommandPalette } from "./components/ui/command-palette";
import { HelpOverlay } from "./components/hotkeys/HelpOverlay";
import { ChangePeriodDialog } from "./components/dialogs/ChangePeriodDialog";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { org, isLoading } = useOrganization();
  // If loading, wait
  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  // If no org or onboarding not complete, redirect to setup
  // Note: We check if org exists. If not, or if flag is false.
  if (!org?.is_onboarding_completed) {
    return <Navigate to="/setup" replace />;
  }
  return <>{children}</>;
};

const SetupGuard = ({ children }: { children: React.ReactNode }) => {
  const { org, isLoading } = useOrganization();
  if (isLoading) return <div>Loading...</div>;
  // If onboarding is ALREADY complete, go to dashboard
  if (org?.is_onboarding_completed) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppShortcuts = () => {
  // Global App Shortcuts (Navigation fallback handled by CommandPalette usually, but direct hotkeys here)
  // Actually CommandPalette handles its own toggle via useEffect inside it.
  // Help Overlay handles its own toggle.
  // We can add more here if needed.
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <OrganizationProvider>
          <PeriodProvider>
            <ShortcutProvider>
              <BrowserRouter>
                <AppShortcuts />
                <CommandPalette />
                <HelpOverlay />
                <ChangePeriodDialog />
                <Routes>
                  <Route path="/login" element={<Login />} />

                  {/* Onboarding - Protected by Auth, but guarded AGAINST completed users */}
                  <Route path="/setup" element={
                    <ProtectedRoute>
                      <SetupGuard>
                        <OnboardingWizard />
                      </SetupGuard>
                    </ProtectedRoute>
                  } />

                  {/* Main App - Protected by Auth AND Onboarding */}
                  <Route element={
                    <ProtectedRoute>
                      <OnboardingGuard>
                        <MainLayout />
                      </OnboardingGuard>
                    </ProtectedRoute>
                  }>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/ledgers" element={<LedgersPage />} />

                    {/* Real Vouchers */}
                    <Route path="/vouchers/sales" element={<RealVoucherForm />} />
                    <Route path="/vouchers/purchase" element={<RealVoucherForm />} />

                    {/* Legacy / Journal Vouchers */}
                    <Route path="/vouchers/:type" element={<VoucherEntry />} />

                    <Route path="/settings/voucher-types" element={<VoucherTypes />} />
                    <Route path="/parties" element={<Parties />} />

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
            </ShortcutProvider>
          </PeriodProvider>
        </OrganizationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
