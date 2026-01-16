import { useState, useEffect, useCallback } from "react";

/**
 * Hook to manage keyboard navigation for a list of items.
 * 
 * @param itemCount Total number of items in the list.
 * @param onEnter Callback function to execute when Enter is pressed on the selected item.
 * @returns { selectedIndex, setSelectedIndex }
 */
export function useKeyboardNavigation(itemCount: number, onEnter?: (index: number) => void) {
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (itemCount === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % itemCount);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex !== -1 && onEnter) {
                onEnter(selectedIndex);
            }
        }
    }, [itemCount, selectedIndex, onEnter]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Reset selection if items change significantly (optional, but good practice)
    useEffect(() => {
        if (itemCount > 0 && selectedIndex === -1) {
            setSelectedIndex(0); // Select first by default if list populated
        }
    }, [itemCount]);

    return { selectedIndex, setSelectedIndex };
}
