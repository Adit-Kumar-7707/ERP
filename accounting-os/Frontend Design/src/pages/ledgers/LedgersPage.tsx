import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  MoreHorizontal,
  Filter,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LedgerGroup {
  id: string;
  name: string;
  type: "group" | "ledger";
  balance?: number;
  balanceType?: "Dr" | "Cr";
  children?: LedgerGroup[];
  isExpanded?: boolean;
}

const ledgerData: LedgerGroup[] = [
  {
    id: "1",
    name: "Capital Account",
    type: "group",
    children: [
      { id: "1.1", name: "Owner's Capital", type: "ledger", balance: 5000000, balanceType: "Cr" },
      { id: "1.2", name: "Partner A Capital", type: "ledger", balance: 2500000, balanceType: "Cr" },
    ],
  },
  {
    id: "2",
    name: "Current Assets",
    type: "group",
    children: [
      {
        id: "2.1",
        name: "Cash-in-Hand",
        type: "group",
        children: [
          { id: "2.1.1", name: "Cash", type: "ledger", balance: 245000, balanceType: "Dr" },
          { id: "2.1.2", name: "Petty Cash", type: "ledger", balance: 15000, balanceType: "Dr" },
        ],
      },
      {
        id: "2.2",
        name: "Bank Accounts",
        type: "group",
        children: [
          { id: "2.2.1", name: "HDFC Current Account", type: "ledger", balance: 8500000, balanceType: "Dr" },
          { id: "2.2.2", name: "SBI Savings Account", type: "ledger", balance: 2500000, balanceType: "Dr" },
          { id: "2.2.3", name: "ICICI OD Account", type: "ledger", balance: 500000, balanceType: "Cr" },
        ],
      },
      {
        id: "2.3",
        name: "Sundry Debtors",
        type: "group",
        children: [
          { id: "2.3.1", name: "ABC Enterprises", type: "ledger", balance: 450000, balanceType: "Dr" },
          { id: "2.3.2", name: "XYZ Trading Co", type: "ledger", balance: 320000, balanceType: "Dr" },
          { id: "2.3.3", name: "Global Tech Ltd", type: "ledger", balance: 180000, balanceType: "Dr" },
        ],
      },
    ],
  },
  {
    id: "3",
    name: "Current Liabilities",
    type: "group",
    children: [
      {
        id: "3.1",
        name: "Sundry Creditors",
        type: "group",
        children: [
          { id: "3.1.1", name: "Raw Materials Supplier", type: "ledger", balance: 680000, balanceType: "Cr" },
          { id: "3.1.2", name: "Office Supplies Vendor", type: "ledger", balance: 45000, balanceType: "Cr" },
        ],
      },
      {
        id: "3.2",
        name: "Duties & Taxes",
        type: "group",
        children: [
          { id: "3.2.1", name: "GST Payable", type: "ledger", balance: 185000, balanceType: "Cr" },
          { id: "3.2.2", name: "TDS Payable", type: "ledger", balance: 42000, balanceType: "Cr" },
        ],
      },
    ],
  },
  {
    id: "4",
    name: "Income",
    type: "group",
    children: [
      { id: "4.1", name: "Sales - Trading", type: "ledger", balance: 15800000, balanceType: "Cr" },
      { id: "4.2", name: "Sales - Services", type: "ledger", balance: 2400000, balanceType: "Cr" },
      { id: "4.3", name: "Interest Received", type: "ledger", balance: 35000, balanceType: "Cr" },
    ],
  },
  {
    id: "5",
    name: "Expenses",
    type: "group",
    children: [
      { id: "5.1", name: "Purchase - Trading", type: "ledger", balance: 12500000, balanceType: "Dr" },
      { id: "5.2", name: "Salary & Wages", type: "ledger", balance: 850000, balanceType: "Dr" },
      { id: "5.3", name: "Rent Expense", type: "ledger", balance: 180000, balanceType: "Dr" },
      { id: "5.4", name: "Utility Expenses", type: "ledger", balance: 45000, balanceType: "Dr" },
    ],
  },
];

const formatIndianCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
  }).format(amount);
};

interface LedgerTreeItemProps {
  item: LedgerGroup;
  level: number;
}

const LedgerTreeItem = ({ item, level }: LedgerTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = item.children && item.children.length > 0;
  const isGroup = item.type === "group";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 hover:bg-table-row-hover transition-colors group cursor-pointer",
          level > 0 && "ml-6"
        )}
        style={{ paddingLeft: `${(level * 24) + 12}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-5 h-5 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </div>

        {/* Icon */}
        {isGroup ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Name */}
        <span
          className={cn(
            "flex-1 text-sm",
            isGroup ? "font-medium" : ""
          )}
        >
          {item.name}
        </span>

        {/* Balance */}
        {item.balance !== undefined && (
          <span
            className={cn(
              "tabular-nums text-sm font-medium",
              item.balanceType === "Dr" ? "text-debit" : "text-credit"
            )}
          >
            ₹{formatIndianCurrency(item.balance)} {item.balanceType}
          </span>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Statement</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            {isGroup && <DropdownMenuItem>Add Ledger</DropdownMenuItem>}
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {item.children?.map((child) => (
            <LedgerTreeItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const LedgersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage ledger groups and accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Ledger
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ledgers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Kbd>/</Kbd>
          </div>
        </div>

        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Ledger Tree */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-table-header border-b">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Ledger / Group
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Balance
          </span>
        </div>

        {/* Tree View */}
        <div className="divide-y divide-table-border">
          {ledgerData.map((group) => (
            <LedgerTreeItem key={group.id} item={group} level={0} />
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 5 groups, 24 ledgers</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> Expand/Collapse
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>N</Kbd> New Ledger
          </span>
        </div>
      </div>
    </div>
  );
};

export default LedgersPage;
