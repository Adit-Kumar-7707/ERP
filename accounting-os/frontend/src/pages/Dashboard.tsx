import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  CreditCard,
  Activity,
  Users,
  Wallet,
  Building2,
  TrendingUp,
  FileText,
  AlertTriangle,
  Clock
} from "lucide-react";
import api from "@/api/client";
import { CashFlowChart, ProfitChart } from "@/components/dashboard/DashboardCharts";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

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
  recent_vouchers: any[];
  voucher_stats?: {
    [key: string]: {
      count: number;
      total_amount: number;
    }
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

import { usePeriod } from "@/contexts/PeriodContext";

// ...
const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { fromDate, toDate, formatDate } = usePeriod();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);

  // 1. Strict Owner Permission Check
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "owner") {
        console.warn("User is not owner:", user.role);
      }
    }
  }, [user, authLoading, navigate]);

  // 2. Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = `?from_date=${formatDate(fromDate)}&to_date=${formatDate(toDate)}`;
        const [dashRes, voucherRes] = await Promise.all([
          api.get(`/analytics/dashboard${query}`),
          api.get('/vouchers/entries?limit=5')
        ]);
        setData(dashRes.data);
        setRecentVouchers(voucherRes.data);
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === "owner") {
      fetchData();
    }
  }, [user, fromDate, toDate]); // Re-fetch when period changes

  if (authLoading || loading) return <div className="p-8 flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!data) return <div className="p-8 text-destructive">Failed to load system data.</div>;

  const { metrics, trends } = data;

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto bg-gray-50/50 min-h-screen">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Command Center</h2>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.full_name || "Owner"}. Here is your business at a glance.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
          <div className="px-4 py-1 border-r">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Net Profit (MTD)</p>
            <p className={cn("text-xl font-bold font-mono", metrics.monthly_profit >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(metrics.monthly_profit)}
            </p>
          </div>
          <div className="px-4 py-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cash Flow (MTD)</p>
            <p className={cn("text-xl font-bold font-mono", (metrics.monthly_revenue - metrics.monthly_expenses) >= 0 ? "text-blue-600" : "text-orange-600")}>
              {formatCurrency(metrics.monthly_revenue - metrics.monthly_expenses)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Financial Position (The "StatCards" user liked) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Cash in Hand"
          value={formatCurrency(metrics.cash_in_hand)}
          icon={Wallet}
          subtitle="Liquid Cash"
          className="bg-white shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          title="Bank Balance"
          value={formatCurrency(metrics.bank_balance)}
          icon={Building2}
          subtitle="All Bank Accounts"
          className="bg-white shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          title="Receivables"
          value={formatCurrency(metrics.receivables)}
          icon={ArrowUpRight}
          variant="credit"
          subtitle="To be collected"
          className="bg-white shadow-sm hover:shadow-md transition-all"
        />
        <StatCard
          title="Payables"
          value={formatCurrency(metrics.payables)}
          icon={ArrowDownRight}
          variant="debit"
          subtitle="To be paid"
          className="bg-white shadow-sm hover:shadow-md transition-all"
        />
      </div>

      {/* 3. Performance & Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profit Chart (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-1 rounded-xl border shadow-sm">
            <CashFlowChart data={trends} />
          </div>
          <div className="bg-white p-1 rounded-xl border shadow-sm">
            <ProfitChart data={trends} />
          </div>
        </div>

        {/* Right: Operational Summaries (1 col) */}
        <div className="space-y-6">
          {/* GST Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> GST Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">Output Liability</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(metrics.gst_payable)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">Input Credit</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(metrics.gst_credit)}</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="text-sm font-bold">Net Payable</span>
                <span className="text-lg font-mono font-bold">{formatCurrency(Math.max(0, metrics.gst_payable - metrics.gst_credit))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Widget */}
          <div className="shadow-sm rounded-xl overflow-hidden border bg-white">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Business Alerts
              </h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <AlertsWidget />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Voucher/Operational Activity Overview (Restored as requested) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Operational Volume
            </CardTitle>
            <CardDescription>Breakdown of recorded vouchers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {data.voucher_stats && Object.entries(data.voucher_stats).map(([type, stats]: any) => (
                <div key={type} className="flex flex-col p-3 bg-muted/40 rounded-lg border">
                  <span className="text-xs text-muted-foreground uppercase font-medium">{type}</span>
                  <span className="text-2xl font-bold">{stats.count}</span>
                  <span className="text-xs text-muted-foreground">Entries</span>
                </div>
              ))}
              {/* Fallback if empty */}
              {(!data.voucher_stats || Object.keys(data.voucher_stats).length === 0) && (
                <div className="col-span-3 text-center text-sm text-muted-foreground">No voucher activity recorded yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Recent Transactions
            </CardTitle>
            <CardDescription>Latest 5 vouchers recorded in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentVouchers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Voucher No</th>
                      <th className="px-4 py-3">Type</th>
                      {/* <th className="px-4 py-3 text-right">Amount</th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{v.date ? new Date(v.date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">{v.voucher_number}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{v.voucher_type?.name || 'Unknown'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent transactions found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
