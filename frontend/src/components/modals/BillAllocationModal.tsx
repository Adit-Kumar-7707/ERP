import { useState, useEffect, useRef } from "react";

export interface BillAllocation {
    ref_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
    ref_name: string;
    amount: string;
    credit_period?: string; // Days or Date? Tally uses Days for New Ref, but Date is stored. Let's simpler: Date string.
}

interface BillAllocationModalProps {
    ledgerName: string;
    totalAmount: number; // The amount to be allocated
    onClose: () => void;
    onSave: (allocations: BillAllocation[]) => void;
    initialAllocations?: BillAllocation[];
}

export default function BillAllocationModal({ ledgerName, totalAmount, onClose, onSave, initialAllocations }: BillAllocationModalProps) {
    const [allocations, setAllocations] = useState<BillAllocation[]>(initialAllocations || []);

    // Temp State for new row
    const [currentRow, setCurrentRow] = useState<BillAllocation>({
        ref_type: "New Ref",
        ref_name: "",
        amount: "",
    });

    // const [selectedIndex, setSelectedIndex] = useState(0); // 0=Type, 1=Name, 2=Amount
    const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);

    // Auto-fill amount logic: Remaining Balance
    useEffect(() => {
        const allocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
        const remaining = totalAmount - allocated;
        if (remaining > 0 && !currentRow.amount) {
            setCurrentRow(prev => ({ ...prev, amount: remaining.toFixed(2) }));
        }
    }, [allocations, totalAmount]);

    // Keyboard Handling for Grid
    const handleKeyDown = (e: React.KeyboardEvent, fieldIndex: number) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // If last field (Amount), add row
            if (fieldIndex === 2) {
                // Add Row
                if (currentRow.ref_name && currentRow.amount) {
                    setAllocations(prev => [...prev, currentRow]);

                    // Check if fully allocated?
                    const newAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0) + parseFloat(currentRow.amount);
                    if (Math.abs(newAllocated - totalAmount) < 0.1) {
                        // Done!
                        // But we wait for user to hit Enter again or specific Save key?
                        // Tally usually focuses "End of List" or just prompts?
                        // Let's reset curr row and focus Type.
                        // But if fully allocated, maybe just save?
                        // Let's allow one more review.
                    }

                    // Reset
                    setCurrentRow({ ref_type: "New Ref", ref_name: "", amount: "" });
                    // Focus first input
                    setTimeout(() => inputRefs.current[0]?.focus(), 10);
                }
            } else {
                // Move to next field
                setTimeout(() => inputRefs.current[fieldIndex + 1]?.focus(), 10);
            }
        }
        if (e.key === "Escape") {
            // Cancel?
            onClose();
        }
    };

    // Save
    const handleSave = () => {
        // Validate total?
        const allocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
        if (Math.abs(allocated - totalAmount) > 0.1) {
            if (!confirm(`Total mismatch (${allocated} vs ${totalAmount}). Continue?`)) return;
        }
        onSave(allocations);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-tally-bg border-4 border-tally-blue shadow-2xl w-[600px] flex flex-col">
                <div className="bg-tally-blue text-white p-2 font-bold text-center">
                    Bill-wise Details for: {ledgerName} <br />
                    <span className="text-xs font-normal">Total: {totalAmount.toFixed(2)}</span>
                </div>

                <div className="bg-white p-4 min-h-[300px] flex flex-col font-mono text-sm">
                    {/* Header */}
                    <div className="flex font-bold border-b border-gray-400 mb-2">
                        <div className="w-1/4">Ref Type</div>
                        <div className="w-1/2">Name</div>
                        <div className="w-1/4 text-right">Amount</div>
                    </div>

                    {/* Pending Rows */}
                    {allocations.map((a, i) => (
                        <div key={i} className="flex border-b border-gray-100 py-1">
                            <div className="w-1/4">{a.ref_type}</div>
                            <div className="w-1/2">{a.ref_name}</div>
                            <div className="w-1/4 text-right">{parseFloat(a.amount).toFixed(2)}</div>
                        </div>
                    ))}

                    {/* Input Row */}
                    <div className="flex py-2 bg-yellow-50 border border-yellow-200 mt-2">
                        <div className="w-1/4">
                            <select
                                ref={el => inputRefs.current[0] = el}
                                value={currentRow.ref_type}
                                onChange={e => setCurrentRow({ ...currentRow, ref_type: e.target.value as any })}
                                onKeyDown={e => handleKeyDown(e, 0)}
                                className="w-full bg-transparent outline-none"
                                autoFocus
                            >
                                <option>New Ref</option>
                                <option>Agst Ref</option>
                                <option>Advance</option>
                                <option>On Account</option>
                            </select>
                        </div>
                        <div className="w-1/2 px-2">
                            <input
                                ref={el => inputRefs.current[1] = el}
                                value={currentRow.ref_name}
                                onChange={e => setCurrentRow({ ...currentRow, ref_name: e.target.value })}
                                onKeyDown={e => handleKeyDown(e, 1)}
                                className="w-full bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-blue-500"
                                placeholder="Ref No"
                            />
                        </div>
                        <div className="w-1/4">
                            <input
                                ref={el => inputRefs.current[2] = el}
                                value={currentRow.amount}
                                onChange={e => setCurrentRow({ ...currentRow, amount: e.target.value })}
                                onKeyDown={e => handleKeyDown(e, 2)}
                                className="w-full bg-transparent outline-none text-right border-b border-dashed border-gray-300 focus:border-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-2 bg-tally-bg flex justify-between items-center border-t">
                    <div className="text-xs text-tally-muted">
                        Allocated: {allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0).toFixed(2)}
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-tally-blue text-white px-6 py-1 font-bold hover:bg-blue-700 shadow-md"
                    >
                        Accept (Ctrl+A)
                    </button>
                </div>
            </div>
        </div>
    );
}
