import { useState, useEffect } from "react";
import api from "@/api/client";

interface LedgerCreateModalProps {
    onClose: () => void;
    onSuccess: (newLedgerId: number) => void;
}

export default function LedgerCreateModal({ onClose, onSuccess }: LedgerCreateModalProps) {
    const [name, setName] = useState("");
    const [groupId, setGroupId] = useState("");
    const [openingBalance, setOpeningBalance] = useState("0");
    const [groups, setGroups] = useState<any[]>([]);

    // GST / Party Details
    const [gstin, setGstin] = useState("");
    const [partyState, setPartyState] = useState("");
    const [dutyHead, setDutyHead] = useState("");
    const [taxType, setTaxType] = useState("");

    const selectedGroupName = groups.find(g => g.id === Number(groupId))?.name || "";
    const isDutyGroup = selectedGroupName.includes("Duties") || selectedGroupName.includes("Tax");
    const isPartyGroup = selectedGroupName.includes("Debtor") || selectedGroupName.includes("Creditor");

    useEffect(() => {
        api.get("/accounting/chart-of-accounts")
            .then(res => {
                const flatGroups: any[] = [];
                const traverse = (list: any[]) => {
                    list.forEach(g => {
                        flatGroups.push({ id: g.id, name: g.name });
                        if (g.children) traverse(g.children);
                    });
                };
                traverse(res.data);
                setGroups(flatGroups);
            })
            .catch(err => console.error(err));
    }, []);

    const handleSave = async () => {
        if (!name || !groupId) return alert("Name and Group are required");

        try {
            const res = await api.post("/accounting/ledgers", {
                name,
                group_id: Number(groupId),
                opening_balance: parseFloat(openingBalance),
                gstin: gstin,
                state: partyState,
                tax_type: taxType,
                duty_head: dutyHead
            });
            alert("Ledger Created!");
            onSuccess(res.data.id);
            onClose();
        } catch (e: any) {
            console.error(e);
            alert("Error: " + (e.response?.data?.detail || e.message));
        }
    };

    // Keyboard support - Only within Modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if ((e.metaKey || e.ctrlKey) && e.key === "a") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [name, groupId, openingBalance, gstin, partyState, dutyHead, taxType]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
            <div className="bg-white w-[800px] shadow-2xl border border-tally-blue flex flex-col max-h-[90vh]">
                <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                    <div className="font-bold text-lg">Ledger Creation (Secondary)</div>
                    <button onClick={onClose} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Close</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-[150px_1fr] gap-4">
                        <label className="font-bold text-tally-text mt-1">Name</label>
                        <input
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-md font-bold"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                        />

                        <label className="font-bold text-tally-text mt-1">Under</label>
                        <select
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-md w-full"
                            value={groupId}
                            onChange={e => setGroupId(e.target.value)}
                        >
                            <option value="" disabled>Select Group</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>

                        <label className="font-bold text-tally-text mt-1">Opening Balance</label>
                        <div className="flex gap-2 items-center">
                            <input
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 w-32 text-right"
                                value={openingBalance}
                                onChange={e => setOpeningBalance(e.target.value)}
                            />
                            <span className="text-xs font-bold">Dr/Cr</span>
                        </div>

                        {/* Conditional Fields - Simplified for Modal */}
                        {isDutyGroup && (
                            <>
                                <div className="col-span-2 my-2 border-t"></div>
                                <label className="font-bold text-tally-text mt-1">Type of Duty/Tax</label>
                                <select
                                    className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                    value={taxType}
                                    onChange={e => setTaxType(e.target.value)}
                                >
                                    <option value="">Select</option>
                                    <option value="GST">GST</option>
                                    <option value="Others">Others</option>
                                </select>

                                {taxType === "GST" && (
                                    <>
                                        <label className="font-bold text-tally-text mt-1">Tax Type</label>
                                        <select
                                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                            value={dutyHead}
                                            onChange={e => setDutyHead(e.target.value)}
                                        >
                                            <option value="">Select</option>
                                            <option value="CGST">Central Tax (CGST)</option>
                                            <option value="SGST">State Tax (SGST)</option>
                                            <option value="IGST">Integrated Tax (IGST)</option>
                                            <option value="Cess">Cess</option>
                                        </select>
                                    </>
                                )}
                            </>
                        )}

                        {isPartyGroup && (
                            <>
                                <div className="col-span-2 my-2 border-t"></div>
                                <label className="font-bold text-tally-text mt-1">State</label>
                                <input
                                    className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                    value={partyState}
                                    onChange={e => setPartyState(e.target.value)}
                                    placeholder="Karnataka"
                                />

                                <label className="font-bold text-tally-text mt-1">GSTIN/UIN</label>
                                <input
                                    className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                    value={gstin}
                                    onChange={e => setGstin(e.target.value)}
                                />
                            </>
                        )}

                    </div>
                </div>

                <div className="bg-tally-bg border-t p-2 text-xs text-center text-tally-muted flex justify-between px-4">
                    <span>[Esc] Cancel</span>
                    <button onClick={handleSave} className="font-bold bg-tally-green text-white px-4 py-1">Accept (Ctrl+A)</button>
                </div>
            </div>
        </div>
    );
}
