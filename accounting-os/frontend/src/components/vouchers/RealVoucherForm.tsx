import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Search, Plus, Trash2, Save, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface VoucherItem {
    id: string; // React key
    ledger_id: string;
    description: string;
    qty: number;
    rate: number;
    amount: number;
}

export const RealVoucherForm = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Config
    const isSales = type === "sales";
    const title = isSales ? "Sales Invoice" : "Purchase Bill";

    // State
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [voucherNo, setVoucherNo] = useState("AUTO");
    const [partyId, setPartyId] = useState("");
    const [narration, setNarration] = useState("");

    const [items, setItems] = useState<VoucherItem[]>([
        { id: "1", ledger_id: "", description: "", qty: 1, rate: 0, amount: 0 }
    ]);

    const [accounts, setAccounts] = useState<any[]>([]);
    const [voucherTypeObj, setVoucherTypeObj] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Refs for Focus Management
    const partyRef = useRef<HTMLButtonElement>(null);
    const gridRefs = useRef<(HTMLInputElement | HTMLButtonElement | null)[][]>([]);

    // Register Shortcut
    useKeyboardShortcuts([
        { combo: "ctrl+s", handler: () => handleSave(), description: "Save Voucher" },
        { combo: "control+enter", handler: () => handleSave(), description: "Save Voucher" },
        { combo: "alt+c", handler: () => toast({ title: "Quick Create", description: "Coming soon!" }), description: "Create Master" }
    ]);

    // Load Data
    useEffect(() => {
        const init = async () => {
            try {
                const [accRes, typeRes] = await Promise.all([
                    api.get('/accounting/accounts'),
                    api.get('/vouchers/types')
                ]);

                setAccounts(accRes.data.filter((a: any) => !a.is_group));

                const targetType = typeRes.data.find((t: any) => t.name.toLowerCase().includes(type || "sales"));
                if (targetType) {
                    setVoucherTypeObj(targetType);
                } else {
                    toast({ title: "Error", description: `Voucher Type for ${type} not found`, variant: "destructive" });
                }
            } catch (err) {
                console.error(err);
                toast({ title: "Error", description: "Failed to load masters", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [type]);

    // Initial Focus
    useEffect(() => {
        if (!loading && partyRef.current) {
            setTimeout(() => partyRef.current?.focus(), 100);
        }
    }, [loading]);

    // Handlers
    const updateItem = (id: string, field: keyof VoucherItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'qty' || field === 'rate') {
                    updated.amount = updated.qty * updated.rate;
                }
                return updated;
            }
            return item;
        }));
    };

    const addItem = () => {
        const newId = Date.now().toString();
        setItems([...items, { id: newId, ledger_id: "", description: "", qty: 1, rate: 0, amount: 0 }]);
        // Focus logic: Wait for render, then focus first cell of new row.
        // Handled in GridKeyDown ideally or effect.
    };

    const removeItem = (id: string) => {
        if (items.length > 1) setItems(items.filter(i => i.id !== id));
    };

    const calculateTotal = () => items.reduce((sum, i) => sum + i.amount, 0);

    const handleSave = async () => {
        if (!partyId) {
            toast({ title: "Error", description: "Select a Party Ledger", variant: "destructive" });
            return;
        }
        if (!voucherTypeObj) return;

        const payload = {
            voucher_type_id: voucherTypeObj.id,
            date: date,
            party_ledger_id: parseInt(partyId),
            narration: narration,
            voucher_number: voucherNo === 'AUTO' ? null : voucherNo,
            items: items.map(i => ({
                ledger_id: parseInt(i.ledger_id),
                description: i.description,
                qty: i.qty,
                rate: i.rate,
                amount: i.amount
            }))
        };

        try {
            await api.post('/vouchers/entries', payload);
            toast({ title: "Success", description: "Voucher Saved Successfully" });
            navigate('/vouchers');
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.detail || "Save Failed", variant: "destructive" });
        }
    };

    // Grid Navigation Logic
    const handleGridKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
        if (e.key === "Enter") {
            e.preventDefault();

            // Columns: 0=Ledger, 1=Desc, 2=Qty, 3=Rate
            // Move Next
            if (colIdx < 3) {
                // Move right
                // Need ref to next cell
                // How to get ref? simpler without storing ref array? element.nextSibling?
                // Or strict ID based.
                // Let's use `gridRefs` array.
                const next = gridRefs.current[rowIdx]?.[colIdx + 1];
                if (next) next.focus();
            } else {
                // Last Column (Rate) -> Amount is ReadOnly.
                // Move to Next Row or Add Row
                if (rowIdx === items.length - 1) {
                    addItem();
                    // Focus handling for new row is tricky as it doesn't exist yet.
                    // Solution: useEffect to focus last row first cell when items change?
                    // Or specific "isAdding" state.
                } else {
                    const nextRowStart = gridRefs.current[rowIdx + 1]?.[0];
                    if (nextRowStart) nextRowStart.focus();
                }
            }
        }
        if (e.key === "ArrowDown") {
            const nextRow = gridRefs.current[rowIdx + 1]?.[colIdx];
            if (nextRow) nextRow.focus();
        }
        if (e.key === "ArrowUp") {
            const prevRow = gridRefs.current[rowIdx - 1]?.[colIdx];
            if (prevRow) prevRow.focus();
        }
    };

    // Auto-focus new row
    useEffect(() => {
        if (items.length > 1) {
            const lastIdx = items.length - 1;
            // Focus first cell of last row if it was just added (checking previous length would be better but this is MVP)
            // setTimeout ensures render
            setTimeout(() => {
                const el = gridRefs.current[lastIdx]?.[0];
                if (el) el.focus();
            }, 50);
        }
    }, [items.length]);


    if (loading) return <div>Loading...</div>;

    const setGridRef = (el: any, r: number, c: number) => {
        if (!gridRefs.current[r]) gridRefs.current[r] = [];
        gridRefs.current[r][c] = el;
    };

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="text-muted-foreground">{voucherTypeObj?.name}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Save (Ctrl+S)</Button>
                </div>
            </div>

            <div className="bg-card border rounded-lg p-4 grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Party A/c Name</Label>
                    <Select value={partyId} onValueChange={setPartyId}>
                        <SelectTrigger ref={partyRef} onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                // Focus next: Date
                                // Simple hack: id based or ref.
                                document.getElementById('vch-date')?.focus();
                            }
                        }}>
                            <SelectValue placeholder="Select Party Ledger" />
                        </SelectTrigger>
                        <SelectContent className="h-[200px]">
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Voucher Date</Label>
                    <Input
                        id="vch-date"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                // Focus first item
                                gridRefs.current[0]?.[0]?.focus();
                            }
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Voucher No</Label>
                    <Input value={voucherNo} readOnly className="font-mono bg-muted" />
                </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
                    <div className="col-span-4">Item / Ledger</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                </div>

                <div className="divide-y">
                    {items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/10">
                            <div className="col-span-4">
                                {/* Using Native Select for MVP Key Nav or custom Select that exposes Ref properly? 
                                    Shadcn Select Trigger exposes ref.
                                */}
                                <Select value={item.ledger_id} onValueChange={v => updateItem(item.id, 'ledger_id', v)}>
                                    <SelectTrigger
                                        className="h-8"
                                        ref={(el) => setGridRef(el, idx, 0)}
                                        onKeyDown={(e) => handleGridKeyDown(e, idx, 0)}
                                    >
                                        <SelectValue placeholder="Select Ledger" />
                                    </SelectTrigger>
                                    <SelectContent className="h-[200px]">
                                        {accounts.filter(a => isSales ? a.type === 'income' : a.type === 'expense').map(acc => (
                                            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-3">
                                <Input
                                    className="h-8"
                                    value={item.description}
                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                    placeholder="Item desc"
                                    ref={(el) => setGridRef(el, idx, 1)}
                                    onKeyDown={(e) => handleGridKeyDown(e, idx, 1)}
                                />
                            </div>
                            <div className="col-span-1">
                                <Input
                                    className="h-8 text-right"
                                    type="number"
                                    value={item.qty}
                                    onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value))}
                                    ref={(el) => setGridRef(el, idx, 2)}
                                    onKeyDown={(e) => handleGridKeyDown(e, idx, 2)}
                                />
                            </div>
                            <div className="col-span-2">
                                <Input
                                    className="h-8 text-right"
                                    type="number"
                                    value={item.rate}
                                    onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value))}
                                    ref={(el) => setGridRef(el, idx, 3)}
                                    onKeyDown={(e) => handleGridKeyDown(e, idx, 3)}
                                />
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                                <Input readOnly className="h-8 text-right font-mono bg-muted/50" value={item.amount.toFixed(2)} />
                                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-3 border-t">
                    <Button variant="ghost" size="sm" onClick={addItem} className="gap-2 text-muted-foreground"><Plus className="w-4 h-4" /> Add Item</Button>
                </div>
            </div>

            <div className="flex justify-end">
                <div className="bg-card border rounded-lg p-4 w-64 space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Total Amount</span>
                        <span>₹ {calculateTotal().toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
                <Label>Narration</Label>
                <Input
                    className="mt-2"
                    value={narration}
                    onChange={e => setNarration(e.target.value)}
                    placeholder="Remarks..."
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            handleSave();
                        }
                    }}
                />
            </div>
        </div>
    );
};
