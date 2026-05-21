import { BannerConfig, BannerShape, ShapeOptions, TextureOptions } from '../types';

declare class GIF {
  constructor(options: any);
  addFrame(element: any, options?: any): void;
  on(event: string, callback: (args?: any) => void): void;
  render(): void;
}

// ============================================================================
// Shape path
// ============================================================================

/**
 * Build a path on `ctx` matching the configured banner shape.
 * Caller is responsible for calling ctx.beginPath() / ctx.clip() / ctx.fill().
 */
export const tracePath = (
  ctx: CanvasRenderingContext2D,
  shape: BannerShape,
  opts: ShapeOptions,
  width: number,
  height: number
): void => {
  ctx.beginPath();

  switch (shape) {
    case 'rectangle': {
      ctx.rect(0, 0, width, height);
      break;
    }

    case 'rounded': {
      const r = Math.min(opts.cornerRadius, width / 2, height / 2);
      ctx.moveTo(r, 0);
      ctx.lineTo(width - r, 0);
      ctx.quadraticCurveTo(width, 0, width, r);
      ctx.lineTo(width, height - r);
      ctx.quadraticCurveTo(width, height, width - r, height);
      ctx.lineTo(r, height);
      ctx.quadraticCurveTo(0, height, 0, height - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      break;
    }

    case 'pill': {
      // Fully rounded ends — radius = height/2, capsule shape.
      const r = height / 2;
      ctx.moveTo(r, 0);
      ctx.lineTo(width - r, 0);
      ctx.arc(width - r, r, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(r, height);
      ctx.arc(r, r, r, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      break;
    }

    case 'parallelogram': {
      // Slanted left and right edges. slantAmount = horizontal shift at top.
      const s = Math.min(opts.slantAmount, width / 3);
      ctx.moveTo(s, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width - s, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      break;
    }

    case 'arrow': {
      // Right-pointing chevron. arrowHead = depth of the tip.
      const a = Math.min(opts.arrowHead, width / 3);
      ctx.moveTo(0, 0);
      ctx.lineTo(width - a, 0);
      ctx.lineTo(width, height / 2);
      ctx.lineTo(width - a, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      break;
    }

    case 'tag': {
      // Price-tag shape: rectangle with one slanted left end + a punched hole.
      const slant = Math.min(height * 0.6, width / 6);
      const holeR = Math.min(opts.tagHoleRadius, height / 4);
      const holeCx = slant + holeR + 2;
      const holeCy = height / 2;

      // Outer outline — slanted left, flat right
      ctx.moveTo(slant, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(slant, height);
      ctx.lineTo(0, height / 2);
      ctx.closePath();

      // Subtract the hole (even-odd fill rule via reverse sub-path)
      ctx.moveTo(holeCx + holeR, holeCy);
      ctx.arc(holeCx, holeCy, holeR, 0, Math.PI * 2, true);
      break;
    }

    case 'wave': {
      const amp = Math.min(opts.edgeAmplitude, height / 4);
      const freq = Math.max(1, opts.edgeFrequency);
      const steps = 80;
      const topWavy = opts.edgeSides === 'both' || opts.edgeSides === 'top';
      const botWavy = opts.edgeSides === 'both' || opts.edgeSides === 'bottom';

      // Top edge — wavy or straight
      if (topWavy) {
        ctx.moveTo(0, amp);
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * width;
          const y = amp - amp * Math.sin((i / steps) * freq * Math.PI * 2) * 0.5 - amp * 0.5;
          ctx.lineTo(x, y + amp);
        }
      } else {
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
      }

      // Right edge
      ctx.lineTo(width, botWavy ? height - amp : height);

      // Bottom edge — wavy or straight
      if (botWavy) {
        for (let i = steps; i >= 0; i--) {
          const x = (i / steps) * width;
          const y = height - amp + amp * Math.sin((i / steps) * freq * Math.PI * 2) * 0.5 + amp * 0.5;
          ctx.lineTo(x, y - amp);
        }
      } else {
        ctx.lineTo(0, height);
      }

      ctx.closePath();
      break;
    }

    case 'zigzag': {
      const amp = Math.min(opts.edgeAmplitude, height / 4);
      const freq = Math.max(2, Math.round(opts.edgeFrequency));
      const segWidth = width / freq;
      const topZig = opts.edgeSides === 'both' || opts.edgeSides === 'top';
      const botZig = opts.edgeSides === 'both' || opts.edgeSides === 'bottom';

      // Top edge
      if (topZig) {
        ctx.moveTo(0, amp);
        for (let i = 0; i < freq; i++) {
          const x0 = i * segWidth;
          const xMid = x0 + segWidth / 2;
          const x1 = x0 + segWidth;
          const high = i % 2 === 0 ? 0 : amp * 2;
          ctx.lineTo(xMid, high);
          ctx.lineTo(x1, amp);
        }
      } else {
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
      }

      // Right edge
      ctx.lineTo(width, botZig ? height - amp : height);

      // Bottom edge
      if (botZig) {
        for (let i = freq - 1; i >= 0; i--) {
          const x0 = (i + 1) * segWidth;
          const xMid = x0 - segWidth / 2;
          const x1 = i * segWidth;
          const low = i % 2 === 0 ? height : height - amp * 2;
          ctx.lineTo(xMid, low);
          ctx.lineTo(x1, height - amp);
        }
      } else {
        ctx.lineTo(0, height);
      }

      ctx.closePath();
      break;
    }

    case 'ribbon': {
      const notch = Math.min(opts.notchDepth, width / 4);
      // Left V-notch, top edge, right V-notch, bottom edge back to start.
      ctx.moveTo(0, 0);
      ctx.lineTo(width - notch, 0);
      ctx.lineTo(width, height / 2);
      ctx.lineTo(width - notch, height);
      ctx.lineTo(0, height);
      ctx.lineTo(notch, height / 2);
      ctx.closePath();
      break;
    }
  }
};

// ============================================================================
// Textures
// ============================================================================

/**
 * Paint a procedural texture overlay across the current canvas.
 * Assumes any shape clipping has already been applied via ctx.clip().
 */
const paintTexture = (
  ctx: CanvasRenderingContext2D,
  tex: TextureOptions,
  width: number,
  height: number
): void => {
  if (tex.type === 'none' || tex.opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = tex.opacity;
  ctx.fillStyle = tex.color;
  ctx.strokeStyle = tex.color;

  switch (tex.type) {
    case 'stripes': {
      const spacing = Math.max(4, tex.scale);
      const thickness = Math.max(1, spacing / 3);
      const angleRad = (tex.angle * Math.PI) / 180;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(angleRad);
      const diag = Math.sqrt(width * width + height * height);
      ctx.lineWidth = thickness;
      for (let y = -diag; y < diag; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(-diag, y);
        ctx.lineTo(diag, y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'dots': {
      const spacing = Math.max(6, tex.scale);
      const radius = Math.max(0.8, spacing / 6);
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'grid': {
      const spacing = Math.max(6, tex.scale);
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }

    case 'checker': {
      const cell = Math.max(4, tex.scale);
      for (let y = 0; y < height; y += cell) {
        for (let x = 0; x < width; x += cell) {
          const tileIndex = Math.floor(x / cell) + Math.floor(y / cell);
          if (tileIndex % 2 === 0) ctx.fillRect(x, y, cell, cell);
        }
      }
      break;
    }

    case 'crosshatch': {
      // Two sets of perpendicular diagonal lines.
      const spacing = Math.max(6, tex.scale);
      ctx.lineWidth = 1;
      const diag = Math.sqrt(width * width + height * height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(Math.PI / 4);
      for (let y = -diag; y < diag; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(-diag, y);
        ctx.lineTo(diag, y);
        ctx.stroke();
      }
      ctx.rotate(Math.PI / 2);
      for (let y = -diag; y < diag; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(-diag, y);
        ctx.lineTo(diag, y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'plus': {
      // Repeating + glyphs on a grid.
      const cell = Math.max(8, tex.scale);
      const arm = cell / 3;
      ctx.lineWidth = Math.max(1, cell / 8);
      for (let y = cell / 2; y < height; y += cell) {
        for (let x = cell / 2; x < width; x += cell) {
          ctx.beginPath();
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
          ctx.stroke();
        }
      }
      break;
    }

    case 'triangles': {
      // Tessellated upward/downward triangles.
      const cell = Math.max(8, tex.scale);
      const h = (cell * Math.sqrt(3)) / 2;
      for (let row = 0, y = 0; y < height + h; row++, y += h) {
        const xOff = (row % 2) * (cell / 2);
        for (let x = -cell; x < width + cell; x += cell) {
          ctx.beginPath();
          ctx.moveTo(x + xOff, y);
          ctx.lineTo(x + xOff + cell / 2, y + h);
          ctx.lineTo(x + xOff + cell, y);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }

    case 'noise': {
      // Deterministic noise (same pattern every frame so we don't add
      // motion artifacts that confuse the GIF encoder's LZW compression).
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const [tr, tg, tb] = hexToRgb(tex.color);
      const a = tex.opacity * 255;
      // Inline LCG so noise is deterministic and fast — no allocations per pixel.
      let seed = 1234567;
      for (let i = 0; i < data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const r = (seed / 0x7fffffff);
        if (r > 0.5) continue;
        // Alpha-blend the noise color on top of the existing pixel.
        const k = (1 - r) * (a / 255);
        data[i] = data[i] * (1 - k) + tr * k;
        data[i + 1] = data[i + 1] * (1 - k) + tg * k;
        data[i + 2] = data[i + 2] * (1 - k) + tb * k;
      }
      ctx.putImageData(imageData, 0, 0);
      break;
    }
  }

  ctx.restore();
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

// ============================================================================
// Background fill
// ============================================================================

const buildBackgroundFill = (
  ctx: CanvasRenderingContext2D,
  config: BannerConfig
): string | CanvasGradient => {
  if (config.bgType === 'solid') return config.bgColor;

  const { width, height } = config;
  const stops = [...config.gradientStops].sort((a, b) => a.position - b.position);

  let gradient: CanvasGradient;
  if (config.gradientType === 'radial') {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.max(width, height) / 2;
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else {
    const angleRad = (config.gradientAngle * Math.PI) / 180;
    const x0 = width / 2 - (Math.cos(angleRad) * width) / 2;
    const y0 = height / 2 - (Math.sin(angleRad) * height) / 2;
    const x1 = width / 2 + (Math.cos(angleRad) * width) / 2;
    const y1 = height / 2 + (Math.sin(angleRad) * height) / 2;
    gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  }

  for (const stop of stops) {
    const p = Math.max(0, Math.min(1, stop.position));
    gradient.addColorStop(p, stop.color);
  }
  return gradient;
};

// ============================================================================
// Per-frame paint (shared by preview + encoder)
// ============================================================================

export const drawBannerFrame = (
  ctx: CanvasRenderingContext2D,
  config: BannerConfig,
  frameIndex: number
): void => {
  const { width, height, text, spacing, shape, shapeOptions } = config;

  // --- 1. Paint outside-shape area first (so it shows around shape edges) ---
  ctx.save();
  if (config.outsideTransparent) {
    // Use the configured transparent color marker for gif.js. The preview
    // can't render alpha but the export will treat this color as transparent.
    ctx.fillStyle = config.outsideColor;
  } else {
    ctx.fillStyle = config.outsideColor;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // --- 2. Clip to the configured shape ------------------------------------
  ctx.save();
  tracePath(ctx, shape, shapeOptions, width, height);
  // evenodd lets sub-paths (like the tag-hole punch) cut through the outline.
  // Single-perimeter shapes render identically under either fill rule.
  ctx.clip('evenodd');

  // --- 3. Background fill (solid or gradient) -----------------------------
  ctx.fillStyle = buildBackgroundFill(ctx, config);
  ctx.fillRect(0, 0, width, height);

  // --- 4. Texture overlay ---------------------------------------------------
  paintTexture(ctx, config.texture, width, height);

  // --- 5. Text setup --------------------------------------------------------
  const fontStr = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
  ctx.font = fontStr;
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const measureTxt = text || 'Mg';
  const vMetrics = ctx.measureText(measureTxt);
  const ascent = vMetrics.actualBoundingBoxAscent;
  const descent = vMetrics.actualBoundingBoxDescent;
  const yPos = height / 2 + (ascent - descent) / 2;

  const spacingStr = ' '.repeat(spacing);
  const fullTextUnit = text + spacingStr;
  const unitMetrics = ctx.measureText(fullTextUnit);
  const unitWidth = unitMetrics.width;
  const minRepetitions = Math.ceil(width / Math.max(1, unitWidth)) + 2;

  // In static modes, prepend a tiny left-pad so the first repetition isn't
  // flush against the canvas edge. One space is usually enough; with very wide
  // spacing settings we allow a second.
  const isStaticOutput = config.outputFormat !== 'gif';
  const staticLeftPad = isStaticOutput ? (spacing >= 8 ? '  ' : ' ') : '';
  const textToRender = staticLeftPad + fullTextUnit.repeat(minRepetitions);

  // Animated: offset cycles through one unitWidth across numFrames for a perfect loop.
  // Static: no offset (we already padded with leading whitespace).
  const offset = isStaticOutput
    ? 0
    : -1 * (frameIndex * (unitWidth / config.numFrames));

  // --- 6. Drop shadow (applies to both stroke and fill) ---------------------
  if (config.shadowEnabled) {
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = config.shadowBlur;
    ctx.shadowOffsetX = config.shadowOffsetX;
    ctx.shadowOffsetY = config.shadowOffsetY;
  }

  // --- 7. Text stroke (drawn first so fill sits on top) ---------------------
  if (config.strokeWidth > 0) {
    ctx.lineWidth = config.strokeWidth * 2; // half is clipped by fill on top
    ctx.strokeStyle = config.strokeColor;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(textToRender, offset, yPos);
    // Disable shadow before the fill — otherwise the fill's shadow stacks
    // on top of the stroke's shadow, producing a visible halo.
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // --- 8. Text fill --------------------------------------------------------
  ctx.fillStyle = config.textColor;
  ctx.fillText(textToRender, offset, yPos);

  ctx.restore();
};

// ============================================================================
// GIF encoding
// ============================================================================

export const generateBannerGif = async (
  config: BannerConfig,
  canvas: HTMLCanvasElement,
  onProgress: (percent: number) => void
): Promise<Blob> => {
  // gif.js spawns a Web Worker, which fails CORS from a CDN. Fetch the
  // worker source and wrap it in a same-origin Blob URL instead.
  const workerResponse = await fetch('https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js');
  if (!workerResponse.ok) throw new Error('Failed to load GIF worker');
  const workerScript = await workerResponse.text();

  const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(workerBlob);

  return new Promise((resolve, reject) => {
    try {
      // gif.js's `transparent` option takes a 0xRRGGBB number. If the user
      // wants a transparent outside, we tell gif.js to treat the outsideColor
      // as the transparent slot.
      const transparent = config.outsideTransparent
        ? parseInt(config.outsideColor.replace('#', ''), 16)
        : null;

      const gif = new GIF({
        workers: 2,
        quality: 20,
        width: config.width,
        height: config.height,
        workerScript: workerUrl,
        background: config.outsideTransparent ? config.outsideColor : config.bgColor,
        dither: false,
        transparent,
      });

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      if (canvas.width !== config.width) canvas.width = config.width;
      if (canvas.height !== config.height) canvas.height = config.height;

      for (let i = 0; i < config.numFrames; i++) {
        drawBannerFrame(ctx, config, i);
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

// ============================================================================
// Static export (PNG / WebP) — single frame, no encoding worker
// ============================================================================

// MIME type and encoder quality per static format.
// PNG is lossless (quality is ignored); JPEG/WebP get visually-lossless q=0.92.
const STATIC_FORMAT_INFO: Record<'jpeg' | 'png' | 'webp', { mime: string; quality?: number }> = {
  jpeg: { mime: 'image/jpeg', quality: 0.92 },
  png:  { mime: 'image/png' },
  webp: { mime: 'image/webp', quality: 0.92 },
};

export const generateStaticImage = (
  config: BannerConfig,
  canvas: HTMLCanvasElement
): Promise<Blob> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Could not get canvas context'));

  if (canvas.width !== config.width) canvas.width = config.width;
  if (canvas.height !== config.height) canvas.height = config.height;

  // Render frame 0 — the "starting position" of the marquee.
  drawBannerFrame(ctx, config, 0);

  if (config.outputFormat === 'gif') {
    return Promise.reject(new Error('generateStaticImage called with gif format'));
  }

  const info = STATIC_FORMAT_INFO[config.outputFormat];

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to encode ${config.outputFormat.toUpperCase()}`));
      },
      info.mime,
      info.quality
    );
  });
};

// ============================================================================
// Size estimate
// ============================================================================

export const estimateOutputSizeKB = (config: BannerConfig): number => {
  const pixels = config.width * config.height;

  // For static formats, we encode a single frame.
  if (config.outputFormat === 'png') {
    // PNG is lossless. Flat banners compress well via zlib.
    let bpp = 0.4;
    if (config.bgType === 'gradient') bpp += 0.2;
    if (config.texture.type !== 'none') bpp += 0.3;
    if (config.texture.type === 'noise') bpp += 0.5;
    if (config.shadowEnabled) bpp += 0.15;
    return Math.max(1, Math.round((pixels * bpp) / 1024));
  }

  if (config.outputFormat === 'webp') {
    // WebP @ q=0.92 is typically 30–50% smaller than PNG for this content.
    let bpp = 0.22;
    if (config.bgType === 'gradient') bpp += 0.08;
    if (config.texture.type !== 'none') bpp += 0.12;
    if (config.texture.type === 'noise') bpp += 0.25;
    if (config.shadowEnabled) bpp += 0.08;
    return Math.max(1, Math.round((pixels * bpp) / 1024));
  }

  if (config.outputFormat === 'jpeg') {
    // JPEG @ q=0.92 is typically a touch larger than WebP but smaller than PNG.
    // Note: JPEG flattens transparency onto a white background.
    let bpp = 0.3;
    if (config.bgType === 'gradient') bpp += 0.1;
    if (config.texture.type !== 'none') bpp += 0.18;
    if (config.texture.type === 'noise') bpp += 0.35;
    if (config.shadowEnabled) bpp += 0.1;
    return Math.max(1, Math.round((pixels * bpp) / 1024));
  }

  // GIF: animated, all frames.
  let bytesPerPixelPerFrame = 0.06;
  if (config.bgType === 'gradient') bytesPerPixelPerFrame += 0.04;
  if (config.strokeWidth > 0) bytesPerPixelPerFrame += 0.02;
  if (config.shadowEnabled) bytesPerPixelPerFrame += 0.03;
  if (config.texture.type !== 'none') bytesPerPixelPerFrame += 0.05;
  if (config.texture.type === 'noise') bytesPerPixelPerFrame += 0.1;
  if (config.shape !== 'rectangle') bytesPerPixelPerFrame += 0.01;
  const bytes = pixels * config.numFrames * bytesPerPixelPerFrame;
  return Math.max(2, Math.round(bytes / 1024));
};

