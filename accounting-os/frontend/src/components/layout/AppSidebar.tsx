import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Package,
  BarChart3,
  Settings,
  Users,
  Calculator,
  Building2,
  ChevronDown,
  ChevronRight,
  Receipt,
  IndianRupee,
  Wallet,
  ArrowLeftRight,
  FileSpreadsheet,
  TrendingUp,
  ShoppingCart,
  Truck,
  CreditCard,
  FileCheck,
  Layers,
  ToggleLeft,
  Shield,
  HelpCircle,
  Command,
  Zap,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { useOrganization } from "@/context/OrganizationContext";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  shortcut?: string;
  children?: NavItem[];
  feature?: string;
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    shortcut: "D",
  },
  {
    title: "Vouchers",
    icon: FileText,
    shortcut: "V",
    children: [
      { title: "Payment", href: "/vouchers/payment", icon: Wallet },
      { title: "Receipt", href: "/vouchers/receipt", icon: IndianRupee },
      { title: "Contra", href: "/vouchers/contra", icon: ArrowLeftRight },
      { title: "Journal", href: "/vouchers/journal", icon: FileSpreadsheet },
      { title: "Sales", href: "/vouchers/sales", icon: TrendingUp },
      { title: "Purchase", href: "/vouchers/purchase", icon: ShoppingCart },
      { title: "Credit Note", href: "/vouchers/credit-note", icon: FileCheck },
      { title: "Debit Note", href: "/vouchers/debit-note", icon: Receipt },
    ],
  },
  {
    title: "Ledgers",
    href: "/ledgers",
    icon: BookOpen,
    shortcut: "L",
  },
  {
    title: "Inventory",
    icon: Package,
    shortcut: "I",
    children: [
      { title: "Stock Items", href: "/inventory/items", icon: Package },
      { title: "Stock Groups", href: "/inventory/groups", icon: Layers },
      { title: "Godowns", href: "/inventory/godowns", icon: Building2 },
      { title: "Stock Journal", href: "/inventory/journal", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    shortcut: "R",
    children: [
      { title: "Trial Balance", href: "/reports/trial-balance", icon: Calculator },
      { title: "Profit & Loss", href: "/reports/pnl", icon: TrendingUp },
      { title: "Balance Sheet", href: "/reports/balance-sheet", icon: FileSpreadsheet },
      { title: "Cash Flow", href: "/reports/cash-flow", icon: IndianRupee },
      { title: "GST Reports", href: "/reports/gst", icon: Receipt },
      { title: "Ledger Statements", href: "/reports/ledger", icon: BookOpen },
    ],
  },
  {
    title: "Parties",
    href: "/parties",
    icon: Users,
    shortcut: "P",
  },
  {
    title: "Banking",
    href: "/banking",
    icon: CreditCard,
    shortcut: "B",
  },
];

const settingsNav: NavItem[] = [
  {
    title: "Voucher Types",
    href: "/settings/voucher-types",
    icon: FileText,
  },
  {
    title: "Automation Rules",
    href: "/settings/rules",
    icon: Zap,
  },
  {
    title: "Feature Toggles",
    href: "/settings/features",
    icon: ToggleLeft,
  },
  {
    title: "Users & Roles",
    href: "/settings/users",
    icon: Shield,
  },
  {
    title: "Company",
    href: "/settings/company",
    icon: Building2,
  },
  {
    title: "Cost Centers",
    href: "/masters/cost-centers",
    icon: Building2,
    feature: "cost_centers"
  },
  {
    title: "Price Levels",
    href: "/masters/price-levels",
    icon: TrendingUp,
    feature: "inventory" // Usually linked to inventory
  },
];

interface SidebarGroupProps {
  item: NavItem;
  isCollapsed: boolean;
}

const SidebarGroup = ({ item, isCollapsed }: SidebarGroupProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(
    item.children?.some((child) => child.href === location.pathname) ?? false
  );

  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <NavLink
        to={item.href || "#"}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground"
          )
        }
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.shortcut && (
              <Kbd className="bg-sidebar-muted text-sidebar-foreground/60 border-sidebar-border">
                {item.shortcut}
              </Kbd>
            )}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "text-sidebar-foreground"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.title}</span>
            {item.shortcut && (
              <Kbd className="bg-sidebar-muted text-sidebar-foreground/60 border-sidebar-border mr-1">
                {item.shortcut}
              </Kbd>
            )}
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </>
        )}
      </button>
      {isOpen && !isCollapsed && (
        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
          {item.children?.map((child) => (
            <NavLink
              key={child.href}
              to={child.href || "#"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80"
                )
              }
            >
              <child.icon className="h-3.5 w-3.5" />
              <span>{child.title}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const AppSidebar = ({ isCollapsed, onToggle }: AppSidebarProps) => {
  const { hasFeature } = useOrganization();
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-sm font-semibold text-sidebar-primary">Finance ERP</h1>
              <p className="text-2xs text-sidebar-foreground/60">v1.0.0</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <Command className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        {navigation.map((item) => {
          // Feature Toggle Logic
          if (item.title === "Inventory" && !hasFeature("inventory")) return null;
          // Filter Reports children if needed (e.g. GST)
          if (item.title === "Reports" && item.children) {
            const filteredChildren = item.children.filter(child => {
              if (child.title.includes("GST") && !hasFeature("gst")) return false;
              return true;
            });
            // Clone item with filtered children
            return <SidebarGroup key={item.title} item={{ ...item, children: filteredChildren }} isCollapsed={isCollapsed} />;
          }
          return <SidebarGroup key={item.title} item={item} isCollapsed={isCollapsed} />;
        })}
      </nav>

      {/* Settings Section */}
      <div className="border-t border-sidebar-border p-3">
        {!isCollapsed && (
          <p className="px-3 mb-2 text-2xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Settings
          </p>
        )}
        <div className="space-y-1">
          {settingsNav.map((item) => {
            // @ts-ignore - custom property
            if (item.feature === "cost_centers" && !hasFeature("cost_centers")) return null;
            // @ts-ignore
            if (item.feature === "inventory" && !hasFeature("inventory")) return null;

            return <SidebarGroup key={item.title} item={item} isCollapsed={isCollapsed} />;
          })}
        </div>
      </div>

      {/* Help */}
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/help"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          {!isCollapsed && <span>Help & Support</span>}
        </NavLink>
      </div>
    </aside>
  );
};
