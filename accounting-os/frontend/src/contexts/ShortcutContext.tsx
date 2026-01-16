import React, { createContext, useContext, useState } from 'react';

// For Help Overlay State
interface ShortcutContextType {
    isHelpOpen: boolean;
    toggleHelp: () => void;
    isCommandPaletteOpen: boolean;
    setCommandPaletteOpen: (open: boolean) => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

    const toggleHelp = () => setIsHelpOpen(prev => !prev);

    return (
        <ShortcutContext.Provider value={{ isHelpOpen, toggleHelp, isCommandPaletteOpen, setCommandPaletteOpen }}>
            {children}
        </ShortcutContext.Provider>
    );
}

export function useShortcutContext() {
    const context = useContext(ShortcutContext);
    if (context === undefined) {
        throw new Error('useShortcutContext must be used within a ShortcutProvider');
    }
    return context;
}
