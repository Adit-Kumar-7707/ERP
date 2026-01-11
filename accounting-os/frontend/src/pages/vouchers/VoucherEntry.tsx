import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/client";
import {
  Calendar,
  Search,
  Plus,
  Trash2,
  Save,
  Printer,
  X,
  ChevronDown,
  Paperclip,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface VoucherLine {
  id: string; // Internal ID for React keys
  ledgerId: string; // The selected account ID
  debit: number | null;
  credit: number | null;
}

interface Account {
  id: number;
  name: string;
  type: string;
  code: string;
}

interface VoucherType {
  id: number;
  name: string;
  type_group: string;
}

const voucherTypeConfig: Record<string, { title: string; shortcut: string }> = {
  payment: { title: "Payment Voucher", shortcut: "F5" },
  receipt: { title: "Receipt Voucher", shortcut: "F6" },
  contra: { title: "Contra Voucher", shortcut: "F4" },
  journal: { title: "Journal Voucher", shortcut: "F7" },
  sales: { title: "Sales Invoice", shortcut: "F8" },
  purchase: { title: "Purchase Invoice", shortcut: "F9" },
  "credit-note": { title: "Credit Note", shortcut: "Ctrl+F8" },
  "debit-note": { title: "Debit Note", shortcut: "Ctrl+F9" },
};

const formatIndianCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
  }).format(amount);
};

