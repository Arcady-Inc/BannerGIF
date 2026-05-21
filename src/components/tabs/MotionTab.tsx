import React from 'react';
import { BannerConfig } from '../../types';
import { Label, SliderField } from '../ui/Field';

interface Props {
  config: BannerConfig;
  onChange: (c: BannerConfig) => void;
}

const MotionTab: React.FC<Props> = ({ config, onChange }) => {
  const set = <K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) =>
    onChange({ ...config, [key]: value });

  // Convenience: total loop duration in seconds for the help text.
  const loopSec = ((config.frameDuration * config.numFrames) / 1000).toFixed(2);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between mb-1.5">
          <Label>Speed (delay per frame)</Label>
          <span className="text-[10px] text-slate-500">{config.frameDuration}ms</span>
        </div>
        <SliderField
          value={config.frameDuration}
          onChange={(v) => set('frameDuration', v)}
          min={20}
          max={200}
          step={10}
          suffix="ms"
        />
      </div>

      <div>
        <div className="flex justify-between mb-1.5">
          <Label>Smoothness (frames)</Label>
          <span className="text-[10px] text-slate-500">{config.numFrames}</span>
        </div>
        <SliderField
          value={config.numFrames}
          onChange={(v) => set('numFrames', v)}
          min={10}
          max={60}
          suffix=" fr"
        />
      </div>

      <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Loop length: <span className="text-slate-200 font-mono">{loopSec}s</span>
        </p>
        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
          More frames = smoother motion but larger file. For email use, 15–25 frames is usually
          plenty.
        </p>
      </div>
    </div>
  );
};

export default MotionTab;
