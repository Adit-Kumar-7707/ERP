import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";
import { useMenuNavigation } from "@/hooks/useMenuNavigation";
import { cn } from "@/lib/utils";

interface VoucherType {
    id: number;
    name: string;
    numbering_method: string;
    prevent_duplicates: boolean;
    numbering_prefix?: string;
    numbering_suffix?: string;
}

export default function VoucherTypeAlter() {
    const navigate = useNavigate();
    const [types, setTypes] = useState<VoucherType[]>([]);
    const [selectedType, setSelectedType] = useState<VoucherType | null>(null);

    // Fetch types
    useEffect(() => {
        api.get("/accounting/voucher-types")
            .then(res => setTypes(res.data))
            .catch(err => console.error(err));
    }, []);

    // List View Navigation
    const { selectedIndex } = useMenuNavigation(types, (item) => {
        setSelectedType(item);
    }, () => navigate("/masters/create"));

    const handleSave = async (updated: VoucherType) => {
        try {
            await api.put(`/accounting/voucher-types/${updated.id}`, {
                numbering_method: updated.numbering_method,
                prevent_duplicates: updated.prevent_duplicates,
                numbering_prefix: updated.numbering_prefix,
                numbering_suffix: updated.numbering_suffix
            });
            alert("Voucher Type Updated!");
            setSelectedType(null);
            // Refresh list
            const res = await api.get("/accounting/voucher-types");
            setTypes(res.data);
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    if (selectedType) {
        return <VoucherTypeForm
            initialData={selectedType}
            onSave={handleSave}
            onCancel={() => setSelectedType(null)}
        />;
    }

    return (
        <div className="h-full flex flex-col bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Gateway of Tally &gt; Masters &gt; Voucher Types</div>
            </div>

            <div className="flex-1 flex justify-center items-center">
                <div className="w-96 border-2 border-tally-border bg-tally-panel shadow-lg">
                    <div className="bg-tally-yellow text-tally-text font-bold text-center py-1 border-b border-tally-border">
                        List of Voucher Types
                    </div>
                    <div className="bg-white min-h-[300px] overflow-auto max-h-[500px]">
                        {types.map((item, idx) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "px-4 py-1 cursor-pointer flex justify-between",
                                    selectedIndex === idx ? "bg-tally-blue text-white" : "text-tally-text"
                                )}
                                onClick={() => setSelectedType(item)}
                            >
                                <span>{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Esc] Back  [Enter] Select
            </div>
        </div>
    );
}

function VoucherTypeForm({ initialData, onSave, onCancel }: { initialData: VoucherType, onSave: (d: VoucherType) => void, onCancel: () => void }) {
    const [data, setData] = useState(initialData);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                e.preventDefault();
                onSave(data);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [data, onSave, onCancel]);

    return (
        <div className="h-full flex flex-col bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Voucher Type Alteration</div>
            </div>

            <div className="flex-1 bg-white p-8 max-w-4xl mx-auto w-full border-x border-tally-border shadow-md mt-4">
                <div className="grid grid-cols-[200px_1fr] gap-4">
                    <label className="font-bold text-tally-text mt-1">Name</label>
                    <div className="font-bold p-1 bg-gray-100">{data.name}</div>

                    <label className="font-bold text-tally-text mt-1">Method of Numbering</label>
                    <select
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                        value={data.numbering_method}
                        onChange={e => setData({ ...data, numbering_method: e.target.value })}
                    >
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="None">None</option>
                    </select>

                    <label className="font-bold text-tally-text mt-1">Prevent Duplicates</label>
                    <select
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 w-20"
                        value={data.prevent_duplicates ? "Yes" : "No"}
                        onChange={e => setData({ ...data, prevent_duplicates: e.target.value === "Yes" })}
                    >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>

                    <div className="col-span-2 border-t my-2"></div>
                    <div className="col-span-2 font-bold text-tally-blue">Advanced Configuration</div>

                    <label className="font-bold text-tally-text mt-1">Default Prefix</label>
                    <input
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                        placeholder="e.g. INV/"
                        value={data.numbering_prefix || ""}
                        onChange={e => setData({ ...data, numbering_prefix: e.target.value })}
                    />

                    <label className="font-bold text-tally-text mt-1">Default Suffix</label>
                    <input
                        className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                        placeholder="e.g. /24-25"
                        value={data.numbering_suffix || ""}
                        onChange={e => setData({ ...data, numbering_suffix: e.target.value })}
                    />
                </div>
            </div>
            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Ctrl+A] Save  [Esc] Cancel
            </div>
        </div>
    );
}
