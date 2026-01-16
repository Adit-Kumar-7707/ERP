import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/api/client";
import { useTally } from "@/context/TallyContext";

interface PrintData {
    org: any;
    voucher: any;
}

export default function InvoicePrint() {
    const { id } = useParams();
    const [data, setData] = useState<PrintData | null>(null);

    useEffect(() => {
        // Fetch Voucher and Org Details
        const fetchData = async () => {
            try {
                const vRes = await api.get(`/accounting/vouchers/${id}`);
                const oRes = await api.get(`/accounting/organization`); // Singleton
                setData({ voucher: vRes.data, org: oRes.data });

                // Auto Print after load?
                // setTimeout(() => window.print(), 1000);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "p") {
                e.preventDefault();
                window.print();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [id]);

    if (!data) return <div>Loading Invoice...</div>;

    const { org, voucher } = data;
    const entries = voucher.entries || [];
    // Filter Ledger Entries (Party) vs Item Entries
    // In Tally, usually:
    // Party Dr/Cr is Header.
    // Items are lines.

    // Find Party (The one that is NOT the Sales Ledger)?
    // Heuristic: The DEBIT entry in a Sales Voucher is usually the Party (Debtor).
    // The CREDIT entry is Sales.
    // Stock Items are attached to the Sales/Purchase ledger entries or separate? 
    // In our model, `VoucherEntry` has `stock_item_id`.

    const itemEntries = entries.filter((e: any) => e.stock_item_id);
    const partyEntry = entries.find((e: any) => e.ledger && e.is_debit); // For Sales

    // Calculate Totals
    const totalQty = itemEntries.reduce((sum: number, e: any) => sum + (e.quantity || 0), 0);
    const totalAmount = itemEntries.reduce((sum: number, e: any) => sum + e.amount, 0);

    return (
        <div className="bg-white text-black font-serif p-8 max-w-[210mm] mx-auto min-h-screen">
            <style>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>

            {/* Header */}
            <div className="text-center border-b-2 border-black pb-4 mb-4">
                <h1 className="text-2xl font-bold uppercase">{org.name}</h1>
                <p>{org.state}, {org.country}</p>
                <p className="text-sm">GSTIN: {org.gstin}</p>
            </div>

            <div className="flex justify-between mb-6">
                <div className="border p-4 w-1/2 mr-2">
                    <h2 className="font-bold text-sm bg-gray-200 px-1 mb-2">Bill To</h2>
                    <p className="font-bold">{partyEntry?.ledger?.name}</p>
                    <p>{partyEntry?.ledger?.address || "Address not set"}</p>
                    <p>State: {partyEntry?.ledger?.state}</p>
                    <p>GSTIN: {partyEntry?.ledger?.gstin}</p>
                </div>
                <div className="border p-4 w-1/2 ml-2">
                    <h2 className="font-bold text-sm bg-gray-200 px-1 mb-2">Invoice Details</h2>
                    <div className="flex justify-between"><span>Inv No:</span> <span className="font-bold">{voucher.voucher_number}</span></div>
                    <div className="flex justify-between"><span>Date:</span> <span>{voucher.date}</span></div>
                </div>
            </div>

            {/* Grid */}
            <table className="w-full border-collapse border border-black mb-6 text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 w-12">#</th>
                        <th className="border border-black p-1 text-left">Description of Goods</th>
                        <th className="border border-black p-1 w-16">HSN/SAC</th>
                        <th className="border border-black p-1 w-16 text-right">Qty</th>
                        <th className="border border-black p-1 w-20 text-right">Rate</th>
                        <th className="border border-black p-1 w-16 text-right">Per</th>
                        <th className="border border-black p-1 w-24 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {itemEntries.map((item: any, idx: number) => (
                        <tr key={item.id}>
                            <td className="border border-black p-1 text-center">{idx + 1}</td>
                            <td className="border border-black p-1">
                                <div className="font-bold">{item.stock_item?.name}</div>
                            </td>
                            <td className="border border-black p-1 text-center">{item.stock_item?.hsn_code}</td>
                            <td className="border border-black p-1 text-right">{item.quantity}</td>
                            <td className="border border-black p-1 text-right">{item.rate.toFixed(2)}</td>
                            <td className="border border-black p-1 text-right">Nos</td>
                            <td className="border border-black p-1 text-right">{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                    {/* Filler rows for height? */}
                    {Array.from({ length: Math.max(0, 10 - itemEntries.length) }).map((_, i) => (
                        <tr key={`fill-${i}`}>
                            <td className="border border-black p-1">&nbsp;</td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold">
                        <td colSpan={3} className="border border-black p-1 text-right">Total</td>
                        <td className="border border-black p-1 text-right">{totalQty}</td>
                        <td colSpan={2} className="border border-black p-1"></td>
                        <td className="border border-black p-1 text-right">{totalAmount.toFixed(2)}</td>
                    </tr>
                    {/* Tax Summary would go here */}
                </tfoot>
            </table>

            <div className="flex justify-between mt-8">
                <div className="text-sm w-1/2">
                    <p className="font-bold underline">Terms & Conditions:</p>
                    <ol className="list-decimal list-inside">
                        <li>Goods once sold will not be taken back.</li>
                        <li>Interest @ 18% p.a. will be charged if payment is delayed.</li>
                    </ol>
                </div>
                <div className="text-center w-1/3">
                    <p className="font-bold mb-8">For {org.name}</p>
                    <p>(Authorised Signatory)</p>
                </div>
            </div>

            <div className="fixed bottom-4 right-4 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                >
                    Print (Ctrl+P)
                </button>
            </div>
        </div>
    );
}
