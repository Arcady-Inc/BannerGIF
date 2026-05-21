import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Smile, Search, X } from 'lucide-react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { BannerConfig, FONTS, FONT_WEIGHTS } from '../../types';
import { Label, NumberField, SliderField, Divider } from '../ui/Field';

interface Props {
  config: BannerConfig;
  onChange: (c: BannerConfig) => void;
}

const ContentTab: React.FC<Props> = ({ config, onChange }) => {
  const [fontOpen, setFontOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  const filteredFonts = FONTS.filter((f) =>
    f.name.toLowerCase().includes(fontSearch.toLowerCase())
  );

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
          <span style={{ fontFamily: config.fontFamily }} className="text-sm text-slate-200 truncate">
            {FONTS.find((f) => f.value === config.fontFamily)?.name || config.fontFamily}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${fontOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {fontOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1E293B] border border-slate-700 rounded-lg shadow-2xl max-h-80 flex flex-col z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-700/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  placeholder="Search fonts..."
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
            <div className="flex-1 overflow-y-auto py-1.5 custom-scrollbar">
              {filteredFonts.map((font) => (
                <div
                  key={font.value}
                  onClick={() => {
                    set('fontFamily', font.value);
                    setFontOpen(false);
                    setFontSearch('');
                  }}
                  className={`px-3 py-2 hover:bg-slate-700/50 cursor-pointer flex items-center justify-between ${
                    config.fontFamily === font.value ? 'bg-[#4F6FF5]/10' : ''
                  }`}
                >
                  <span
                    style={{ fontFamily: font.value }}
                    className={`text-sm ${
                      config.fontFamily === font.value ? 'text-[#4F6FF5]' : 'text-slate-300'
                    }`}
                  >
                    {font.name}
                  </span>
                  {config.fontFamily === font.value && (
                    <Check className="w-3.5 h-3.5 text-[#4F6FF5]" />
                  )}
                </div>
              ))}
              {filteredFonts.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-slate-500 italic">No fonts matching "{fontSearch}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weight + Size */}
      <div className="grid grid-cols-2 gap-4">
        <div className="group">
          <Label>Weight</Label>
          <div className="relative">
            <select
              value={config.fontWeight}
              onChange={(e) => set('fontWeight', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:border-[#4F6FF5] focus:ring-1 focus:ring-[#4F6FF5] outline-none appearance-none cursor-pointer"
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.name}
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
