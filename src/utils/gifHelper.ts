import { BannerConfig, BannerShape, IconSettings, ShapeOptions, TextureOptions, DEFAULT_ICON_SETTINGS } from '../types';
import { quoteFontFamily } from './customFonts';
import { getIconImageSync, parseSegments, Segment } from './iconStore';

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
// Segment measurement + drawing
//
// Banner text can contain inline icon tokens (e.g. `{{icon:mdi:home}}`). We
// parse the text into segments (alternating text + icon) and measure/draw
// each in sequence, advancing an X cursor. The marquee unit is the full
// segment list rendered once.
// ============================================================================

interface SegmentMetrics {
  width: number;        // total horizontal advance, including icon padding
  height: number;       // for icons: rendered pixel height
}

const getIconSettings = (
  iconId: string,
  config: BannerConfig
): IconSettings => config.iconSettings[iconId] ?? DEFAULT_ICON_SETTINGS;

const resolveIconColor = (settings: IconSettings, config: BannerConfig): string =>
  settings.color === 'inherit' ? config.textColor : settings.color;

/** Measure one segment without drawing. Mutates nothing. */
const measureSegment = (
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  config: BannerConfig
): SegmentMetrics => {
  if (seg.type === 'text') {
    return {
      width: ctx.measureText(seg.value).width,
      height: config.fontSize,
    };
  }
  // Icon segment — width = height * intrinsic-aspect (we treat all icons as
  // square for layout; non-square Iconify icons get drawn at their natural
  // aspect inside the square box, which is what most users expect).
  const settings = getIconSettings(seg.iconId, config);
  const iconHeight = (config.fontSize * settings.sizePercent) / 100;
  // Use square footprint for layout — Iconify icons are overwhelmingly square,
  // and predictable spacing matters more than perfect tight-bounding for the
  // odd non-square logo.
  return {
    width: iconHeight + settings.paddingPx * 2,
    height: iconHeight,
  };
};

/** Total width of a list of segments. */
const totalSegmentsWidth = (
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  config: BannerConfig
): number => segments.reduce((acc, s) => acc + measureSegment(ctx, s, config).width, 0);

/**
 * Draw a single segment at (x, baselineY). Returns the new X cursor after the
 * segment is drawn. Caller is responsible for setting ctx.font, fillStyle,
 * and any text effects (shadow, stroke) before invoking.
 */
const drawSegment = (
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  x: number,
  baselineY: number,
  config: BannerConfig,
  // When drawing text, the caller may have already set ctx.fillStyle for the
  // fill pass and previously stroked. Icons need their own fillStyle (their
  // color comes from iconSettings), so we restore on exit.
  textFill: boolean
): number => {
  if (seg.type === 'text') {
    if (textFill) ctx.fillText(seg.value, x, baselineY);
    const w = ctx.measureText(seg.value).width;
    return x + w;
  }

  const settings = getIconSettings(seg.iconId, config);
  const color = resolveIconColor(settings, config);
  const iconHeight = (config.fontSize * settings.sizePercent) / 100;
  const iconWidth = iconHeight;

  // Middle-align the icon on the text's x-height by default; user can nudge
  // up (negative) or down (positive) via verticalOffsetPx.
  //
  // For the alphabetic baseline, the visual middle of capital letters sits
  // roughly `cap-height/2` above the baseline. We approximate cap-height as
  // 0.7 × fontSize (standard heuristic), so the text-visual-center is at
  // `baselineY - fontSize * 0.35`. Placing the icon so ITS center hits that
  // point means iconY = (text-visual-center) - iconHeight/2.
  const textVisualCenter = baselineY - config.fontSize * 0.35;
  const iconY = textVisualCenter - iconHeight / 2 + settings.verticalOffsetPx;

  if (textFill) {
    const img = getIconImageSync(seg.iconId, color);
    if (img) {
      ctx.drawImage(img, x + settings.paddingPx, iconY, iconWidth, iconHeight);
    } else {
      // Placeholder while the icon is still decoding. Use the icon's own
      // color (or text color) so the placeholder is visible on the user's
      // banner background, not just on dark slate.
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + settings.paddingPx, iconY, iconWidth, iconHeight);
      ctx.restore();
    }
  }
  return x + iconWidth + settings.paddingPx * 2;
};

// ============================================================================
// Per-frame paint (shared by preview + encoder)
// ============================================================================

