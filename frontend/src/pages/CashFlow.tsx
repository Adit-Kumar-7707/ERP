import { useEffect, useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function CashFlow() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        api.get("/analytics/cash-flow")
            .then(res => setData(res.data))
            .catch(err => console.error(err));

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate("/");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    if (!data) return <div className="p-4">Loading...</div>;

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm">
            <div className="bg-tally-blue text-white p-1 text-center font-bold">
                Cash Flow Statement
            </div>

            <div className="flex justify-between border-b-2 border-dashed border-gray-400 p-2 font-bold bg-gray-100">
                <div className="w-32">Month</div>
                <div className="w-32 text-right">Inflow</div>
                <div className="w-32 text-right">Outflow</div>
                <div className="w-32 text-right">Net Flow</div>
            </div>

            <div className="flex-1 overflow-auto">
                {data.items.map((item: any) => (
                    <div key={item.month} className="flex justify-between p-2 hover:bg-yellow-100 border-b border-gray-100">
                        <div className="w-32 font-bold">{item.month}</div>
                        <div className="w-32 text-right text-green-700">{item.inflow.toFixed(2)}</div>
                        <div className="w-32 text-right text-red-700">{item.outflow.toFixed(2)}</div>
                        <div className="w-32 text-right font-bold">{item.net.toFixed(2)}</div>
                    </div>
                ))}
            </div>

            <div className="bg-tally-lemon p-2 border-t font-bold flex justify-between">
                <div className="w-32">Total</div>
                <div className="w-32 text-right">{data.total_inflow.toFixed(2)}</div>
                <div className="w-32 text-right">{data.total_outflow.toFixed(2)}</div>
                <div className="w-32 text-right">{data.net_flow.toFixed(2)}</div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Quit
            </div>
        </div>
    );
}
