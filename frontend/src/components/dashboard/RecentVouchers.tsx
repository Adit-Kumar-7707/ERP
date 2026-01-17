import { Link } from "react-router-dom";
import {
    Wallet,
    IndianRupee,
    TrendingUp,
    ShoppingCart,
    FileSpreadsheet,

    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";

const voucherTypeConfig: any = {
    payment: { icon: Wallet, color: "text-red-600", label: "Payment" },
    receipt: { icon: IndianRupee, color: "text-green-600", label: "Receipt" },
    sales: { icon: TrendingUp, color: "text-green-600", label: "Sales" },
    purchase: { icon: ShoppingCart, color: "text-red-600", label: "Purchase" },
    journal: { icon: FileSpreadsheet, color: "text-gray-500", label: "Journal" },
};

export const RecentVouchers = ({ vouchers }: { vouchers: any[] }) => {
    if (!vouchers) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-tally-blue">Recent Vouchers</h2>
                <Link
                    to="/daybook"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                    View All
                    <ExternalLink className="h-3 w-3" />
                </Link>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-3">Voucher No</div>
                    <div className="col-span-3">Party</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-2">Date</div>
                </div>

                <div className="divide-y divide-gray-100">
                    {vouchers.map((voucher) => {
                        const config = voucherTypeConfig[voucher.type] || voucherTypeConfig.journal;
                        const Icon = config.icon;

                        return (
                            <div
                                key={voucher.id}
                                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors group"
                            >
                                <div className="col-span-3">
                                    <Link
                                        to={`/vouchers/${voucher.id}`}
                                        className="font-medium text-sm text-blue-600 hover:underline transition-colors"
                                    >
                                        {voucher.voucherNo}
                                    </Link>
                                    {voucher.narration && (
                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                            {voucher.narration}
                                        </p>
                                    )}
                                </div>
                                <div className="col-span-3 text-sm truncate text-gray-700">{voucher.party}</div>
                                <div className="col-span-2">
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-1.5 text-xs font-medium",
                                            config.color
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {config.label}
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        "col-span-2 text-right font-medium text-sm tabular-nums",
                                        voucher.type === "payment" || voucher.type === "purchase"
                                            ? "text-red-700"
                                            : "text-green-700"
                                    )}
                                >
                                    {formatCurrency(voucher.amount)}
                                </div>
                                <div className="col-span-2 text-sm text-gray-500">
                                    {voucher.date}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
