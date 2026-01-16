import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function StockItemCreate() {
    const navigate = useNavigate();

    // Form State
    const [name, setName] = useState("");
    const [groupId, setGroupId] = useState("");
    const [unitId, setUnitId] = useState("");
    const [openingQty, setOpeningQty] = useState("0");
    const [openingRate, setOpeningRate] = useState("0");
    // GST
    const [hsn, setHsn] = useState("");
    const [taxability, setTaxability] = useState("Taxable");
    const [gstRate, setGstRate] = useState("0");

    // Masters Data
    const [groups, setGroups] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);

    useEffect(() => {
        // Fetch dependencies
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
            await api.post("/inventory/items", {
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
            setName("");
            setOpeningQty("0");
            setOpeningRate("0");
        } catch (e: any) {
            console.error(e);
            alert("Error: " + (e.response?.data?.detail || e.message));
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate("/masters/create");
            if ((e.metaKey || e.ctrlKey) && e.key === "a") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, name, groupId, unitId, openingQty, openingRate]);


    return (
        <div className="flex flex-col h-full bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Stock Item Creation</div>
            </div>

            <div className="flex-1 bg-white p-8 max-w-4xl mx-auto w-full border-x border-tally-border shadow-md mt-4">
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

                    <div className="h-4"></div> {/* Spacer */}

                    <div className="border-t border-tally-border my-2"></div>
                    <div className="font-bold text-tally-blue mb-2">Statutory Details</div>

                    <label className="font-bold text-tally-text mt-1">GST Applicable</label>
                    <div className="font-bold p-1">Applicable</div>

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

                    <div className="h-4"></div> {/* Spacer */}

                    <label className="font-bold text-tally-text mt-1">Opening Balance</label>
                    <div className="flex gap-4">
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
                        <div className="flex flex-col">
                            <label className="text-xs">Value</label>
                            <div className="p-1 w-32 text-right font-bold">
                                {((parseFloat(openingQty) || 0) * (parseFloat(openingRate) || 0)).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Ctrl+A] Accept  [Esc] Quit
            </div>
        </div>
    );
}
