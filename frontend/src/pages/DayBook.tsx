import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useTally } from "@/context/TallyContext";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

interface VoucherEntry {
    ledger_name: string;
    amount: number;
    is_debit: boolean;
}

interface Voucher {
    id: number;
    date: string;
    voucher_number: string;
    voucher_type_name: string;
    narration: string;
    entries: VoucherEntry[];
}

export default function DayBook() {
    const navigate = useNavigate();
    const { currentDate, setCurrentDate } = useTally();
    const [date, setDate] = useState(currentDate);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(false);

    // Sync local date
    useEffect(() => {
        setDate(currentDate);
    }, [currentDate]);

    useEffect(() => {
        setLoading(true);
        api.get(`/vouchers/day-book?date=${date}`)
            .then(res => setVouchers(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [date]);

    // Keyboard Nav
    const { selectedIndex } = useKeyboardNavigation(vouchers.length, (index) => {
        const v = vouchers[index];
        if (v) navigate(`/voucher-entry/${v.id}`);
    });

    // Scroll to selection
    useEffect(() => {
        if (selectedIndex !== -1) {
            const row = document.getElementById(`row-${selectedIndex}`);
            if (row) row.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    // Handle ESC and shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);

            // Export (Alt+E)
            if (e.altKey && e.key === "e") {
                e.preventDefault();
                handleExport();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, vouchers, date]);

    const handleExport = () => {
        if (!vouchers.length) return alert("No data to export");

        const data = vouchers.map(v => ({
            Date: v.date,
            VoucherNo: v.voucher_number,
            Type: v.voucher_type_name,
            Particulars: v.entries[0]?.ledger_name || "",
            Amount: v.entries.filter(e => e.is_debit).reduce((s, e) => s + e.amount, 0),
            Narration: v.narration || ""
        }));

        exportToCSV(data, `DayBook_${date}`);
    };

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm">
            {/* Header */}
            <div className="bg-tally-blue text-white px-2 py-1 flex justify-between">
                <span className="font-bold">Day Book</span>
                <span className="font-bold">{date}</span>
            </div>

            {/* Controls */}
            <div className="p-2 border-b bg-gray-50 flex gap-2 items-center">
                <label className="font-bold">Date:</label>
                <input
                    type="date"
                    className="border p-1"
                    value={date}
                    onChange={e => {
                        setDate(e.target.value);
                        setCurrentDate(e.target.value);
                    }}
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white border-b-2 border-gray-500 z-10">
                        <tr>
                            <th className="text-left p-1 w-24">Date</th>
                            <th className="text-left p-1">Particulars</th>
                            <th className="text-left p-1 w-32">Vch Type</th>
                            <th className="text-left p-1 w-24">Vch No.</th>
                            <th className="text-right p-1 w-32">Debit Amount</th>
                            <th className="text-right p-1 w-32">Credit Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>}
                        {!loading && vouchers.length === 0 && (
                            <tr><td colSpan={6} className="p-4 text-center text-gray-500">No Vouchers Found</td></tr>
                        )}

                        {vouchers.map((v, idx) => {
                            const totalAmount = v.entries.filter(e => e.is_debit).reduce((s, e) => s + e.amount, 0);
                            const isSelected = idx === selectedIndex;

                            return (
                                <tr
                                    id={`row-${idx}`}
                                    key={v.id}
                                    className={`cursor-pointer border-b border-gray-100 ${isSelected ? "bg-tally-yellow text-black font-bold" : "hover:bg-yellow-100"}`}
                                    onClick={() => navigate(`/voucher-entry/${v.id}`)}
                                >
                                    <td className="p-1 align-top">{v.date}</td>
                                    <td className="p-1 align-top font-bold text-gray-700">
                                        {v.entries[0]?.ledger_name}
                                        {v.entries.length > 2 && <span className="text-xs italic font-normal text-gray-500"> (and others)</span>}
                                        <div className="text-xs font-normal text-gray-500 italic">{v.narration}</div>
                                    </td>
                                    <td className="p-1 align-top">{v.voucher_type_name}</td>
                                    <td className="p-1 align-top">{v.voucher_number}</td>
                                    <td className="p-1 align-top text-right">{totalAmount.toFixed(2)}</td>
                                    <td className="p-1 align-top text-right"></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted flex justify-between px-4">
                <span>[Esc] Quit  [Enter] Detailed View  [Up/Down] Navigate</span>
                <span className="cursor-pointer hover:text-black font-bold" onClick={handleExport}>[Alt+E] Export</span>
            </div>
        </div>
    );
}
