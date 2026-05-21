import React, { useRef, useState } from 'react';
import { Droplet, Type, Upload, Image as ImageIcon, Sparkles, Paintbrush } from 'lucide-react';
import { BannerConfig, BackgroundType, TEXTURE_OPTIONS, TextureType } from '../../types';
import { ColorField, Label, Segmented, SliderField, Collapsible, Toggle } from '../ui/Field';
import GradientEditor from '../GradientEditor';

interface Props {
  config: BannerConfig;
  onChange: (c: BannerConfig) => void;
}

// ---------------------------------------------------------------------------
// Brand color extraction (kept inline — small helper, only used here)
// ---------------------------------------------------------------------------

const rgbToHex = (r: number, g: number, b: number) =>
  '#' +
  [r, g, b]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

const extractColors = (src: string): Promise<string[]> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve([]);
      const MAX = 250;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > MAX) { h *= MAX / w; w = MAX; }
      } else {
        if (h > MAX) { w *= MAX / h; h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const map: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 8) {
        if (data[i + 3] < 128) continue;
        const r = Math.round(data[i] / 10) * 10;
        const g = Math.round(data[i + 1] / 10) * 10;
        const b = Math.round(data[i + 2] / 10) * 10;
        const k = `${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)}`;
        map[k] = (map[k] || 0) + 1;
      }
      const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5);
      resolve(sorted.map(([k]) => {
        const [r, g, b] = k.split(',').map(Number);
        return rgbToHex(r, g, b);
      }));
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });

// ---------------------------------------------------------------------------

