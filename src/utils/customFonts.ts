import { del, get, set } from 'idb-keyval';

// ----------------------------------------------------------------------------
// Custom font store (multi-variant)
//
// A "custom font" is a FAMILY — e.g. "Roboto" — that may contain multiple
// variants (regular/bold/italic/etc.). Each variant has its own binary, but
// they all register under the same CSS font-family name with different
// `weight` + `style` descriptors. So:
//
//   ctx.font = '32px Roboto'          → uses weight=400, style=normal
//   ctx.font = 'bold 32px Roboto'     → uses weight=700, style=normal
//   ctx.font = 'italic 32px Roboto'   → uses weight=400, style=italic
//
// The browser resolves to the best-matching FontFace automatically. If a
// requested combo isn't loaded, browsers synthesize (e.g. fake-italic via
// slant) — usually acceptable for marquee banners.
// ----------------------------------------------------------------------------

export type FontFormat = 'truetype' | 'opentype' | 'woff' | 'woff2';
export type FontSource = 'upload' | 'google-fonts';
export type FontStyle = 'normal' | 'italic';

export interface FontVariant {
  weight: string;        // '100'..'900' for static; min..max range (e.g. '100 900') for variable
  style: FontStyle;
  blobId: string;        // unique within the family — used as IDB key suffix
  format: FontFormat;
  size: number;          // bytes
  // Variable-font metadata. When present, this variant covers every weight
  // from wghtMin..wghtMax via the OpenType `wght` axis — picker should let
  // the user choose any standard weight within the range.
  wghtMin?: number;
  wghtMax?: number;
}

export interface CustomFont {
  id: string;            // UUID for the family
  family: string;        // CSS font-family name
  fileName: string;      // for display in the picker (original filename or "Roboto" for Google)
  source: FontSource;
  googleUrl?: string;
  variants: FontVariant[];
  addedAt: number;
}

const INDEX_KEY = 'customFontIndex';
const blobKey = (fontId: string, blobId: string) => `font:${fontId}:${blobId}`;

// ----------------------------------------------------------------------------
// Common variant labels (for UI display)
// ----------------------------------------------------------------------------

const WEIGHT_NAMES: Record<string, string> = {
  '100': 'Thin',
  '200': 'Extra Light',
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'Semi Bold',
  '700': 'Bold',
  '800': 'Extra Bold',
  '900': 'Black',
};

export const variantLabel = (v: FontVariant): string => {
  const name = WEIGHT_NAMES[v.weight] ?? v.weight;
  return v.style === 'italic' ? `${name} Italic` : name;
};

/** Pick the variant closest to "Regular Normal" — used as the default on family change. */
export const defaultVariant = (variants: FontVariant[]): FontVariant | undefined => {
  if (variants.length === 0) return undefined;
  // Prefer 400+normal, then 400+italic, then any normal-style variant,
  // then a variable variant whose range includes 400, then anything.
  return (
    variants.find((v) => v.weight === '400' && v.style === 'normal') ??
    variants.find((v) => v.weight === '400') ??
    variants.find((v) => v.style === 'normal') ??
    variants.find(
      (v) =>
        v.wghtMin !== undefined &&
        v.wghtMax !== undefined &&
        v.wghtMin <= 400 &&
        v.wghtMax >= 400
    ) ??
    variants[0]
  );
};

// ----------------------------------------------------------------------------
// FontFace registration
// ----------------------------------------------------------------------------

const registerFontFace = async (
  family: string,
  blob: Blob,
  weight: string,
  style: FontStyle
): Promise<void> => {
  const buffer = await blob.arrayBuffer();
  const face = new FontFace(family, buffer, { weight, style });
  await face.load();
  document.fonts.add(face);
};

/**
 * Sweep `document.fonts` for any FontFace whose `family` matches and delete it.
 *
 * Why this exists: the previous `register first, persist second` flow could
 * leave orphan FontFaces in `document.fonts` when persistence failed (page
 * closed mid-upload, HMR fired between awaits). Those orphans then make
 * `document.fonts.check()` return true for a family that doesn't exist in
 * our IDB-backed index, blocking re-uploads with "already imported" while
 * the Custom tab silently has zero entries.
 *
 * Calling this before every registration is cheap (single-digit milliseconds
 * even with hundreds of FontFaces) and idempotent.
 */
const removeOrphanFontFaces = (family: string): void => {
  const toRemove: FontFace[] = [];
  document.fonts.forEach((face) => {
    if (face.family === family) toRemove.push(face);
  });
  toRemove.forEach((face) => document.fonts.delete(face));
};

