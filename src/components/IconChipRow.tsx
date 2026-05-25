import React, { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { BannerConfig, DEFAULT_ICON_SETTINGS, IconSettings } from '../types';
import { uniqueIconIds, buildIconToken } from '../utils/iconStore';
import { ColorField, Label, SliderField, Toggle } from './ui/Field';

interface IconChipRowProps {
  config: BannerConfig;
  onChange: (next: BannerConfig) => void;
}

const IconChipRow: React.FC<IconChipRowProps> = ({ config, onChange }) => {
  const iconIds = uniqueIconIds(config.text);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingPopRef = useRef<HTMLDivElement>(null);
  // Ref to the currently-active chip button — used to anchor the popover.
  const activeChipRef = useRef<HTMLButtonElement | null>(null);
  const [popPos, setPopPos] = useState<{ left: number; top: number } | null>(null);

  // Recompute popover position when editingId changes (or on window resize/scroll).
  // The popover is position:fixed so its left/top are in viewport coordinates.
  // We anchor it BELOW the active chip and clamp left so the popover's right
  // edge never exceeds the sidebar's right edge.
  useEffect(() => {
    if (!editingId || !activeChipRef.current) {
      setPopPos(null);
      return;
    }
    const POPOVER_WIDTH = 260;
    const SIDEBAR_RIGHT_EDGE = 360; // matches App.tsx's md:w-[360px] sidebar
    const GAP = 6;

    const place = () => {
      const chip = activeChipRef.current;
      if (!chip) return;
      const rect = chip.getBoundingClientRect();
      const desiredLeft = rect.left;
      const maxLeft = SIDEBAR_RIGHT_EDGE - POPOVER_WIDTH - 8;
      const left = Math.max(8, Math.min(desiredLeft, maxLeft));
      const top = rect.bottom + GAP;
      setPopPos({ left, top });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [editingId, iconIds.length]);

  // Close the popover on click outside.
  useEffect(() => {
    if (!editingId) return;
    const handler = (e: MouseEvent) => {
      if (editingPopRef.current?.contains(e.target as Node)) return;
      // Avoid closing when the user clicks the chip itself — that toggles.
      const target = e.target as HTMLElement;
      if (target.closest('[data-icon-chip]')) return;
      setEditingId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingId]);

  // Hide entirely when no icons in the text — that's the "no bloat" guarantee.
  if (iconIds.length === 0) return null;

  const settingsFor = (iconId: string): IconSettings =>
    config.iconSettings[iconId] ?? DEFAULT_ICON_SETTINGS;

  const updateSettings = (iconId: string, patch: Partial<IconSettings>) =>
    onChange({
      ...config,
      iconSettings: {
        ...config.iconSettings,
        [iconId]: { ...settingsFor(iconId), ...patch },
      },
    });

  const removeFromBanner = (iconId: string) => {
    // Strip every occurrence of the token from the text, and clean up the
    // settings entry so we don't leak unused per-icon state.
    const token = buildIconToken(iconId);
    const cleanedText = config.text.split(token).join('');
    const cleanedSettings = { ...config.iconSettings };
    delete cleanedSettings[iconId];
    onChange({ ...config, text: cleanedText, iconSettings: cleanedSettings });
    setEditingId(null);
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 items-center relative">
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pr-1">
        Icons in banner
      </span>
      {iconIds.map((iconId) => {
        const isEditing = editingId === iconId;
        return (
          <button
            key={iconId}
            ref={isEditing ? activeChipRef : null}
            data-icon-chip
            onClick={() => setEditingId(isEditing ? null : iconId)}
            title={`${iconId} — click to edit`}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border ${
              isEditing
                ? 'bg-[#4F6FF5]/15 border-[#4F6FF5]/50'
                : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <img
              src={`https://api.iconify.design/${iconId}.svg`}
              alt=""
              className="w-3.5 h-3.5"
              style={{ filter: 'invert(0.85)' }}
            />
            <span className="text-[10px] text-slate-300 font-mono max-w-[90px] truncate">
              {iconId.split(':')[1] ?? iconId}
            </span>
          </button>
        );
      })}

      {/* Popover — rendered once at the row level, position:fixed in viewport
          coordinates. JS-computed left clamps the popover to stay inside the
          sidebar's right edge. */}
      {editingId && popPos && (
        <div
          ref={editingPopRef}
          className="fixed z-50 w-[260px] bg-[#1E293B] border border-slate-700 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 space-y-3"
          style={{ left: popPos.left, top: popPos.top }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-slate-400 truncate flex-1">
              {editingId}
            </p>
            <button
              onClick={() => setEditingId(null)}
              className="text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <IconSettingsForm
            iconId={editingId}
            settings={settingsFor(editingId)}
            onChange={(patch) => updateSettings(editingId, patch)}
          />

          <button
            onClick={() => removeFromBanner(editingId)}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 py-1.5 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Remove from banner
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Per-icon settings form — used inside the chip's popover
// ---------------------------------------------------------------------------

interface IconSettingsFormProps {
  iconId: string;
  settings: IconSettings;
  onChange: (patch: Partial<IconSettings>) => void;
}

const IconSettingsForm: React.FC<IconSettingsFormProps> = ({ settings, onChange }) => {
  const useTextColor = settings.color === 'inherit';
  return (
    <>
      <div>
        <Toggle
          label="Use text color"
          checked={useTextColor}
          onChange={(v) => onChange({ color: v ? 'inherit' : '#FFFFFF' })}
        />
        {!useTextColor && (
          <div className="mt-1.5">
            <ColorField
              value={settings.color}
              onChange={(c) => onChange({ color: c })}
            />
          </div>
        )}
      </div>

      <div>
        <Label>Size</Label>
        <SliderField
          value={settings.sizePercent}
          onChange={(v) => onChange({ sizePercent: v })}
          min={50}
          max={300}
          step={5}
          suffix="%"
          editable
        />
      </div>

      <div>
        <Label>Padding</Label>
        <SliderField
          value={settings.paddingPx}
          onChange={(v) => onChange({ paddingPx: v })}
          min={0}
          max={32}
          suffix="px"
          editable
        />
      </div>

      <div>
        <Label>Vertical Offset</Label>
        <SliderField
          value={settings.verticalOffsetPx}
          onChange={(v) => onChange({ verticalOffsetPx: v })}
          min={-32}
          max={32}
          suffix="px"
          editable
        />
      </div>
    </>
  );
};

export default IconChipRow;