/**
 * Optional render-time context.
 *
 * The "outside the shape" area is rendered differently depending on what we're
 * about to do with the canvas:
 *
 *   - Preview (forEncode=false):
 *       Clear to alpha=0 when outsideTransparent — the workspace shows a
 *       checkerboard behind the canvas, so transparency is visible.
 *
 *   - GIF encode (forEncode=true, format='gif'):
 *       PAINT outsideColor. gif.js reads back canvas pixels and looks for the
 *       configured color in the quantized palette to mark as transparent.
 *
 *   - PNG / WebP encode (forEncode=true, format='png'|'webp'):
 *       Clear to alpha=0. canvas.toBlob() preserves alpha; format supports it.
 *
 *   - JPEG encode (forEncode=true, format='jpeg'):
 *       PAINT outsideColor. JPEG has no alpha channel — clearing would let
 *       toBlob composite the transparent pixels onto an implementation-defined
 *       background (often black). Painting gives a deterministic result.
 */
interface DrawOptions {
  forEncode?: boolean;
}

const shouldPaintOutside = (config: BannerConfig, forEncode: boolean): boolean => {
  if (!config.outsideTransparent) return true;
  if (!forEncode) return false;
  return config.outputFormat === 'gif' || config.outputFormat === 'jpeg';
};

