import { get, set } from 'idb-keyval';

// ----------------------------------------------------------------------------
// Icon store
//
// Backed by Iconify (https://iconify.design) — a meta-library with 200,000+
// icons across 200+ icon sets. Free CDN, generous CORS, no auth.
//
// Three layers of caching:
//   1. IndexedDB (idb-keyval, prefix "icon:") — raw SVG strings, persist
//      across reloads. One blob per Iconify icon ID.
//   2. In-memory Image cache, keyed by `${iconId}|${color}` — decoded
//      HTMLImageElements ready to drawImage(). Color substitution happens
//      at decode time (the SVG's `currentColor` is replaced with the
//      target hex before building the data URL).
//   3. Iconify CDN — first source of truth. Hit once per icon, ever.
//
// The renderer (drawBannerFrame) reads from the in-memory cache synchronously
// via getIconImageSync(). If an entry isn't ready it returns null and the
// caller renders a placeholder; the calling layer (PreviewArea) is
// responsible for preloading before each render via preloadIcons().
// ----------------------------------------------------------------------------

const ICONIFY_API = 'https://api.iconify.design';
const SVG_CACHE_PREFIX = 'icon:';

// ----------------------------------------------------------------------------
// Search
// ----------------------------------------------------------------------------

export type IconStyle = 'all' | 'outline' | 'solid' | 'decorative' | 'brands';

// Set prefixes that compose each style — used as a query prefix to Iconify's
// search API. The first prefix in each list is the "primary" we search first.
const STYLE_PREFIXES: Record<Exclude<IconStyle, 'all'>, string[]> = {
  outline: ['lucide', 'tabler', 'heroicons', 'ph', 'ion'],
  solid: ['material-symbols', 'mdi', 'ph-fill', 'heroicons-solid'],
  decorative: ['noto', 'twemoji', 'fluent-emoji', 'openmoji', 'flat-color-icons'],
  brands: ['logos', 'simple-icons', 'devicon', 'brandico'],
};

export interface IconSearchResult {
  id: string;        // e.g. "material-symbols:home"
}

interface IconifySearchResponse {
  icons: string[];
  total: number;
}

/**
 * Search Iconify across all sets (style="all") or a curated subset.
 *
 * For style-filtered searches we fan out one request per set prefix and
 * merge — Iconify's API doesn't support OR-ing multiple prefixes in a
 * single call. Limit is split across prefixes so the result count stays
 * predictable.
 */
export const searchIcons = async (
  query: string,
  style: IconStyle = 'all',
  limit: number = 64
): Promise<IconSearchResult[]> => {
  // Empty query — return featured icons so the picker has something to show.
  if (!query.trim()) {
    return FEATURED_ICONS.slice(0, limit).map((id) => ({ id }));
  }

  if (style === 'all') {
    const url = `${ICONIFY_API}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as IconifySearchResponse;
      return data.icons.map((id) => ({ id }));
    } catch {
      return [];
    }
  }

  // Style-filtered: parallel fetch per prefix, merge, dedupe, trim.
  const prefixes = STYLE_PREFIXES[style];
  const perPrefix = Math.max(8, Math.ceil(limit / prefixes.length));
  const responses = await Promise.all(
    prefixes.map(async (prefix) => {
      try {
        const url = `${ICONIFY_API}/search?query=${encodeURIComponent(query)}&prefix=${prefix}&limit=${perPrefix}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = (await res.json()) as IconifySearchResponse;
        return data.icons;
      } catch {
        return [];
      }
    })
  );
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const list of responses) {
    for (const id of list) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(id);
      if (merged.length >= limit) break;
    }
    if (merged.length >= limit) break;
  }
  return merged.map((id) => ({ id }));
};

// Featured icons surfaced when the search box is empty. Mix of styles so
// users see what the library can do.
const FEATURED_ICONS: string[] = [
  'material-symbols:star',
  'material-symbols:favorite',
  'material-symbols:bolt',
  'material-symbols:check-circle',
  'material-symbols:rocket-launch',
  'material-symbols:auto-awesome',
  'lucide:sparkles',
  'lucide:flame',
  'lucide:zap',
  'lucide:gift',
  'lucide:trending-up',
  'lucide:tag',
  'ph:fire-fill',
  'ph:lightning-fill',
  'ph:heart-fill',
  'ph:crown-fill',
  'noto:sparkles',
  'noto:rocket',
  'noto:fire',
  'noto:party-popper',
  'twemoji:hundred-points',
  'twemoji:check-mark-button',
  'logos:google-icon',
  'flat-color-icons:like',
];

// ----------------------------------------------------------------------------
// SVG fetch + IDB cache
// ----------------------------------------------------------------------------

