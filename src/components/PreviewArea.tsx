import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { BannerConfig, OutputFormat, OutputMode, STATIC_FORMATS, DEFAULT_ICON_SETTINGS } from '../types';
import {
  generateBannerGif,
  generateStaticImage,
  drawBannerFrame,
  estimateOutputSizeKB,
  measureOutputSizeKB,
} from '../utils/gifHelper';
import { preloadIcons, uniqueIconIds } from '../utils/iconStore';
import {
  Download,
  Play,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  FileDown,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface PreviewAreaProps {
  config: BannerConfig;
  onChange: (next: BannerConfig) => void;
  setGenerating: (val: boolean) => void;
  isGenerating: boolean;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({
  config,
  onChange,
  setGenerating,
  isGenerating,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [actualKB, setActualKB] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Success toast — appears for 3s after a successful Generate, then fades.
  const [successToast, setSuccessToast] = useState<string | null>(null);
  // Pulse animation on the Download button when it newly appears.
  const [downloadPulse, setDownloadPulse] = useState(false);

  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const heuristicKB = useMemo(() => estimateOutputSizeKB(config), [config]);
  const [measuredKB, setMeasuredKB] = useState<number | null>(null);
  const mode: OutputMode = config.outputFormat === 'gif' ? 'animated' : 'static';
  const isStatic = mode === 'static';

  // Preload icons referenced by the text. Each (iconId, color) combo gets
  // fetched from Iconify, cached in IDB, and decoded as an Image — the
  // renderer reads from that decoded cache synchronously. We bump a counter
  // when new icons finish loading so the animate loop re-renders with them
  // instead of showing the placeholder rectangles indefinitely.
  const [iconReadyTick, setIconReadyTick] = useState(0);
  useEffect(() => {
    const ids = uniqueIconIds(config.text);
    if (ids.length === 0) return;
    const needs = ids.map((iconId) => {
      const settings = config.iconSettings[iconId] ?? DEFAULT_ICON_SETTINGS;
      const color = settings.color === 'inherit' ? config.textColor : settings.color;
      return { iconId, color };
    });
    let cancelled = false;
    preloadIcons(needs).then(() => {
      if (!cancelled) setIconReadyTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [config.text, config.iconSettings, config.textColor]);

  // Frame-sampled measurement — debounced 250ms so we don't run it on
  // every keystroke. Falls back to the heuristic if measurement fails.
  // Re-runs when iconReadyTick changes so the size reflects newly-loaded icons.
  useEffect(() => {
    setMeasuredKB(null);
    let cancelled = false;
    const t = setTimeout(async () => {
      const kb = await measureOutputSizeKB(config);
      if (!cancelled) setMeasuredKB(kb);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [config, iconReadyTick]);

  // Display priority: post-generate actual > sampled measurement > heuristic.
  const displayKB = actualKB ?? measuredKB ?? heuristicKB;
  const displayKBIsExact = actualKB !== null;

  const animate = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!startTimeRef.current) startTimeRef.current = time;

      if (canvas.width !== config.width) canvas.width = config.width;
      if (canvas.height !== config.height) canvas.height = config.height;

      if (isStatic) {
        drawBannerFrame(ctx, config, 0);
      } else {
        const loopDuration = config.frameDuration * config.numFrames;
        const elapsed = time - startTimeRef.current;
        const loopProgress = (elapsed % loopDuration) / loopDuration;
        const currentFrameIndex = Math.floor(loopProgress * config.numFrames);
        drawBannerFrame(ctx, config, currentFrameIndex);
      }

      requestRef.current = requestAnimationFrame(animate);
    },
    [config, isStatic]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Invalidate cached download when config changes.
  useEffect(() => {
    if (generatedUrl) {
      URL.revokeObjectURL(generatedUrl);
      setGeneratedUrl(null);
      setActualKB(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(null), 3500);
    return () => clearTimeout(t);
  }, [successToast]);

  // Briefly pulse the download button when it newly appears.
  useEffect(() => {
    if (generatedUrl) {
      setDownloadPulse(true);
      const t = setTimeout(() => setDownloadPulse(false), 1200);
      return () => clearTimeout(t);
    }
  }, [generatedUrl]);

  const handleGenerate = async () => {
    if (!canvasRef.current) return;

    setGenerating(true);
    setProgress(0);
    setError(null);
    setSuccessToast(null);
    setGeneratedUrl(null);
    setActualKB(null);

    try {
      // Make sure every icon used in the banner is fully decoded before we
      // encode frames — otherwise the GIF would bake placeholder rectangles
      // where icons should be.
      const iconNeeds = uniqueIconIds(config.text).map((iconId) => {
        const settings = config.iconSettings[iconId] ?? DEFAULT_ICON_SETTINGS;
        const color = settings.color === 'inherit' ? config.textColor : settings.color;
        return { iconId, color };
      });
      if (iconNeeds.length > 0) await preloadIcons(iconNeeds);

      const blob = isStatic
        ? await generateStaticImage(config, canvasRef.current)
        : await generateBannerGif(config, canvasRef.current, setProgress);
      const url = URL.createObjectURL(blob);
      const kb = Math.round(blob.size / 1024);
      setGeneratedUrl(url);
      setActualKB(kb);
      setSuccessToast(`Ready — ${kb} KB .${config.outputFormat} ready to download`);
    } catch (err) {
      console.error(err);
      setError(`Failed to generate ${config.outputFormat.toUpperCase()}.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement('a');
    a.href = generatedUrl;
    const safeName = config.text.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    a.download = `${safeName || 'banner'}.${config.outputFormat}`;
    a.click();
  };

  const setMode = (next: OutputMode) => {
    if (next === 'animated') {
      onChange({ ...config, outputFormat: 'gif' });
    } else {
      // Default static format on first switch: JPEG (first in STATIC_FORMATS).
      onChange({ ...config, outputFormat: STATIC_FORMATS[0] });
    }
  };

  const setStaticFormat = (fmt: OutputFormat) => onChange({ ...config, outputFormat: fmt });

  return (
    <div
      className="h-full flex flex-col relative overflow-hidden font-sans bg-[#F1F5F9]"
      style={{
        backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="flex-1 overflow-auto flex items-center justify-center relative z-10 custom-scrollbar p-4 sm:p-8 md:p-12">
        {/* Workspace top-left status chip — anchored to the workspace, not the canvas */}
        <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-20">
          <TransparencyStatus
            outsideTransparent={config.outsideTransparent}
            format={config.outputFormat}
          />
        </div>

        <div
          className="relative transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <div
            className="relative shadow-2xl shadow-black/10 ring-1 ring-black/5 rounded-sm overflow-hidden"
            style={
              config.outsideTransparent
                ? {
                    // Checkerboard pattern — shows users that the canvas pixels
                    // outside the shape are truly transparent (Photoshop/Figma
                    // convention). Matches what the exported PNG/WebP/GIF
                    // will look like when placed on any background.
                    backgroundImage:
                      'linear-gradient(45deg, #d4d4d8 25%, transparent 25%), ' +
                      'linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), ' +
                      'linear-gradient(45deg, transparent 75%, #d4d4d8 75%), ' +
                      'linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    backgroundColor: '#ffffff',
                  }
                : { backgroundColor: '#ffffff' }
            }
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{ width: config.width, height: config.height }}
            />
          </div>

          <div className="absolute -top-8 left-0 flex items-center gap-1.5">
            <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              {config.width} × {config.height}
            </span>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 flex gap-1 bg-white p-1 rounded-lg shadow-lg border border-slate-200">
          <button
            onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-600 px-2 py-1.5 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating toolbar */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 max-w-[calc(100%-1.5rem)] sm:max-w-none">
        <div className="bg-white/90 backdrop-blur-md border border-white/50 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl shadow-xl flex flex-col gap-2">
          {/* Mode toggle row: Animated / Static */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div
              className="flex p-0.5 bg-slate-100 rounded-lg"
              role="tablist"
              aria-label="Output mode"
            >
              <button
                role="tab"
                aria-selected={mode === 'animated'}
                onClick={() => setMode('animated')}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
                  mode === 'animated'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Animated GIF — universal email support"
              >
                Animated
              </button>
              <button
                role="tab"
                aria-selected={mode === 'static'}
                onClick={() => setMode('static')}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-md transition-all ${
                  mode === 'static'
                    ? 'bg-white text-[#4F6FF5] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Static image — single frame"
              >
                Static
              </button>
            </div>

            {/* Static-format sub-toggle (only when Static is selected) */}
            {isStatic && (
              <div
                className="flex p-0.5 bg-slate-100 rounded-lg animate-in fade-in slide-in-from-right-2 duration-200"
                role="tablist"
                aria-label="Static format"
              >
                {STATIC_FORMATS.map((fmt) => {
                  const active = config.outputFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setStaticFormat(fmt)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-md transition-all uppercase ${
                        active
                          ? 'bg-[#4F6FF5] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Live file-size — sampled by encoding 1-3 real frames */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-slate-600"
              title={
                displayKBIsExact
                  ? 'Actual size of last export'
                  : measuredKB !== null
                  ? 'Sampled from real frame encoding (close to actual)'
                  : 'Rough estimate — refining...'
              }
            >
              <FileDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-mono font-semibold">
                {displayKBIsExact ? `${displayKB} KB` : `~${displayKB} KB`}
              </span>
            </div>

            {/* Download button (appears after generation) */}
            {generatedUrl && (
              <button
                onClick={handleDownload}
                className={`flex items-center text-slate-700 hover:text-[#4F6FF5] px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl hover:bg-blue-50/50 transition-all font-semibold text-xs sm:text-sm ${
                  downloadPulse ? 'ring-2 ring-[#4F6FF5]/40 animate-pulse' : ''
                }`}
              >
                <Download className="w-4 h-4 mr-1.5" />
                .{config.outputFormat}
              </button>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-lg
                 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95
                 ${
                   isGenerating
                     ? 'bg-slate-400 cursor-wait shadow-slate-400/20'
                     : 'bg-[#4F6FF5] hover:bg-[#3D52C7] shadow-[#4F6FF5]/30 hover:shadow-[#4F6FF5]/40'
                 }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress > 0 ? `${progress}%` : 'Processing...'}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Generate
                </>
              )}
            </button>
          </div>

          {/* Feedback row — success or error message, slides in */}
          {(successToast || error) && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
                error
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}
              role={error ? 'alert' : 'status'}
            >
              {error ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{error || successToast}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TransparencyStatus — small chip in the toolbar telling the user whether
// the OUTSIDE of the banner shape will be transparent in the export. State
// depends on (outsideTransparent toggle in Shape tab) × (selected format).
// ---------------------------------------------------------------------------

interface TransparencyStatusProps {
  outsideTransparent: boolean;
  format: OutputFormat;
}

const TransparencyStatus: React.FC<TransparencyStatusProps> = ({
  outsideTransparent,
  format,
}) => {
  // Decide the chip's color + label + tooltip from the (toggle × format) matrix.
  let bgClass: string;
  let label: string;
  let tooltip: string;

  if (format === 'jpeg' && outsideTransparent) {
    // JPEG can't honor transparency — warn the user.
    bgClass = 'bg-amber-500/95';
    label = 'No alpha';
    tooltip =
      'JPEG has no alpha channel — the outside will be filled with the configured Outside Color regardless. Switch to PNG, WebP, or GIF for transparency.';
  } else if (outsideTransparent) {
    bgClass = 'bg-emerald-600/95';
    label = 'Transparent';
    tooltip =
      'Outside the shape will be truly transparent in the export. Toggle off in Shape → Outside Area to use a solid color instead.';
  } else {
    bgClass = 'bg-slate-500/95';
    label = 'Solid';
    tooltip =
      'Outside the shape will be filled with the configured Outside Color. Toggle on in Shape → Outside Area for transparency.';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${bgClass} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg`}
      title={tooltip}
    >
      <Layers className="w-2.5 h-2.5" />
      {label}
    </span>
  );
};

export default PreviewArea;
