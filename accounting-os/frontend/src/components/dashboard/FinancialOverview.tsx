import { useEffect, useState } from "react";
import api from "@/api/client";
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

const formatIndianCurrency = (amount: number) => {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount || 0);
};

export const FinancialOverview = () => {
  const [stats, setStats] = useState({
    cashBalance: 0,
    bankBalance: 0,
    receivables: 0,
    payables: 0,
    grossProfit: 0,
    grossProfitMargin: 0,
    gstPayable: 0,
    gstCredit: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Endpoint might be /accounting/dashboard-stats
        const res = await api.get('/accounting/dashboard-stats');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Financial Overview</h2>
        <button className="text-sm text-primary hover:underline">
          View Details →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cash in Hand"
          value={formatIndianCurrency(stats.cashBalance)}
          icon={Wallet}
          subtitle="Updated just now"
        />
        <StatCard
          title="Bank Balance"
          value={formatIndianCurrency(stats.bankBalance)}
          icon={Building2}
          subtitle="3 bank accounts"
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatCard
          title="Total Receivables"
          value={formatIndianCurrency(stats.receivables)}
          icon={ArrowUpRight}
          variant="credit"
          subtitle="42 parties"
        />
        <StatCard
          title="Total Payables"
          value={formatIndianCurrency(stats.payables)}
          icon={ArrowDownRight}
          variant="debit"
          subtitle="28 parties"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profit Snapshot */}
        <div className="bg-card border rounded-lg p-5 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Profit Snapshot (Current Month)</h3>
            <span className="text-xs text-muted-foreground">Jan 2025</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatIndianCurrency(11200000)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatIndianCurrency(8000000)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Gross Profit</p>
              <p className="text-xl font-semibold tabular-nums text-credit">
                {formatIndianCurrency(stats.grossProfit)}
              </p>
              <p className="text-xs text-credit flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {stats.grossProfitMargin}% margin
              </p>
            </div>
          </div>
        </div>

        {/* GST Summary */}
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">GST Summary</h3>
            <span className="text-xs text-muted-foreground">This Quarter</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-debit" />
                <span className="text-sm">Output GST</span>
              </div>
              <span className="font-medium tabular-nums">
                {formatIndianCurrency(stats.gstPayable)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-credit" />
                <span className="text-sm">Input Credit</span>
              </div>
              <span className="font-medium tabular-nums">
                {formatIndianCurrency(stats.gstCredit)}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Payable</span>
                <span className="font-semibold tabular-nums text-debit">
                  {formatIndianCurrency(stats.gstPayable - stats.gstCredit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
