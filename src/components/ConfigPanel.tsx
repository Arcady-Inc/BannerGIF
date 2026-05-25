import React, { useState } from 'react';
import { Type, Palette, Shapes, Activity } from 'lucide-react';
import { BannerConfig } from '../types';
import { CustomFont } from '../utils/customFonts';
import ContentTab from './tabs/ContentTab';
import StyleTab from './tabs/StyleTab';
import ShapeTab from './tabs/ShapeTab';
import MotionTab from './tabs/MotionTab';

interface ConfigPanelProps {
  config: BannerConfig;
  onChange: (newConfig: BannerConfig) => void;
  isGenerating: boolean;
  customFonts: CustomFont[];
  onCustomFontsChange: (fonts: CustomFont[]) => void;
}

type TabKey = 'content' | 'style' | 'shape' | 'motion';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'content', label: 'Content', icon: <Type className="w-3.5 h-3.5" /> },
  { key: 'style',   label: 'Style',   icon: <Palette className="w-3.5 h-3.5" /> },
  { key: 'shape',   label: 'Shape',   icon: <Shapes className="w-3.5 h-3.5" /> },
  { key: 'motion',  label: 'Motion',  icon: <Activity className="w-3.5 h-3.5" /> },
];

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onChange,
  customFonts,
  onCustomFontsChange,
}) => {
  const [tab, setTab] = useState<TabKey>('content');

  return (
    <div className="h-full flex flex-col w-full bg-[#0F172A] text-slate-300 border-r border-slate-800 shadow-2xl overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-800/60 bg-[#0F172A]/95 backdrop-blur z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-[#4F6FF5]/20 ring-1 ring-white/5">
            {/* Marquee Stack — three offset bars, the BannerGIF mark */}
            <svg viewBox="0 0 100 100" className="w-full h-full" aria-label="BannerGIF Studio">
              <defs>
                <linearGradient id="bgLogo" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5470F8" />
                  <stop offset="100%" stopColor="#3D52C7" />
                </linearGradient>
                <clipPath id="logoClip">
                  <rect width="100" height="100" rx="22" />
                </clipPath>
              </defs>
              <rect width="100" height="100" rx="22" fill="url(#bgLogo)" />
              <g clipPath="url(#logoClip)" fill="#ffffff">
                <rect x="28" y="26" width="82" height="11" />
                <rect x="-10" y="44.5" width="82" height="11" />
                <rect x="28" y="63" width="82" height="11" />
              </g>
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-100 tracking-tight leading-tight">
              BannerGIF Studio
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Animated banner generator</p>
          </div>
        </div>
      </div>

      {/* ─── Tab bar ────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1 bg-[#0F172A] shrink-0">
        <div className="grid grid-cols-4 gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all ${
                  active
                    ? 'bg-[#4F6FF5] text-white shadow-md shadow-[#4F6FF5]/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {t.icon}
                <span className="text-[10px] font-semibold tracking-wide">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Tab content (scrollable) ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        {tab === 'content' && (
          <ContentTab
            config={config}
            onChange={onChange}
            customFonts={customFonts}
            onCustomFontsChange={onCustomFontsChange}
          />
        )}
        {tab === 'style'   && <StyleTab config={config} onChange={onChange} />}
        {tab === 'shape'   && <ShapeTab config={config} onChange={onChange} />}
        {tab === 'motion'  && <MotionTab config={config} onChange={onChange} />}
      </div>

      {/* ─── Arcady credit footer ───────────────────────────────────────── */}
      <a
        href="https://arcadymedia.com"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-2 px-5 py-3 border-t border-slate-800/60 bg-[#0B1120]/80 hover:bg-slate-800/40 transition-colors group"
      >
        <span className="text-[9px] text-slate-500 group-hover:text-slate-400 uppercase tracking-widest">
          Developed by
        </span>
        <img
          src="/brand/arcady-monogram-white.png"
          alt="Arcady Media"
          className="h-3.5 w-auto opacity-60 group-hover:opacity-90 transition-opacity"
        />
        <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-200 tracking-wide">
          Arcady Media Inc
        </span>
      </a>
    </div>
  );
};

export default ConfigPanel;
