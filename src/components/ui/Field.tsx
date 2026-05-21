import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// ============================================================================
// Reusable form primitives shared by all config tabs.
// ============================================================================

export const Label: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({
  children,
  htmlFor,
}) => (
  <label
    htmlFor={htmlFor}
    className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-[#4F6FF5] transition-colors uppercase tracking-wide"
  >
    {children}
  </label>
);

export const SectionTitle: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="flex items-center gap-2 mb-3 text-slate-400 font-medium text-xs uppercase tracking-wider px-1">
    {icon}
    <span>{children}</span>
  </div>
);

export const Divider: React.FC = () => (
  <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent my-5" />
);

interface NumberFieldProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberField: React.FC<NumberFieldProps> = ({ value, onChange, min, max, step }) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    step={step}
    onChange={(e) => {
      const n = Number(e.target.value);
      if (Number.isFinite(n)) {
        const clamped =
          (min !== undefined && n < min) ? min :
          (max !== undefined && n > max) ? max : n;
        onChange(clamped);
      }
    }}
    className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:border-[#4F6FF5] focus:ring-1 focus:ring-[#4F6FF5] outline-none"
  />
);

interface SliderFieldProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export const SliderField: React.FC<SliderFieldProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}) => (
  <div className="flex items-center gap-3">
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4F6FF5] [&::-webkit-slider-thumb]:shadow-md"
    />
    <span className="text-[10px] font-mono text-slate-400 w-12 text-right tabular-nums">
      {value}
      {suffix}
    </span>
  </div>
);

interface ColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
}

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

export const ColorField: React.FC<ColorFieldProps> = ({ value, onChange }) => (
  <div className="flex items-center gap-2 group">
    <div className="relative w-9 h-9 rounded-lg overflow-hidden ring-1 ring-slate-700 shadow-sm shrink-0 cursor-pointer group-hover:ring-[#4F6FF5] transition-all">
      <input
        type="color"
        value={isValidHex(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 m-0"
      />
    </div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 px-2 py-2 bg-transparent border-b border-slate-700 text-slate-300 text-xs font-mono focus:border-[#4F6FF5] outline-none uppercase transition-colors"
    />
  </div>
);

// ----------------------------------------------------------------------------
// Collapsible advanced section — keeps the panel uncluttered by default.
// ----------------------------------------------------------------------------

interface CollapsibleProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;       // small status text on the right (e.g. "On", "Off")
  children: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#4F6FF5]/15 text-[#7E94FF] uppercase">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-3 pb-3 pt-1 space-y-3">{children}</div>}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Toggle row — boolean setting with a slim switch.
// ----------------------------------------------------------------------------

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="w-full flex items-center justify-between py-1.5 group"
  >
    <span className="text-xs text-slate-300 group-hover:text-slate-100">{label}</span>
    <span
      className={`relative inline-flex shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#4F6FF5]' : 'bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </span>
  </button>
);

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}

export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 bg-slate-900/50 border border-slate-700/50 p-1 rounded-lg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-[11px] font-semibold py-1.5 rounded-md transition-all ${
            value === opt.value
              ? 'bg-[#4F6FF5] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
