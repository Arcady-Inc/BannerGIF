import React, { useState, useRef, useEffect } from 'react';
import { BannerConfig, FONTS, FONT_WEIGHTS } from '../types';
import { Type, Palette, Layout, ChevronDown, Check, Upload, X, Info } from 'lucide-react';

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

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const getColorDistance = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}) => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + 
    Math.pow(c1.g - c2.g, 2) + 
    Math.pow(c1.b - c2.b, 2)
  );
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
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a < 128) continue;
        
        const bucket = 5;
        const rQ = Math.round(r / bucket) * bucket;
        const gQ = Math.round(g / bucket) * bucket;
        const bQ = Math.round(b / bucket) * bucket;
        
        const key = `${Math.min(255, rQ)},${Math.min(255, gQ)},${Math.min(255, bQ)}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }
      
      const sortedCandidates = Object.entries(colorMap)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([key]) => {
           const [r, g, b] = key.split(',').map(Number);
           return { r, g, b, hex: rgbToHex(r, g, b) };
        });
        
      const distinctColors: string[] = [];
      const MIN_DISTANCE = 40; 
      
      for (const cand of sortedCandidates) {
        if (distinctColors.length >= 5) break; 
        
        if (distinctColors.length === 0) {
           distinctColors.push(cand.hex);
           continue;
        }

        const isDistinct = distinctColors.every(existingHex => {
           const existingParams = hexToRgb(existingHex);
           const dist = getColorDistance(cand, existingParams);
           return dist > MIN_DISTANCE;
        });

        if (isDistinct) {
           distinctColors.push(cand.hex);
        }
      }
      
      resolve(distinctColors);
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, isGenerating }) => {
  const [fontOpen, setFontOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  
  // Image extraction state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const handleChange = (key: keyof BannerConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
       if (event.target?.result) {
         const colors = await extractColorsFromImage(event.target.result as string);
         setExtractedColors(colors);
       }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setFontOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-gray-200 flex flex-col w-full shadow-lg z-20">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
          BannerGIF
        </h1>
        <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wide">Studio Editor</p>
      </div>

      <div className="flex-1 px-6 py-6 space-y-8">
        
        {/* TEXT CONTENT */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-800 font-semibold text-sm uppercase tracking-wider">
            <Type className="w-4 h-4 text-brand-500" /> 
            <span>Typography</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Banner Text</label>
              <input
                type="text"
                value={config.text}
                onChange={(e) => handleChange('text', e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                placeholder="Enter your text..."
              />
            </div>

            {/* Custom Font Selector */}
            <div className="relative" ref={fontDropdownRef}>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Font Family</label>
              <button 
                onClick={() => setFontOpen(!fontOpen)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <span style={{ fontFamily: config.fontFamily }} className="text-lg text-gray-800 truncate">
                  {FONTS.find(f => f.value === config.fontFamily)?.name || config.fontFamily}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${fontOpen ? 'rotate-180' : ''}`} />
              </button>

              {fontOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 py-1">
                  {FONTS.map((font) => (
                    <div
                      key={font.value}
                      onClick={() => {
                        handleChange('fontFamily', font.value);
                        setFontOpen(false);
                      }}
                      className={`px-4 py-2 hover:bg-brand-50 cursor-pointer flex items-center justify-between group ${config.fontFamily === font.value ? 'bg-brand-50' : ''}`}
                    >
                      <span style={{ fontFamily: font.value }} className="text-xl text-gray-800">
                        {font.name}
                      </span>
                      {config.fontFamily === font.value && <Check className="w-4 h-4 text-brand-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Weight</label>
                <select
                  value={config.fontWeight}
                  onChange={(e) => handleChange('fontWeight', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                >
                   {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Size</label>
                <input
                  type="number"
                  value={config.fontSize}
                  onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:border-brand-500 outline-none"
                />
              </div>
            </div>
            
             <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Spacing (Chars)</label>
                <input
                  type="number"
                  value={config.spacing}
                  onChange={(e) => handleChange('spacing', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:border-brand-500 outline-none"
                />
              </div>
          </div>
        </section>

        <hr className="border-dashed border-gray-200" />

        {/* COLORS */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-800 font-semibold text-sm uppercase tracking-wider">
            <Palette className="w-4 h-4 text-brand-500" /> 
            <span>Colors</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
             {/* Background */}
             <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Background</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-sm shrink-0 bg-white">
                    <input
                      type="color"
                      value={isValidHex(config.bgColor) ? config.bgColor : "#000000"}
                      onChange={(e) => handleChange('bgColor', e.target.value)}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer p-0 m-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={config.bgColor}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="w-full min-w-0 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none uppercase"
                    placeholder="#C2185B"
                  />
                </div>
             </div>
             
             {/* Text Color */}
             <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Text</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-sm shrink-0 bg-white">
                    <input
                      type="color"
                      value={isValidHex(config.textColor) ? config.textColor : "#000000"}
                      onChange={(e) => handleChange('textColor', e.target.value)}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer p-0 m-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={config.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="w-full min-w-0 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none uppercase"
                    placeholder="#FFFFFF"
                  />
                </div>
             </div>
          </div>
          
          {/* Color Extraction Feature */}
          <div className="mt-5 pt-4 border-t border-gray-100">
             <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                   Get colors from image
                   <div className="group relative">
                     <Info className="w-3 h-3 text-gray-300 hover:text-gray-400 cursor-help" />
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-gray-800 text-white text-[10px] leading-snug rounded-lg shadow-xl hidden group-hover:block z-50 pointer-events-none">
                       Upload an image or GIF to extract its dominant colors and set your background.
                       <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                     </div>
                   </div>
                </label>
                {extractedColors.length > 0 && (
                  <button 
                     onClick={() => setExtractedColors([])}
                     className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-red-50"
                  >
                    Reset <X className="w-3 h-3" />
                  </button>
                )}
             </div>

             {extractedColors.length === 0 ? (
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full py-2.5 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 group"
               >
                 <Upload className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                 Upload Image / GIF
               </button>
             ) : (
               <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <span className="text-[10px] text-gray-400 mr-1">Pick:</span>
                  <div className="flex gap-2.5">
                    {extractedColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleChange('bgColor', color)}
                        className="group relative w-8 h-8 rounded-full border border-gray-200 shadow-sm overflow-hidden hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500"
                        title={`Set background to ${color}`}
                      >
                        <div className="absolute inset-0" style={{ backgroundColor: color }} />
                        {config.bgColor.toUpperCase() === color && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                              <Check className="w-4 h-4 text-white drop-shadow-md" />
                           </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50 transition-all ml-auto"
                     title="Upload new image"
                  >
                     <Upload className="w-3.5 h-3.5" />
                  </button>
               </div>
             )}
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileUpload} 
               accept="image/*" 
               className="hidden" 
             />
          </div>
        </section>

        <hr className="border-dashed border-gray-200" />

        {/* DIMENSIONS */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-800 font-semibold text-sm uppercase tracking-wider">
            <Layout className="w-4 h-4 text-brand-500" /> 
            <span>Canvas</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
             <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Width (px)</label>
                <input
                  type="number"
                  value={config.width}
                  onChange={(e) => handleChange('width', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:border-brand-500 outline-none"
                />
             </div>
             <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Height (px)</label>
                <input
                  type="number"
                  value={config.height}
                  onChange={(e) => handleChange('height', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:border-brand-500 outline-none"
                />
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Frame Delay (ms)</label>
                <input
                  type="number"
                  value={config.frameDuration}
                  step={10}
                  onChange={(e) => handleChange('frameDuration', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:border-brand-500 outline-none"
                />
             </div>
             <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Smoothness (Frames)</label>
                <input
                  type="number"
                  value={config.numFrames}
                  min={5}
                  max={60}
                  onChange={(e) => handleChange('numFrames', Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:border-brand-500 outline-none"
                />
             </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
            Lower delay = faster scroll. Higher smoothness = larger file size.
          </p>
        </section>
        
        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default ConfigPanel;