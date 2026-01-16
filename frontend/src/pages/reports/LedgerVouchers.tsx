import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate, useParams } from "react-router-dom";
import { useTally } from "@/context/TallyContext";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

interface LedgerVoucherItem {
    id: number;
    date: string;
    voucher_id: number;
    voucher_number: string;
    voucher_type: string;
    particulars: string;
    debit: number;
    credit: number;
}

export default function LedgerVouchers() {
    const navigate = useNavigate();
    const { ledgerId } = useParams();
    const { periodStart, periodEnd } = useTally();
    const [items, setItems] = useState<LedgerVoucherItem[]>([]);

    useEffect(() => {
        if (!ledgerId) return;

        api.get(`/accounting/ledger/${ledgerId}/vouchers?from_date=${periodStart}&to_date=${periodEnd}`)
            .then(res => setItems(res.data))
            .catch(err => console.error(err));

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [ledgerId, navigate, periodStart, periodEnd]);

    // Keyboard Navigation
    const { selectedIndex } = useKeyboardNavigation(items.length, (index) => {
        const item = items[index];
        if (item) navigate(`/voucher-entry/${item.voucher_id}`);
    });

    // Scroll to selection
    useEffect(() => {
        if (selectedIndex !== -1) {
            const row = document.getElementById(`voucher-row-${selectedIndex}`);
            if (row) row.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    const totalDebit = items.reduce((sum, i) => sum + i.debit, 0);
    const totalCredit = items.reduce((sum, i) => sum + i.credit, 0);
    const closingBalance = totalDebit - totalCredit;

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm">
            {/* Header */}
            <div className="bg-tally-blue text-white p-1 text-center font-bold">
                Ledger Vouchers
            </div>

            <div className="flex justify-between border-b-2 border-dashed border-gray-400 p-2 font-bold bg-gray-100">
                <div className="w-24">Date</div>
                <div className="flex-1">Particulars</div>
                <div className="w-24">Vch Type</div>
                <div className="w-24">Vch No</div>
                <div className="w-24 text-right">Debit</div>
                <div className="w-24 text-right">Credit</div>
            </div>

            <div className="flex-1 overflow-auto">
                {items.map((item, idx) => (
                    <div
                        key={item.id}
                        id={`voucher-row-${idx}`}
                        className={`flex justify-between p-2 cursor-pointer ${idx === selectedIndex ? "bg-tally-yellow text-black font-bold" : "hover:bg-yellow-100"
                            }`}
                        onClick={() => navigate(`/voucher-entry/${item.voucher_id}`)}
                    >
                        <div className="w-24">{item.date}</div>
                        <div className="flex-1">{item.particulars}</div>
                        <div className="w-24">{item.voucher_type}</div>
                        <div className="w-24">{item.voucher_number || "-"}</div>
                        <div className="w-24 text-right">{item.debit > 0 ? item.debit.toFixed(2) : ""}</div>
                        <div className="w-24 text-right">{item.credit > 0 ? item.credit.toFixed(2) : ""}</div>
                    </div>
                ))}
            </div>

            <div className="bg-tally-lemon p-2 border-t font-bold flex justify-between">
                <div className="w-24">Total</div>
                <div className="flex-1"></div>
                <div className="w-24 text-right">{totalDebit.toFixed(2)}</div>
                <div className="w-24 text-right">{totalCredit.toFixed(2)}</div>
            </div>
            <div className="bg-tally-bg p-2 border-t font-bold flex justify-between text-blue-800">
                <div>Closing Balance</div>
                <div>{Math.abs(closingBalance).toFixed(2)} {closingBalance >= 0 ? "Dr" : "Cr"}</div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Back  [Up/Down] Navigate  [Enter] Select
            </div>
        </div>
    );
}