export const drawBannerFrame = (
  ctx: CanvasRenderingContext2D,
  config: BannerConfig,
  frameIndex: number,
  options: DrawOptions = {}
): void => {
  const { width, height, text, spacing, shape, shapeOptions } = config;
  const forEncode = options.forEncode ?? false;

  // --- 1. Outside-shape area --------------------------------------------------
  // Always start from a known state — either filled with outsideColor or
  // explicitly cleared to alpha=0. See shouldPaintOutside() for the matrix.
  ctx.save();
  if (shouldPaintOutside(config, forEncode)) {
    ctx.fillStyle = config.outsideColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }
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
  // CSS font shorthand order: [style] [weight] size family
  // Family MUST be quoted when it contains anything outside [A-Za-z0-9-];
  // otherwise canvas silently ignores the assignment and keeps drawing in
  // its default `10px sans-serif`.
  const stylePart = config.fontStyle === 'italic' ? 'italic ' : '';
  const fontStr = `${stylePart}${config.fontWeight} ${config.fontSize}px ${quoteFontFamily(config.fontFamily)}`;
  ctx.font = fontStr;
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const measureTxt = text || 'Mg';
  const vMetrics = ctx.measureText(measureTxt);
  const ascent = vMetrics.actualBoundingBoxAscent;
  const descent = vMetrics.actualBoundingBoxDescent;
  const yPos = height / 2 + (ascent - descent) / 2;

  // Parse the user's text into [text|icon|text|...] segments. Each marquee
  // "unit" is one pass through the segment list (plus trailing spacing).
  const baseSegments = parseSegments(text);
  const spacingTail: Segment[] = config.repeatText && spacing > 0
    ? [{ type: 'text', value: ' '.repeat(spacing) }]
    : [];
  const unitSegments: Segment[] = [...baseSegments, ...spacingTail];

  // Total width of one marquee unit (text widths via measureText, icon
  // widths derived from fontSize × sizePercent + padding).
  const unitWidth = totalSegmentsWidth(ctx, unitSegments, config);

  // Compute X origin for the leftmost unit.
  //
  //   repeatText:
  //     animated → start at offset that cycles through one unitWidth across
  //                numFrames for a perfect loop.
  //     static   → start at 0 (tiny pad already absorbed by spacingTail).
  //   non-repeated:
  //     start at aligned position (textAlign + textOffsetX).
  let originX: number;
  if (config.repeatText) {
    const isStaticOutput = config.outputFormat !== 'gif';
    const staticLeftPad = isStaticOutput && spacing < 8 ? config.fontSize * 0.25 : 0;
    originX = isStaticOutput
      ? staticLeftPad
      : -1 * (frameIndex * (unitWidth / Math.max(1, config.numFrames)));
  } else {
    switch (config.textAlign) {
      case 'left':
        originX = 0 + config.textOffsetX;
        break;
      case 'right':
        originX = width - unitWidth + config.textOffsetX;
        break;
      case 'center':
      default:
        originX = (width - unitWidth) / 2 + config.textOffsetX;
        break;
    }
  }

  // --- 6. Render passes ----------------------------------------------------
  //
  // Each marquee unit is drawn in three passes when stroke or shadow is on:
  //   1. Shadow pass (only if stroke is OFF and shadow ON) — draws once
  //      per segment, so the shadow lands behind every glyph + icon.
  //   2. Stroke pass — strokes text only (icons can't be stroked the same
  //      way; we leave their internal artwork alone).
  //   3. Fill pass — text fillText, icon drawImage.
  //
  // The stroke + fill split is the same trick as before: stroking after
  // filling would clip half the stroke into the glyph; stroking first then
  // filling on top gives clean outlined letters.

  const drawOneUnit = (unitOriginX: number) => {
    // Shadow + fill pass for both text and icons. Done together so the
    // shadow applies uniformly to everything inside the unit.
    if (config.shadowEnabled) {
      ctx.shadowColor = config.shadowColor;
      ctx.shadowBlur = config.shadowBlur;
      ctx.shadowOffsetX = config.shadowOffsetX;
      ctx.shadowOffsetY = config.shadowOffsetY;
    }

    // Stroke pass (text only).
    if (config.strokeWidth > 0) {
      ctx.lineWidth = config.strokeWidth * 2;
      ctx.strokeStyle = config.strokeColor;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      let x = unitOriginX;
      for (const seg of unitSegments) {
        if (seg.type === 'text') {
          ctx.strokeText(seg.value, x, yPos);
        }
        // Always advance cursor by the segment's full width — drawing or not.
        x += measureSegment(ctx, seg, config).width;
      }
      // Disable shadow before the fill pass — otherwise it stacks on top
      // of the stroke shadow as a visible halo.
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Fill pass — text fill + icon draw.
    ctx.fillStyle = config.textColor;
    let cursorX = unitOriginX;
    for (const seg of unitSegments) {
      cursorX = drawSegment(ctx, seg, cursorX, yPos, config, true);
    }
  };

  if (config.repeatText) {
    // Wrap the segment list horizontally to fill the canvas + one unit of
    // slack on each side for seamless edge cases when stroke/shadow extends
    // past the unit's bounding box.
    const repetitions = Math.ceil(width / Math.max(1, unitWidth)) + 2;
    for (let i = 0; i < repetitions; i++) {
      drawOneUnit(originX + i * unitWidth);
    }
  } else {
    drawOneUnit(originX);
  }

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
        drawBannerFrame(ctx, config, i, { forEncode: true });
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

  if (config.outputFormat === 'gif') {
    return Promise.reject(new Error('generateStaticImage called with gif format'));
  }

  // Render frame 0 — the "starting position" of the marquee. For PNG/WebP
  // with outsideTransparent, this leaves the outside area at alpha=0; toBlob
  // preserves that into the output.
  drawBannerFrame(ctx, config, 0, { forEncode: true });

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
//
// These are deliberately conservative-low — overestimating is worse than
// underestimating for our audience (email deliverability anxiety). After the
// first real export, PreviewArea displays the actual size instead, so any
// estimate-vs-reality drift self-corrects per session.
//
// All numbers were rough-calibrated against typical scrolling-text banners
// (700×50–1500×100, flat-ish backgrounds). Expect ±40% error on edge cases.

export const estimateOutputSizeKB = (config: BannerConfig): number => {
  const pixels = config.width * config.height;

  if (config.outputFormat === 'png') {
    // PNG is lossless with zlib. Flat text on flat bg compresses very well.
    // Baseline ~0.2 bpp for default content; effects raise the entropy bill.
    let bpp = 0.2;
    if (config.bgType === 'gradient') bpp += 0.15;
    if (config.texture.type !== 'none') bpp += 0.2;
    if (config.texture.type === 'noise') bpp += 0.4;
    if (config.shadowEnabled) bpp += 0.1;
    return Math.max(1, Math.round((pixels * bpp) / 1024) + 1);
  }

  if (config.outputFormat === 'webp') {
    // WebP @ q=0.92 ~30–50% smaller than PNG for our content.
    let bpp = 0.12;
    if (config.bgType === 'gradient') bpp += 0.06;
    if (config.texture.type !== 'none') bpp += 0.08;
    if (config.texture.type === 'noise') bpp += 0.2;
    if (config.shadowEnabled) bpp += 0.05;
    return Math.max(1, Math.round((pixels * bpp) / 1024) + 1);
  }

  if (config.outputFormat === 'jpeg') {
    // JPEG @ q=0.92 sits between WebP and PNG for our content.
    // (JPEG flattens any transparency onto white.)
    let bpp = 0.18;
    if (config.bgType === 'gradient') bpp += 0.08;
    if (config.texture.type !== 'none') bpp += 0.14;
    if (config.texture.type === 'noise') bpp += 0.28;
    if (config.shadowEnabled) bpp += 0.07;
    return Math.max(1, Math.round((pixels * bpp) / 1024) + 1);
  }

  // GIF: indexed-palette LZW across all frames. Default settings
  // (quality=20, dither=false) target compact output for flat content.
  //
  // For a horizontally-scrolling marquee, EVERY pixel shifts each frame,
  // so gif.js's inter-frame delta detection gives little benefit. Each
  // frame ends up as essentially a fresh LZW block, but at very low bpp
  // because the palette is tiny (often <8 colors for flat text).
  let bytesPerPixelPerFrame = 0.035;
  if (config.bgType === 'gradient') bytesPerPixelPerFrame += 0.05;
  if (config.strokeWidth > 0) bytesPerPixelPerFrame += 0.01;
  if (config.shadowEnabled) bytesPerPixelPerFrame += 0.04;
  if (config.texture.type !== 'none') bytesPerPixelPerFrame += 0.04;
  if (config.texture.type === 'noise') bytesPerPixelPerFrame += 0.18;
  // Non-rect shapes barely affect file size — the palette is what matters.
  const bodyBytes = pixels * config.numFrames * bytesPerPixelPerFrame;
  const headerOverhead = 800; // GIF89a header + GCT + extension blocks
  return Math.max(2, Math.round((bodyBytes + headerOverhead) / 1024));
};

// ----------------------------------------------------------------------------
// Frame-sampled measurement — runs the real encoder on a couple of frames
// and extrapolates. ~10-30ms on a default-sized banner, much more accurate
// than the static heuristic above.
//
// Strategy per format:
//
//   - Static (PNG / WebP / JPEG): just encode frame 0 in the target format.
//     One toBlob call. The result *is* the exact final size.
//
//   - GIF: encode frame 0, the middle frame, and the last frame as PNG.
//     PNG isn't GIF, but PNG-bytes-per-frame correlates well with
//     GIF-bytes-per-frame for our content (small palette, flat-ish bg).
//     Apply an empirical ratio (~0.5 for flat banners, higher for noise).
//
// The estimate function above remains as instant fallback while measurement
// is in flight. ----------------------------------------------------------------------------

const PNG_TO_GIF_RATIO_BY_TEXTURE: Record<string, number> = {
  none: 0.5,
  stripes: 0.55,
  dots: 0.55,
  grid: 0.55,
  checker: 0.55,
  crosshatch: 0.6,
  plus: 0.6,
  triangles: 0.6,
  noise: 0.8, // noise hurts both, but more for PNG than GIF
};

export const measureOutputSizeKB = async (config: BannerConfig): Promise<number> => {
  // Use a scratch canvas so we don't disturb the live preview canvas.
  const scratch = document.createElement('canvas');
  scratch.width = config.width;
  scratch.height = config.height;
  const ctx = scratch.getContext('2d');
  if (!ctx) return estimateOutputSizeKB(config);

  const toBlob = (mime: string, quality?: number): Promise<Blob | null> =>
    new Promise((resolve) => scratch.toBlob(resolve, mime, quality));

  try {
    // Static formats — render frame 0 in the target format. This is exact.
    if (config.outputFormat !== 'gif') {
      drawBannerFrame(ctx, config, 0, { forEncode: true });
      const info = STATIC_FORMAT_INFO[config.outputFormat];
      const blob = await toBlob(info.mime, info.quality);
      if (!blob) return estimateOutputSizeKB(config);
      return Math.max(1, Math.round(blob.size / 1024));
    }

    // GIF — sample 3 frames as PNG, extrapolate.
    const indices = [
      0,
      Math.floor(config.numFrames / 2),
      config.numFrames - 1,
    ];
    let totalPngBytes = 0;
    for (const i of indices) {
      drawBannerFrame(ctx, config, i, { forEncode: true });
      const blob = await toBlob('image/png');
      if (!blob) return estimateOutputSizeKB(config);
      totalPngBytes += blob.size;
    }
    const avgPngPerFrame = totalPngBytes / indices.length;
    const ratio = PNG_TO_GIF_RATIO_BY_TEXTURE[config.texture.type] ?? 0.5;
    const gifBytes = avgPngPerFrame * ratio * config.numFrames + 800; // + header
    return Math.max(2, Math.round(gifBytes / 1024));
  } catch {
    return estimateOutputSizeKB(config);
  }
};

