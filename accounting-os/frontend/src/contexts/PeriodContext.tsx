import React, { createContext, useContext, useState, useEffect } from 'react';

interface PeriodContextType {
    fromDate: Date;
    toDate: Date;
    setPeriod: (from: Date, to: Date) => void;
    // Helper to format as YYYY-MM-DD
    formatDate: (d: Date) => string;
    isDialogOpen: boolean;
    openDialog: () => void;
    closeDialog: () => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default: Current Financial Year (Apr 1 - Mar 31) based on Today
    const getInitialFY = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11

        // If Jan-Mar, then FY started Prev Year Apr
        // If Apr-Dec, then FY started Current Year Apr
        const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;
        const endYear = startYear + 1;

        return {
            from: new Date(startYear, 3, 1), // Apr 1
            to: new Date(endYear, 2, 31) // Mar 31
        };
    };

    const [fromDate, setFromDate] = useState<Date>(getInitialFY().from);
    const [toDate, setToDate] = useState<Date>(getInitialFY().to);
    const [isDialogOpen, setDialogOpen] = useState(false);

    const setPeriod = (from: Date, to: Date) => {
        setFromDate(from);
        setToDate(to);
    };

    const formatDate = (d: Date) => {
        return d.toISOString().split('T')[0];
    };

    return (
        <PeriodContext.Provider value={{
            fromDate,
            toDate,
            setPeriod,
            formatDate,
            isDialogOpen,
            openDialog: () => setDialogOpen(true),
            closeDialog: () => setDialogOpen(false)
        }}>
            {children}
        </PeriodContext.Provider>
    );
};

export const usePeriod = () => {
    const context = useContext(PeriodContext);
    if (!context) {
        throw new Error("usePeriod must be used within a PeriodProvider");
    }
    return context;
};
