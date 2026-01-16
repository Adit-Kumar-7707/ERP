import { useState } from "react";
import {
  Search,
  Bell,
  Settings,
  User,
  ChevronDown,
  Building2,
  Calendar,
  LogOut,
  KeyRound,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePeriod } from "@/contexts/PeriodContext";

const shortcuts = [
  { keys: ["Alt", "V"], action: "Voucher Entry" },
  { keys: ["Alt", "L"], action: "Ledger View" },
  { keys: ["Alt", "R"], action: "Reports" },
  { keys: ["Alt", "S"], action: "Search" },
  { keys: ["Ctrl", "N"], action: "New Entry" },
  { keys: ["Esc"], action: "Close / Cancel" },
];

export const TopBar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { fromDate, toDate, formatDate, openDialog } = usePeriod();

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left - Company Info */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">Acme Enterprises Pvt Ltd</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Acme Enterprises Pvt Ltd
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Acme Trading Co
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Companies
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 text-muted-foreground hover:text-foreground"
          onClick={openDialog}
          title="Change Period (Alt+F2)"
        >
          <Calendar className="h-4 w-4" />
          <span className="text-sm hidden md:inline">{formatDate(fromDate)} to {formatDate(toDate)}</span>
          <span className="text-sm md:hidden">Period</span>
        </Button>
      </div>

      {/* Center - Search */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-3 px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors w-80">
            <Search className="h-4 w-4" />
            <span>Search vouchers, ledgers, reports...</span>
            <div className="ml-auto flex items-center gap-1">
              <Kbd>Alt</Kbd>
              <Kbd>S</Kbd>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="sr-only">Search</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vouchers, ledgers, parties, reports..."
                className="pl-10 h-11"
                autoFocus
              />
            </div>
          </div>
          <div className="border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Try searching for "Sales Invoice", "Cash Ledger", or press{" "}
              <Kbd>↓</Kbd> to browse recent items
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Keyboard Shortcuts */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <KeyRound className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm">{shortcut.action}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm">Admin</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/settings/profile'}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/settings/company'}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
