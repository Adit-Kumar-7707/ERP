import { useEffect, useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function Banking() {
    const navigate = useNavigate();
    const [banks, setBanks] = useState<any[]>([]);

    useEffect(() => {
        // Fetch All Ledgers, Filter for "Bank" parent group.
        // Ideally backend does filter.
        api.get("/accounting/ledgers").then(res => {
            // Heuristic: Parent Name contains "Bank" or Group Nature is Asset (too broad).
            // Better: Check Group. Wait, I only have GroupId.
            // I need to fetch groups too to know names.
            // Or assume user put them in "Bank Accounts" (Standard).

            // Fetch Groups too
            api.get("/accounting/chart-of-accounts").then(gRes => {
                // Find IDs of groups named "Bank"
                const findBankGroupIds = (groups: any[]): number[] => {
                    let ids: number[] = [];
                    groups.forEach(g => {
                        if (g.name.includes("Bank")) ids.push(g.id);
                        if (g.children) ids = [...ids, ...findBankGroupIds(g.children)];
                    });
                    return ids;
                };
                const bankGroupIds = findBankGroupIds(gRes.data);

                const bankLedgers = res.data.filter((l: any) => bankGroupIds.includes(l.group_id));
                setBanks(bankLedgers);
            });
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate("/");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm max-w-4xl mx-auto border shadow my-4">
            <div className="bg-tally-blue text-white p-2 text-center font-bold text-lg">
                Utility: Banking
            </div>

            <div className="p-4 bg-gray-100 font-bold border-b">Select Bank to Reconcile:</div>

            <div className="flex-1 overflow-auto bg-white">
                {banks.length === 0 ? (
                    <div className="p-4 text-gray-500">No Bank Ledgers Found. Ensure you have created ledgers under 'Bank Accounts'.</div>
                ) : (
                    banks.map(b => (
                        <div
                            key={b.id}
                            className="p-3 border-b border-dotted hover:bg-yellow-100 cursor-pointer flex justify-between"
                            onClick={() => navigate(`/bank-reconcile/${b.id}`)}
                        >
                            <span className="font-bold text-tally-text">{b.name}</span>
                            <span>{b.closing_balance?.toFixed(2)}</span>
                        </div>
                    ))
                )}
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Back
            </div>
        </div>
    );
}
