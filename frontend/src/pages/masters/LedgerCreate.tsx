import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function LedgerCreate() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [groupId, setGroupId] = useState("");
    const [openingBalance, setOpeningBalance] = useState("0");
    const [groups, setGroups] = useState<any[]>([]);

    // GST / Party Details
    const [gstin, setGstin] = useState("");
    const [partyState, setPartyState] = useState(""); // Avoid collision with React state
    const [dutyHead, setDutyHead] = useState(""); // CGST/SGST
    const [taxType, setTaxType] = useState(""); // GST/Others

    // To detect selected group name
    const selectedGroupName = groups.find(g => g.id === Number(groupId))?.name || "";
    const isDutyGroup = selectedGroupName.includes("Duties") || selectedGroupName.includes("Tax");
    const isPartyGroup = selectedGroupName.includes("Debtor") || selectedGroupName.includes("Creditor");

    useEffect(() => {
        // Fetch Groups for autocomplete
        // Reuse COA endpoint, flattened
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
            await api.post("/accounting/ledgers", {
                name,
                group_id: Number(groupId),
                opening_balance: parseFloat(openingBalance),
                gstin: gstin,
                state: partyState,
                tax_type: taxType,
                duty_head: dutyHead
            });
            alert("Ledger Created!");
            setName(""); // Reset for next creation
            setOpeningBalance("0");
            // Keep group selected for convenience
        } catch (e: any) {
            console.error(e);
            alert("Error: " + (e.response?.data?.detail || e.message));
        }
    };

    // Keyboard support
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
    }, [navigate, name, groupId, openingBalance]);


    return (
        <div className="flex flex-col h-full bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Ledger Creation</div>
            </div>

            <div className="flex-1 bg-white p-8 max-w-4xl mx-auto w-full border-x border-tally-border shadow-md mt-4 relative">
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
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-md"
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

                    {/* Conditional Fields */}
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
                            <div className="col-span-2 font-bold text-tally-blue">Mailing Details</div>

                            <label className="font-bold text-tally-text mt-1">State</label>
                            <input
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                value={partyState}
                                onChange={e => setPartyState(e.target.value)}
                                placeholder="e.g. Karnataka"
                            />

                            <label className="font-bold text-tally-text mt-1">GSTIN/UIN</label>
                            <input
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                value={gstin}
                                onChange={e => setGstin(e.target.value)}
                                placeholder="e.g. 29AAAAA0000A1Z5"
                            />
                        </>
                    )}
                </div>

                {/* Right Side Panel for Group List - Tally Style (Mocked mainly for now, we use Select above) */}
                <div className="absolute right-0 top-0 bottom-0 w-64 border-l bg-gray-50 p-2 hidden">
                    {/* This would be the "List of Groups" side panel */}
                </div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Ctrl+A] Accept  [Esc] Quit
            </div>
        </div>
    );
}
