import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

interface Unit {
    id: number;
    symbol: string;
    name: string;
}

export default function UnitCreate() {
    const navigate = useNavigate();

    // Mode
    const [type, setType] = useState<"Simple" | "Compound">("Simple");

    // Simple Fields
    const [symbol, setSymbol] = useState("");
    const [formalName, setFormalName] = useState("");
    const [precision, setPrecision] = useState("0");

    // Compound Fields
    const [units, setUnits] = useState<Unit[]>([]);
    const [conversion, setConversion] = useState("");
    const [baseUnitId, setBaseUnitId] = useState("");

    useEffect(() => {
        // Fetch units for dropdown
        api.get("/inventory/units/").then(res => setUnits(res.data)).catch(console.error);
    }, []);

    const handleSave = async () => {
        if (!symbol && type === "Simple") return alert("Symbol is required");
        if (type === "Compound") {
            if (!conversion || !baseUnitId || !symbol) return alert("All fields required for Compound Unit");
        }

        try {
            const payload: any = {
                name: formalName || symbol,
                symbol: symbol,
                precision: parseInt(precision),
            };

            if (type === "Compound") {
                payload.base_unit_id = parseInt(baseUnitId);
                payload.conversion_factor = parseFloat(conversion);
                // For Compound, Symbol is constructed? Or User enters "Box"?
                // Tally: "First Unit" is the symbol effectively.
                // User enters "Box", selects "10", "Nos".
            }

            await api.post("/inventory/units/", payload);
            alert("Unit Created!");
            setSymbol("");
            setFormalName("");
            setConversion("");
            setBaseUnitId("");
            // Refresh units
            api.get("/inventory/units/").then(res => setUnits(res.data));
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
            // Toggle Type with Backspace if on first field? No, Tally uses specific keys.
            // Let's us Up/Down to simulate menu navigation if field is focused.
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, type, symbol, formalName, precision, conversion, baseUnitId]);

    return (
        <div className="flex flex-col h-full bg-tally-bg">
            <div className="bg-tally-yellow px-4 py-2 flex justify-between items-center border-b border-yellow-500">
                <div className="font-bold text-lg">Unit Creation</div>
                <div className="text-xs">
                    Type:
                    <button
                        onClick={() => setType("Simple")}
                        className={`mx-1 ${type === "Simple" ? "font-bold underline" : ""}`}
                    >Simple</button>
                    /
                    <button
                        onClick={() => setType("Compound")}
                        className={`mx-1 ${type === "Compound" ? "font-bold underline" : ""}`}
                    >Compound</button>
                    (Backspace to toggle)
                </div>
            </div>

            <div className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full border-x border-tally-border shadow-md mt-4">
                <div className="grid grid-cols-[150px_1fr] gap-4">

                    {/* Type Selector (Tally usually puts this at top) */}
                    <label className="font-bold text-tally-text mt-1">Type</label>
                    <div className="relative">
                        <select
                            className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs w-full appearance-none"
                            value={type}
                            onChange={e => setType(e.target.value as any)}
                        >
                            <option value="Simple">Simple</option>
                            <option value="Compound">Compound</option>
                        </select>
                    </div>

                    {type === "Simple" && (
                        <>
                            <label className="font-bold text-tally-text mt-1">Symbol</label>
                            <input
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                value={symbol}
                                onChange={e => setSymbol(e.target.value)}
                                autoFocus
                                placeholder="e.g. Nos"
                            />

                            <label className="font-bold text-tally-text mt-1">Formal Name</label>
                            <input
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                value={formalName}
                                onChange={e => setFormalName(e.target.value)}
                                placeholder="e.g. Numbers"
                            />

                            <label className="font-bold text-tally-text mt-1">Decimal Places</label>
                            <input
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 w-20"
                                value={precision}
                                type="number"
                                onChange={e => setPrecision(e.target.value)}
                            />
                        </>
                    )}

                    {type === "Compound" && (
                        <>
                            <label className="font-bold text-tally-text mt-1">First Unit</label>
                            <input
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs"
                                value={symbol}
                                onChange={e => setSymbol(e.target.value)}
                                autoFocus
                                placeholder="e.g. Box"
                                title="The new unit you are creating"
                            />

                            <label className="font-bold text-tally-text mt-1">Conversion</label>
                            <div className="flex items-center gap-2">
                                <span>1 {symbol || "Unit"} = </span>
                                <input
                                    className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 w-20 text-center"
                                    value={conversion}
                                    onChange={e => setConversion(e.target.value)}
                                    placeholder="e.g. 10"
                                    type="number"
                                />
                            </div>

                            <label className="font-bold text-tally-text mt-1">Second Unit</label>
                            <select
                                className="bg-tally-input border-b border-dashed border-gray-400 outline-none p-1 focus:bg-yellow-100 max-w-xs appearance-none"
                                value={baseUnitId}
                                onChange={e => setBaseUnitId(e.target.value)}
                            >
                                <option value="">Select Base Unit</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.symbol}</option>
                                ))}
                            </select>
                        </>
                    )}

                </div>
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted">
                [Ctrl+A] Accept  [Esc] Quit
            </div>
        </div>
    );
}
