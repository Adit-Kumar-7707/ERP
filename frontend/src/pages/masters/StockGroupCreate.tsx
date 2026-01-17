import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function StockGroupCreate() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [parent] = useState("");

    const handleSave = async () => {
        if (!name) return alert("Name is required");

        try {
            await api.post("/inventory/groups", {
                name: name,
                parent_id: parent ? parseInt(parent) : null
            });
            alert("Stock Group Created!");
            setName("");
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
    }, [navigate, name]);

    return (
        <div className="flex flex-col h-full bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Stock Group Creation</div>
            </div>

            <div className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full border-x border-tally-border shadow-md mt-4">
                <div className="grid grid-cols-[150px_1fr] gap-4">

                    <label className="font-bold text-tally-text mt-1">Name</label>
                    <input
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-md font-bold"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                    />

                    <label className="font-bold text-tally-text mt-1">Under</label>
                    <input
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-md"
                        value="Primary"
                        readOnly
                    // TODO: Implement Parent Selection
                    />
                </div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Ctrl+A] Accept  [Esc] Quit
            </div>
        </div>
    );
}
