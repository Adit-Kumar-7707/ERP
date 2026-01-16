import { useState, useEffect, useRef } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useLedgers } from "@/hooks/useLedgers";
import { useGroups } from "@/hooks/useGroups";

interface Ledger {
    id: number;
    name: string;
    group_id: number;
    opening_balance: number;
}

export default function LedgerAlter() {
    const navigate = useNavigate();
    const { ledgers, fetchLedgers } = useLedgers();
    const { groups, fetchGroups } = useGroups();

    // Modes: 'select' | 'edit'
    const [mode, setMode] = useState<"select" | "edit">("select");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    // Form State
    const [formData, setFormData] = useState<Partial<Ledger>>({});

    const inputRef = useRef<HTMLInputElement>(null);

    // Initial Fetch
    useEffect(() => { fetchLedgers(); fetchGroups(); }, []);

    // Selection Logic
    const filteredLedgers = ledgers.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    const [selIndex, setSelIndex] = useState(0);

    // Keyboard for Selection
    useEffect(() => {
        if (mode !== "select") return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") setSelIndex(prev => Math.min(prev + 1, filteredLedgers.length - 1));
            if (e.key === "ArrowUp") setSelIndex(prev => Math.max(prev - 1, 0));
            if (e.key === "Enter" && filteredLedgers[selIndex]) {
                handleSelect(filteredLedgers[selIndex]);
            }
            if (e.key === "Escape") navigate("/alter");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode, filteredLedgers, selIndex, navigate]);

    const handleSelect = (l: Ledger) => {
        setFormData({ ...l });
        setSelectedId(l.id);
        setMode("edit");
    };

    const handleSave = async () => {
        if (!selectedId || !formData.name || !formData.group_id) return;
        try {
            await api.put(`/accounting/ledgers/${selectedId}`, formData);
            alert("Ledger Upated!");
            navigate("/alter");
        } catch (e) {
            alert("Error updating ledger");
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (confirm("Delete Ledger?")) {
            try {
                await api.delete(`/accounting/ledgers/${selectedId}`);
                alert("Deleted!");
                fetchLedgers(); // Refresh list
                setMode("select");
                setSearch(""); // Reset search
            } catch (e: any) {
                alert(e.response?.data?.detail || "Delete Failed");
            }
        }
    };

    // Keyboard Shortcuts (Edit Mode)
    useEffect(() => {
        if (mode !== "edit") return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setMode("select");
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                e.preventDefault();
                handleSave();
            }
            if (e.altKey && e.key === "d") {
                e.preventDefault();
                handleDelete();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [mode, selectedId, formData]); // formData needed for save if we called it directly

    if (mode === "select") {
        return (
            <div className="flex flex-col h-full bg-white font-mono text-sm">
                <div className="bg-tally-blue text-white p-1 text-center font-bold">Select Ledger</div>
                <div className="p-2 border-b">
                    <input
                        className="w-full border p-1"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex-1 overflow-auto">
                    {filteredLedgers.map((l, idx) => (
                        <div
                            key={l.id}
                            className={`p-1 px-4 cursor-pointer flex justify-between ${idx === selIndex ? "bg-yellow-200 text-black font-bold" : "hover:bg-yellow-100"}`}
                            onClick={() => handleSelect(l)}
                        >
                            <span>{l.name}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                    [Enter] Select  [Esc] Back
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full items-center justify-center bg-gray-100 font-mono">
            <div className="w-[600px] bg-tally-bg border shadow-lg flex flex-col h-[400px]">
                {/* Header */}
                <div className="bg-tally-blue text-white font-bold px-2 py-1 flex justify-between">
                    <span>Ledger Alteration</span>
                </div>

                {/* Form */}
                <div className="p-8 flex flex-col gap-4">
                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Name</label>
                        <input
                            className="bg-black text-white p-1 outline-none w-full border border-gray-600 focus:bg-yellow-100 focus:text-black"
                            value={formData.name || ""}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Under</label>
                        <select
                            className="bg-white text-black p-1 outline-none w-full border border-gray-400"
                            value={formData.group_id || ""}
                            onChange={e => setFormData({ ...formData, group_id: parseInt(e.target.value) })}
                        >
                            <option value="" disabled>Select Group</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Opening Bal</label>
                        <div className="flex-1 flex gap-2">
                            <input
                                className="bg-white text-black p-1 outline-none w-1/2 border border-gray-400 text-right"
                                type="number"
                                value={formData.opening_balance || 0}
                                onChange={e => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) })}
                            />
                            <div className="text-xs flex items-center">Dr/Cr (Fixed to Dr for now)</div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto bg-tally-bg border-t p-2 flex justify-between">
                    <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-1 font-bold text-xs shadow-md">
                        Delete (Alt+D)
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => setMode("select")} className="px-4 py-1 font-bold text-xs underline">
                            Cancel (Esc)
                        </button>
                        <button onClick={handleSave} className="bg-tally-blue text-white px-4 py-1 font-bold text-xs shadow-md">
                            Accept (Yes)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
