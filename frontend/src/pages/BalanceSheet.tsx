import { useEffect, useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useTally } from "@/context/TallyContext";

interface ReportNode {
    id: number;
    name: string;
    total_balance: number;
    children: ReportNode[];
    ledgers: { id: number; name: string; closing_balance: number }[];
}

interface BSResponse {
    assets: ReportNode[];
    liabilities: ReportNode[];
    totals: {
        total_assets_ledgers: number;
        total_liabilities_ledgers: number;
        closing_stock: number;
        net_profit: number;
        grand_total_assets: number;
        grand_total_liabilities: number;
    };
}

export default function BalanceSheet() {
    const navigate = useNavigate();
    const { periodEnd } = useTally();
    const [data, setData] = useState<BSResponse | null>(null);
    const [loading, setLoading] = useState(true);
    // Expand states for Left (Liab) and Right (Asset)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setLoading(true);
        api.get(`/reports/balance-sheet?end_date=${periodEnd}`)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate("/");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, periodEnd]);

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderNode = (node: ReportNode, level: number) => {
        const hasChildren = (node.children?.length > 0) || (node.ledgers?.length > 0);
        const isExpanded = expanded[node.id];
        const padding = level * 16;
        const bal = Math.abs(node.total_balance);

        return (
            <div key={node.id}>
                <div
                    className={`flex justify-between hover:bg-yellow-50 cursor-pointer ${level === 0 ? "font-bold" : ""} ${hasChildren ? "text-tally-blue" : "text-gray-700"}`}
                    style={{ paddingLeft: `${padding}px` }}
                    onClick={() => hasChildren && toggleExpand(String(node.id))}
                >
                    <div className="truncate pr-2">{node.name}</div>
                    <div className="whitespace-nowrap">{bal.toFixed(2)}</div>
                </div>
                {isExpanded && (
                    <div>
                        {node.children.map(c => renderNode(c, level + 1))}
                        {node.ledgers.map(l => (
                            <div key={`l-${l.id}`} className="flex justify-between hover:bg-blue-50 text-gray-500 italic pl-4 text-xs"
                                style={{ paddingLeft: `${padding + 16}px` }}
                                onClick={() => navigate(`/report/ledger/${l.id}`)}
                            >
                                <div>{l.name}</div>
                                <div>{Math.abs(l.closing_balance).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading || !data) return <div className="p-4">Loading Balance Sheet...</div>;

    const { assets, liabilities, totals } = data;

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm max-w-6xl mx-auto border shadow-lg my-2">
            <div className="bg-tally-blue text-white p-2 text-center font-bold text-lg">
                Balance Sheet
            </div>
            <div className="text-center bg-gray-100 border-b p-1 text-xs">
                As of {periodEnd}
            </div>

            <div className="flex flex-1 overflow-auto">
                {/* Liabilities Side (Left) */}
                <div className="flex-1 border-r border-gray-300 flex flex-col">
                    <div className="font-bold text-center border-b p-2 bg-gray-50">Liabilities</div>
                    <div className="p-2 flex-1 overflow-auto">
                        {/* Capital / Loans / Liabilities Nodes */}
                        {liabilities.map(n => renderNode(n, 0))}

                        {/* Profit & Loss Account (If Positive Profit) */}
                        {totals.net_profit > 0 && (
                            <div className="flex justify-between font-bold text-green-700 mt-2 border-t pt-1">
                                <div>Profit & Loss A/c</div>
                                <div>{totals.net_profit.toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                    <div className="p-2 font-bold border-t bg-gray-100 flex justify-between text-lg">
                        <div>Total</div>
                        <div>{totals.grand_total_liabilities.toFixed(2)}</div>
                    </div>
                </div>

                {/* Assets Side (Right) */}
                <div className="flex-1 flex flex-col">
                    <div className="font-bold text-center border-b p-2 bg-gray-50">Assets</div>
                    <div className="p-2 flex-1 overflow-auto">
                        {/* Fixed Assets / Current Assets Nodes */}
                        {assets.map(n => renderNode(n, 0))}

                        {/* Closing Stock */}
                        {totals.closing_stock > 0 && (
                            <div className="flex justify-between font-bold text-blue-700 mt-2 border-t pt-1">
                                <div>Closing Stock</div>
                                <div>{totals.closing_stock.toFixed(2)}</div>
                            </div>
                        )}

                        {/* Loss (if any) */}
                        {totals.net_profit < 0 && (
                            <div className="flex justify-between font-bold text-red-700 mt-2 border-t pt-1">
                                <div>Profit & Loss A/c (Loss)</div>
                                <div>{Math.abs(totals.net_profit).toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                    <div className="p-2 font-bold border-t bg-gray-100 flex justify-between text-lg">
                        <div>Total</div>
                        <div>{totals.grand_total_assets.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Quit | [Enter] Drill Down
            </div>
        </div>
    );
}
