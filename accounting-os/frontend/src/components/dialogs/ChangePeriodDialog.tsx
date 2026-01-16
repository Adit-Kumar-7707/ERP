import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { usePeriod } from "../../contexts/PeriodContext";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

export function ChangePeriodDialog() {
    const { fromDate, toDate, setPeriod, formatDate, isDialogOpen, openDialog, closeDialog } = usePeriod();
    const [tempFrom, setTempFrom] = useState(formatDate(fromDate));
    const [tempTo, setTempTo] = useState(formatDate(toDate));

    // Update temps when dialog opens or dates change externally
    useEffect(() => {
        if (isDialogOpen) {
            setTempFrom(formatDate(fromDate));
            setTempTo(formatDate(toDate));
        }
    }, [isDialogOpen, fromDate, toDate]);

    // Shortcut Alt+F2
    useKeyboardShortcuts([
        {
            combo: "alt+f2",
            handler: () => {
                openDialog();
            },
            description: "Change Period"
        }
    ]);

    const handleSave = () => {
        const from = new Date(tempFrom);
        const to = new Date(tempTo);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
            setPeriod(from, to);
            closeDialog();
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Change Period</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="from" className="text-right">From</Label>
                        <Input id="from" type="date" value={tempFrom} onChange={e => setTempFrom(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="to" className="text-right">To</Label>
                        <Input id="to" type="date" value={tempTo} onChange={e => setTempTo(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
