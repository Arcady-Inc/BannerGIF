import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { IconStyle, searchIcons } from '../utils/iconStore';

interface IconPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (iconId: string) => void;
  /** Absolute anchor position (e.g. from a button's getBoundingClientRect). */
  anchorRef: React.RefObject<HTMLElement>;
}

const STYLE_OPTIONS: { value: IconStyle; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'outline', label: 'Outline' },
  { value: 'solid', label: 'Solid' },
  { value: 'decorative', label: 'Decor' },
  { value: 'brands', label: 'Brands' },
];

const IconPicker: React.FC<IconPickerProps> = ({ open, onClose, onPick, anchorRef }) => {
  const [query, setQuery] = useState('');
  const [style, setStyle] = useState<IconStyle>('all');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Debounced search — 280ms after the last keystroke or filter change.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchIcons(query, style, 60);
      setResults(r.map((x) => x.id));
      setLoading(false);
    }, query.trim() ? 280 : 0);
    return () => clearTimeout(t);
  }, [query, style, open]);

  // Click-outside-to-close. We exclude the anchor element so the same
  // button click that opened the popover doesn't immediately close it.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[99] md:hidden"
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        className="fixed md:absolute top-1/2 left-1/2 md:top-full md:left-auto md:right-0 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 md:mt-2 w-[320px] p-3 bg-[#1E293B] border border-slate-700 rounded-xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Style filter chips */}
        <div className="grid grid-cols-5 gap-1 mb-2.5">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStyle(opt.value)}
              className={`text-[10px] font-bold py-1 rounded transition-all ${
                style === opt.value
                  ? 'bg-[#4F6FF5] text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 200,000+ icons..."
            autoFocus
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-md py-1.5 pl-8 pr-7 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4F6FF5]/50 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Results grid */}
        <div className="h-56 overflow-y-auto custom-scrollbar relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <Loader2 className="w-4 h-4 animate-spin text-[#4F6FF5]" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-[11px] text-slate-500 italic">
                No icons matching "{query}"
              </p>
            </div>
          )}
          <div className={`grid grid-cols-6 gap-1 ${loading ? 'opacity-40' : ''}`}>
            {results.map((iconId) => (
              <button
                key={iconId}
                onClick={() => onPick(iconId)}
                title={iconId}
                className="aspect-square flex items-center justify-center rounded-md hover:bg-[#4F6FF5]/20 border border-transparent hover:border-[#4F6FF5]/40 transition-all group"
              >
                {/* Preview from Iconify CDN — auto-scales and uses currentColor */}
                <img
                  src={`https://api.iconify.design/${iconId}.svg`}
                  alt={iconId}
                  loading="lazy"
                  className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors"
                  style={{ filter: 'invert(0.85)' }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-[9px] text-slate-500 mt-2 leading-snug">
          Icons fetched from{' '}
          <a
            href="https://iconify.design"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4F6FF5] hover:underline"
          >
            Iconify
          </a>{' '}
          · cached locally after first use
        </p>
      </div>
    </>
  );
};

export default IconPicker;