const detectFormat = (fileName: string): FontFormat => {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'otf') return 'opentype';
  return 'truetype';
};

// ----------------------------------------------------------------------------
// Variable-font detection
//
// Reads the OpenType `fvar` table to find a `wght` (weight) axis. If present,
// the file is a variable font — one binary that covers a continuous range of
// weights. We expose the min/max so the picker can offer all standard weights.
//
// Supports TTF and OTF directly. WOFF/WOFF2 are compressed wrappers around
// the same table layout — we don't decompress here, so variable WOFF2 fonts
// load as fixed-weight 400 (acceptable; uncommon edge case).
// ----------------------------------------------------------------------------

interface FvarInfo {
  wghtMin: number;
  wghtMax: number;
  wghtDefault: number;
}

const readFvar = (buffer: ArrayBuffer): FvarInfo | null => {
  try {
    const view = new DataView(buffer);
    const magic = view.getUint32(0);
    // Only support uncompressed sfnt-flavored fonts here:
    //   0x00010000 = TrueType, 0x4F54544F (OTTO) = OpenType CFF
    if (magic !== 0x00010000 && magic !== 0x4f54544f) return null;

    const numTables = view.getUint16(4);
    let fvarOffset = -1;
    // Table directory starts at byte 12, each entry is 16 bytes (tag, checksum, offset, length)
    for (let i = 0; i < numTables; i++) {
      const entry = 12 + i * 16;
      const tag = String.fromCharCode(
        view.getUint8(entry),
        view.getUint8(entry + 1),
        view.getUint8(entry + 2),
        view.getUint8(entry + 3)
      );
      if (tag === 'fvar') {
        fvarOffset = view.getUint32(entry + 8);
        break;
      }
    }
    if (fvarOffset < 0) return null;

    // fvar header: version (4), offsetToAxesArray (2), reserved (2),
    //              axisCount (2), axisSize (2), instanceCount (2), instanceSize (2)
    const axesOffset = fvarOffset + view.getUint16(fvarOffset + 4);
    const axisCount = view.getUint16(fvarOffset + 8);
    const axisSize = view.getUint16(fvarOffset + 10);

    for (let i = 0; i < axisCount; i++) {
      const off = axesOffset + i * axisSize;
      const tag = String.fromCharCode(
        view.getUint8(off),
        view.getUint8(off + 1),
        view.getUint8(off + 2),
        view.getUint8(off + 3)
      );
      if (tag === 'wght') {
        // Fixed 16.16 — divide by 65536 to get the decimal value.
        const min = view.getInt32(off + 4) / 65536;
        const def = view.getInt32(off + 8) / 65536;
        const max = view.getInt32(off + 12) / 65536;
        return { wghtMin: min, wghtMax: max, wghtDefault: def };
      }
    }
    return null;
  } catch {
    return null;
  }
};

// ----------------------------------------------------------------------------
// Standard CSS named weights — picker rows generated from the fvar range
// ----------------------------------------------------------------------------

interface StandardWeight {
  name: string;
  value: number;
}

const STANDARD_WEIGHTS: StandardWeight[] = [
  { name: 'Thin',        value: 100 },
  { name: 'Extra Light', value: 200 },
  { name: 'Light',       value: 300 },
  { name: 'Regular',     value: 400 },
  { name: 'Medium',      value: 500 },
  { name: 'Semi Bold',   value: 600 },
  { name: 'Bold',        value: 700 },
  { name: 'Extra Bold',  value: 800 },
  { name: 'Black',       value: 900 },
];

/** Standard weights that fit inside a variable font's wght axis range. */
export const weightsInRange = (min: number, max: number): StandardWeight[] =>
  STANDARD_WEIGHTS.filter((w) => w.value >= min && w.value <= max);

/**
 * Wrap a font-family name in double quotes when it contains anything other
 * than letters, digits, or hyphens.
 *
 * Required for the canvas `ctx.font` shorthand (which fails SILENTLY on
 * unquoted family names containing spaces, parentheses, dots, etc. — the
 * assignment is ignored and the canvas keeps drawing in `10px sans-serif`).
 * Also safer for CSS inline `font-family` styles.
 *
 * Examples:
 *   quoteFontFamily('Inter')                        // → 'Inter'
 *   quoteFontFamily('Open Sans')                    // → '"Open Sans"'
 *   quoteFontFamily('URBANIST-VARIABLEFONT (1)')    // → '"URBANIST-VARIABLEFONT (1)"'
 */
export const quoteFontFamily = (family: string): string => {
  if (/^[A-Za-z0-9-]+$/.test(family)) return family;
  // Escape any embedded double quotes so the CSS parser stays happy.
  return `"${family.replace(/"/g, '\\"')}"`;
};

