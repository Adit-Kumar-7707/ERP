import { useEffect, useCallback } from 'react';

// Define key types
type KeyCombo = string; // e.g., "ctrl+k", "alt+v", "enter", "shift+enter"

type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
    combo: KeyCombo;
    handler: ShortcutHandler;
    description?: string; // For Help Overlay
    context?: string; // "global", "grid", "modal"
    preventDefault?: boolean;
}

// Global registry for help overlay
export const REGISTERED_SHORTCUTS: ShortcutConfig[] = [];

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], deps: any[] = []) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Normalize key string
            const key = event.key.toLowerCase();
            const ctrl = event.ctrlKey || event.metaKey ? 'ctrl+' : '';
            const alt = event.altKey ? 'alt+' : '';
            const shift = event.shiftKey ? 'shift+' : '';

            const combo = `${ctrl}${alt}${shift}${key}`;

            // Check matches
            const match = shortcuts.find(s => {
                // Handle complex matching if needed, for now exact string match roughly
                // Fix normalization: "ctrl+k" vs "k"
                // If key is "Control", event.key is "Control". We ignore modifier-only presses usually.
                if (["control", "alt", "shift", "meta"].includes(key)) return false;

                return s.combo.toLowerCase() === combo;
            });

            if (match) {
                if (match.preventDefault !== false) {
                    event.preventDefault();
                }
                match.handler(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Register for Help (Effectively on mount)
        shortcuts.forEach(s => {
            if (s.description && !REGISTERED_SHORTCUTS.some(r => r.combo === s.combo && r.context === s.context)) {
                REGISTERED_SHORTCUTS.push(s);
            }
        });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            // Optional: Unregister? Usually we keep global list growing or we need smarter management.
            // For MVP, simplistic global list is fine, duplicates allowed if context differs.
        };
    }, [shortcuts, ...deps]);
}
