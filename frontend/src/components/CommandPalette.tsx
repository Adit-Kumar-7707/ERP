import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface CommandAction {
    id: string;
    label: string;
    description?: string;
    action: () => void;
    group: "Navigation" | "Action" | "Report";
}

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Define all available commands
    const actions: CommandAction[] = useMemo(() => [
        // Reports
        { id: "goto_bs", label: "Balance Sheet", group: "Report", action: () => navigate("/balance-sheet") },
        { id: "goto_tb", label: "Trial Balance", group: "Report", action: () => navigate("/trial-balance") },
        { id: "goto_pl", label: "Profit & Loss", group: "Report", action: () => navigate("/pl") },
        { id: "goto_daybook", label: "Day Book", group: "Report", action: () => navigate("/day-book") },
        { id: "goto_stock_summary", label: "Stock Summary", group: "Report", action: () => navigate("/stock-summary") },
        { id: "goto_ratios", label: "Ratio Analysis", group: "Report", action: () => navigate("/ratios") },
        { id: "goto_cashflow", label: "Cash Flow", group: "Report", action: () => navigate("/cash-flow") },
        { id: "goto_coa", label: "Chart of Accounts", group: "Report", action: () => navigate("/chart-of-accounts") },

        // Actions
        { id: "create_voucher", label: "Create Voucher", group: "Action", action: () => navigate("/voucher-entry") },
        { id: "create_ledger", label: "Create Ledger", group: "Action", action: () => navigate("/masters/ledger") },
        { id: "create_item", label: "Create Stock Item", group: "Action", action: () => navigate("/masters/stock-item") },
        { id: "create_unit", label: "Create Unit", group: "Action", action: () => navigate("/masters/unit") },
        { id: "create_group", label: "Create Stock Group", group: "Action", action: () => navigate("/masters/stock-group") },

        // Navigation
        { id: "goto_gateway", label: "Gateway of Tally", group: "Navigation", action: () => navigate("/") },
        { id: "goto_print", label: "Print Current View (Ctrl+P)", group: "Navigation", action: () => window.print() },
    ], [navigate]);

    // Filtered items
    const filteredItems = useMemo(() => {
        if (!query) return actions;
        const lowerQuery = query.toLowerCase();
        return actions.filter(item =>
            item.label.toLowerCase().includes(lowerQuery) ||
            item.group.toLowerCase().includes(lowerQuery)
        );
    }, [query, actions]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query, isOpen]);

    // Handle Global Keydown to Open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt+G (Tally Standard) or Ctrl+K (Modern Standard)
            if ((e.altKey && e.key === "g") || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            // Close on Escape if open
            if (isOpen && e.key === "Escape") {
                e.preventDefault(); // Prevent bubbling to other ESC listeners
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle List Navigation
    const handleListKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const item = filteredItems[selectedIndex];
            if (item) {
                item.action();
                setIsOpen(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-24">
            <div className="bg-white w-[600px] shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[60vh] border border-tally-blue">
                {/* Header */}
                <div className="p-3 bg-tally-yellow border-b border-yellow-500 flex justify-between items-center">
                    <span className="font-bold text-tally-text">Go To (Switch to)</span>
                    <span className="text-xs text-gray-700 font-mono">[Esc] Close</span>
                </div>

                {/* Input */}
                <div className="p-2 border-b">
                    <input
                        ref={inputRef}
                        className="w-full text-lg p-2 border border-gray-300 rounded focus:border-tally-blue focus:ring-1 focus:ring-tally-blue outline-none"
                        placeholder="Search reports, masters, or actions..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleListKeyDown}
                    />
                </div>

                {/* List */}
                <div ref={listRef} className="flex-1 overflow-y-auto p-1 bg-gray-50">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No results found</div>
                    ) : (
                        filteredItems.map((item, index) => (
                            <div
                                key={item.id}
                                className={`
                                    p-3 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center
                                    ${index === selectedIndex ? "bg-tally-blue text-white" : "hover:bg-gray-200 text-gray-800"}
                                `}
                                onClick={() => {
                                    item.action();
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="font-medium">{item.label}</div>
                                <div className={`text-xs ${index === selectedIndex ? "text-blue-100" : "text-gray-500"}`}>
                                    {item.group}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
