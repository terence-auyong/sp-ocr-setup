import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from 'lucide-react';

export function MultiSelect({ items, selected, onChange, placeholder, hasError, disabled, isLoading }: {
    items: { id: number; name: string }[];
    isLoading: boolean;
    selected: { id: number; name: string }[];
    onChange: (items: any[]) => void;
    placeholder: string;
    hasError?: boolean;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

    const toggle = (item: any) => {
        if (selected.find(s => s.id === item.id)) {
            onChange(selected.filter(s => s.id !== item.id));
        } else {
            onChange([...selected, item]);
        }
    };

    const remove = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter(s => s.id !== id));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => !disabled && setOpen(o => !o)}
                className={[
                    'min-h-[42px] w-full rounded px-3 py-2 bg-gray-100 flex flex-wrap gap-2 items-center transition-all duration-150',
                    disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer',
                    hasError ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200 hover:border-blue-400',
                    open ? 'border-blue-500 ring-2 ring-blue-100' : '',
                ].join(' ')}
            >
                {isLoading ? (
                    <div className="flex items-center text-gray-400">
                        Loading...
                    </div>
                ) : (
                    <>
                        {selected.length === 0 ? (
                            <span className="text-gray-400 select-none">{placeholder}</span>
                        ) : (
                            selected.map(s => (
                                <span key={s.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-md border border-blue-200">
                                    {s.name}
                                    {!disabled && (
                                        <button onClick={(e) => remove(s.id, e)} className="ml-0.5 text-blue-400 hover:text-blue-700">
                                            <X size={12}/>
                                        </button>
                                    )}
                                </span>
                            ))
                        )}
                        {!disabled && (
                            <span className={`ml-auto text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                                <ChevronDown size={18}/>
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Auto complete */}
            {open && !disabled && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    <ul className="max-h-52 overflow-y-auto py-1">
                        {filtered.length === 0 && <li className="text-sm text-gray-400 px-3 py-2">No results</li>}
                        {filtered.map(item => {
                            const isSelected = !!selected.find(s => s.id === item.id);
                            return (
                                <li key={item.id} onClick={() => toggle(item)}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors duration-100 ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                    </span>
                                    {item.name}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="border-t border-gray-100 px-3 py-2">
                        <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Done ({selected.length} selected)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}