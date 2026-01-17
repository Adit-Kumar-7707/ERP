import { useEffect, useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useTally } from "@/context/TallyContext";
// import { formatCurrency } from "@/utils/format";

interface ReportNode {
    id: number;
    name: string;
    nature: string;
    closing_balance: number; // Direct
    total_balance: number;   // Cumulative
    children: ReportNode[];
    ledgers: {
        id: number;
        name: string;
        closing_balance: number;
    }[];
}

export default function TrialBalance() {
    const navigate = useNavigate();
    const { periodEnd } = useTally(); // TB is "As On" usually
    const [data, setData] = useState<ReportNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setLoading(true);
        api.get(`/reports/trial-balance?end_date=${periodEnd}`)
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
            if (e.altKey && e.key === "F1") {
                e.preventDefault();
                // Expand All Logic could go here
                setExpanded((prev): Record<string, boolean> => (Object.keys(prev).length > 0 ? {} : { "ALL": true }));
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, periodEnd]);

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderNode = (node: ReportNode, level: number) => {
        const hasChildren = (node.children && node.children.length > 0) || (node.ledgers && node.ledgers.length > 0);
        const isExpanded = expanded[node.id] || expanded["ALL"];
        const padding = level * 20;

        // Formatting: If balance > 0 => Dr, < 0 => Cr (Usually)
        // In TB, typically:
        // Debit Balance displayed in Debit Col?
        // Or condensed: Name | Closing Balance (Dr/Cr)

        const bal = node.total_balance;
        const absBal = Math.abs(bal);
        const drCr = bal > 0 ? "Dr" : (bal < 0 ? "Cr" : "");

        return (
            <div key={`g-${node.id}`}>
                {/* Group Row */}
                <div
                    className={`flex py-1 px-2 border-b border-dotted border-gray-300 hover:bg-yellow-100 cursor-pointer ${level === 0 ? "font-bold text-base" : "text-sm"} ${hasChildren ? "text-tally-text" : "text-gray-600"}`}
                    onClick={() => hasChildren && toggleExpand(String(node.id))}
                >
                    <div className="flex-1" style={{ paddingLeft: `${padding}px` }}>
                        {node.name}
                    </div>
                    <div className="w-40 text-right font-medium">
                        {bal !== 0 ? `${absBal.toFixed(2)} ${drCr}` : ""}
                    </div>
                </div>

                {/* Children */}
                {isExpanded && (
                    <div>
                        {/* Sub Groups */}
                        {node.children.map(child => renderNode(child, level + 1))}

                        {/* Direct Ledgers */}
                        {node.ledgers.map(l => {
                            const lBal = l.closing_balance;
                            const lAbs = Math.abs(lBal);
                            const lDrCr = lBal > 0 ? "Dr" : (lBal < 0 ? "Cr" : "");

                            return (
                                <div
                                    key={`l-${l.id}`}
                                    className="flex py-1 px-2 border-b border-dotted border-gray-200 hover:bg-blue-50 cursor-pointer italic text-gray-700"
                                    onClick={() => navigate(`/report/ledger/${l.id}`)}
                                >
                                    <div className="flex-1" style={{ paddingLeft: `${padding + 20}px` }}>
                                        {l.name}
                                    </div>
                                    <div className="w-40 text-right">
                                        {lBal !== 0 ? `${lAbs.toFixed(2)} ${lDrCr}` : ""}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Calculate Grand Totals (Dr and Cr columns)
    // Actually our API returns Net Balance per group. 
    // Usually TB has explicit Dr Total and Cr Total at bottom.
    // Sum of all Root Nodes should be 0.

    const totalDiff = data.reduce((acc, node) => acc + node.total_balance, 0);

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm">
            <div className="bg-tally-blue text-white p-1 text-center font-bold">
                Trial Balance (As of {periodEnd})
            </div>

            <div className="flex justify-between border-b-2 border-dashed border-gray-400 p-2 font-bold bg-gray-100">
                <div className="flex-1 text-center">Particulars</div>
                <div className="w-40 text-right">Closing Balance</div>
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? <div className="p-4 text-center">Loading Data...</div> : data.map(node => renderNode(node, 0))}
            </div>

            <div className="bg-tally-lemon p-2 border-t font-bold flex justify-between">
                <div className="flex-1">Grand Total (Diff)</div>
                <div className="w-40 text-right">{Math.abs(totalDiff).toFixed(2)} {totalDiff > 0 ? "Dr" : (totalDiff < 0 ? "Cr" : "")}</div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Quit | [Alt+F1] Expand/Collapse | [Enter] Drill Down
            </div>
        </div>
    );
}

