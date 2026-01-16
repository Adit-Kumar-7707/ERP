import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TallyContextType {
    currentDate: string;
    setCurrentDate: (date: string) => void;
    periodStart: string;
    periodEnd: string;
    setPeriod: (start: string, end: string) => void;
    showDateModal: boolean;
    setShowDateModal: (show: boolean) => void;
}

const TallyContext = createContext<TallyContextType | undefined>(undefined);

export function TallyProvider({ children }: { children: ReactNode }) {
    const today = new Date();
    // Logic for Financial Year (Apr-Mar)
    const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;

    const [currentDate, setCurrentDate] = useState(today.toISOString().split('T')[0]);
    const [periodStart, setPeriodStart] = useState(`${currentYear}-04-01`);
    const [periodEnd, setPeriodEnd] = useState(`${currentYear + 1}-03-31`);

    const [showDateModal, setShowDateModal] = useState(false);
    const [showPeriodModal, setShowPeriodModal] = useState(false);

    // Global Shortcut F2 (Date) & Alt+F2 (Period)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2" && !e.altKey) {
                e.preventDefault();
                setShowDateModal(true);
            }
            if (e.key === "F2" && e.altKey) {
                e.preventDefault();
                setShowPeriodModal(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const setPeriod = (start: string, end: string) => {
        setPeriodStart(start);
        setPeriodEnd(end);
    };

    return (
        <TallyContext.Provider value={{ currentDate, setCurrentDate, periodStart, periodEnd, setPeriod, showDateModal, setShowDateModal }}>
            {children}
            {showDateModal && <DateModal currentDate={currentDate} onClose={(d) => { setCurrentDate(d); setShowDateModal(false); }} />}
            {showPeriodModal && <PeriodModal start={periodStart} end={periodEnd} onClose={(s, e) => { setPeriod(s, e); setShowPeriodModal(false); }} />}
        </TallyContext.Provider>
    );
}

export function useTally() {
    const context = useContext(TallyContext);
    if (!context) throw new Error("useTally must be used within TallyProvider");
    return context;
}

// Simple Modal Component Internal
function DateModal({ currentDate, onClose }: { currentDate: string, onClose: (d: string) => void }) {
    const [date, setDate] = useState(currentDate);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-tally-yellow border-2 border-tally-blue p-4 shadow-xl w-64">
                <div className="font-bold mb-2 text-tally-blue">Current Date</div>
                <input
                    type="date"
                    className="w-full p-1 border border-gray-400 font-bold mb-4"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                        if (e.key === "Enter") onClose(date);
                        if (e.key === "Escape") onClose(currentDate); // Cancel
                    }}
                />
                <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => onClose(currentDate)} className="text-red-800 hover:underline">Cancel</button>
                    <button onClick={() => onClose(date)} className="bg-tally-blue text-white px-3 py-1 font-bold">Set</button>
                </div>
            </div>
        </div>
    );
}

function PeriodModal({ start, end, onClose }: { start: string, end: string, onClose: (s: string, e: string) => void }) {
    const [s, setS] = useState(start);
    const [e, setE] = useState(end);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-tally-yellow border-2 border-tally-blue p-4 shadow-xl w-80">
                <div className="font-bold mb-2 text-tally-blue">Change Period</div>
                <div className="flex flex-col gap-2 mb-4">
                    <div>
                        <label className="text-xs font-bold">From</label>
                        <input
                            type="date"
                            className="w-full p-1 border border-gray-400 font-bold"
                            value={s}
                            onChange={ev => setS(ev.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold">To</label>
                        <input
                            type="date"
                            className="w-full p-1 border border-gray-400 font-bold"
                            value={e}
                            onChange={ev => setE(ev.target.value)}
                            onKeyDown={ev => {
                                if (ev.key === "Enter") onClose(s, e);
                                if (ev.key === "Escape") onClose(start, end);
                            }}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => onClose(start, end)} className="text-red-800 hover:underline">Cancel</button>
                    <button onClick={() => onClose(s, e)} className="bg-tally-blue text-white px-3 py-1 font-bold">Set</button>
                </div>
            </div>
        </div>
    );
}
