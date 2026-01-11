import { useEffect, useState } from "react";
import api from "@/api/client";
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
  id: number;
  voucher_number: string;
  voucher_type_id: number;
  date: string;
  narration?: string;
  // TODO: Add amount and type details from backend relations
  // For MVP, we might miss some details until backend serializer includes them
}

const voucherTypeConfig: any = {
  // Map ID or type string to icon. 
  // Since we might get IDs, we need a smarter mapping or backend to send type string.
  // Fallback config
  default: { icon: FileSpreadsheet, color: "text-muted-foreground", label: "Voucher" },
};

const formatIndianCurrency = (amount: number) => {
  // Fallback if amount is undefined
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

export const RecentVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await api.get('/vouchers/entries?limit=5');
        setVouchers(res.data);
      } catch (err) {
        console.error("Failed to fetch vouchers", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVouchers();
  }, []);

  if (loading) return <div>Loading vouchers...</div>;

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
          {vouchers.map((voucher) => {
            const config = voucherTypeConfig.default; // Simplification for now
            const Icon = config.icon;

            return (
              <div
                key={voucher.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-table-row-hover transition-colors group"
              >
                <div className="col-span-3">
                  <Link
                    to={`/vouchers/view/${voucher.id}`}
                    className="font-medium text-sm hover:text-primary transition-colors"
                  >
                    {voucher.voucher_number}
                  </Link>
                  {voucher.narration && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {voucher.narration}
                    </p>
                  )}
                </div>
                <div className="col-span-3 text-sm truncate">Unknown Party</div>
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
                    "col-span-2 text-right font-medium text-sm tabular-nums"
                  )}
                >
                  {formatIndianCurrency(0)}
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
