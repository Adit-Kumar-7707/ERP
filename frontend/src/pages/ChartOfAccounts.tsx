import { useEffect, useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

// Types matching Backend
interface Ledger {
    id: number;
    name: string;
    opening_balance: number;
}
interface Group {
    id: number;
    name: string;
    nature: string;
    children: Group[];
    ledgers: Ledger[];
}

export default function ChartOfAccounts() {
    const [data, setData] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Flatten logic for Keyboard Navigation (Tally uses linear navigation over tree)
    // We will build a flat list of visible items to handle traversing.
    // For MVP Phase 1: Just render the tree.

    useEffect(() => {
        api.get("/accounting/chart-of-accounts")
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    // Handle ESC to go back
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    if (loading) return <div className="p-4 font-mono">Loading Chart of Accounts...</div>;

    return (
        <div className="flex h-full flex-col bg-white">
            {/* Tally Header */}
            <div className="bg-tally-blue text-white font-bold px-2 py-1 flex justify-between text-sm">
                <span>Chart of Accounts</span>
                <span>My Company Ltd</span>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-auto p-2 font-mono text-sm">
                <div className="grid grid-cols-[1fr_100px] border-b border-gray-400 font-bold mb-2">
                    <div>Particulars</div>
                    <div className="text-right">Balance</div>
                </div>

                {data.map(group => (
                    <GroupNode key={group.id} group={group} level={0} />
                ))}
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Quit  [Enter] Drill Down
            </div>
        </div>
    );
}

function GroupNode({ group, level }: { group: Group, level: number }) {
    // Tally Style: Groups are Bold/Italic? Tally Prime Groups are Bold. Ledgers are Normal/Italic.
    // Let's stick to: Groups = Bold, Ledgers = Normal.

    return (
        <>
            <div className="cursor-pointer hover:bg-yellow-100 flex justify-between">
                <div style={{ paddingLeft: `${level * 20}px` }} className="font-bold text-tally-text">
                    {group.name}
                </div>
                <div className="text-right">
                    {/* Calc Totals later */}
                </div>
            </div>

            {/* Ledger Children */}
            {group.ledgers.map(ledger => (
                <div key={ledger.id} className="cursor-pointer hover:bg-yellow-100 flex justify-between text-gray-700 italic">
                    <div style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                        {ledger.name}
                    </div>
                    <div className="text-right">
                        {ledger.opening_balance.toFixed(2)}
                    </div>
                </div>
            ))}

            {/* Sub Groups */}
            {group.children.map(child => (
                <GroupNode key={child.id} group={child} level={level + 1} />
            ))}
        </>
    );
}
