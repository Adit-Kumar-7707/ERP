import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useShortcutContext } from "../../contexts/ShortcutContext";
// import { Dialog, DialogContent } from "@/components/ui/dialog"; // Not used if using bare Command
import { Search, Calculator, Book, FileText, Settings, User, PlusCircle } from "lucide-react";

// CSS for CMDK (Often needs custom styling or shadcn component)
// Assuming we have Shadcn UI "Command" component wrapper, but bare implementation here for precision control.
// If Shadcn "Command" exists, I should use that. Let's assume bare for now or styled wrapper.
// Actually, shadcn installs `Command` usually. I will try to use a self-contained component for now.

export function CommandPalette() {
    const { isCommandPaletteOpen, setCommandPaletteOpen } = useShortcutContext();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCommandPaletteOpen(!isCommandPaletteOpen);
            }
        }
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [isCommandPaletteOpen, setCommandPaletteOpen]);

    const runCommand = (command: () => void) => {
        setCommandPaletteOpen(false);
        command();
    };

    if (!isCommandPaletteOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-popover text-popover-foreground rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <Command label="Global Command Menu" className="w-full">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Command.Input
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Type a command or search..."
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                        <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>

                        <Command.Group heading="Navigation">
                            <Command.Item onSelect={() => runCommand(() => navigate("/dashboard"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <Calculator className="mr-2 h-4 w-4" /> Dashboard
                            </Command.Item>
                            <Command.Item onSelect={() => runCommand(() => navigate("/reports/trial-balance"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <FileText className="mr-2 h-4 w-4" /> Trial Balance
                            </Command.Item>
                            <Command.Item onSelect={() => runCommand(() => navigate("/masters/ledgers"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <Book className="mr-2 h-4 w-4" /> Ledgers
                            </Command.Item>
                            <Command.Item onSelect={() => runCommand(() => navigate("/masters/items"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <Book className="mr-2 h-4 w-4" /> Stock Items
                            </Command.Item>
                        </Command.Group>

                        <Command.Group heading="Create">
                            <Command.Item onSelect={() => runCommand(() => navigate("/vouchers/sales"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <PlusCircle className="mr-2 h-4 w-4" /> Create Sales Voucher
                            </Command.Item>
                            <Command.Item onSelect={() => runCommand(() => navigate("/vouchers/purchase"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <PlusCircle className="mr-2 h-4 w-4" /> Create Purchase Voucher
                            </Command.Item>
                        </Command.Group>

                        <Command.Group heading="Settings">
                            <Command.Item onSelect={() => runCommand(() => navigate("/settings"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <Settings className="mr-2 h-4 w-4" /> Settings
                            </Command.Item>
                            <Command.Item onSelect={() => runCommand(() => navigate("/profile"))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
                                <User className="mr-2 h-4 w-4" /> User Profile
                            </Command.Item>
                        </Command.Group>

                    </Command.List>
                </Command>
            </div>
        </div>
    );
}
