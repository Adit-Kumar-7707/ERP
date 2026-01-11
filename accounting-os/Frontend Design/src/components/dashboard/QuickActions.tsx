import { Link } from "react-router-dom";
import {
  Wallet,
  IndianRupee,
  ArrowLeftRight,
  FileSpreadsheet,
  TrendingUp,
  ShoppingCart,
  Plus,
  BookOpen,
  Users,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string[];
  color: "default" | "credit" | "debit" | "warning";
}

const quickActions: QuickAction[] = [
  {
    title: "Payment",
    description: "Record outgoing payment",
    href: "/vouchers/payment",
    icon: Wallet,
    shortcut: ["F5"],
    color: "debit",
  },
  {
    title: "Receipt",
    description: "Record incoming receipt",
    href: "/vouchers/receipt",
    icon: IndianRupee,
    shortcut: ["F6"],
    color: "credit",
  },
  {
    title: "Contra",
    description: "Bank-Cash transfer",
    href: "/vouchers/contra",
    icon: ArrowLeftRight,
    shortcut: ["F4"],
    color: "default",
  },
  {
    title: "Journal",
    description: "Adjustment entry",
    href: "/vouchers/journal",
    icon: FileSpreadsheet,
    shortcut: ["F7"],
    color: "default",
  },
  {
    title: "Sales",
    description: "Create sales invoice",
    href: "/vouchers/sales",
    icon: TrendingUp,
    shortcut: ["F8"],
    color: "credit",
  },
  {
    title: "Purchase",
    description: "Record purchase",
    href: "/vouchers/purchase",
    icon: ShoppingCart,
    shortcut: ["F9"],
    color: "debit",
  },
];

const secondaryActions = [
  { title: "New Ledger", href: "/ledgers/new", icon: Plus },
  { title: "View Ledgers", href: "/ledgers", icon: BookOpen },
  { title: "Parties", href: "/parties", icon: Users },
];

const colorStyles = {
  default: "border-border hover:border-primary/30",
  credit: "border-l-4 border-l-credit hover:border-credit/50",
  debit: "border-l-4 border-l-debit hover:border-debit/50",
  warning: "border-l-4 border-l-warning hover:border-warning/50",
};

export const QuickActions = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <span className="text-xs text-muted-foreground">
          Press function keys for shortcuts
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.href}
            className={cn(
              "bg-card border rounded-lg p-4 transition-all duration-150 hover:shadow-sm group",
              colorStyles[action.color]
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-muted rounded-lg group-hover:bg-accent transition-colors">
                <action.icon className="h-4 w-4 text-foreground" />
              </div>
              {action.shortcut && (
                <Kbd className="text-2xs">{action.shortcut[0]}</Kbd>
              )}
            </div>
            <h3 className="font-medium text-sm">{action.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {action.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        {secondaryActions.map((action) => (
          <Link
            key={action.title}
            to={action.href}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-md hover:bg-accent transition-colors"
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.title}
          </Link>
        ))}
      </div>
    </div>
  );
};
