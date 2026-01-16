import { useNavigate } from "react-router-dom";
import { useMenuNavigation } from "@/hooks/useMenuNavigation";
import { cn } from "@/lib/utils";

const MASTERS_MENU = [
    { label: "Group", action: "group", disabled: true },
    { label: "Ledger", action: "ledger" },
    { label: "Currency", action: "currency", disabled: true },
    { label: "Voucher Type", action: "vouchertype" },
    { label: "Stock Group", action: "stockgroup" },
    { label: "Stock Item", action: "stockitem" },
    { label: "Unit", action: "unit" },
    { label: "User", action: "user", separator: true },
];

export default function MasterCreate() {
    const navigate = useNavigate();

    const { selectedIndex } = useMenuNavigation(MASTERS_MENU, (item) => {
        if (item.action === "ledger") {
            navigate("/masters/ledger");
        } else if (item.action === "unit") {
            navigate("/masters/unit");
        } else if (item.action === "vouchertype") {
            navigate("/masters/voucher-type");
        } else if (item.action === "stockgroup") {
            navigate("/masters/stock-group");
        } else if (item.action === "stockitem") {
            navigate("/masters/stock-item");
        } else if (item.action === "user") {
            navigate("/masters/user");
        }
    }, () => navigate(-1));

    return (
        <div className="h-full flex flex-col bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Gateway of Tally &gt; Create</div>
            </div>

            <div className="flex-1 flex justify-center items-center">
                <div className="w-96 border-2 border-tally-border bg-tally-panel shadow-lg">
                    <div className="bg-tally-yellow text-tally-text font-bold text-center py-1 border-b border-tally-border">
                        List of Masters
                    </div>

                    <div className="bg-white min-h-[300px]">
                        <div className="text-center font-bold text-gray-500 py-1 bg-gray-100 text-xs">Accounting Masters</div>
                        {MASTERS_MENU.map((item, idx) => (
                            <div
                                key={item.label}
                                className={cn(
                                    "px-4 py-1 cursor-pointer flex justify-between",
                                    selectedIndex === idx ? "bg-tally-blue text-white" : "text-tally-text",
                                    item.disabled && "text-gray-400"
                                )}
                            >
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Back
            </div>
        </div>
    );
}
