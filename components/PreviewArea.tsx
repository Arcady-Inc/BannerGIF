import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BannerConfig } from '../types';
import { generateBannerGif } from '../utils/gifHelper';
import { Download, Play, AlertCircle, Loader2, Sparkles } from 'lucide-react';

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
  
  // Animation loop state
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!startTimeRef.current) startTimeRef.current = time;
    
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
      setError("Failed to generate GIF. Network error or memory limit.");
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
    <div className="h-full bg-gray-50 flex flex-col relative overflow-hidden font-sans">
      
      {/* Workspace */}
      <div className="flex-1 overflow-auto flex relative z-10 custom-scrollbar">
        <div className="m-auto p-12 flex flex-col items-center justify-center min-w-fit min-h-fit">
            
            <div className="relative shadow-2xl shadow-black/5">
               <canvas 
                 ref={canvasRef} 
                 className="block bg-white"
                 style={{ width: config.width, height: config.height }}
               />
               <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">
                    Live Preview
                  </span>
               </div>
            </div>

        </div>
      </div>

      {/* Control Bar */}
      <div className="w-full bg-white border-t border-gray-200 z-20 px-8 py-4 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-500">
                 <Sparkles className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-sm font-bold text-gray-800">Design Studio</h3>
                <p className="text-xs text-gray-500">Changes reflect in real-time</p>
             </div>
         </div>

         <div className="flex items-center gap-4">
            {error && (
              <span className="text-red-500 text-xs font-semibold flex items-center mr-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                {error}
              </span>
            )}
            
            {generatedUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center text-gray-600 hover:text-brand-600 px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors font-medium text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`
                flex items-center justify-center px-6 py-2.5 rounded-full text-white font-medium shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0
                ${isGenerating 
                  ? 'bg-gray-400 cursor-wait' 
                  : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:shadow-brand-500/40'
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
                  Generate GIF
                </>
              )}
            </button>
         </div>
      </div>
    </div>
  );
};

export default PreviewArea;