// ----------------------------------------------------------------------------
// Index helpers
// ----------------------------------------------------------------------------

const readIndex = async (): Promise<CustomFont[]> => {
  const raw = await get<CustomFont[]>(INDEX_KEY);
  return raw ?? [];
};

const writeIndex = async (fonts: CustomFont[]): Promise<void> => {
  await set(INDEX_KEY, fonts);
};

// ----------------------------------------------------------------------------
// Add a font from a local file (single variant — Regular Normal)
// ----------------------------------------------------------------------------

export const addFontFromFile = async (
  file: File,
  displayName?: string
): Promise<CustomFont> => {
  const id = crypto.randomUUID();
  const family = (displayName?.trim() || file.name.replace(/\.[^.]+$/, '')).trim();

  if (!family) throw new Error('Font name cannot be empty');

  // Source-of-truth dedupe: the IDB index — NOT document.fonts. The latter
  // can hold orphan entries from prior partial uploads, which would otherwise
  // block re-import even though the Custom tab is empty.
  const dedupeIdx = await readIndex();
  if (dedupeIdx.some((f) => f.family === family)) {
    const err = new Error(
      `A custom font named "${family}" already exists. Open the Custom tab in the font picker, remove it, then try again.`
    );
    (err as Error & { code?: string }).code = 'DUPLICATE_FAMILY';
    throw err;
  }

  // Cleanup orphans before registering so a leftover FontFace with this
  // family from a previous failed upload doesn't confuse the browser's
  // font-matching pass.
  removeOrphanFontFaces(family);

  const buffer = await file.arrayBuffer();
  const blob = new Blob([buffer], { type: file.type || 'font/woff2' });
  const blobId = crypto.randomUUID();

  // Detect variable-font axis BEFORE registering — picks the correct weight
  // descriptor (range for VFs, single value for static).
  const fvar = readFvar(buffer);

  let weightDescriptor: string;
  if (fvar) {
    // CSS Font Descriptor allows `min max` to declare a range. Browsers then
    // use the wght variation axis to interpolate between requested weights.
    weightDescriptor = `${Math.round(fvar.wghtMin)} ${Math.round(fvar.wghtMax)}`;
  } else {
    weightDescriptor = '400';
  }

  await registerFontFace(family, blob, weightDescriptor, 'normal');

  const meta: CustomFont = {
    id,
    family,
    fileName: file.name,
    source: 'upload',
    variants: [
      {
        weight: weightDescriptor,
        style: 'normal',
        blobId,
        format: detectFormat(file.name),
        size: blob.size,
        ...(fvar
          ? { wghtMin: Math.round(fvar.wghtMin), wghtMax: Math.round(fvar.wghtMax) }
          : {}),
      },
    ],
    addedAt: Date.now(),
  };

  await set(blobKey(id, blobId), blob);
  const idx = await readIndex();
  await writeIndex([...idx, meta]);

  return meta;
};

// ----------------------------------------------------------------------------
// Google Fonts URL import (parses ALL @font-face blocks)
// ----------------------------------------------------------------------------

interface ParsedFace {
  family: string;
  weight: string;
  style: FontStyle;
  fontUrl: string;
  format: FontFormat;
}

/**
 * Walk every @font-face block in the Google Fonts CSS and extract the family,
 * weight, style, and font-file URL. Dedupes by (weight, style) — Google's CSS
 * has separate blocks per unicode-range (Latin, Cyrillic, Greek, etc.); we
 * keep just the first src per (weight, style) tuple, which is normally Latin.
 */
