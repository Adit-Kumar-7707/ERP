import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTally } from "@/context/TallyContext";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

interface GroupSummaryItem {
    id: number;
    name: string;
    type: "group" | "ledger";
    balance: number;
    is_debit: boolean;
}

interface GroupSummaryResponse {
    group_name: string;
    items: GroupSummaryItem[];
    total_debit: number; // calculated for column footer
    total_credit: number;
}

export default function GroupSummary() {
    const navigate = useNavigate();
    const location = useLocation();
    const { groupName } = useParams();
    const { periodStart, periodEnd } = useTally();
    const [data, setData] = useState<GroupSummaryResponse | null>(null);

    // Determine Filter Mode
    const filterType = location.state?.filterType || 'period';

    useEffect(() => {
        if (!groupName) return;

        let url = `/analytics/group-summary/${encodeURIComponent(groupName)}?to_date=${periodEnd}`;
        if (filterType === 'period') {
            url += `&from_date=${periodStart}`;
        }

        api.get(url)
            .then(res => setData(res.data))
            .catch(err => console.error(err));
    }, [groupName, navigate, periodStart, periodEnd, filterType]);

    // Handle ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    const handleRowClick = (item: GroupSummaryItem) => {
        if (item.type === "group") {
            navigate(`/report/group/${encodeURIComponent(item.name)}`, { state: { filterType } });
        } else {
            navigate(`/report/ledger/${item.id}`, { state: { filterType } });
        }
    }

    // Keyboard Nav
    const { selectedIndex } = useKeyboardNavigation(data?.items.length || 0, (index) => {
        if (data && data.items[index]) {
            handleRowClick(data.items[index]);
        }
    });

    // Scroll to selection
    useEffect(() => {
        if (selectedIndex !== -1) {
            const row = document.getElementById(`row-${selectedIndex}`);
            if (row) row.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    if (!data) return <div>Loading...</div>;

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm">
            {/* Header */}
            <div className="bg-tally-blue text-white p-1 text-center font-bold">
                Group Summary: {data.group_name}
            </div>

            <div className="flex justify-between border-b-2 border-dashed border-gray-400 p-2 font-bold bg-gray-100">
                <div className="w-1/2">Particulars</div>
                <div className="w-1/4 text-right">Debit</div>
                <div className="w-1/4 text-right">Credit</div>
            </div>

            <div className="flex-1 overflow-auto">
                {data.items.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                        <div
                            id={`row-${idx}`}
                            key={item.id + item.type}
                            className={`flex justify-between p-2 cursor-pointer ${isSelected ? "bg-tally-yellow text-black font-bold" : "hover:bg-yellow-100"}`}
                            onClick={() => handleRowClick(item)}
                        >
                            <div className="w-1/2">
                                {item.name}
                                <span className="text-gray-400 text-xs ml-2 italic">({item.type})</span>
                            </div>
                            <div className="w-1/4 text-right">
                                {item.is_debit ? item.balance.toFixed(2) : ""}
                            </div>
                            <div className="w-1/4 text-right">
                                {!item.is_debit ? item.balance.toFixed(2) : ""}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-tally-lemon p-2 border-t font-bold flex justify-between">
                <div className="w-1/2">Grand Total</div>
                <div className="w-1/4 text-right">{data.total_debit.toFixed(2)}</div>
                <div className="w-1/4 text-right">{data.total_credit.toFixed(2)}</div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Back  [Up/Down] Navigate  [Enter] Select
            </div>
        </div>
    );
}
