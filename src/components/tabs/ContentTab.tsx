import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Smile, Search, X, Plus, Trash2 } from 'lucide-react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { BannerConfig, FONTS, FONT_TYPES, FontType } from '../../types';
import { Label, NumberField, SliderField, Divider } from '../ui/Field';
import {
  CustomFont,
  defaultVariant,
  quoteFontFamily,
  removeFont,
  variantLabel,
  weightsInRange,
} from '../../utils/customFonts';
import CustomFontModal from '../CustomFontModal';

interface Props {
  config: BannerConfig;
  onChange: (c: BannerConfig) => void;
  customFonts: CustomFont[];
  onCustomFontsChange: (fonts: CustomFont[]) => void;
}

type FontTab = 'builtin' | 'custom';

const ContentTab: React.FC<Props> = ({
  config,
  onChange,
  customFonts,
  onCustomFontsChange,
}) => {
  const [fontOpen, setFontOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const [fontTab, setFontTab] = useState<FontTab>('builtin');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Auto-switch to Custom tab whenever the user adds their first custom font,
  // and back to Built-in if all customs are removed.
  useEffect(() => {
    if (customFonts.length === 0 && fontTab === 'custom') {
      setFontTab('builtin');
    }
  }, [customFonts.length, fontTab]);

  const set = <K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) =>
    onChange({ ...config, [key]: value });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setFontOpen(false);
        setFontSearch('');
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = config.text.substring(0, start) + emoji + config.text.substring(end);
    set('text', newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  // Unified item shape so both built-in and custom fonts can share the list UI.
  type FontItem = { value: string; name: string; customId?: string };

  const builtInItems: FontItem[] = FONTS;
  const customItems: FontItem[] = customFonts.map((cf) => ({
    value: cf.family,
    name: cf.family,
    customId: cf.id,
  }));

  const activeItems = fontTab === 'custom' ? customItems : builtInItems;
  const filteredFonts = activeItems.filter((f) =>
    f.name.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const handleFontsAdded = (newFonts: CustomFont[]) => {
    onCustomFontsChange([...customFonts, ...newFonts]);
    setFontTab('custom');
    // Auto-select the first newly added font so the user sees it applied.
    if (newFonts.length > 0) {
      set('fontFamily', newFonts[0].family);
    }
    // Close the modal automatically after a successful add — keeps the user
    // in flow. They can re-open it from the same "+ Add" button.
    setTimeout(() => setShowCustomModal(false), 400);
  };

  const handleRemoveCustomFont = async (id: string, family: string) => {
    await removeFont(id);
    onCustomFontsChange(customFonts.filter((f) => f.id !== id));
    if (config.fontFamily === family) {
      onChange({ ...config, fontFamily: 'Inter', fontWeight: '400', fontStyle: 'normal' });
    }
  };

  /**
   * Picking a new family — reset to its default variant (Regular Normal for
   * built-in fonts; closest-to-regular for custom imports). Prevents the
   * "I picked Inter but it stayed in Bold Italic from the previous font" UX.
   */
  const handlePickFamily = (familyValue: string) => {
    const matchingCustom = customFonts.find((cf) => cf.family === familyValue);
    if (matchingCustom) {
      const v = defaultVariant(matchingCustom.variants);
      // Variable variants store a range like "100 900" as their weight; resolve
      // to a single value (400 if in range, else the midpoint) for fontWeight.
      let weight = v?.weight ?? '400';
      if (v?.wghtMin !== undefined && v?.wghtMax !== undefined) {
        weight = v.wghtMin <= 400 && v.wghtMax >= 400
          ? '400'
          : String(Math.round((v.wghtMin + v.wghtMax) / 2));
      }
      onChange({
        ...config,
        fontFamily: familyValue,
        fontWeight: weight,
        fontStyle: v?.style ?? 'normal',
      });
    } else {
      onChange({
        ...config,
        fontFamily: familyValue,
        fontWeight: '400',
        fontStyle: 'normal',
      });
    }
    setFontOpen(false);
    setFontSearch('');
  };

  /**
   * Available types for the currently-selected font.
   *
   * Custom fonts:
   *   - Variable font (variant has wghtMin/wghtMax): expand into one row per
   *     standard CSS weight inside the range. Browser uses the wght axis to
   *     interpolate the requested weight.
   *   - Static font: list ONLY the variants we actually loaded.
   *
   * Built-in fonts: list the full FONT_TYPES catalog.
   */
  const activeFontTypes: FontType[] = (() => {
    const matchingCustom = customFonts.find((cf) => cf.family === config.fontFamily);
    if (!matchingCustom) return FONT_TYPES;

    const out: FontType[] = [];
    for (const v of matchingCustom.variants) {
      if (v.wghtMin !== undefined && v.wghtMax !== undefined) {
        // Variable: one picker row per standard weight inside the axis range.
        for (const w of weightsInRange(v.wghtMin, v.wghtMax)) {
          out.push({
            name: v.style === 'italic' ? `${w.name} Italic` : w.name,
            weight: String(w.value),
            style: v.style,
          });
        }
      } else {
        // Static variant — single entry.
        out.push({
          name: variantLabel(v),
          weight: v.weight,
          style: v.style,
        });
      }
    }
    return out;
  })();

  const currentTypeKey = `${config.fontWeight}|${config.fontStyle}`;

  return (
    <div className="space-y-5">
      {/* Text content */}
      <div className="group">
        <Label>Content</Label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={config.text}
            onChange={(e) => set('text', e.target.value)}
            rows={2}
            placeholder="Enter banner text..."
            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:ring-1 focus:ring-[#4F6FF5] focus:border-[#4F6FF5] transition-all outline-none resize-none placeholder:text-slate-600 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className={`absolute right-3 top-2.5 p-1 rounded-md transition-colors ${
              showEmojiPicker
                ? 'text-[#4F6FF5] bg-[#4F6FF5]/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Insert emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 bg-black/40 z-[99] md:hidden"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div
                ref={emojiPickerRef}
                className="fixed md:absolute top-1/2 left-1/2 md:top-full md:left-auto md:right-0 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 md:mt-2 bg-[#1E293B] border border-slate-700 rounded-lg shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
              >
                <EmojiPicker
                  theme={Theme.DARK}
                  emojiStyle={EmojiStyle.NATIVE}
                  onEmojiClick={(data) => insertEmoji(data.emoji)}
                  lazyLoadEmojis
                  width={280}
                  height={350}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                  searchPlaceholder="Search emoji..."
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Font family with search */}
      <div className="relative group" ref={fontDropdownRef}>
        <Label>Font Family</Label>
        <button
          type="button"
          onClick={() => setFontOpen((v) => !v)}
          className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-left flex items-center justify-between hover:border-slate-600 transition-colors group-focus-within:border-[#4F6FF5] outline-none"
        >
          <span style={{ fontFamily: quoteFontFamily(config.fontFamily) }} className="text-sm text-slate-200 truncate">
            {[...FONTS, ...customItems].find((f) => f.value === config.fontFamily)?.name ||
              config.fontFamily}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${fontOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {fontOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1E293B] border border-slate-700 rounded-lg shadow-2xl max-h-96 flex flex-col z-50 overflow-hidden">
            {/* + Add custom font button */}
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="px-3 py-2 flex items-center gap-2 border-b border-slate-700/50 text-[11px] font-bold text-[#4F6FF5] hover:bg-[#4F6FF5]/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add custom font
            </button>

            {/* Tab strip — Custom tab only appears once at least one custom font exists */}
            {customFonts.length > 0 && (
              <div className="grid grid-cols-2 gap-1 m-2 bg-slate-900/60 border border-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFontTab('builtin')}
                  className={`py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    fontTab === 'builtin'
                      ? 'bg-[#4F6FF5] text-white shadow-md shadow-[#4F6FF5]/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  Built-in ({FONTS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFontTab('custom')}
                  className={`py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    fontTab === 'custom'
                      ? 'bg-[#4F6FF5] text-white shadow-md shadow-[#4F6FF5]/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  Custom ({customFonts.length})
                </button>
              </div>
            )}

            {/* Search input */}
            <div className="p-2 border-b border-slate-700/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  placeholder={`Search ${fontTab === 'custom' ? 'custom' : 'built-in'} fonts...`}
                  autoFocus
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-md py-1.5 pl-8 pr-7 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4F6FF5]/50 transition-colors"
                />
                {fontSearch && (
                  <button
                    type="button"
                    onClick={() => setFontSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Font list */}
            <div className="flex-1 overflow-y-auto py-1.5 custom-scrollbar">
              {filteredFonts.map((font) => {
                const active = config.fontFamily === font.value;
                return (
                  <div
                    key={font.value}
                    onClick={() => handlePickFamily(font.value)}
                    className={`group/item px-3 py-2 hover:bg-slate-700/50 cursor-pointer flex items-center justify-between gap-2 ${
                      active ? 'bg-[#4F6FF5]/10' : ''
                    }`}
                  >
                    <span
                      style={{ fontFamily: quoteFontFamily(font.value) }}
                      className={`text-sm truncate ${
                        active ? 'text-[#4F6FF5]' : 'text-slate-300'
                      }`}
                    >
                      {font.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Delete button — only on custom-tab rows, only on hover */}
                      {font.customId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustomFont(font.customId!, font.value);
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          aria-label={`Remove ${font.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      {active && <Check className="w-3.5 h-3.5 text-[#4F6FF5]" />}
                    </div>
                  </div>
                );
              })}
              {filteredFonts.length === 0 && (
                <div className="px-3 py-6 text-center">
                  {fontTab === 'custom' && customFonts.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No custom fonts yet — click + Add custom font above.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      No fonts matching "{fontSearch}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom font modal */}
      <CustomFontModal
        open={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onAdded={handleFontsAdded}
      />

      {/* Type + Size */}
      <div className="grid grid-cols-2 gap-4">
        <div className="group">
          <Label>Type</Label>
          <div className="relative">
            <select
              value={currentTypeKey}
              onChange={(e) => {
                const [w, s] = e.target.value.split('|');
                onChange({
                  ...config,
                  fontWeight: w,
                  fontStyle: s === 'italic' ? 'italic' : 'normal',
                });
              }}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:border-[#4F6FF5] focus:ring-1 focus:ring-[#4F6FF5] outline-none appearance-none cursor-pointer"
            >
              {activeFontTypes.map((t) => (
                <option key={`${t.weight}|${t.style}`} value={`${t.weight}|${t.style}`}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
        <div className="group">
          <Label>Size (px)</Label>
          <NumberField
            value={config.fontSize}
            onChange={(v) => set('fontSize', v)}
            min={6}
            max={300}
          />
        </div>
      </div>

      <Divider />

      {/* Spacing */}
      <div>
        <div className="flex justify-between mb-1.5">
          <Label>Repeat Spacing</Label>
          <span className="text-[10px] text-slate-500">{config.spacing}</span>
        </div>
        <SliderField
          value={config.spacing}
          onChange={(v) => set('spacing', v)}
          min={0}
          max={20}
        />
      </div>
    </div>
  );
};

export default ContentTab;
