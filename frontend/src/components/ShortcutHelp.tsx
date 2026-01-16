import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ShortcutHelp() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only toggle if not typing in an input (unless it's just ?)
            // Actually ? is Shift+/, so usually safe.
            // But if generic input is focused, we might want to avoid.
            // Tally allows ? to work everywhere? Maybe specific inputs consume it.
            // Let's allow it globally for now.
            if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    // Contextual Shortcuts based on Route
    const isVoucher = location.pathname.includes("voucher-entry");
    const isReport = location.pathname.includes("report") || location.pathname.includes("balance-sheet") || location.pathname.includes("pl");

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white border-2 border-tally-blue shadow-2xl w-[600px] max-h-[80vh] overflow-auto rounded-lg">
                <div className="bg-tally-blue text-white p-3 font-bold text-lg flex justify-between items-center">
                    <span>Keyboard Shortcuts</span>
                    <button onClick={() => setIsOpen(false)} className="text-sm bg-white/20 px-2 rounded hover:bg-white/30">Esc</button>
                </div>

                <div className="p-6 grid grid-cols-2 gap-8 text-sm font-mono">
                    <div>
                        <h3 className="text-tally-blue font-bold border-b border-gray-200 mb-2 pb-1">Global</h3>
                        <div className="space-y-2">
                            <ShortcutKey keys={["Ctrl", "K"]} label="Go To (Command Palette)" />
                            <ShortcutKey keys={["Alt", "G"]} label="Go To (Alternative)" />
                            <ShortcutKey keys={["F2"]} label="Change Date" />
                            <ShortcutKey keys={["Alt", "F2"]} label="Change Period" />
                            <ShortcutKey keys={["Esc"]} label="Back / Quit" />
                            <ShortcutKey keys={["?"]} label="Toggle This Help" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-tally-blue font-bold border-b border-gray-200 mb-2 pb-1">Voucher Entry</h3>
                        <div className="space-y-2">
                            <ShortcutKey keys={["Alt", "C"]} label="Create Master (On-fly)" />
                            <ShortcutKey keys={["Ctrl", "A"]} label="Save Voucher" />
                            <ShortcutKey keys={["Enter"]} label="Next Field / Accept" />
                            <ShortcutKey keys={["Backspace"]} label="Delete Row (Empty)" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-tally-blue font-bold border-b border-gray-200 mb-2 pb-1">Reports</h3>
                        <div className="space-y-2">
                            <ShortcutKey keys={["Arrow Keys"]} label="Navigate Grid" />
                            <ShortcutKey keys={["Enter"]} label="Drill Down" />
                            <ShortcutKey keys={["Alt", "F1"]} label="Detailed / Condensed" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-tally-blue font-bold border-b border-gray-200 mb-2 pb-1">Masters</h3>
                        <div className="space-y-2">
                            <ShortcutKey keys={["Alt", "D"]} label="Delete Master" />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-100 p-3 text-xs text-center border-t text-gray-500">
                    Pro Tip: Most actions can be performed without a mouse.
                </div>
            </div>
        </div>
    );
}

function ShortcutKey({ keys, label }: { keys: string[], label: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-700">{label}</span>
            <div className="flex gap-1">
                {keys.map(k => (
                    <kbd key={k} className="bg-gray-200 border border-gray-400 rounded px-1.5 py-0.5 text-xs font-bold text-gray-800 shadow-sm min-w-[20px] text-center">
                        {k}
                    </kbd>
                ))}
            </div>
        </div>
    );
}
