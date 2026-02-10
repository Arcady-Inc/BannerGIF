import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BannerConfig } from '../types';
import { generateBannerGif } from '../utils/gifHelper';
import { Download, Play, AlertCircle, Loader2, Sparkles, ZoomIn, ZoomOut, Box } from 'lucide-react';

interface PreviewAreaProps {
  config: BannerConfig;
  setGenerating: (val: boolean) => void;
  isGenerating: boolean;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ config, setGenerating, isGenerating }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Animation loop state
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!startTimeRef.current) startTimeRef.current = time;

    // config.frameDuration is delay per frame.
    // Loop duration = numFrames * frameDuration
    const loopDuration = config.frameDuration * config.numFrames;
    const elapsed = time - startTimeRef.current;
    const loopProgress = (elapsed % loopDuration) / loopDuration;

    // --- DRAWING LOGIC ---
    if (canvas.width !== config.width) canvas.width = config.width;
    if (canvas.height !== config.height) canvas.height = config.height;

    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, config.width, config.height);

    ctx.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = config.textColor;

    const measureTxt = config.text || "Mg";
    const vMetrics = ctx.measureText(measureTxt);
    const ascent = vMetrics.actualBoundingBoxAscent;
    const descent = vMetrics.actualBoundingBoxDescent;
    const yPos = (config.height / 2) + (ascent - descent) / 2;

    const spacingStr = " ".repeat(config.spacing);
    const fullTextUnit = config.text + spacingStr;
    const unitMetrics = ctx.measureText(fullTextUnit);
    const unitWidth = unitMetrics.width;

    const currentFrameIndex = Math.floor(loopProgress * config.numFrames);
    const offset = -1 * (currentFrameIndex * (unitWidth / config.numFrames));

    const minRepetitions = Math.ceil(config.width / unitWidth) + 2;
    const textToRender = fullTextUnit.repeat(minRepetitions);

    ctx.fillText(textToRender, offset, yPos);

    requestRef.current = requestAnimationFrame(animate);
  }, [config]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const handleGenerate = async () => {
    if (!canvasRef.current) return;

    setGenerating(true);
    setProgress(0);
    setError(null);
    setGeneratedUrl(null);

    try {
      const blob = await generateBannerGif(config, canvasRef.current, setProgress);
      const url = URL.createObjectURL(blob);
      setGeneratedUrl(url);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate GIF. Try reducing frames.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedUrl) {
      const a = document.createElement('a');
      a.href = generatedUrl;
      const safeName = config.text.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.download = `${safeName || 'banner'}.gif`;
      a.click();
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-sans bg-[#F1F5F9]"
      style={{
        backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>

      {/* Workspace */}
      <div className="flex-1 overflow-auto flex items-center justify-center relative z-10 custom-scrollbar p-4 sm:p-8 md:p-12">
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="relative shadow-2xl shadow-black/10 ring-1 ring-black/5 rounded-sm overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="block bg-white"
              style={{ width: config.width, height: config.height }}
            />
          </div>

          <div className="absolute -top-8 left-0 flex items-center gap-2">
            <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              {config.width} × {config.height}
            </span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 flex gap-1 bg-white p-1 rounded-lg shadow-lg border border-slate-200">
          <button onClick={() => setZoom(Math.max(0.2, zoom - 0.1))} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-600 px-2 py-1.5 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Control Bar */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 max-w-[calc(100%-1.5rem)] sm:max-w-none">
        <div className="bg-white/90 backdrop-blur-md border border-white/50 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl shadow-xl flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
          {error && (
            <span className="text-red-500 text-xs font-medium flex items-center px-3 py-1.5 bg-red-50 rounded-xl border border-red-100 animate-in fade-in slide-in-from-right-5">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
              {error}
            </span>
          )}

          {generatedUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center text-slate-700 hover:text-indigo-600 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-indigo-50/50 transition-all font-semibold text-xs sm:text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download GIF
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`
                 flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/20
                 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95
                 ${isGenerating
                ? 'bg-slate-400 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/30'
              }
               `}
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
      </div>
    </div>
  );
};

export default PreviewArea;