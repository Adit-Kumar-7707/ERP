import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  CreditCard,
  Activity,
  Users,
} from "lucide-react";
import api from "@/api/client";
import { CashFlowChart, ProfitChart } from "@/components/dashboard/DashboardCharts";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";

interface DashboardData {
  metrics: {
    revenue: number;
    expenses: number;
    net_profit: number;
    cash_balance: number;
    receivables: number;
    payables: number;
  };
  trends: any[];
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        setData(res.data);
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="p-8">Loading Analytics...</div>;
  if (!data) return <div className="p-8">Failed to load data.</div>;

  const { metrics, trends } = data;

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.expenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.net_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              ₹{metrics.net_profit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.cash_balance.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <CashFlowChart data={trends} />
        <ProfitChart data={trends} />
      </div>

      {/* Pending Items + Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-2 gap-4 h-min">
          <Card>
            <CardHeader><CardTitle className="text-sm">Receivables (Unpaid Sales)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-mono text-blue-600">₹{metrics.receivables.toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Payables (Unpaid Bills)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-mono text-orange-600">₹{metrics.payables.toLocaleString()}</div></CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 h-[300px]">
          <AlertsWidget />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
