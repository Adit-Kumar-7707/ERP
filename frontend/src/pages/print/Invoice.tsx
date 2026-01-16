import { useState, useEffect } from "react";
import api from "@/api/client";
import { useParams, useNavigate } from "react-router-dom";
import { numberToWords } from "@/utils/numberToWords";

// Types
interface InvoiceItem {
    id: number;
    stock_item_name: string;
    hsn_code: string;
    gst_rate: number;
    quantity: number;
    rate: number;
    amount: number;
}

interface TaxAnalysis {
    rate: number;
    taxableValue: number;
    taxAmount: number; // Total Tax
}

export default function InvoicePrint() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [voucher, setVoucher] = useState<any>(null);
    const [items, setItems] = useState<InvoiceItem[]>([]);

    // Derived
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalQty, setTotalQty] = useState(0);
    const [taxAnalysis, setTaxAnalysis] = useState<TaxAnalysis[]>([]);

    useEffect(() => {
        if (!id) return;
        const fetch = async () => {
            try {
                const res = await api.get(`/vouchers/${id}`);
                const v = res.data;
                setVoucher(v);

                // Process Items
                const loadedItems: InvoiceItem[] = v.entries
                    .filter((e: any) => !e.is_debit && e.stock_item_id)
                    .map((e: any) => ({
                        id: e.id,
                        stock_item_name: e.stock_item_name || "Unknown Item",
                        hsn_code: e.hsn_code || "",
                        gst_rate: e.gst_rate || 0,
                        quantity: e.quantity,
                        rate: e.rate,
                        amount: e.amount
                    }));

                setItems(loadedItems);
                setTotalAmount(loadedItems.reduce((s, i) => s + i.amount, 0) + v.entries.filter((e: any) => !e.stock_item_id && !e.is_debit).reduce((s: number, e: any) => s + e.amount, 0));
                // Note: Total Amount should include Tax Ledgers too (which are non-stock credit entries usually) -> actually Tax ledgers are Duties.
                // Let's rely on Voucher Total Entires? Voucher doesn't have grand total field in API, sum Credit entries.
                const grandTotal = v.entries.filter((e: any) => !e.is_debit).reduce((s: number, e: any) => s + e.amount, 0);
                setTotalAmount(grandTotal);

                setTotalQty(loadedItems.reduce((s, i) => s + i.quantity, 0));

                // Process Tax Analysis
                const analysis: Record<number, TaxAnalysis> = {};
                loadedItems.forEach(item => {
                    const rate = item.gst_rate;
                    if (!analysis[rate]) analysis[rate] = { rate, taxableValue: 0, taxAmount: 0 };
                    analysis[rate].taxableValue += item.amount;
                    analysis[rate].taxAmount += item.amount * (rate / 100);
                });
                setTaxAnalysis(Object.values(analysis).sort((a, b) => b.rate - a.rate)); // Descending rate

            } catch (e) {
                console.error(e);
            }
        };
        fetch();

        // Print listener
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);
            if ((e.ctrlKey || e.metaKey) && e.key === "p") {
                e.preventDefault();
                window.print();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);

    }, [id]);

    if (!voucher) return <div className="p-10">Loading Invoice...</div>;

    const buyerName = voucher.entries.find((e: any) => e.is_debit)?.ledger_name || "Cash";

    return (
        <div className="bg-white text-black font-sans p-8 max-w-[210mm] mx-auto min-h-screen text-xs leading-tight">
            <div className="border border-black flex flex-col min-h-[280mm]">

                {/* Title */}
                <div className="text-center font-bold text-sm border-b border-black py-1">
                    TAX INVOICE
                </div>

                {/* Header Section */}
                <div className="flex border-b border-black">
                    {/* Company */}
                    <div className="w-1/2 border-r border-black p-2 flex flex-col gap-1">
                        <div className="font-bold text-lg">My Demo Company</div>
                        <div>123, Business Park, Tech City</div>
                        <div>State : Karnataka, Code : 29</div>
                        <div>Email : accounts@demo.com</div>
                        <div className="font-bold mt-2">GSTIN/UIN : 29ABCDE1234F1Z5</div>
                    </div>

                    {/* Invoice Info */}
                    <div className="w-1/2 flex">
                        <div className="w-1/2 border-r border-black">
                            <div className="p-1 border-b border-black h-1/3">
                                <div>Invoice No.</div>
                                <div className="font-bold">{voucher.voucher_number}</div>
                            </div>
                            <div className="p-1 border-b border-black h-1/3">
                                <div>Delivery Note</div>
                            </div>
                            <div className="p-1 h-1/3">
                                <div>Reference No. & Date.</div>
                            </div>
                        </div>
                        <div className="w-1/2">
                            <div className="p-1 border-b border-black h-1/3">
                                <div>Dated</div>
                                <div className="font-bold">{voucher.date}</div>
                            </div>
                            <div className="p-1 border-b border-black h-1/3">
                                <div>Mode/Terms of Payment</div>
                            </div>
                            <div className="p-1 h-1/3">
                                <div>Other References</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Consignee / Buyer */}
                <div className="flex border-b border-black">
                    <div className="w-1/2 border-r border-black p-2 min-h-[100px]">
                        <div className="text-gray-500 mb-1">Buter (Bill to)</div>
                        <div className="font-bold text-base">{buyerName}</div>
                        <div>Karnataka, Code : 29</div>
                    </div>
                    <div className="w-1/2 p-2 min-h-[100px]">
                        <div className="text-gray-500 mb-1">Consignee (Ship to)</div>
                        <div className="font-bold text-base">{buyerName}</div>
                    </div>
                </div>

                {/* Item Table Header */}
                <div className="flex border-b border-black bg-gray-100 font-bold text-center">
                    <div className="w-10 border-r border-black p-1">SI No.</div>
                    <div className="flex-1 border-r border-black p-1">Description of Goods</div>
                    <div className="w-20 border-r border-black p-1">HSN/SAC</div>
                    <div className="w-16 border-r border-black p-1">GST Rate</div>
                    <div className="w-20 border-r border-black p-1">Quantity</div>
                    <div className="w-20 border-r border-black p-1">Rate</div>
                    <div className="w-10 border-r border-black p-1">per</div>
                    <div className="w-24 p-1">Amount</div>
                </div>

                {/* Items */}
                <div className="flex-1 flex flex-col">
                    {items.map((item, i) => (
                        <div key={i} className="flex border-transparent hover:bg-gray-50">
                            <div className="w-10 border-r border-black p-1 text-center">{i + 1}</div>
                            <div className="flex-1 border-r border-black p-1 font-bold">{item.stock_item_name}</div>
                            <div className="w-20 border-r border-black p-1 text-center">{item.hsn_code}</div>
                            <div className="w-16 border-r border-black p-1 text-center">{item.gst_rate}%</div>
                            <div className="w-20 border-r border-black p-1 text-right font-bold">{item.quantity}</div>
                            <div className="w-20 border-r border-black p-1 text-right">{item.rate.toFixed(2)}</div>
                            <div className="w-10 border-r border-black p-1 text-center">Nos</div>
                            <div className="w-24 p-1 text-right font-bold">{item.amount.toFixed(2)}</div>
                        </div>
                    ))}

                    {/* Display Tax Ledgers (CGST/SGST) separately if needed, OR just Total
                        In Standard Tally Invoice, Tax Ledgers appear as items below goods but italicized
                        Let's extract non-item credit entries (Duties)
                    */}
                    {voucher.entries.filter((e: any) => !e.is_debit && !e.stock_item_id && e.amount > 0).map((e: any, i: number) => (
                        <div key={"tax" + i} className="flex">
                            <div className="w-10 border-r border-black p-1 text-center"></div>
                            <div className="flex-1 border-r border-black p-1 italic">{e.ledger_name}</div>
                            <div className="w-20 border-r border-black p-1 text-center"></div>
                            <div className="w-16 border-r border-black p-1 text-center"></div>
                            <div className="w-20 border-r border-black p-1 text-right"></div>
                            <div className="w-20 border-r border-black p-1 text-right"></div>
                            <div className="w-10 border-r border-black p-1 text-center"></div>
                            <div className="w-24 p-1 text-right">{e.amount.toFixed(2)}</div>
                        </div>
                    ))}

                    {/* Fills space to push footer down */}
                    <div className="flex-1 flex">
                        <div className="w-10 border-r border-black"></div>
                        <div className="flex-1 border-r border-black"></div>
                        <div className="w-20 border-r border-black"></div>
                        <div className="w-16 border-r border-black"></div>
                        <div className="w-20 border-r border-black"></div>
                        <div className="w-20 border-r border-black"></div>
                        <div className="w-10 border-r border-black"></div>
                        <div className="w-24"></div>
                    </div>
                </div>

                {/* Totals */}
                <div className="flex border-t border-black border-b font-bold">
                    <div className="w-10 border-r border-black p-1"></div>
                    <div className="flex-1 border-r border-black p-1 text-right">Total</div>
                    <div className="w-20 border-r border-black p-1 text-center"></div>
                    <div className="w-16 border-r border-black p-1 text-center"></div>
                    <div className="w-20 border-r border-black p-1 text-right">{totalQty}</div>
                    <div className="w-20 border-r border-black p-1 text-right"></div>
                    <div className="w-10 border-r border-black p-1 text-center"></div>
                    <div className="w-24 p-1 text-right">{totalAmount.toFixed(2)}</div>
                </div>

                {/* Amount Words */}
                <div className="border-b border-black p-2 bg-gray-50 flex gap-2">
                    <div className="font-bold">Amount Chargeable (in words): </div>
                    <div className="italic">{numberToWords(totalAmount)}</div>
                </div>

                {/* Tax Analysis Table (Footer) */}
                <div className="border-b border-black flex">
                    <div className="flex-1 p-2 border-r border-black">
                        <div className="font-bold underline mb-1">Tax Analysis</div>
                        <table className="w-full text-xs text-right">
                            <thead>
                                <tr className="border-b border-gray-300">
                                    <th className="text-left">HSN/SAC</th>
                                    <th>Taxable Value</th>
                                    <th>Central Tax</th>
                                    <th>State Tax</th>
                                    <th>Total Tax</th>
                                </tr>
                            </thead>
                            <tbody>
                                {taxAnalysis.map(tax => (
                                    <tr key={tax.rate}>
                                        <td className="text-left font-bold py-1">Taxable @ {tax.rate}%</td>
                                        <td>{tax.taxableValue.toFixed(2)}</td>
                                        <td>{(tax.taxAmount / 2).toFixed(2)}</td>
                                        <td>{(tax.taxAmount / 2).toFixed(2)}</td>
                                        <td>{tax.taxAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold border-t border-gray-300">
                                    <td className="text-left pt-1">Total</td>
                                    <td className="pt-1">{taxAnalysis.reduce((s, t) => s + t.taxableValue, 0).toFixed(2)}</td>
                                    <td className="pt-1">{taxAnalysis.reduce((s, t) => s + t.taxAmount / 2, 0).toFixed(2)}</td>
                                    <td className="pt-1">{taxAnalysis.reduce((s, t) => s + t.taxAmount / 2, 0).toFixed(2)}</td>
                                    <td className="pt-1">{taxAnalysis.reduce((s, t) => s + t.taxAmount, 0).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="w-1/2 p-2 flex flex-col justify-end text-center">
                        <div className="font-bold text-sm">for My Demo Company</div>
                        <div className="h-16"></div>
                        <div className="text-xs border-t border-gray-400 mt-4 px-4 pt-1 inline-block mx-auto">Authorized Signatory</div>
                    </div>
                </div>

                <div className="text-center text-[10px] p-1">This is a Computer Generated Invoice</div>
            </div>

            {/* Print Controls */}
            <div className="fixed top-4 right-4 print:hidden flex gap-2">
                <button onClick={() => window.print()} className="bg-tally-blue text-white px-4 py-2 font-bold shadow-lg rounded">
                    Print (Ctrl+P)
                </button>
                <button onClick={() => navigate(-1)} className="bg-gray-600 text-white px-4 py-2 font-bold shadow-lg rounded">
                    Close (Esc)
                </button>
            </div>
        </div>
    );
}
