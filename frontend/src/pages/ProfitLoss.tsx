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

interface PLResponse {
    income: ReportNode[];
    expenses: ReportNode[];
    totals: {
        total_income_ledgers: number;
        total_expense_ledgers: number;
        opening_stock: number;
        closing_stock: number;
        net_profit: number;
    };
}

export default function ProfitLoss() {
    const navigate = useNavigate();
    const { periodStart, periodEnd } = useTally();
    const [data, setData] = useState<PLResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setLoading(true);
        api.get(`/reports/profit-loss?start_date=${periodStart}&end_date=${periodEnd}`)
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
    }, [navigate, periodStart, periodEnd]);

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

    if (loading || !data) return <div className="p-4">Loading Profit & Loss...</div>;

    const { income, expenses, totals } = data;
    const totalExpensesWithStock = totals.total_expense_ledgers + totals.opening_stock;
    const totalIncomeWithStock = totals.total_income_ledgers + totals.closing_stock;
    // The side totals must balance. Whichever is higher determines the grand total, and the difference is Net Profit/Loss.
    const grandTotal = Math.max(totalExpensesWithStock, totalIncomeWithStock);

    // If Net Profit is positive, it sits on Expenses side to balance.
    // If Net Profit is negative (Loss), it sits on Income side.
    const isProfit = totals.net_profit >= 0;

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm max-w-6xl mx-auto border shadow-lg my-2">
            <div className="bg-tally-blue text-white p-2 text-center font-bold text-lg">
                Profit & Loss A/c
            </div>
            <div className="text-center bg-gray-100 border-b p-1 text-xs">
                For {periodStart} to {periodEnd}
            </div>

            <div className="flex flex-1 overflow-auto">
                {/* Expenses Side (Left) */}
                <div className="flex-1 border-r border-gray-300 flex flex-col">
                    <div className="font-bold text-center border-b p-2 bg-gray-50">Particulars (Expenses)</div>
                    <div className="p-2 flex-1 overflow-auto">
                        {/* Opening Stock */}
                        <div className="flex justify-between font-bold mb-2">
                            <div>Opening Stock</div>
                            <div>{totals.opening_stock.toFixed(2)}</div>
                        </div>

                        {/* Purchase / Direct Expenses / Indirect Expenses */}
                        {expenses.map(n => renderNode(n, 0))}

                        {/* Net Profit (Balancing Figure) */}
                        {isProfit && (
                            <div className="flex justify-between font-bold text-green-700 mt-4 border-t pt-2">
                                <div>Net Profit</div>
                                <div>{totals.net_profit.toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                    <div className="p-2 font-bold border-t bg-gray-100 flex justify-between text-lg">
                        <div>Total</div>
                        <div>{(isProfit ? grandTotal : totalExpensesWithStock).toFixed(2)}</div>
                    </div>
                </div>

                {/* Income Side (Right) */}
                <div className="flex-1 flex flex-col">
                    <div className="font-bold text-center border-b p-2 bg-gray-50">Particulars (Income)</div>
                    <div className="p-2 flex-1 overflow-auto">
                        {/* Sales / Direct / Indirect Income */}
                        {income.map(n => renderNode(n, 0))}

                        {/* Closing Stock */}
                        {totals.closing_stock > 0 && (
                            <div className="flex justify-between font-bold text-blue-700 mt-2 border-t pt-1">
                                <div>Closing Stock</div>
                                <div>{totals.closing_stock.toFixed(2)}</div>
                            </div>
                        )}

                        {/* Net Loss (Balancing Figure) */}
                        {!isProfit && (
                            <div className="flex justify-between font-bold text-red-700 mt-4 border-t pt-2">
                                <div>Net Loss</div>
                                <div>{Math.abs(totals.net_profit).toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                    <div className="p-2 font-bold border-t bg-gray-100 flex justify-between text-lg">
                        <div>Total</div>
                        <div>{(!isProfit ? grandTotal : totalIncomeWithStock).toFixed(2)}</div>
                    </div>
                </div>
            </div>
            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Quit | [Enter] Drill Down
            </div>
        </div>
    );
}
