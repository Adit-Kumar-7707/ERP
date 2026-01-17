import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/client";
// import { useTally } from "@/context/TallyContext";

interface BankEntry {
    id: number;
    voucher_date: string;
    voucher_number: string;
    voucher_type: string;
    particulars: string;
    instrument_number?: string;
    instrument_date?: string;
    bank_date?: string | null;
    debit: number;
    credit: number;
}

export default function BankReconciliation() {
    const { ledgerId } = useParams();
    const navigate = useNavigate();
    // const { periodStart, periodEnd } = useTally();

    const [entries, setEntries] = useState<BankEntry[]>([]);
    const [ledger, setLedger] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Local State for edits
    const [edits, setEdits] = useState<Record<number, string>>({});

    useEffect(() => {
        if (!ledgerId) return;

        const fetchData = async () => {
            try {
                // Fetch Ledger Details
                // We need to fetch specific ledger. Using /accounting/ledgers/{id} (Need to ensure endpoint exists)
                // Existing router: /accounting/ledgers returns list.
                // Assuming I can't fetch single easily without filtering list.
                // Let's use `accounting/chart-of-accounts` or just fetch list and find.
                // Or I can add `GET /accounting/ledgers/{id}`.
                // For now, I'll fetch entries and hope backend validates.

                // Oops, I need ledger Name.
                // I'll try to fetch all ledgers and find it (MVP Hack).
                const lRes = await api.get("/accounting/ledgers");
                const found = lRes.data.find((l: any) => l.id === Number(ledgerId));
                setLedger(found);

                const res = await api.get(`/banking/reconciliation/${ledgerId}`);
                setEntries(res.data);
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetchData();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                e.preventDefault();
                saveReconciliation();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [ledgerId]);

    const handleDateChange = (id: number, val: string) => {
        setEdits(prev => ({ ...prev, [id]: val }));
    };

    const saveReconciliation = async () => {
        const payload = Object.entries(edits).map(([id, date]) => ({
            entry_id: Number(id),
            bank_date: date || null // Handle clearing if empty?
        }));

        if (payload.length === 0) return;

        try {
            await api.post("/banking/reconcile", payload);
            alert("Reconciliation Saved!");
            // Refresh
            const res = await api.get(`/banking/reconciliation/${ledgerId}`);
            setEntries(res.data);
            setEdits({});
        } catch (e) {
            alert("Failed to save");
        }
    };

    // Calculation
    // Company Balance
    const companyBalance = ledger?.closing_balance || 0; // This might be overall closing balance.

    // Amounts not reflected in Bank (Unreconciled)
    // If Payment (Credit in Books) is Unreconciled, Bank Balance > Book Balance.
    // If Receipt (Debit in Books) is Unreconciled, Bank Balance < Book Balance.

    // Let's calculate purely from the displayed entries? No, displayed entries are a subset.
    // Ideally we need "Unreconciled Total".
    // My API returns ALL Unreconciled entries.

    const unreconciledDebits = entries.filter(e => !e.bank_date && !edits[e.id]).reduce((sum, e) => sum + e.debit, 0); // Receipts not in Bank
    const unreconciledCredits = entries.filter(e => !e.bank_date && !edits[e.id]).reduce((sum, e) => sum + e.credit, 0); // Payments not in Bank

    // Balance as per Bank = Book Balance + Unreconciled Payments (Credits) - Unreconciled Receipts (Debits)
    // Assuming Book Balance is Positive for Debit (Asset).
    // If Book Balance is Debit 1000.
    // I issued cheque 500 (Credit). Book = 500. Bank = 1000 (hasn't cleared).
    // So Bank = Book (500) + Unreconciled Credit (500) = 1000. Correct.

    const bankBalance = companyBalance + unreconciledCredits - unreconciledDebits;

    if (loading) return <div>Loading...</div>;
    if (!ledger) return <div>Ledger Not Found</div>;

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm">
            <div className="bg-tally-blue text-white p-1 text-center font-bold">
                Bank Reconciliation: {ledger.name}
            </div>

            <div className="flex justify-between border-b-2 border-dashed border-gray-400 p-2 font-bold bg-gray-100">
                <div className="w-24">Date</div>
                <div className="flex-1">Particulars</div>
                <div className="w-32">Vch Type</div>
                <div className="w-32">Inst. No</div>
                <div className="w-32">Inst. Date</div>
                <div className="w-32 text-center bg-yellow-200">Bank Date</div>
                <div className="w-32 text-right">Debit</div>
                <div className="w-32 text-right">Credit</div>
            </div>

            <div className="flex-1 overflow-auto">
                {entries.map(e => {
                    const effectiveDate = edits[e.id] !== undefined ? edits[e.id] : (e.bank_date || "");
                    return (
                        <div key={e.id} className="flex border-b border-dotted hover:bg-yellow-50 items-center py-1">
                            <div className="w-24 pl-2">{e.voucher_date}</div>
                            <div className="flex-1 truncate">{e.particulars}</div>
                            <div className="w-32 truncate">{e.voucher_type}</div>
                            <div className="w-32 truncate">{e.instrument_number || "-"}</div>
                            <div className="w-32 truncate">{e.instrument_date || "-"}</div>
                            <div className="w-32 text-center p-0.5">
                                <input
                                    type="date"
                                    className="border bg-yellow-50 w-full"
                                    value={effectiveDate}
                                    onChange={(ev) => handleDateChange(e.id, ev.target.value)}
                                />
                            </div>
                            <div className="w-32 text-right">{e.debit ? e.debit.toFixed(2) : ""}</div>
                            <div className="w-32 text-right pr-2">{e.credit ? e.credit.toFixed(2) : ""}</div>
                        </div>
                    )
                })}
            </div>

            <div className="bg-gray-100 p-4 border-t text-sm font-bold grid grid-cols-2 gap-4">
                <div className="text-right">Balance as per Company Books:</div>
                <div className="text-left">{companyBalance.toFixed(2)}</div>

                <div className="text-right text-gray-600">Amounts not reflected in Bank:</div>
                <div className="text-left">
                    (Dr: {unreconciledDebits.toFixed(2)} | Cr: {unreconciledCredits.toFixed(2)})
                </div>

                <div className="text-right text-tally-blue text-lg">Balance as per Bank:</div>
                <div className="text-left text-lg">{bankBalance.toFixed(2)}</div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Quit | [Ctrl+A] Save Reconciliation
            </div>
        </div>
    );
}
