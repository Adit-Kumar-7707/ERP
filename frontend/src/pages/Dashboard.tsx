import { useEffect, useState } from "react";
import api from "@/api/client";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FinancialOverview } from "@/components/dashboard/FinancialOverview";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { RecentVouchers } from "@/components/dashboard/RecentVouchers";

export default function Dashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get("/analytics/dashboard");
                setData(res.data);
            } catch (err) {
                console.error("Dashboard Fetch Error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <div className="p-8">Loading Dashboard...</div>;

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen animate-fade-in font-sans">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-tally-blue">Dashboard</h1>
                <p className="text-gray-500 mt-1">
                    Welcome back! Here's your financial overview.
                </p>
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Financial Overview */}
            <FinancialOverview data={data} />

            {/* Alerts & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentVouchers vouchers={data?.recent_vouchers} />
                </div>
                <div>
                    <AlertsWidget alerts={data?.alerts} />
                </div>
            </div>

            <div className="text-center text-xs text-gray-400 pt-8 pb-4">
                Accounting OS v1.0 • Designed for Business
            </div>
        </div>
    );
}
