import React from 'react';
import { Frame } from 'lucide-react';
import { BannerConfig, EdgeSides } from '../../types';
import {
  Label,
  NumberField,
  SliderField,
  Collapsible,
  Toggle,
  ColorField,
  Segmented,
} from '../ui/Field';
import ShapePicker from '../ShapePicker';

interface Props {
  config: BannerConfig;
  onChange: (c: BannerConfig) => void;
}

const ShapeTab: React.FC<Props> = ({ config, onChange }) => {
  const set = <K extends keyof BannerConfig>(key: K, value: BannerConfig[K]) =>
    onChange({ ...config, [key]: value });

  const setShapeOpt = <K extends keyof BannerConfig['shapeOptions']>(
    key: K,
    value: BannerConfig['shapeOptions'][K]
  ) => onChange({ ...config, shapeOptions: { ...config.shapeOptions, [key]: value } });

  const shape = config.shape;
  const opt = config.shapeOptions;

  // Show only the parameters that apply to the selected shape.
  const showRadius = shape === 'rounded';
  const showWaveZig = shape === 'wave' || shape === 'zigzag';
  const showNotch = shape === 'ribbon';
  const showSlant = shape === 'parallelogram';
  const showArrow = shape === 'arrow';
  const showTag = shape === 'tag';
  const hasAnyShapeParam =
    showRadius || showWaveZig || showNotch || showSlant || showArrow || showTag;

  return (
    <div className="space-y-5">
      <div>
        <Label>Banner Shape</Label>
        <ShapePicker value={shape} onChange={(s) => set('shape', s)} />
      </div>

      {hasAnyShapeParam && (
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3 space-y-3">
          {showRadius && (
            <div>
              <Label>Corner Radius</Label>
              <SliderField
                value={opt.cornerRadius}
                onChange={(v) => setShapeOpt('cornerRadius', v)}
                min={0}
                max={40}
                suffix="px"
              />
            </div>
          )}

          {showWaveZig && (
            <>
              <div>
                <Label>Edge Amplitude</Label>
                <SliderField
                  value={opt.edgeAmplitude}
                  onChange={(v) => setShapeOpt('edgeAmplitude', v)}
                  min={0}
                  max={Math.floor(config.height / 3)}
                  suffix="px"
                />
              </div>
              <div>
                <Label>Edge Frequency</Label>
                <SliderField
                  value={opt.edgeFrequency}
                  onChange={(v) => setShapeOpt('edgeFrequency', v)}
                  min={2}
                  max={40}
                  suffix=" peaks"
                />
              </div>
              <div>
                <Label>Apply To</Label>
                <Segmented<EdgeSides>
                  value={opt.edgeSides}
                  onChange={(v) => setShapeOpt('edgeSides', v)}
                  options={[
                    { value: 'both',   label: 'Both' },
                    { value: 'top',    label: 'Top' },
                    { value: 'bottom', label: 'Bottom' },
                  ]}
                />
              </div>
            </>
          )}

          {showNotch && (
            <div>
              <Label>Notch Depth</Label>
              <SliderField
                value={opt.notchDepth}
                onChange={(v) => setShapeOpt('notchDepth', v)}
                min={0}
                max={Math.floor(config.width / 4)}
                suffix="px"
              />
            </div>
          )}

          {showSlant && (
            <div>
              <Label>Slant Amount</Label>
              <SliderField
                value={opt.slantAmount}
                onChange={(v) => setShapeOpt('slantAmount', v)}
                min={0}
                max={Math.floor(config.width / 3)}
                suffix="px"
              />
            </div>
          )}

          {showArrow && (
            <div>
              <Label>Arrow Tip Depth</Label>
              <SliderField
                value={opt.arrowHead}
                onChange={(v) => setShapeOpt('arrowHead', v)}
                min={0}
                max={Math.floor(config.width / 3)}
                suffix="px"
              />
            </div>
          )}

          {showTag && (
            <div>
              <Label>Hole Radius</Label>
              <SliderField
                value={opt.tagHoleRadius}
                onChange={(v) => setShapeOpt('tagHoleRadius', v)}
                min={0}
                max={Math.floor(config.height / 4)}
                suffix="px"
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Width</Label>
          <NumberField
            value={config.width}
            onChange={(v) => set('width', v)}
            min={50}
            max={2000}
          />
        </div>
        <div>
          <Label>Height</Label>
          <NumberField
            value={config.height}
            onChange={(v) => set('height', v)}
            min={20}
            max={800}
          />
        </div>
      </div>

      <div className="pt-1">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-1">
          Advanced
        </div>
        <Collapsible
          title="Outside Area"
          icon={<Frame className="w-3.5 h-3.5" />}
          badge={config.outsideTransparent ? 'Transparent' : undefined}
        >
          <Toggle
            label="Transparent outside shape"
            checked={config.outsideTransparent}
            onChange={(v) => set('outsideTransparent', v)}
          />
          <div>
            <Label>
              {config.outsideTransparent ? 'Transparency Reference Color' : 'Outside Color'}
            </Label>
            <ColorField
              value={config.outsideColor}
              onChange={(c) => set('outsideColor', c)}
            />
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              {config.outsideTransparent
                ? 'GIFs use one transparent color slot. Pick a color that doesn\'t appear in your banner art to avoid holes.'
                : 'Color shown around the shape when the banner sits on a different background.'}
            </p>
          </div>
        </Collapsible>
      </div>
    </div>
  );
};

export default ShapeTab;
