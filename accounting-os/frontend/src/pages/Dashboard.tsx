import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  CreditCard,
  Activity,
  Users,
  Wallet,
  Building2,
  TrendingUp
} from "lucide-react";
import api from "@/api/client";
import { CashFlowChart, ProfitChart } from "@/components/dashboard/DashboardCharts";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { StatCard } from "@/components/ui/stat-card"; // Assuming this component exists from Phase 2
import { cn } from "@/lib/utils";

interface DashboardData {
  metrics: {
    revenue: number;
    expenses: number;
    net_profit: number;
    cash_balance: number;
    bank_balance: number;
    cash_in_hand: number;
    receivables: number;
    payables: number;
    monthly_revenue: number;
    monthly_expenses: number;
    monthly_profit: number;
    gst_payable: number;
    gst_credit: number;
  };
  trends: any[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

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

  if (loading) return <div className="p-8 animate-pulse">Loading Analytics...</div>;
  if (!data) return <div className="p-8 text-destructive">Failed to load dashboard data.</div>;

  const { metrics, trends } = data;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Owner Overview</h2>
          <p className="text-muted-foreground">Real-time business insights and health check.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">Current Month Profit</p>
          <p className={cn("text-2xl font-bold", metrics.monthly_profit >= 0 ? "text-success" : "text-destructive")}>
            {formatCurrency(metrics.monthly_profit)}
          </p>
        </div>
      </div>

      {/* 2. Key Liquidity Cards (Cash/Bank) + Receivables/Payables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.cash_in_hand)}</div>
            <p className="text-xs text-muted-foreground">Available Cash</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.bank_balance)}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.receivables)}</div>
            <p className="text-xs text-muted-foreground">Pending from Customers</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payables</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.payables)}</div>
            <p className="text-xs text-muted-foreground">Pending to Vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Detailed Financial Performance (Totals & Monthly) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Revenue Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="font-semibold">{formatCurrency(metrics.monthly_revenue)}</span>
            </div>
          </CardContent>
        </Card>
        {/* Expenses Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.expenses)}</div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="font-semibold">{formatCurrency(metrics.monthly_expenses)}</span>
            </div>
          </CardContent>
        </Card>
        {/* GST Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GST Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Payable (Output)</span>
              <span className="text-sm font-mono text-red-600">{formatCurrency(metrics.gst_payable)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Credit (Input)</span>
              <span className="text-sm font-mono text-green-600">{formatCurrency(metrics.gst_credit)}</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center font-bold">
              <span className="text-sm">Net Payable</span>
              <span className="text-sm font-mono">{formatCurrency(Math.max(0, metrics.gst_payable - metrics.gst_credit))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Visual Trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <CashFlowChart data={trends} />
        <ProfitChart data={trends} />
      </div>

      {/* 5. Alerts & Notifications */}
      <div className="grid grid-cols-1">
        <div className="h-[300px]">
          <AlertsWidget />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
