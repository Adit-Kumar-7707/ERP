import { useState, useEffect } from "react";
import api from "@/api/client";
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

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  description?: string;
  parent_id?: number;
  is_group: boolean;
}

interface LedgerGroup {
  id: string;
  name: string;
  type: "group" | "ledger";
  balance?: number;
  balanceType?: "Dr" | "Cr";
  children?: LedgerGroup[];
  isExpanded?: boolean;
}

const formatIndianCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
  }).format(amount || 0);
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
  const [ledgerData, setLedgerData] = useState<LedgerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to build tree
  const buildTree = (accounts: Account[]): LedgerGroup[] => {
    const map = new Map<number, LedgerGroup>();
    const roots: LedgerGroup[] = [];

    // 1. Create nodes
    accounts.forEach(acc => {
      map.set(acc.id, {
        id: acc.id.toString(),
        name: acc.name,
        type: acc.is_group ? "group" : "ledger",
        children: [],
        balance: 0, // Todo: fetch real balances
        balanceType: "Dr"
      });
    });

    // 2. Assemble tree
    accounts.forEach(acc => {
      const node = map.get(acc.id);
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children!.push(node!);
      } else {
        roots.push(node!);
      }
    });
    return roots;
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/accounting/accounts');
        const tree = buildTree(res.data);
        setLedgerData(tree);
      } catch (err) {
        console.error("Failed to fetch accounts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  if (loading) return <div>Loading Chart of Accounts...</div>;

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
          {ledgerData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No accounts found. Use 'New Ledger' to create one.</div>
          ) : (
            ledgerData.map((group) => (
              <LedgerTreeItem key={group.id} item={group} level={0} />
            ))
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing all groups and ledgers</span>
        <div className="flex items-center gap-4">
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
