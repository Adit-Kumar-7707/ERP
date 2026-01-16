import { useEffect, useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useTally } from "@/context/TallyContext";

interface StockValuationResponse {
    stock_item_id: number;
    stock_item_name: string;
    closing_quantity: number;
    closing_rate: number;
    closing_value: number;
}

export default function StockSummary() {
    const navigate = useNavigate();
    const { periodStart, periodEnd } = useTally();
    const [items, setItems] = useState<StockValuationResponse[] | null>(null);

    useEffect(() => {
        // Fetch All Items and their Valuation
        const fetchStock = async () => {
            try {
                // We need an endpoint that returns the summary for ALL items.
                // Currently we have /inventory/items (list) and /inventory/items/:id/valuation.
                // Calling valuation for each item is N+1.
                // We should make a bulk endpoint: /inventory/valuation-summary?date=...

                // Assuming I will create this endpoint.
                const res = await api.get(`/inventory/valuation-summary?end_date=${periodEnd}`);
                setItems(res.data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchStock();
    }, [periodEnd]);

    if (!items) return <div>Loading Stock Summary...</div>;

    // Grouping Logic (by Parent Group) to be added later. Flat list for now.

    const totalValue = items.reduce((sum, i) => sum + i.closing_value, 0);

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm">
            <div className="bg-tally-blue text-white p-1 text-center font-bold">
                Stock Summary
            </div>
            <div className="flex justify-between border-b-2 border-dashed border-gray-400 p-2 font-bold bg-gray-100">
                <div className="flex-1">Particulars</div>
                <div className="w-32 text-center">Quantity</div>
                <div className="w-32 text-center">Rate</div>
                <div className="w-32 text-center">Value</div>
            </div>

            <div className="flex-1 overflow-auto">
                {items.map(item => (
                    <div
                        key={item.stock_item_id}
                        className="flex border-b border-dotted hover:bg-yellow-50 cursor-pointer p-1"
                        onClick={() => navigate(`/stock/item/${item.stock_item_id}`)} // Drill down to Monthly Summary
                    >
                        <div className="flex-1 pl-2">{item.stock_item_name}</div>
                        <div className="w-32 text-right">{item.closing_quantity.toFixed(2)}</div>
                        <div className="w-32 text-right">
                            {item.closing_rate.toFixed(2)}
                        </div>
                        <div className="w-32 text-right">{item.closing_value.toFixed(2)}</div>
                    </div>
                ))}
            </div>

            <div className="bg-tally-lemon p-2 border-t font-bold flex justify-between">
                <div className="flex-1">Grand Total</div>
                <div className="w-32"></div>
                <div className="w-32"></div>
                <div className="w-32 text-right">{totalValue.toFixed(2)}</div>
            </div>
        </div>
    );
}
