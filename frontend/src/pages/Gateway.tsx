import { useMenuNavigation } from "@/hooks/useMenuNavigation";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useTally } from "@/context/TallyContext";
import { useAuth } from "@/context/AuthContext";

const MENU_ITEMS = [
    { label: "Create", action: "create" },
    { label: "Alter", action: "alter" },
    { label: "Chart of Accounts", action: "chart" },
    { label: "Voucher Entry", action: "vouchers" },
    { label: "Day Book", action: "daybook" },
    { label: "Stock Summary", action: "stock_summary" },
    { label: "Balance Sheet", action: "balance_sheet", separator: true },
    { label: "Profit & Loss A/c", action: "pl", path: "/pl" },
    { label: "Ratio Analysis", action: "ratio", disabled: true },
    { label: "Display More Reports", action: "more", separator: true },
    { label: "Dashboard", action: "dashboard" },
    { label: "Company Settings (F11)", action: "settings" },
    { label: "Banking", action: "banking" },
    { label: "Import Data", action: "import" },
    { label: "Quit", action: "quit", separator: true },
];

export default function Gateway() {
    const navigate = useNavigate();
    const { currentDate, periodStart, periodEnd } = useTally();
    const { logout } = useAuth();

    // Formatting Date
    const displayDate = new Date(currentDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    const pStart = new Date(periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const pEnd = new Date(periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const { selectedIndex } = useMenuNavigation(MENU_ITEMS, (item) => {
        switch (item.action) {
            case "create": return navigate("/masters/create");
            case "alter": return navigate("/alter");
            case "chart": return navigate("/chart-of-accounts");
            case "vouchers": return navigate("/voucher-entry");
            case "daybook": return navigate("/day-book");
            case "stock_summary": return navigate("/stock-summary");
            case "balance_sheet": return navigate("/report/balance-sheet");
            case "pl": return navigate("/report/profit-loss");
            case "more": return navigate("/report/trial-balance"); // MVP Shortcut
            case "settings": return navigate("/settings/company");
            case "banking": return navigate("/banking");
            case "import": return navigate("/import");
            case "dashboard": return navigate("/dashboard");
            case "quit":
                if (confirm("Quit?")) logout();
                break;
            default: break;
        }
    }, () => {
        // On Escape
        if (confirm("Quit?")) logout();
    });

    return (
        <div className="flex h-full">
            {/* Left Panel: Info */}
            <div className="w-1/2 p-1 flex flex-col gap-1 bg-white border-r">
                <div className="flex gap-1 h-32">
                    <div className="w-1/2 border p-2 bg-tally-lemon">
                        <div className="text-xs text-tally-blue font-bold uppercase mb-1">Current Period</div>
                        <div className="font-mono font-bold">{pStart} to {pEnd}</div>
                    </div>
                    <div className="w-1/2 border p-2 bg-tally-lemon">
                        <div className="text-xs text-tally-blue font-bold uppercase mb-1">Current Date</div>
                        <div className="font-mono font-bold">{displayDate}</div>
                    </div>
                </div>

                <div className="flex-1 border bg-tally-lemon flex flex-col">
                    <div className="flex justify-between px-2 py-1 bg-tally-blue text-white font-bold text-xs uppercase">
                        <span>Name of Company</span>
                        <span>Date of Last Entry</span>
                    </div>
                    <div className="p-2 font-bold font-mono flex justify-between">
                        <span>My Demo Company</span>
                        <span>{displayDate}</span>
                    </div>
                </div>
            </div>

            {/* Right Panel: The MENU */}
            <div className="w-1/2 bg-tally-bg flex items-center justify-center p-8">
                <div className="w-80 shadow-lg border bg-white">
                    <div className="bg-tally-blue text-white font-bold text-center py-1 uppercase text-sm border-b-2 border-yellow-400">
                        Gateway of Tally
                    </div>
                    <div className="py-2 flex flex-col">
                        {MENU_ITEMS.map((item, idx) => (
                            <div key={item.label}>
                                {item.separator && <div className="h-4"></div>}
                                <div
                                    className={cn(
                                        "px-6 py-1 cursor-pointer font-semibold flex items-center justify-center relative",
                                        selectedIndex === idx ? "bg-tally-blue text-white" : "text-gray-800 hover:bg-yellow-100"
                                    )}
                                >
                                    {/* Highlight First Letter logic needed later for hotkeys */}
                                    <span className="first-letter:text-red-500 first-letter:font-bold">{item.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
