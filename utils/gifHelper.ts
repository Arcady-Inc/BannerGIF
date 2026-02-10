import { BannerConfig } from '../types';

declare class GIF {
  constructor(options: any);
  addFrame(element: any, options?: any): void;
  on(event: string, callback: (args?: any) => void): void;
  render(): void;
}

export const generateBannerGif = async (
  config: BannerConfig,
  canvas: HTMLCanvasElement,
  onProgress: (percent: number) => void
): Promise<Blob> => {
  // 1. Fetch the worker script text manually
  const workerResponse = await fetch('https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js');
  if (!workerResponse.ok) throw new Error("Failed to load GIF worker");
  const workerScript = await workerResponse.text();
  
  // 2. Create a local Blob URL for the worker
  const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(workerBlob);

  return new Promise((resolve, reject) => {
    try {
      const gif = new GIF({
        workers: 2,
        // Quality: 1 (Best/Slowest) to 20 (Worst/Fastest). 
        // For text banners, 20 is actually fine and produces smaller files with less noise.
        quality: 20, 
        width: config.width,
        height: config.height,
        workerScript: workerUrl,
        background: config.bgColor,
        // Dithering adds noise dots to gradients. For flat text on flat bg, it's bad for file size.
        // Disabling it makes the file smaller and cleaner.
        dither: false, 
        transparent: null
      });

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      // Setup Font
      const fontStr = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
      ctx.font = fontStr;
      ctx.textBaseline = 'alphabetic'; // Use alphabetic for precise manual centering
      
      // Measure text for Vertical Centering
      // We measure the text content itself to ensure we center the visual mass of what is written
      const measureTxt = config.text || "Mg"; 
      const vMetrics = ctx.measureText(measureTxt);
      const ascent = vMetrics.actualBoundingBoxAscent;
      const descent = vMetrics.actualBoundingBoxDescent;
      
      // Calculate Y position to perfectly center the text bounding box vertically
      // Formula: Middle of canvas + half of the difference between ascent and descent shifts the baseline correctly
      const yPos = (config.height / 2) + (ascent - descent) / 2;
      
      // Measure text for Horizontal Loop
      const spacingStr = " ".repeat(config.spacing);
      const fullTextUnit = config.text + spacingStr;
      const unitMetrics = ctx.measureText(fullTextUnit);
      const unitWidth = unitMetrics.width;
      
      const minRepetitions = Math.ceil(config.width / unitWidth) + 2;
      const textToRender = fullTextUnit.repeat(minRepetitions);

      // Animation Rendering Loop
      for (let i = 0; i < config.numFrames; i++) {
        // Clear background
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(0, 0, config.width, config.height);

        // Calculate offset
        const offset = -1 * (i * (unitWidth / config.numFrames));

        // Draw Text
        ctx.fillStyle = config.textColor;
        ctx.font = fontStr;
        ctx.textBaseline = 'alphabetic'; // Ensure consistent baseline
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.fillText(textToRender, offset, yPos);

        // Add frame to GIF
        gif.addFrame(ctx, { copy: true, delay: config.frameDuration });
      }

      gif.on('progress', (p: number) => {
        onProgress(Math.round(p * 100));
      });

      gif.on('finished', (blob: Blob) => {
        URL.revokeObjectURL(workerUrl);
        resolve(blob);
      });

      gif.render();

    } catch (error) {
      URL.revokeObjectURL(workerUrl);
      reject(error);
    }
  });
};