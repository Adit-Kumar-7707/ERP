import { QuickActions } from "@/components/dashboard/QuickActions";
import { FinancialOverview } from "@/components/dashboard/FinancialOverview";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { RecentVouchers } from "@/components/dashboard/RecentVouchers";

const Dashboard = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's your financial overview.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Financial Overview */}
      <FinancialOverview />

      {/* Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentVouchers />
        </div>
        <div>
          <AlertsWidget />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