export const VoucherEntry = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const config = voucherTypeConfig[type || "payment"];

  const [voucherNo, setVoucherNo] = useState("AUTO");
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([
    { id: "1", ledgerId: "", debit: null, credit: null },
    { id: "2", ledgerId: "", debit: null, credit: null },
  ]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [voucherTypeObj, setVoucherTypeObj] = useState<VoucherType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Fetch Accounts
        const accRes = await api.get('/accounting/accounts');
        // Filter out groups, we only post to ledgers
        const ledgers = accRes.data.filter((a: any) => !a.is_group);
        setAccounts(ledgers);

        // 2. Fetch Voucher Types and find current
        const typesRes = await api.get('/vouchers/types');
        const currentType = typesRes.data.find((t: any) => t.name.toLowerCase() === (type || 'payment').toLowerCase());

        if (currentType) {
          setVoucherTypeObj(currentType);
        } else {
          // Fallback or Error
          toast({
            title: "Error",
            description: `Voucher Type '${type}' not found in configuration.`,
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [type]);

  // F-Key Shortcuts
  useEffect(() => {
    const handleVoucherShortcuts = (e: KeyboardEvent) => {
      // Allow F-keys even inside inputs
      switch (e.key) {
        case "F5": e.preventDefault(); navigate("/vouchers/payment"); break;
        case "F6": e.preventDefault(); navigate("/vouchers/receipt"); break;
        case "F4": e.preventDefault(); navigate("/vouchers/contra"); break;
        case "F7": e.preventDefault(); navigate("/vouchers/journal"); break;
        case "F8":
          e.preventDefault();
          if (e.ctrlKey) navigate("/vouchers/credit-note");
          else navigate("/vouchers/sales");
          break;
        case "F9":
          e.preventDefault();
          if (e.ctrlKey) navigate("/vouchers/debit-note");
          else navigate("/vouchers/purchase");
          break;
      }
    };
    window.addEventListener("keydown", handleVoucherShortcuts);
    return () => window.removeEventListener("keydown", handleVoucherShortcuts);
  }, [navigate]);

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), ledgerId: "", debit: null, credit: null },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof VoucherLine, value: any) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  // Keyboard Navigation Handler
  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Logic to move to next field
      if (field === "ledger") {
        // Move to Debit
        const debitInput = document.getElementById(`debit-${lines[index].id}`);
        debitInput?.focus();
      } else if (field === "debit") {
        // Move to Credit
        const creditInput = document.getElementById(`credit-${lines[index].id}`);
        creditInput?.focus();
      } else if (field === "credit") {
        // If last line, add new line or focus narration
        if (index === lines.length - 1) {
          // Move to Narration if balanced? Or just add line?
          // Accountant flow: Always add line until user manually stops
          addLine();
          // Focus will be set by useEffect or we need to wait for render. 
          // For now, let's just focus Narration if balanced, or Add Button
          if (isBalanced && index > 0) {
            document.getElementById("narration")?.focus();
          } else {
            // We need to wait for state update to focus the new line.
            // A simple timeout works for MVP
            setTimeout(() => {
              // The ID of the NEXT line is not known yet because it's generated in addLine. 
              // We need to refactor addLine to return ID or use a Ref.
              // For now, let's just focus the "Add Line" button as a safe step
              const addButton = document.getElementById("add-line-btn");
              addButton?.focus();
            }, 100);
          }
        } else {
          // Move to next line Ledger
          // Since Ledger is a Select, we need to focus its trigger.
          // We need IDs on Select Triggers.
          const nextLedger = document.getElementById(`ledger-trigger-${lines[index + 1].id}`);
          nextLedger?.focus();
        }
      }
    }
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleSave = async () => {
    if (!isBalanced) {
      toast({ title: "Error", description: "Voucher is not balanced.", variant: "destructive" });
      return;
    }
    if (!voucherTypeObj) return;

    const payload = {
      voucher_type_id: voucherTypeObj.id,
      date: voucherDate,
      narration: narration,
      voucher_number: voucherNo === 'AUTO' ? null : voucherNo,
      lines: lines.map(l => ({
        account_id: parseInt(l.ledgerId),
        debit: l.debit || 0,
        credit: l.credit || 0,
        description: "" // Line description if needed
      }))
    };

    try {
      await api.post('/vouchers/entries', payload);
      toast({ title: "Success", description: "Voucher saved successfully." });
      navigate('/vouchers');
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.response?.data?.detail || "Unknown error", variant: "destructive" });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{config?.title || "Voucher Entry"}</h1>
              <Kbd className="text-2xs">{config?.shortcut}</Kbd>
            </div>
            <p className="text-sm text-muted-foreground">
              Voucher No: {voucherNo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save
            <Kbd className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 ml-1">
              Ctrl+S
            </Kbd>
          </Button>
        </div>
      </div>

      {/* Voucher Form */}
      <div className="bg-card border rounded-lg">
        {/* Top Section - Date, Voucher No, Reference */}
        <div className="grid grid-cols-3 gap-4 p-4 border-b">
          <div className="space-y-1.5">
            <Label htmlFor="voucherDate" className="text-xs text-muted-foreground">
              Date
            </Label>
            <div className="relative">
              <Input
                id="voucherDate"
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="h-9 pl-9"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="voucherNo" className="text-xs text-muted-foreground">
              Voucher No
            </Label>
            <Input
              id="voucherNo"
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference" className="text-xs text-muted-foreground">
              Reference
            </Label>
            <Input
              id="reference"
              placeholder="Invoice / Bill No"
              className="h-9"
            />
          </div>
        </div>

        {/* Voucher Lines */}
        <div className="p-4">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-table-header rounded-t-lg text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-5">Ledger Account</div>
            <div className="col-span-3 text-right">Debit (₹)</div>
            <div className="col-span-3 text-right">Credit (₹)</div>
            <div className="col-span-1"></div>
          </div>

          {/* Lines */}
          <div className="divide-y divide-table-border border-x border-b rounded-b-lg">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-table-row-hover transition-colors group"
              >
                <div className="col-span-5">
                  <Select
                    value={line.ledgerId}
                    onValueChange={(value) => updateLine(line.id, "ledgerId", value)}
                  >
                    <SelectTrigger
                      id={`ledger-trigger-${line.id}`}
                      onKeyDown={(e) => handleKeyDown(e, index, "ledger")}
                      className="h-9 border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-input"
                    >
                      <SelectValue placeholder="Select ledger..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id.toString()}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    id={`debit-${line.id}`}
                    type="number"
                    placeholder="0.00"
                    value={line.debit || ""}
                    onKeyDown={(e) => handleKeyDown(e, index, "debit")}
                    onChange={(e) =>
                      updateLine(
                        line.id,
                        "debit",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="h-9 text-right font-mono tabular-nums border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-input"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    id={`credit-${line.id}`}
                    type="number"
                    placeholder="0.00"
                    value={line.credit || ""}
                    onKeyDown={(e) => handleKeyDown(e, index, "credit")}
                    onChange={(e) =>
                      updateLine(
                        line.id,
                        "credit",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    className="h-9 text-right font-mono tabular-nums border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-input"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length <= 2}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Line Button */}
          <button
            id="add-line-btn"
            onClick={addLine}
            className="w-full mt-2 p-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Line
          </button>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-12 gap-2 px-3">
              <div className="col-span-5 text-sm font-medium">Total</div>
              <div
                className={cn(
                  "col-span-3 text-right font-semibold tabular-nums",
                  totalDebit > 0 && "text-debit"
                )}
              >
                ₹{formatIndianCurrency(totalDebit)}
              </div>
              <div
                className={cn(
                  "col-span-3 text-right font-semibold tabular-nums",
                  totalCredit > 0 && "text-credit"
                )}
              >
                ₹{formatIndianCurrency(totalCredit)}
              </div>
              <div className="col-span-1"></div>
            </div>

            {!isBalanced && (
              <div className="mt-3 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Difference: ₹{formatIndianCurrency(Math.abs(difference))} (
                  {difference > 0 ? "Debit" : "Credit"} side is higher)
                </p>
              </div>
            )}

            {isBalanced && totalDebit > 0 && (
              <div className="mt-3 px-3 py-2 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success flex items-center gap-2">
                  ✓ Voucher is balanced
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Narration */}
        <div className="p-4 border-t">
          <Label htmlFor="narration" className="text-xs text-muted-foreground mb-1.5 block">
            Narration
          </Label>
          <Textarea
            id="narration"
            placeholder="Enter narration or remarks..."
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className="resize-none h-20"
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Footer */}
      <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd>Tab</Kbd> Next field
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> Save
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Ctrl</Kbd>+<Kbd>N</Kbd> New line
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> Cancel
        </span>
      </div>
    </div>
  );
};

export default VoucherEntry;
