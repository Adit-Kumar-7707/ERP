import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

interface VoucherLine {
  id: string;
  ledger: string;
  debit: number | null;
  credit: number | null;
  costCenter?: string;
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

const sampleLedgers = [
  "Cash",
  "Bank - HDFC Current",
  "Bank - SBI Savings",
  "Sales - Trading",
  "Purchase - Trading",
  "Sundry Debtors - ABC Ltd",
  "Sundry Creditors - XYZ Suppliers",
  "GST Input",
  "GST Output",
  "Salary Expense",
  "Rent Expense",
  "Office Expense",
];

const formatIndianCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
  }).format(amount);
};

export const VoucherEntry = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const config = voucherTypeConfig[type || "payment"];

  const [voucherNo, setVoucherNo] = useState("AUTO");
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([
    { id: "1", ledger: "", debit: null, credit: null },
    { id: "2", ledger: "", debit: null, credit: null },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), ledger: "", debit: null, credit: null },
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

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

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
          <Button variant="outline" size="sm" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Attach
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" className="gap-2">
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
                    value={line.ledger}
                    onValueChange={(value) => updateLine(line.id, "ledger", value)}
                  >
                    <SelectTrigger className="h-9 border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-input">
                      <SelectValue placeholder="Select ledger..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleLedgers.map((ledger) => (
                        <SelectItem key={ledger} value={ledger}>
                          {ledger}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={line.debit || ""}
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
                    type="number"
                    placeholder="0.00"
                    value={line.credit || ""}
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
