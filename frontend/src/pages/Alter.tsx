import { useNavigate } from "react-router-dom";
import { useMenuNavigation } from "@/hooks/useMenuNavigation";
import { cn } from "@/lib/utils";

const ALTER_ITEMS = [
    { label: "Legder", action: "ledger" },
    { label: "Group", action: "group", disabled: true },
    { label: "Stock Item", action: "item" },
    { label: "Stock Group", action: "stock_group", disabled: true },
    { label: "Unit", action: "unit", disabled: true },
    { label: "Quit", action: "quit", separator: true },
];

export default function Alter() {
    const navigate = useNavigate();
    const { selectedIndex } = useMenuNavigation(ALTER_ITEMS, (item) => {
        if (item.action === "quit") {
            navigate("/");
        } else if (item.action === "ledger") {
            navigate("/alter/ledger");
        } else if (item.action === "item") {
            navigate("/alter/item");
        }
    });

    return (
        <div className="flex h-full items-center justify-center bg-tally-bg">
            <div className="w-80 bg-white border shadow-lg">
                <div className="bg-tally-blue text-white font-bold text-center py-1 uppercase text-sm border-b-2 border-yellow-400">
                    Master Alteration
                </div>
                <div className="py-2 flex flex-col">
                    {ALTER_ITEMS.map((item, idx) => (
                        <div key={item.label}>
                            {item.separator && <div className="h-4"></div>}
                            <div
                                className={cn(
                                    "px-6 py-1 cursor-pointer font-semibold flex items-center justify-center relative",
                                    selectedIndex === idx ? "bg-tally-blue text-white" : "text-gray-800 hover:bg-yellow-100",
                                    item.disabled && "text-gray-400"
                                )}
                            >
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="absolute bottom-0 w-full bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Back
            </div>
        </div>
    );
}
