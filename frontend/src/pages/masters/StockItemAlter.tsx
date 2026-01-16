import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useStockItems } from "@/hooks/useStockItems";

interface StockItem {
    id: number;
    name: string;
    group_id?: number;
    unit_id?: number;
    opening_qty: number;
    opening_rate: number;
    opening_value: number;
}

interface BasicMaster {
    id: number;
    name: string;
}

export default function StockItemAlter() {
    const navigate = useNavigate();
    const { items: startItems, fetchItems } = useStockItems(); // For selection list

    // Modes: 'select' | 'edit'
    const [mode, setMode] = useState<"select" | "edit">("select");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    // Dropdown Data
    const [groups, setGroups] = useState<BasicMaster[]>([]);
    const [units, setUnits] = useState<BasicMaster[]>([]);

    // Form State
    const [formData, setFormData] = useState<Partial<StockItem>>({});

    // Initial Fetch
    useEffect(() => {
        fetchItems();
        api.get("/inventory/groups").then(res => setGroups(res.data));
        api.get("/inventory/units").then(res => setUnits(res.data));
    }, []);

    // Selection Logic
    const filteredItems = startItems.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    const [selIndex, setSelIndex] = useState(0);

    // Keyboard for Selection
    useEffect(() => {
        if (mode !== "select") return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") setSelIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
            if (e.key === "ArrowUp") setSelIndex(prev => Math.max(prev - 1, 0));
            if (e.key === "Enter" && filteredItems[selIndex]) {
                handleSelect(filteredItems[selIndex] as unknown as StockItem);
            }
            if (e.key === "Escape") navigate("/alter");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode, filteredItems, selIndex, navigate]);

    const handleSelect = (item: StockItem) => {
        setFormData({ ...item });
        setSelectedId(item.id);
        setMode("edit");
    };

    const handleSave = async () => {
        if (!selectedId || !formData.name) return;
        try {
            await api.put(`/inventory/items/${selectedId}`, formData);
            alert("Stock Item Updated!");
            navigate("/alter");
        } catch (e) {
            alert("Error updating item");
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (confirm("Delete Stock Item?")) {
            try {
                await api.delete(`/inventory/items/${selectedId}`);
                alert("Deleted!");
                fetchItems();
                setMode("select");
                setSearch("");
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
    }, [mode, selectedId, formData]);

    if (mode === "select") {
        return (
            <div className="flex flex-col h-full bg-white font-mono text-sm">
                <div className="bg-tally-blue text-white p-1 text-center font-bold">Select Stock Item</div>
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
                    {filteredItems.map((l, idx) => (
                        <div
                            key={l.id}
                            className={`p-1 px-4 cursor-pointer flex justify-between ${idx === selIndex ? "bg-yellow-200 text-black font-bold" : "hover:bg-yellow-100"}`}
                            onClick={() => handleSelect(l as unknown as StockItem)}
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
            <div className="w-[800px] h-[500px] bg-tally-bg border shadow-lg flex flex-col p-1">
                {/* Header */}
                <div className="bg-tally-blue text-white font-bold px-2 py-1 flex justify-between mb-4">
                    <span>Stock Item Alteration</span>
                </div>

                {/* Form */}
                <div className="flex-1 px-8 py-2 flex flex-col gap-2">
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
                            className="bg-white text-black p-1 outline-none w-1/2 border border-gray-400"
                            value={formData.group_id || ""}
                            onChange={e => setFormData({ ...formData, group_id: parseInt(e.target.value) })}
                        >
                            <option value="">Primary</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Units</label>
                        <select
                            className="bg-white text-black p-1 outline-none w-1/2 border border-gray-400"
                            value={formData.unit_id || ""}
                            onChange={e => setFormData({ ...formData, unit_id: parseInt(e.target.value) })}
                        >
                            <option value="">Not Applicable</option>
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="border-t border-gray-400 my-2"></div>
                    <div className="font-bold mb-2">Opening Balance</div>

                    <div className="flex gap-2">
                        <div className="flex flex-col w-1/3">
                            <label className="text-xs">Quantity</label>
                            <input
                                className="border p-1 text-right"
                                type="number"
                                value={formData.opening_qty || 0}
                                onChange={e => setFormData({ ...formData, opening_qty: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col w-1/3">
                            <label className="text-xs">Rate</label>
                            <input
                                className="border p-1 text-right"
                                type="number"
                                value={formData.opening_rate || 0}
                                onChange={e => setFormData({ ...formData, opening_rate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col w-1/3">
                            <label className="text-xs">Value</label>
                            <input
                                className="border p-1 text-right bg-gray-200"
                                type="number"
                                disabled
                                value={(formData.opening_qty || 0) * (formData.opening_rate || 0)}
                            />
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
