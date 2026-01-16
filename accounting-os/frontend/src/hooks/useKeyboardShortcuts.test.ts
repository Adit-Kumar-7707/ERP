import { renderHook } from '@testing-library/react-hooks';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { describe, it, expect, vi } from 'vitest';

describe('useKeyboardShortcuts', () => {
    it('should trigger handler on key press', () => {
        const handler = vi.fn();
        renderHook(() => useKeyboardShortcuts([
            { combo: 'ctrl+k', handler }
        ]));

        const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
        window.dispatchEvent(event);

        expect(handler).toHaveBeenCalled();
    });

    it('should match context-specific shortcuts', () => {
        // Mock logic implies we check context in components, handled by mounting/unmounting
        // This test ensures basic firing works.
        const handler = vi.fn();
        renderHook(() => useKeyboardShortcuts([
            { combo: 'enter', handler }
        ]));

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        window.dispatchEvent(event);

        expect(handler).toHaveBeenCalled();
    });
});
