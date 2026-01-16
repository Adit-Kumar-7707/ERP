import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

interface Godown {
    id: number;
    name: string;
    parent_id: number | null;
}

export default function GodownCreate() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [parentId, setParentId] = useState<number | null>(null);
    const [godowns, setGodowns] = useState<Godown[]>([]);

    useEffect(() => {
        api.get("/inventory/godowns/").then(res => setGodowns(res.data)).catch(console.error);
    }, []);

    const handleSave = async () => {
        if (!name) return alert("Name is required");
        try {
            await api.post("/inventory/godowns", { name, parent_id: parentId });
            alert("Godown Created!");
            setName("");
            setParentId(null);
            // Refresh
            api.get("/inventory/godowns/").then(res => setGodowns(res.data));
        } catch (e: any) {
            console.error(e);
            alert("Error: " + (e.response?.data?.detail || e.message));
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);
            if ((e.metaKey || e.ctrlKey) && e.key === "a") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, name, parentId]);

    // Simple Indented List for Parent Selection
    const renderOptions = (parentId: number | null = null, depth = 0): React.ReactNode => {
        const children = godowns.filter(g => g.parent_id === parentId);
        if (children.length === 0) return null;
        return children.map(g => (
            <>
                <option key={g.id} value={g.id}>
                    {"\u00A0".repeat(depth * 4)}{g.name}
                </option>
                {renderOptions(g.id, depth + 1)}
            </>
        ));
    };

    return (
        <div className="flex flex-col h-full bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Godown Creation</div>
            </div>

            <div className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full border-x border-tally-border shadow-md mt-4">
                <div className="grid grid-cols-[150px_1fr] gap-4">
                    <label className="font-bold text-tally-text mt-1">Name</label>
                    <input
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                    />

                    <label className="font-bold text-tally-text mt-1">Under (Parent)</label>
                    <select
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs appearance-none"
                        value={parentId || ""}
                        onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">Primary</option>
                        {/* Recursive options render */}
                        {godowns.filter(g => g.parent_id === null).map(g => (
                            <>
                                <option key={g.id} value={g.id}>{g.name}</option>
                                {renderOptions(g.id, 1)}
                            </>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Ctrl+A] Accept  [Esc] Quit
            </div>
        </div>
    );
}
