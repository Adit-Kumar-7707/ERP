import { Link } from "react-router-dom";
import {
  Wallet,
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  FileSpreadsheet,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Voucher {
  id: string;
  voucherNo: string;
  type: "payment" | "receipt" | "sales" | "purchase" | "journal";
  party: string;
  amount: number;
  date: string;
  narration?: string;
}

const recentVouchers: Voucher[] = [
  {
    id: "1",
    voucherNo: "PAY/2025/0042",
    type: "payment",
    party: "ABC Suppliers",
    amount: 125000,
    date: "2025-01-08",
    narration: "Payment for Invoice #INV-2024-1234",
  },
  {
    id: "2",
    voucherNo: "REC/2025/0038",
    type: "receipt",
    party: "XYZ Enterprises",
    amount: 245000,
    date: "2025-01-08",
    narration: "Receipt against Sales Invoice #SL-2024-0892",
  },
  {
    id: "3",
    voucherNo: "SAL/2025/0156",
    type: "sales",
    party: "Global Trading Co",
    amount: 380000,
    date: "2025-01-07",
  },
  {
    id: "4",
    voucherNo: "PUR/2025/0089",
    type: "purchase",
    party: "Raw Materials Ltd",
    amount: 520000,
    date: "2025-01-07",
  },
  {
    id: "5",
    voucherNo: "JRN/2025/0012",
    type: "journal",
    party: "Depreciation Entry",
    amount: 45000,
    date: "2025-01-06",
    narration: "Monthly depreciation on fixed assets",
  },
];

const voucherTypeConfig = {
  payment: { icon: Wallet, color: "text-debit", label: "Payment" },
  receipt: { icon: IndianRupee, color: "text-credit", label: "Receipt" },
  sales: { icon: TrendingUp, color: "text-credit", label: "Sales" },
  purchase: { icon: ShoppingCart, color: "text-debit", label: "Purchase" },
  journal: { icon: FileSpreadsheet, color: "text-muted-foreground", label: "Journal" },
};

const formatIndianCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

export const RecentVouchers = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Vouchers</h2>
        <Link
          to="/vouchers"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          View All
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-table-header text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-3">Voucher No</div>
          <div className="col-span-3">Party</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-table-border">
          {recentVouchers.map((voucher) => {
            const config = voucherTypeConfig[voucher.type];
            const Icon = config.icon;

            return (
              <div
                key={voucher.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-table-row-hover transition-colors group"
              >
                <div className="col-span-3">
                  <Link
                    to={`/vouchers/${voucher.type}/${voucher.id}`}
                    className="font-medium text-sm hover:text-primary transition-colors"
                  >
                    {voucher.voucherNo}
                  </Link>
                  {voucher.narration && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {voucher.narration}
                    </p>
                  )}
                </div>
                <div className="col-span-3 text-sm truncate">{voucher.party}</div>
                <div className="col-span-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      config.color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </span>
                </div>
                <div
                  className={cn(
                    "col-span-2 text-right font-medium text-sm tabular-nums",
                    voucher.type === "payment" || voucher.type === "purchase"
                      ? "text-debit"
                      : voucher.type === "journal"
                      ? ""
                      : "text-credit"
                  )}
                >
                  {formatIndianCurrency(voucher.amount)}
                </div>
                <div className="col-span-1 text-sm text-muted-foreground">
                  {formatDate(voucher.date)}
                </div>
                <div className="col-span-1 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Print</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