const StyleTab: React.FC<Props> = ({ config, onChange }) => {
  const set = <K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) =>
    onChange({ ...config, [key]: value });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracted, setExtracted] = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (ev.target?.result) {
        const colors = await extractColors(ev.target.result as string);
        setExtracted(colors);
        if (colors.length > 0) set('bgColor', colors[0]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isGradient = config.bgType === 'gradient';
  const tex = config.texture;
  const textureOn = tex.type !== 'none';
  const strokeOn = config.strokeWidth > 0;
  const shadowOn = config.shadowEnabled;

  return (
    <div className="space-y-4">
      {/* ─── Background fill ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label>Background</Label>
        <Segmented<BackgroundType>
          value={config.bgType}
          onChange={(v) => set('bgType', v)}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'gradient', label: 'Gradient' },
          ]}
        />

        {!isGradient && <ColorField value={config.bgColor} onChange={(c) => set('bgColor', c)} />}

        {isGradient && <GradientEditor config={config} onChange={onChange} />}
      </div>

      {/* ─── Text color ─────────────────────────────────────────────────── */}
      <div>
        <Label>Text Color</Label>
        <ColorField value={config.textColor} onChange={(c) => set('textColor', c)} />
      </div>

      {/* ─── Advanced sections ──────────────────────────────────────────── */}
      <div className="pt-1 space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-1">
          Advanced
        </div>

        {/* Texture */}
        <Collapsible
          title="Texture"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          badge={textureOn ? tex.type : undefined}
        >
          <div>
            <Label>Pattern</Label>
            <div className="space-y-1.5">
              <Segmented<TextureType>
                value={tex.type}
                onChange={(v) => set('texture', { ...tex, type: v })}
                options={TEXTURE_OPTIONS.slice(0, 3)}
              />
              <Segmented<TextureType>
                value={tex.type}
                onChange={(v) => set('texture', { ...tex, type: v })}
                options={TEXTURE_OPTIONS.slice(3, 6)}
              />
              <Segmented<TextureType>
                value={tex.type}
                onChange={(v) => set('texture', { ...tex, type: v })}
                options={TEXTURE_OPTIONS.slice(6)}
              />
            </div>
          </div>

          {textureOn && (
            <>
              <div>
                <Label>Texture Color</Label>
                <ColorField
                  value={tex.color}
                  onChange={(c) => set('texture', { ...tex, color: c })}
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Opacity</Label>
                  <span className="text-[10px] text-slate-500">
                    {Math.round(tex.opacity * 100)}%
                  </span>
                </div>
                <SliderField
                  value={Math.round(tex.opacity * 100)}
                  onChange={(v) => set('texture', { ...tex, opacity: v / 100 })}
                  min={0}
                  max={100}
                  suffix="%"
                />
              </div>
              {tex.type !== 'noise' && (
                <div>
                  <Label>Scale</Label>
                  <SliderField
                    value={tex.scale}
                    onChange={(v) => set('texture', { ...tex, scale: v })}
                    min={4}
                    max={48}
                    suffix="px"
                  />
                </div>
              )}
              {(tex.type === 'stripes' || tex.type === 'grid') && (
                <div>
                  <Label>Angle</Label>
                  <SliderField
                    value={tex.angle}
                    onChange={(v) => set('texture', { ...tex, angle: v })}
                    min={0}
                    max={180}
                    suffix="°"
                  />
                </div>
              )}
            </>
          )}
        </Collapsible>

        {/* Text stroke */}
        <Collapsible
          title="Text Stroke"
          icon={<Type className="w-3.5 h-3.5" />}
          badge={strokeOn ? `${config.strokeWidth}px` : undefined}
        >
          <div>
            <Label>Stroke Width</Label>
            <SliderField
              value={config.strokeWidth}
              onChange={(v) => set('strokeWidth', v)}
              min={0}
              max={8}
              step={0.5}
              suffix="px"
            />
          </div>
          {strokeOn && (
            <div>
              <Label>Stroke Color</Label>
              <ColorField value={config.strokeColor} onChange={(c) => set('strokeColor', c)} />
            </div>
          )}
        </Collapsible>

        {/* Drop shadow */}
        <Collapsible
          title="Drop Shadow"
          icon={<Droplet className="w-3.5 h-3.5" />}
          badge={shadowOn ? 'On' : 'Off'}
        >
          <Toggle
            label="Enable drop shadow"
            checked={config.shadowEnabled}
            onChange={(v) => set('shadowEnabled', v)}
          />
          {shadowOn && (
            <>
              <div>
                <Label>Blur</Label>
                <SliderField
                  value={config.shadowBlur}
                  onChange={(v) => set('shadowBlur', v)}
                  min={0}
                  max={30}
                  suffix="px"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Offset X</Label>
                  <SliderField
                    value={config.shadowOffsetX}
                    onChange={(v) => set('shadowOffsetX', v)}
                    min={-20}
                    max={20}
                    suffix="px"
                  />
                </div>
                <div>
                  <Label>Offset Y</Label>
                  <SliderField
                    value={config.shadowOffsetY}
                    onChange={(v) => set('shadowOffsetY', v)}
                    min={-20}
                    max={20}
                    suffix="px"
                  />
                </div>
              </div>
              <div>
                <Label>Shadow Color</Label>
                <ColorField
                  value={config.shadowColor}
                  onChange={(c) => set('shadowColor', c)}
                />
              </div>
            </>
          )}
        </Collapsible>

        {/* Brand color extractor */}
        <Collapsible
          title="Match Brand Colors"
          icon={<Paintbrush className="w-3.5 h-3.5" />}
          badge={extracted.length > 0 ? `${extracted.length}` : undefined}
        >
          {extracted.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group w-full py-4 border border-dashed border-slate-700 rounded-lg bg-slate-900/20 hover:bg-slate-800/50 hover:border-[#4F6FF5]/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-[#4F6FF5]/20 flex items-center justify-center transition-colors">
                <Upload className="w-4 h-4 text-slate-400 group-hover:text-[#4F6FF5]" />
              </div>
              <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                Upload image to extract palette
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {extracted.map((color) => (
                  <button
                    key={color}
                    onClick={() => set('bgColor', color)}
                    className="group relative w-8 h-8 rounded-full ring-2 ring-slate-800 hover:scale-110 hover:ring-[#4F6FF5] transition-all"
                    style={{ backgroundColor: color }}
                    title={`Use ${color}`}
                  />
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:text-[#4F6FF5] hover:border-[#4F6FF5] transition-all"
                  title="Upload another"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => setExtracted([])}
                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear palette
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </Collapsible>
      </div>
    </div>
  );
};

export default StyleTab;