const parseGoogleFontsCSS = (css: string): ParsedFace[] => {
  // Match each @font-face { ... } block including nested braces? Actually Google's
  // blocks don't nest. Simple non-greedy match works.
  const blocks = css.match(/@font-face\s*\{[^}]+\}/g) ?? [];
  const seen = new Set<string>();
  const out: ParsedFace[] = [];

  for (const block of blocks) {
    const familyMatch = /font-family:\s*['"]([^'"]+)['"]/i.exec(block);
    const weightMatch = /font-weight:\s*([0-9]+)/i.exec(block);
    const styleMatch = /font-style:\s*(italic|normal)/i.exec(block);
    const woff2Match = /src:\s*url\(([^)]+)\)\s*format\(['"]?woff2['"]?\)/i.exec(block);
    const anyMatch = /url\(([^)]+)\)/i.exec(block);
    const urlMatch = woff2Match ?? anyMatch;

    if (!familyMatch || !urlMatch) continue;

    const family = familyMatch[1];
    const weight = weightMatch?.[1] ?? '400';
    const style: FontStyle = (styleMatch?.[1]?.toLowerCase() === 'italic') ? 'italic' : 'normal';
    const fontUrl = urlMatch[1].replace(/['"]/g, '');
    const format: FontFormat = woff2Match ? 'woff2' : 'truetype';

    const key = `${family}|${weight}|${style}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ family, weight, style, fontUrl, format });
  }

  if (out.length === 0) throw new Error('No @font-face blocks found in CSS');
  return out;
};

export const addFontFromGoogleURL = async (
  cssUrl: string,
  displayName?: string
): Promise<CustomFont> => {
  if (!/^https:\/\/fonts\.googleapis\.com\//.test(cssUrl)) {
    throw new Error('URL must point to fonts.googleapis.com');
  }

  const cssRes = await fetch(cssUrl);
  if (!cssRes.ok) throw new Error(`Fetch failed: HTTP ${cssRes.status}`);
  const css = await cssRes.text();

  const parsedFaces = parseGoogleFontsCSS(css);
  // All blocks should share the same family — sanity check + use it.
  const detectedFamily = parsedFaces[0].family;
  const finalFamily = (displayName?.trim() || detectedFamily).trim();

  // Dedupe against the IDB-backed index (same logic as the file upload path).
  const dedupeIdx = await readIndex();
  if (dedupeIdx.some((f) => f.family === finalFamily)) {
    const err = new Error(
      `A custom font named "${finalFamily}" already exists. Open the Custom tab in the font picker, remove it, then try again.`
    );
    (err as Error & { code?: string }).code = 'DUPLICATE_FAMILY';
    throw err;
  }
  removeOrphanFontFaces(finalFamily);

  const id = crypto.randomUUID();
  const variants: FontVariant[] = [];

  // Fetch all variant binaries in parallel — Google's CDN is fast.
  await Promise.all(
    parsedFaces.map(async (face) => {
      const res = await fetch(face.fontUrl);
      if (!res.ok) throw new Error(`Variant fetch failed (${face.weight} ${face.style}): HTTP ${res.status}`);
      const blob = await res.blob();
      const blobId = crypto.randomUUID();
      await registerFontFace(finalFamily, blob, face.weight, face.style);
      await set(blobKey(id, blobId), blob);
      variants.push({
        weight: face.weight,
        style: face.style,
        blobId,
        format: face.format,
        size: blob.size,
      });
    })
  );

  // Sort: weights ascending, normal before italic within each weight.
  variants.sort((a, b) => {
    const w = parseInt(a.weight) - parseInt(b.weight);
    if (w !== 0) return w;
    return a.style === b.style ? 0 : a.style === 'normal' ? -1 : 1;
  });

  const meta: CustomFont = {
    id,
    family: finalFamily,
    fileName: detectedFamily,
    source: 'google-fonts',
    googleUrl: cssUrl,
    variants,
    addedAt: Date.now(),
  };

  const idx = await readIndex();
  await writeIndex([...idx, meta]);
  return meta;
};

// ----------------------------------------------------------------------------
// Remove a font (all variants)
// ----------------------------------------------------------------------------

export const removeFont = async (id: string): Promise<void> => {
  const idx = await readIndex();
  const target = idx.find((f) => f.id === id);

  if (target) {
    // Delete every variant's blob.
    await Promise.all(target.variants.map((v) => del(blobKey(id, v.blobId))));

    // Remove every matching FontFace from document.fonts.
    const facesToRemove: FontFace[] = [];
    document.fonts.forEach((face) => {
      if (face.family === target.family) facesToRemove.push(face);
    });
    facesToRemove.forEach((face) => document.fonts.delete(face));
  }

  await writeIndex(idx.filter((f) => f.id !== id));
};

// ----------------------------------------------------------------------------
// Boot-time hydration
// ----------------------------------------------------------------------------

export const loadAllCustomFonts = async (): Promise<CustomFont[]> => {
  const idx = await readIndex();
  if (idx.length === 0) return [];

  await Promise.all(
    idx.map(async (meta) => {
      try {
        // Wipe any stale FontFaces with this family — handles HMR-induced
        // orphans without skipping the re-register (which would otherwise
        // leave variants out of date if blob content changed).
        removeOrphanFontFaces(meta.family);

        await Promise.all(
          meta.variants.map(async (v) => {
            const blob = await get<Blob>(blobKey(meta.id, v.blobId));
            if (!blob) return;
            await registerFontFace(meta.family, blob, v.weight, v.style);
          })
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to load custom font "${meta.family}":`, err);
      }
    })
  );

  return idx;
};
