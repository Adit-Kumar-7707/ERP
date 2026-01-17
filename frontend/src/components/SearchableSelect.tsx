import { useState, useEffect, useRef } from "react";

interface Option {
    id: number | string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: number | string;
    onChange: (val: any) => void;
    onCreate?: () => void; // New prop for Alt+C
    placeholder?: string;
    className?: string; // Wrapper class
    autoFocus?: boolean;
    focusRef?: (el: HTMLInputElement | null) => void;
}

export default function SearchableSelect({ options, value, onChange, onCreate, placeholder, className, autoFocus, focusRef }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightIndex, setHighlightIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync Query with Selected Value on Mount/Update
    useEffect(() => {
        const selected = options.find(o => o.id === value);
        if (selected && !isOpen) {
            setQuery(selected.label);
        } else if (!value && !isOpen) {
            setQuery("");
        }
    }, [value, options, isOpen]);

    // Filter Options
    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase())
    );

    // Handle Keyboard
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === "Enter" || e.key === "ArrowDown") {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            if (isOpen) {
                e.preventDefault();
                if (filteredOptions[highlightIndex]) {
                    handleSelect(filteredOptions[highlightIndex]);
                } else if (filteredOptions.length === 0) {
                    setIsOpen(false);
                }
            } else {
                // Bubble up or handle externally for navigation
                // We don't preventDefault here so parent form can handle it
                // OR we accept an onNext prop.
                // Let's rely on event bubbling if we don't preventDefault.
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            // Revert query
            const selected = options.find(o => o.id === value);
            setQuery(selected?.label || "");
        } else if (e.key === "Tab") {
            // Allow native tab but select current if open?
            if (filteredOptions[highlightIndex]) {
                handleSelect(filteredOptions[highlightIndex]);
            }
            setIsOpen(false);
        } else if (e.altKey && e.key.toLowerCase() === "c") {
            e.preventDefault();
            if (onCreate) {
                setIsOpen(false);
                onCreate();
            }
        }
    };

    const handleSelect = (option: Option) => {
        onChange(option.id);
        setQuery(option.label);
        setIsOpen(false);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                // Revert if not selected
                const selected = options.find(o => o.id === value);
                if (!isOpen) setQuery(selected?.label || "");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [options, value, isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <input
                ref={(el) => {
                    if (inputRef && 'current' in inputRef) {
                        (inputRef as any).current = el;
                    }
                    if (focusRef) focusRef(el);
                }}
                className="w-full bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-tally-blue focus:bg-yellow-100 p-1"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                    setHighlightIndex(0);
                }}
                onFocus={() => {
                    setIsOpen(true);
                    // Select all text on focus for easy replacement
                    inputRef.current?.select();
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
            />

            {isOpen && (
                <div className="absolute top-full left-0 w-full min-w-[200px] z-50 bg-white border border-tally-blue shadow-xl max-h-60 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                        <div className="p-2 text-gray-500 text-sm italic">No results</div>
                    ) : (
                        filteredOptions.map((opt, idx) => (
                            <div
                                key={opt.id}
                                className={`
                                    px-2 py-1 text-sm cursor-pointer flex justify-between
                                    ${idx === highlightIndex ? "bg-tally-blue text-white" : "hover:bg-gray-100 text-tally-text"}
                                `}
                                onMouseDown={() => handleSelect(opt)} // MouseDown fires before Blur
                                onMouseEnter={() => setHighlightIndex(idx)}
                            >
                                <span>{opt.label}</span>
                                {opt.subLabel && <span className="opacity-70 text-xs">{opt.subLabel}</span>}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
