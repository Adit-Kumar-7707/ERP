import { useRef, useCallback } from "react";

export function useVoucherFocus() {
    const refs = useRef<Map<string, HTMLElement | null>>(new Map());

    const register = useCallback((key: string) => (el: HTMLElement | null) => {
        if (el) {
            refs.current.set(key, el);
        } else {
            refs.current.delete(key);
        }
    }, []);

    const focus = useCallback((key: string) => {
        const el = refs.current.get(key);
        if (el) {
            el.focus();
            // Optional: Select all text
            if (el instanceof HTMLInputElement) {
                el.select();
            }
        } else {
            console.warn(`Focus target not found: ${key}`);
        }
    }, []);

    const handleEnter = useCallback((currentKey: string, order: string[], onLast?: () => void) => {
        const idx = order.indexOf(currentKey);
        if (idx !== -1 && idx < order.length - 1) {
            const nextKey = order[idx + 1];
            focus(nextKey);
        } else if (idx === order.length - 1 && onLast) {
            onLast();
        }
    }, [focus]);

    return { register, focus, handleEnter };
}