const svgKey = (iconId: string) => `${SVG_CACHE_PREFIX}${iconId}`;

/**
 * Fetch the raw SVG body for an icon, hitting the IDB cache first.
 *
 * Iconify SVGs use `currentColor` for their fill/stroke (we don't pass a
 * &color= param so they stay tintable later). The result is cached forever
 * by iconId — color is applied at decode time.
 */
const fetchSvgRaw = async (iconId: string): Promise<string | null> => {
  const cached = await get<string>(svgKey(iconId));
  if (cached) return cached;

  try {
    const res = await fetch(`${ICONIFY_API}/${iconId}.svg`);
    if (!res.ok) return null;
    const svg = await res.text();
    await set(svgKey(iconId), svg);
    return svg;
  } catch {
    return null;
  }
};

// ----------------------------------------------------------------------------
// In-memory decoded-Image cache (keyed by `${iconId}|${color}`)
// ----------------------------------------------------------------------------

const imageCache = new Map<string, HTMLImageElement>();
const pendingDecodes = new Map<string, Promise<HTMLImageElement | null>>();

const cacheKey = (iconId: string, color: string) => `${iconId}|${color.toLowerCase()}`;

/**
 * Synchronous lookup for the renderer. Returns the decoded Image if it's
 * ready in the in-memory cache, else null. drawBannerFrame uses this in its
 * tight loop — must not be async.
 */
export const getIconImageSync = (
  iconId: string,
  color: string
): HTMLImageElement | null => imageCache.get(cacheKey(iconId, color)) ?? null;

/**
 * Coloriize the SVG, build a data URL, decode an Image, cache it.
 * Returns null if fetch/decode fails (renderer falls back to a placeholder).
 */
const decodeIconImage = async (
  iconId: string,
  color: string
): Promise<HTMLImageElement | null> => {
  const key = cacheKey(iconId, color);
  const existing = imageCache.get(key);
  if (existing) return existing;
  const pending = pendingDecodes.get(key);
  if (pending) return pending;

  const decodePromise = (async () => {
    const rawSvg = await fetchSvgRaw(iconId);
    if (!rawSvg) return null;
    // Replace currentColor with the user's color. Iconify SVGs use
    // currentColor for fill/stroke when no color param was passed.
    const colored = rawSvg.replace(/currentColor/g, color);
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(colored)}`;
    const img = new Image();
    img.src = dataUrl;
    try {
      await img.decode();
    } catch {
      return null;
    }
    imageCache.set(key, img);
    return img;
  })();

  pendingDecodes.set(key, decodePromise);
  const result = await decodePromise;
  pendingDecodes.delete(key);
  return result;
};

/**
 * Pre-decode a batch of (iconId, color) combos. Used by PreviewArea before
 * rendering to ensure the next frame has all icons ready.
 *
 * Idempotent: combos already in cache are skipped, in-flight decodes are
 * awaited rather than re-issued.
 */
export const preloadIcons = async (
  needs: { iconId: string; color: string }[]
): Promise<void> => {
  if (needs.length === 0) return;
  await Promise.all(needs.map((n) => decodeIconImage(n.iconId, n.color)));
};

// ----------------------------------------------------------------------------
// Token parsing
//
// The text content can contain inline icon tokens like:
//   {{icon:material-symbols:home}}
//
// These are parsed into segments alongside text. The icon ID inside the
// token uses the standard Iconify format `prefix:name`.
// ----------------------------------------------------------------------------

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'icon'; iconId: string };

const TOKEN_REGEX = /\{\{icon:([a-zA-Z0-9_:-]+)\}\}/g;

export const parseSegments = (text: string): Segment[] => {
  const segments: Segment[] = [];
  let lastIndex = 0;
  TOKEN_REGEX.lastIndex = 0;

  for (let match = TOKEN_REGEX.exec(text); match !== null; match = TOKEN_REGEX.exec(text)) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'icon', iconId: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  // Empty input → single empty-text segment so the caller can still measure.
  if (segments.length === 0) segments.push({ type: 'text', value: '' });
  return segments;
};

/** Unique Iconify IDs referenced anywhere in the text. */
export const uniqueIconIds = (text: string): string[] => {
  const ids = new Set<string>();
  TOKEN_REGEX.lastIndex = 0;
  for (let m = TOKEN_REGEX.exec(text); m !== null; m = TOKEN_REGEX.exec(text)) {
    ids.add(m[1]);
  }
  return [...ids];
};

/** Build the canonical token string for an icon ID. */
export const buildIconToken = (iconId: string) => `{{icon:${iconId}}}`;
