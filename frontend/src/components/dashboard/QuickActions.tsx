import { Link } from "react-router-dom";
import {
    Wallet,
    IndianRupee,
    ArrowLeftRight,
    FileSpreadsheet,
    TrendingUp,
    ShoppingCart,
    Plus,
    BookOpen,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
    title: string;
    description: string;
    href: string;
    icon: any;
    shortcut?: string[];
    color: "default" | "credit" | "debit" | "warning";
}

const quickActions: QuickAction[] = [
    {
        title: "Payment",
        description: "Record outgoing payment",
        href: "/vouchers/payment",
        icon: Wallet,
        shortcut: ["F5"],
        color: "debit",
    },
    {
        title: "Receipt",
        description: "Record incoming receipt",
        href: "/vouchers/receipt",
        icon: IndianRupee,
        shortcut: ["F6"],
        color: "credit",
    },
    {
        title: "Contra",
        description: "Bank-Cash transfer",
        href: "/vouchers/contra",
        icon: ArrowLeftRight,
        shortcut: ["F4"],
        color: "default",
    },
    {
        title: "Voucher",
        description: "Standard Voucher Entry",
        href: "/vouchers",
        icon: FileSpreadsheet,
        shortcut: ["V"],
        color: "default",
    },
    {
        title: "Sales",
        description: "Create sales invoice",
        href: "/vouchers/sales",
        icon: TrendingUp,
        shortcut: ["F8"],
        color: "credit",
    },
    {
        title: "Purchase",
        description: "Record purchase",
        href: "/vouchers/purchase",
        icon: ShoppingCart,
        shortcut: ["F9"],
        color: "debit",
    },
];

const secondaryActions = [
    { title: "New Ledger", href: "/ledgers/create", icon: Plus },
    { title: "Report Center", href: "/reports", icon: BookOpen },
    { title: "Banking", href: "/banking", icon: Users },
];

const colorStyles = {
    default: "border-gray-200 hover:border-blue-300",
    credit: "border-l-4 border-l-green-500 hover:border-green-300",
    debit: "border-l-4 border-l-red-500 hover:border-red-300",
    warning: "border-l-4 border-l-yellow-500 hover:border-yellow-300",
};

export const QuickActions = () => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-tally-blue">Quick Actions</h2>
                <span className="text-xs text-gray-500">
                    Press function keys for shortcuts
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {quickActions.map((action) => (
                    <Link
                        key={action.title}
                        to={action.href}
                        className={cn(
                            "bg-white border rounded-lg p-4 transition-all duration-150 hover:shadow-md group",
                            colorStyles[action.color]
                        )}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                <action.icon className="h-4 w-4 text-gray-700" />
                            </div>
                            {action.shortcut && (
                                <span className="text-[10px] border px-1 rounded bg-gray-100 font-mono">{action.shortcut[0]}</span>
                            )}
                        </div>
                        <h3 className="font-medium text-sm text-gray-800">{action.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {action.description}
                        </p>
                    </Link>
                ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
                {secondaryActions.map((action) => (
                    <Link
                        key={action.title}
                        to={action.href}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-700 border rounded-md hover:bg-gray-50 transition-colors"
                    >
                        <action.icon className="h-3.5 w-3.5" />
                        {action.title}
                    </Link>
                ))}
            </div>
        </div>
    );
};
