import React from 'react';
import { useShortcutContext } from '../../contexts/ShortcutContext';
import { REGISTERED_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function HelpOverlay() {
    const { isHelpOpen, toggleHelp } = useShortcutContext();

    return (
        <Dialog open={isHelpOpen} onOpenChange={toggleHelp}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Context</TableHead>
                                <TableHead>Shortcut</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {REGISTERED_SHORTCUTS.map((s, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium capitalize">{s.context || 'Global'}</TableCell>
                                    <TableCell>
                                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                            {s.combo.toUpperCase()}
                                        </kbd>
                                    </TableCell>
                                    <TableCell>{s.description}</TableCell>
                                </TableRow>
                            ))}
                            {/* Static Global ones */}
                            <TableRow>
                                <TableCell>Global</TableCell>
                                <TableCell><kbd>CTRL+K</kbd></TableCell>
                                <TableCell>Open Command Palette</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Global</TableCell>
                                <TableCell><kbd>?</kbd></TableCell>
                                <TableCell>Toggle Help</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
