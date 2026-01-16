import {
    Wallet,
    Building2,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/utils/format";

interface FinancialOverviewProps {
    data: any;
}

export const FinancialOverview = ({ data }: FinancialOverviewProps) => {
    if (!data) return <div className="animate-pulse h-64 bg-gray-100 rounded"></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-tally-blue">Financial Overview</h2>
                <button className="text-sm text-blue-600 hover:underline">
                    View Details →
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Cash in Hand"
                    value={formatCurrency(data.cash_balance)}
                    icon={Wallet}
                    subtitle="In hand"
                />
                <StatCard
                    title="Bank Balance"
                    value={formatCurrency(data.bank_balance)}
                    icon={Building2}
                    subtitle="Across all accounts"
                />
                <StatCard
                    title="Receivables"
                    value={formatCurrency(data.receivables)}
                    icon={ArrowUpRight}
                    variant="credit"
                    subtitle="Total Due"
                />
                <StatCard
                    title="Payables"
                    value={formatCurrency(data.payables)}
                    icon={ArrowDownRight}
                    variant="debit"
                    subtitle="To pay"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Profit Snapshot */}
                <div className="bg-white border rounded-lg p-5 col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-tally-blue">Profit Snapshot</h3>
                        <span className="text-xs text-gray-500">Overview</span>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Gross Profit</p>
                            <p className="text-xl font-semibold tabular-nums text-green-700">
                                {formatCurrency(data.gross_profit)}
                            </p>
                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3" />
                                {data.gross_profit_margin.toFixed(1)}% margin
                            </p>
                        </div>
                        <div>
                            {/* Placeholders for Sales/Expense if returned in future, for now omitted as per schema limit */}
                        </div>
                    </div>
                </div>

                {/* GST Summary */}
                <div className="bg-white border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-tally-blue">GST Summary</h3>
                        <span className="text-xs text-gray-500">Current</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                <span className="text-sm">Output GST</span>
                            </div>
                            <span className="font-medium tabular-nums text-red-700">
                                {formatCurrency(data.gst_payable)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-sm">Input Credit</span>
                            </div>
                            <span className="font-medium tabular-nums text-green-700">
                                {formatCurrency(data.gst_credit)}
                            </span>
                        </div>
                        <div className="pt-3 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Net Payable</span>
                                <span className="font-semibold tabular-nums text-red-700">
                                    {formatCurrency(data.gst_payable - data.gst_credit)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
