import React from 'react';
import { Check } from 'lucide-react';
import { BannerShape, SHAPE_OPTIONS } from '../types';

interface ShapePickerProps {
  value: BannerShape;
  onChange: (shape: BannerShape) => void;
}

// Small SVG previews — render the same geometry the canvas will produce,
// so what the user clicks matches what they see in the export.
const ShapeThumb: React.FC<{ shape: BannerShape; active: boolean }> = ({ shape, active }) => {
  const stroke = active ? '#4F6FF5' : '#64748B';
  const fill = active ? 'rgba(79,111,245,0.18)' : 'rgba(100,116,139,0.12)';

  switch (shape) {
    case 'rectangle':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <rect x="2" y="3" width="56" height="14" fill={fill} stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case 'rounded':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <rect x="2" y="3" width="56" height="14" rx="5" fill={fill} stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case 'wave':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <path
            d="M 2 6 Q 8 2 14 6 T 26 6 T 38 6 T 50 6 T 60 6 L 60 14 Q 54 18 48 14 T 36 14 T 24 14 T 12 14 T 2 14 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'zigzag':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <path
            d="M 2 7 L 8 3 L 14 7 L 20 3 L 26 7 L 32 3 L 38 7 L 44 3 L 50 7 L 56 3 L 60 7 L 60 13 L 56 17 L 50 13 L 44 17 L 38 13 L 32 17 L 26 13 L 20 17 L 14 13 L 8 17 L 2 13 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.2"
            strokeLinejoin="miter"
          />
        </svg>
      );
    case 'ribbon':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <path
            d="M 2 3 L 53 3 L 58 10 L 53 17 L 2 17 L 7 10 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'pill':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <rect x="2" y="3" width="56" height="14" rx="7" fill={fill} stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case 'parallelogram':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <path
            d="M 10 3 L 58 3 L 50 17 L 2 17 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'arrow':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <path
            d="M 2 3 L 50 3 L 58 10 L 50 17 L 2 17 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'tag':
      return (
        <svg viewBox="0 0 60 20" className="w-full h-5">
          <path
            d="M 9 3 L 58 3 L 58 17 L 9 17 L 2 10 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.2"
          />
          <circle cx="13" cy="10" r="1.6" fill="#0F172A" />
        </svg>
      );
  }
};

const ShapePicker: React.FC<ShapePickerProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-1.5">
    {SHAPE_OPTIONS.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={`${opt.label} — ${opt.hint}`}
          className={`relative px-1 py-2 rounded-lg border transition-all ${
            active
              ? 'bg-[#4F6FF5]/10 border-[#4F6FF5]/60 ring-1 ring-[#4F6FF5]/40'
              : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/40'
          }`}
        >
          <ShapeThumb shape={opt.value} active={active} />
          <div
            className={`text-[9px] font-semibold mt-1 ${active ? 'text-[#4F6FF5]' : 'text-slate-400'}`}
          >
            {opt.label}
          </div>
          {active && (
            <Check className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-[#4F6FF5]" strokeWidth={3} />
          )}
        </button>
      );
    })}
  </div>
);

export default ShapePicker;
