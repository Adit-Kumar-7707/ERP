import { useState, useEffect, useCallback } from "react";

export function useMenuNavigation(items: any[], onSelect: (item: any) => void, onBack?: () => void) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % items.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            onSelect(items[selectedIndex]);
        } else if (e.key === "Escape" && onBack) {
            e.preventDefault();
            onBack();
        }
    }, [items, selectedIndex, onSelect, onBack]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return { selectedIndex };
}
