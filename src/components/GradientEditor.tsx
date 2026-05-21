import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BannerConfig, GradientStop, GradientType } from '../types';
import { Label, Segmented, SliderField } from './ui/Field';

interface GradientEditorProps {
  config: BannerConfig;
  onChange: (next: BannerConfig) => void;
}

const MAX_STOPS = 4;

const buildPreviewBackground = (
  type: GradientType,
  angle: number,
  stops: GradientStop[]
): string => {
  const stopStr = stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${(s.position * 100).toFixed(0)}%`)
    .join(', ');
  return type === 'radial'
    ? `radial-gradient(circle at center, ${stopStr})`
    : `linear-gradient(${angle}deg, ${stopStr})`;
};

const GradientEditor: React.FC<GradientEditorProps> = ({ config, onChange }) => {
  const stops = config.gradientStops;

  const updateStop = (idx: number, patch: Partial<GradientStop>) => {
    onChange({
      ...config,
      gradientStops: stops.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });
  };

  const addStop = () => {
    if (stops.length >= MAX_STOPS) return;
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    // Insert a new stop in the largest gap between existing positions.
    let gapIdx = 0;
    let gapSize = sorted[0].position;
    for (let i = 0; i < sorted.length - 1; i++) {
      const g = sorted[i + 1].position - sorted[i].position;
      if (g > gapSize) {
        gapSize = g;
        gapIdx = i;
      }
    }
    const newPos = (sorted[gapIdx].position + sorted[gapIdx + 1]?.position) / 2 || 0.5;
    const newColor = sorted[gapIdx].color;
    onChange({
      ...config,
      gradientStops: [...stops, { color: newColor, position: newPos }],
    });
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 2) return; // never go below 2 stops
    onChange({
      ...config,
      gradientStops: stops.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 space-y-3">
      {/* Gradient preview swatch */}
      <div
        className="h-12 rounded-lg ring-1 ring-slate-700/60 shadow-inner"
        style={{
          background: buildPreviewBackground(
            config.gradientType,
            config.gradientAngle,
            stops
          ),
        }}
      />

      {/* Linear / Radial toggle */}
      <div>
        <Label>Gradient Type</Label>
        <Segmented<GradientType>
          value={config.gradientType}
          onChange={(v) => onChange({ ...config, gradientType: v })}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' },
          ]}
        />
      </div>

      {/* Angle (linear only) */}
      {config.gradientType === 'linear' && (
        <div className="flex items-center gap-3">
          {/* Angle dial */}
          <div
            className="relative w-12 h-12 rounded-full bg-slate-900/60 ring-1 ring-slate-700/60 shrink-0"
            aria-hidden
          >
            <div
              className="absolute top-1/2 left-1/2 w-[2px] h-5 bg-[#4F6FF5] origin-top -translate-x-1/2"
              style={{
                transform: `translateX(-50%) rotate(${config.gradientAngle}deg)`,
              }}
            />
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-[#4F6FF5] -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="flex-1">
            <Label>Angle</Label>
            <SliderField
              value={config.gradientAngle}
              onChange={(v) => onChange({ ...config, gradientAngle: v })}
              min={0}
              max={360}
              step={1}
              suffix="°"
            />
          </div>
        </div>
      )}

      {/* Color stops */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Color Stops</Label>
          <button
            type="button"
            onClick={addStop}
            disabled={stops.length >= MAX_STOPS}
            className="text-[10px] font-semibold text-[#4F6FF5] hover:text-[#3D52C7] disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add stop
          </button>
        </div>
        <div className="space-y-2">
          {stops.map((stop, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/60 rounded-lg px-2 py-1.5"
            >
              {/* Color swatch (clickable) */}
              <div className="w-7 h-7 rounded-md ring-1 ring-slate-700 overflow-hidden shrink-0 relative">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => updateStop(idx, { color: e.target.value })}
                  className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 m-0"
                />
              </div>

              {/* Position slider — center-aligned via h-full + flex layout */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(stop.position * 100)}
                  onChange={(e) => updateStop(idx, { position: Number(e.target.value) / 100 })}
                  className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4F6FF5] [&::-webkit-slider-thumb]:shadow-md"
                />
                <span className="text-[10px] font-mono text-slate-400 tabular-nums w-9 text-right shrink-0">
                  {Math.round(stop.position * 100)}%
                </span>
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => removeStop(idx)}
                disabled={stops.length <= 2}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:text-slate-700 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                aria-label="Remove stop"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GradientEditor;
