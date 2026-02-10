import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { BannerConfig, FONTS, FONT_WEIGHTS } from '../types';
import { Type, Palette, Layout, ChevronDown, Check, Upload, X, Info, Settings2, Image as ImageIcon, ChevronDown as ScrollArrow, Smile, Loader2 } from 'lucide-react';
import EmojiPicker, { Theme, EmojiStyle, SuggestionMode } from 'emoji-picker-react';

interface ConfigPanelProps {
  config: BannerConfig;
  onChange: (newConfig: BannerConfig) => void;
  isGenerating: boolean;
}

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

// --- Color Helpers ---
const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
};

const extractColorsFromImage = (src: string): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve([]);

      const MAX_SIZE = 250;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
      } else {
        if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
      const colorMap: Record<string, number> = {};
      const step = 4 * 2;

      for (let i = 0; i < data.length; i += step) {
        const a = data[i + 3];
        if (a < 128) continue;
        const bucket = 10;
        const r = Math.round(data[i] / bucket) * bucket;
        const g = Math.round(data[i + 1] / bucket) * bucket;
        const b = Math.round(data[i + 2] / bucket) * bucket;
        const key = `${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }

      const sorted = Object.entries(colorMap).sort(([, a], [, b]) => b - a).slice(0, 5);
      resolve(sorted.map(([k]) => {
        const [r, g, b] = k.split(',').map(Number);
        return rgbToHex(r, g, b);
      }));
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-4 text-slate-400 font-medium text-xs uppercase tracking-wider px-1">
    {icon}
    <span>{title}</span>
  </div>
);

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, isGenerating }) => {
  const [fontOpen, setFontOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Image extraction state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // Show hint if there's more to scroll (with 10px buffer)
      setShowScrollHint(scrollHeight > clientHeight + scrollTop + 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleChange = (key: keyof BannerConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const colors = await extractColorsFromImage(event.target.result as string);
        setExtractedColors(colors);
        if (colors.length > 0) handleChange('bgColor', colors[0]);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setFontOpen(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = config.text;
    const newText = currentText.substring(0, start) + emoji + currentText.substring(end);

    handleChange('text', newText);

    // Reset focus and cursor position after React update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  return (
    <div className="h-full flex flex-col w-full bg-[#0F172A] text-slate-300 border-r border-slate-800 shadow-2xl overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800/60 bg-[#0F172A]/95 backdrop-blur z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-white text-lg">B</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight leading-tight">BannerGIF</h1>
            <p className="text-[10px] text-slate-500 font-medium">Studio Edition</p>
          </div>
        </div>
        <div className="p-2 rounded-md hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer">
          <Settings2 className="w-4 h-4" />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar relative"
      >

        {/* TEXT CONTENT */}
        <section>
          <SectionHeader icon={<Type className="w-3.5 h-3.5" />} title="Typography" />

          <div className="space-y-5">
            <div className="group">
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-indigo-400 transition-colors">CONTENT</label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={config.text}
                  onChange={(e) => handleChange('text', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none placeholder:text-slate-600 pr-10"
                  placeholder="Enter banner text..."
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`absolute right-3 top-2.5 p-1 rounded-md transition-colors ${showEmojiPicker ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                  title="Insert emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {showEmojiPicker && (
                  <>
                    {/* Mobile backdrop */}
                    <div className="fixed inset-0 bg-black/40 z-[99] md:hidden" onClick={() => setShowEmojiPicker(false)} />
                    <div
                      ref={emojiPickerRef}
                      className="fixed md:absolute top-1/2 left-1/2 md:top-full md:left-auto md:right-0 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 md:mt-2 p-0 bg-[#1E293B] border border-slate-700 rounded-lg shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                    >
                      <EmojiPicker
                        theme={Theme.DARK}
                        emojiStyle={EmojiStyle.NATIVE}
                        onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                        lazyLoadEmojis={true}
                        width={280}
                        height={350}
                        previewConfig={{ showPreview: false }}
                        skinTonesDisabled={true}
                        searchPlaceholder="Search emoji..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Custom Font Selector */}
            <div className="relative group" ref={fontDropdownRef}>
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-indigo-400 transition-colors">FONT FAMILY</label>
              <button
                onClick={() => setFontOpen(!fontOpen)}
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-left flex items-center justify-between hover:border-slate-600 transition-colors group-focus-within:border-indigo-500 outline-none"
              >
                <span style={{ fontFamily: config.fontFamily }} className="text-sm text-slate-200 truncate">
                  {FONTS.find(f => f.value === config.fontFamily)?.name || config.fontFamily}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${fontOpen ? 'rotate-180' : ''}`} />
              </button>

              {fontOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1E293B] border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 py-1.5 custom-scrollbar">
                  {FONTS.map((font) => (
                    <div
                      key={font.value}
                      onClick={() => {
                        handleChange('fontFamily', font.value);
                        setFontOpen(false);
                      }}
                      className={`px-3 py-2 hover:bg-slate-700/50 cursor-pointer flex items-center justify-between group/item ${config.fontFamily === font.value ? 'bg-indigo-500/10' : ''}`}
                    >
                      <span style={{ fontFamily: font.value }} className={`text-sm ${config.fontFamily === font.value ? 'text-indigo-400' : 'text-slate-300'} group-hover/item:text-slate-100`}>
                        {font.name}
                      </span>
                      {config.fontFamily === font.value && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-indigo-400 transition-colors">WEIGHT</label>
                <div className="relative">
                  <select
                    value={config.fontWeight}
                    onChange={(e) => handleChange('fontWeight', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="group">
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-indigo-400 transition-colors">SIZE (PX)</label>
                <input
                  type="number"
                  value={config.fontSize}
                  onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="group">
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-indigo-400 transition-colors">SPACING</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={config.spacing}
                  onChange={(e) => handleChange('spacing', Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
                />
                <span className="text-xs text-slate-400 w-6 text-right">{config.spacing}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

        {/* COLORS */}
        <section>
          <SectionHeader icon={<Palette className="w-3.5 h-3.5" />} title="Colors" />

          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Background */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">BACKGROUND</label>
              <div className="flex items-center gap-2 group">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden ring-1 ring-slate-700 shadow-sm shrink-0 cursor-pointer group-hover:ring-indigo-500 transition-all">
                  <input
                    type="color"
                    value={isValidHex(config.bgColor) ? config.bgColor : "#000000"}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 m-0"
                  />
                </div>
                <input
                  type="text"
                  value={config.bgColor}
                  onChange={(e) => handleChange('bgColor', e.target.value)}
                  className="w-full min-w-0 px-2 py-2 bg-transparent border-b border-slate-700 text-slate-300 text-xs font-mono focus:border-indigo-500 outline-none uppercase transition-colors"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">TEXT</label>
              <div className="flex items-center gap-2 group">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden ring-1 ring-slate-700 shadow-sm shrink-0 cursor-pointer group-hover:ring-indigo-500 transition-all">
                  <input
                    type="color"
                    value={isValidHex(config.textColor) ? config.textColor : "#000000"}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 m-0"
                  />
                </div>
                <input
                  type="text"
                  value={config.textColor}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="w-full min-w-0 px-2 py-2 bg-transparent border-b border-slate-700 text-slate-300 text-xs font-mono focus:border-indigo-500 outline-none uppercase transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Color Extraction Feature */}
          <div className="bg-slate-900/30 rounded-xl p-3 border border-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-semibold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide">
                <ImageIcon className="w-3 h-3" />
                Match Brand Colors
              </label>
              {extractedColors.length > 0 && (
                <button
                  onClick={() => setExtractedColors([])}
                  className="text-[10px] text-slate-500 hover:text-red-400 transition-colors px-1"
                >
                  Clear
                </button>
              )}
            </div>

            {extractedColors.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group w-full py-4 border border-dashed border-slate-700 rounded-lg bg-slate-900/20 hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Upload image or GIF</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                  {extractedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleChange('bgColor', color)}
                      className="group relative w-8 h-8 rounded-full ring-2 ring-slate-800 shadow-sm overflow-hidden hover:scale-110 hover:ring-indigo-500 transition-all focus:outline-none"
                      title={`Use ${color}`}
                    >
                      <div className="absolute inset-0" style={{ backgroundColor: color }} />
                      {config.bgColor.toUpperCase() === color && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-500 hover:bg-slate-800 transition-all shrink-0 ml-auto"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

        {/* DIMENSIONS */}
        <section>
          <SectionHeader icon={<Layout className="w-3.5 h-3.5" />} title="Layout & Animation" />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="group">
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-indigo-400">WIDTH</label>
              <input
                type="number"
                value={config.width}
                onChange={(e) => handleChange('width', Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="group">
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block group-focus-within:text-indigo-400">HEIGHT</label>
              <input
                type="number"
                value={config.height}
                onChange={(e) => handleChange('height', Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="group">
              <div className="flex justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-500 group-focus-within:text-indigo-400">SPEED (DELAY)</label>
                <span className="text-[10px] text-slate-500">{config.frameDuration}ms</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="10"
                value={config.frameDuration}
                onChange={(e) => handleChange('frameDuration', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
              />
            </div>
            <div className="group">
              <div className="flex justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-500 group-focus-within:text-indigo-400">SMOOTHNESS (FRAMES)</label>
                <span className="text-[10px] text-slate-500">{config.numFrames} frames</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={config.numFrames}
                onChange={(e) => handleChange('numFrames', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
              />
            </div>
          </div>
        </section>

        <div className="h-12"></div>
      </div>

      {/* Scroll indicator shadow & animated arrow */}
      <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/80 to-transparent pointer-events-none transition-opacity duration-300 z-20 flex flex-col items-center justify-end pb-4 ${showScrollHint ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col items-center gap-1 animate-bounce">
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest opacity-80">Scroll for more</span>
          <ScrollArrow className="w-4 h-4 text-indigo-500" />
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;