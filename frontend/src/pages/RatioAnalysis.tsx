import { useEffect, useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function RatioAnalysis() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        api.get("/analytics/ratio-analysis")
            .then(res => setData(res.data))
            .catch(err => console.error(err));

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate("/");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    if (!data) return <div className="p-4">Loading...</div>;

    const Row = ({ label, value, subLabel }: { label: string, value: string | number, subLabel?: string }) => (
        <div className="flex justify-between border-b border-dashed border-gray-300 py-1 hover:bg-yellow-50">
            <div className="w-1/2">
                <div className="font-semibold text-tally-text">{label}</div>
                {subLabel && <div className="text-xs text-gray-500 italic">{subLabel}</div>}
            </div>
            <div className="w-1/2 text-right font-bold text-blue-800 font-mono">
                {value}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white font-sans text-sm">
            <div className="bg-tally-blue text-white p-1 text-center font-bold">
                Ratio Analysis
            </div>

            <div className="p-4 max-w-4xl mx-auto w-full">
                <div className="grid grid-cols-2 gap-8">
                    {/* Left Column: Liquidity */}
                    <div className="border border-gray-200 p-2 shadow-sm bg-white">
                        <div className="text-center font-bold text-gray-700 border-b mb-2">Principal Groups</div>
                        <Row label="Working Capital" value={data.working_capital.toFixed(2)} subLabel="Current Assets - Current Liabilities" />
                        <Row label="Current Ratio" value={data.current_ratio.toFixed(2)} subLabel="Current Assets / Current Liabilities" />
                        <Row label="Quick Ratio" value={data.quick_ratio.toFixed(2)} subLabel="(CA - Stock) / CL" />
                        <Row label="Debt/Equity Ratio" value={data.debt_equity_ratio.toFixed(2)} subLabel="Debt / Net Worth" />
                    </div>

                    {/* Right Column: Profitability */}
                    <div className="border border-gray-200 p-2 shadow-sm bg-white">
                        <div className="text-center font-bold text-gray-700 border-b mb-2">Profitability Ratios</div>
                        <Row label="Gross Profit %" value={data.gross_profit_percent.toFixed(2) + " %"} />
                        <Row label="Net Profit %" value={data.net_profit_percent.toFixed(2) + " %"} />
                        <Row label="Return on Working Capital" value={data.return_on_working_capital.toFixed(2) + " %"} />
                    </div>
                </div>
            </div>

            <div className="mt-auto bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Quit
            </div>
        </div>
    );
}
