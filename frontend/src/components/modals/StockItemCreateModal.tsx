import { useState, useEffect } from "react";
import api from "@/api/client";

interface StockItemCreateModalProps {
    onClose: () => void;
    onSuccess: (newItemId: number) => void;
}

export default function StockItemCreateModal({ onClose, onSuccess }: StockItemCreateModalProps) {
    const [name, setName] = useState("");
    const [groupId, setGroupId] = useState("");
    const [unitId, setUnitId] = useState("");
    const [openingQty, setOpeningQty] = useState("0");
    const [openingRate, setOpeningRate] = useState("0");
    const [hsn, setHsn] = useState("");
    const [taxability, setTaxability] = useState("Taxable");
    const [gstRate, setGstRate] = useState("0");

    const [groups, setGroups] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            api.get("/inventory/groups"),
            api.get("/inventory/units")
        ]).then(([gRes, uRes]) => {
            setGroups(gRes.data);
            setUnits(uRes.data);
        }).catch(err => console.error(err));
    }, []);

    const handleSave = async () => {
        if (!name) return alert("Name is required");

        try {
            const res = await api.post("/inventory/items", {
                name,
                group_id: groupId ? parseInt(groupId) : null,
                unit_id: unitId ? parseInt(unitId) : null,
                opening_qty: parseFloat(openingQty),
                opening_rate: parseFloat(openingRate),
                hsn_code: hsn,
                taxability: taxability,
                gst_rate: parseFloat(gstRate)
            });
            alert("Stock Item Created!");
            onSuccess(res.data.id);
            onClose();
        } catch (e: any) {
            console.error(e);
            alert("Error: " + (e.response?.data?.detail || e.message));
        }
    };

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
    }, [name, groupId, unitId, openingQty, openingRate, hsn, taxability, gstRate]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
            <div className="bg-white w-[800px] shadow-2xl border border-tally-blue flex flex-col max-h-[90vh]">
                <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                    <div className="font-bold text-lg">Stock Item Creation (Secondary)</div>
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
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                            value={groupId}
                            onChange={e => setGroupId(e.target.value)}
                        >
                            <option value="">Primary</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>

                        <label className="font-bold text-tally-text mt-1">Units</label>
                        <select
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                            value={unitId}
                            onChange={e => setUnitId(e.target.value)}
                        >
                            <option value="" disabled>Select Unit</option>
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.symbol} ({u.name})</option>
                            ))}
                        </select>

                        <div className="h-4 col-span-2"></div>
                        <div className="border-t border-tally-border my-2 col-span-2"></div>

                        <label className="font-bold text-tally-text mt-1">HSN/SAC</label>
                        <input
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                            placeholder="e.g. 8517"
                            value={hsn}
                            onChange={e => setHsn(e.target.value)}
                        />

                        <label className="font-bold text-tally-text mt-1">Taxability</label>
                        <select
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                            value={taxability}
                            onChange={e => setTaxability(e.target.value)}
                        >
                            <option value="Taxable">Taxable</option>
                            <option value="Exempt">Exempt</option>
                            <option value="Nil Rated">Nil Rated</option>
                        </select>

                        <label className="font-bold text-tally-text mt-1">GST Rate (%)</label>
                        <input
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 w-20 text-right"
                            value={gstRate}
                            onChange={e => setGstRate(e.target.value)}
                        />

                        <div className="h-4 col-span-2"></div>

                        <label className="font-bold text-tally-text mt-1">Opening Balance</label>
                        <div className="flex gap-4 col-span-2">
                            <div className="flex flex-col">
                                <label className="text-xs">Quantity</label>
                                <input
                                    className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 w-32 text-right"
                                    value={openingQty}
                                    onChange={e => setOpeningQty(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs">Rate</label>
                                <input
                                    className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 w-32 text-right"
                                    value={openingRate}
                                    onChange={e => setOpeningRate(e.target.value)}
                                />
                            </div>
                        </div>
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
