// ============================================================================
// Background fills
// ============================================================================

export type BackgroundType = 'solid' | 'gradient';
export type GradientType = 'linear' | 'radial';

export interface GradientStop {
  color: string;
  position: number; // 0..1
}

// ============================================================================
// Texture overlays
// ============================================================================

export type TextureType =
  | 'none'
  | 'stripes'
  | 'dots'
  | 'grid'
  | 'checker'
  | 'noise'
  | 'crosshatch'
  | 'plus'
  | 'triangles';

export interface TextureOptions {
  type: TextureType;
  color: string;
  opacity: number; // 0..1
  scale: number;   // tile/feature size in pixels (8..64 typical)
  angle: number;   // degrees (used by stripes / grid)
}

// ============================================================================
// Banner shape (outline of the canvas itself)
// ============================================================================

export type BannerShape =
  | 'rectangle'
  | 'rounded'
  | 'pill'
  | 'wave'
  | 'zigzag'
  | 'ribbon'
  | 'parallelogram'
  | 'arrow'
  | 'tag';

export type EdgeSides = 'both' | 'top' | 'bottom';

export interface ShapeOptions {
  cornerRadius: number;     // rounded
  edgeAmplitude: number;    // wave / zigzag  (peak height in pixels)
  edgeFrequency: number;    // wave / zigzag  (number of peaks across width)
  notchDepth: number;       // ribbon  (depth of V-cut at each end, px)
  edgeSides: EdgeSides;     // wave / zigzag — which edges to apply to
  slantAmount: number;      // parallelogram (degree of slant, px)
  arrowHead: number;        // arrow (depth of the chevron tip, px)
  tagHoleRadius: number;    // tag (radius of the punch hole, px)
}

// ============================================================================
// Main banner config
// ============================================================================

export interface BannerConfig {
  text: string;
  width: number;
  height: number;

  // Background
  bgType: BackgroundType;
  bgColor: string;                 // used when bgType === 'solid'
  gradientType: GradientType;
  gradientAngle: number;           // 0–360 degrees; 90 = left→right
  gradientStops: GradientStop[];   // 2–4 stops, sorted by position

  // Texture overlay (sits above the background, below the text)
  texture: TextureOptions;

  // Text
  textColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';

  // Text stroke
  strokeColor: string;
  strokeWidth: number;             // 0 disables

  // Drop shadow
  shadowEnabled: boolean;          // explicit on/off
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Shape of the banner outline
  shape: BannerShape;
  shapeOptions: ShapeOptions;
  outsideColor: string;            // color of pixels OUTSIDE the shape
  outsideTransparent: boolean;     // if true, render as GIF transparent

  // Text layout
  repeatText: boolean;                          // false = single text, aligned; true = scrolling marquee
  textAlign: 'left' | 'center' | 'right';       // used when repeatText === false
  textOffsetX: number;                          // fine-tune px offset from the aligned position

  // Per-icon settings, keyed by Iconify icon ID (e.g. "material-symbols:home").
  // Shared by every instance of the same icon in the banner.
  iconSettings: Record<string, IconSettings>;

  // Animation
  frameDuration: number;           // ms per frame
  numFrames: number;
  spacing: number;                 // spaces between repeated text (used only when repeatText is true)

  // Output format — 'gif' is animated, 'png' & 'webp' are static single-frame
  outputFormat: OutputFormat;
}

export type OutputFormat = 'gif' | 'jpeg' | 'png' | 'webp';
export type OutputMode = 'animated' | 'static';

// ----------------------------------------------------------------------------
// Icon settings — applied per iconId (shared across all instances)
// ----------------------------------------------------------------------------

export interface IconSettings {
  color: string;                // hex like '#4F6FF5' OR the literal 'inherit' to use textColor
  sizePercent: number;          // 100 = match fontSize. range 50..300 in UI.
  paddingPx: number;            // horizontal breathing room on each side
  verticalOffsetPx: number;     // nudge up (negative) / down (positive) from the middle-aligned baseline
}

export const DEFAULT_ICON_SETTINGS: IconSettings = {
  color: 'inherit',
  sizePercent: 100,
  paddingPx: 4,
  verticalOffsetPx: 0,
};

// The static formats. Order matters — first is the default when switching to
// static, and it's the leftmost button in the sub-toggle. PNG comes first
// because it's the most common pick (supports transparency, lossless).
export const STATIC_FORMATS: OutputFormat[] = ['png', 'jpeg', 'webp'];

// ============================================================================
// Brand constants
// ============================================================================

export const ARCADY_BLUE = '#4F6FF5';
export const ARCADY_BLUE_DEEP = '#3D52C7';

// ============================================================================
// Default config (used by App.tsx for initial state)
// ============================================================================

export const DEFAULT_CONFIG: BannerConfig = {
  text: 'YOUR TEXT HERE',
  width: 700,
  height: 50,

  bgType: 'solid',
  bgColor: ARCADY_BLUE,
  gradientType: 'linear',
  gradientAngle: 90,
  gradientStops: [
    { color: ARCADY_BLUE, position: 0 },
    { color: ARCADY_BLUE_DEEP, position: 1 },
  ],

  texture: {
    type: 'none',
    color: '#FFFFFF',
    opacity: 0.15,
    scale: 12,
    angle: 45,
  },

  textColor: '#FFFFFF',
  fontFamily: 'Inter',
  fontSize: 32,
  fontWeight: '700',
  fontStyle: 'normal',

  strokeColor: '#000000',
  strokeWidth: 0,

  shadowEnabled: false,
  shadowColor: '#000000',
  shadowBlur: 6,
  shadowOffsetX: 0,
  shadowOffsetY: 2,

  shape: 'rectangle',
  shapeOptions: {
    cornerRadius: 8,
    edgeAmplitude: 6,
    edgeFrequency: 12,
    notchDepth: 12,
    edgeSides: 'both',
    slantAmount: 20,
    arrowHead: 24,
    tagHoleRadius: 6,
  },
  outsideColor: '#F1F5F9',
  outsideTransparent: true,

  repeatText: true,
  textAlign: 'center',
  textOffsetX: 0,

  iconSettings: {},

  frameDuration: 100,
  numFrames: 20,
  spacing: 6,

  outputFormat: 'gif',
};

// ============================================================================
// Font catalog
// ============================================================================

export const FONTS = [
  // Sans Serif / Clean
  { name: 'Inter (Default)', value: 'Inter' },
  { name: 'Outfit', value: 'Outfit' },
  { name: 'Sora', value: 'Sora' },
  { name: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Raleway', value: 'Raleway' },
  { name: 'Work Sans', value: 'Work Sans' },
  { name: 'Space Grotesk', value: 'Space Grotesk' },
  { name: 'Lexend', value: 'Lexend' },
  { name: 'Nunito', value: 'Nunito' },
  { name: 'Ubuntu', value: 'Ubuntu' },
  { name: 'Rubik', value: 'Rubik' },
  { name: 'Exo 2', value: 'Exo 2' },
  { name: 'Comfortaa', value: 'Comfortaa' },

  // Serif / Elegant
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Merriweather', value: 'Merriweather' },
  { name: 'Cinzel', value: 'Cinzel' },
  { name: 'Cormorant Garamond', value: 'Cormorant Garamond' },
  { name: 'EB Garamond', value: 'EB Garamond' },
  { name: 'Lora', value: 'Lora' },
  { name: 'Abril Fatface', value: 'Abril Fatface' },
  { name: 'DM Serif Display', value: 'DM Serif Display' },

  // Display / Bold / Impact
  { name: 'Oswald', value: 'Oswald' },
  { name: 'Bebas Neue', value: 'Bebas Neue' },
  { name: 'Anton', value: 'Anton' },
  { name: 'Russo One', value: 'Russo One' },
  { name: 'Kanit', value: 'Kanit' },
  { name: 'Syncopate', value: 'Syncopate' },
  { name: 'Unbounded', value: 'Unbounded' },
  { name: 'Clash Display', value: 'Clash Display' },
  { name: 'Black Ops One', value: 'Black Ops One' },
  { name: 'Alfa Slab One', value: 'Alfa Slab One' },
  { name: 'Luckiest Guy', value: 'Luckiest Guy' },
  { name: 'Bangers', value: 'Bangers' },
  { name: 'Fredoka One', value: 'Fredoka One' },

  // Retro / Sci-Fi / Tech
  { name: 'Righteous', value: 'Righteous' },
  { name: 'Audiowide', value: 'Audiowide' },
  { name: 'Orbitron', value: 'Orbitron' },
  { name: 'Space Mono', value: 'Space Mono' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono' },
  { name: 'Monoton', value: 'Monoton' },
  { name: 'Press Start 2P', value: 'Press Start 2P' },
  { name: 'Silkscreen', value: 'Silkscreen' },

  // Script / Handwriting
  { name: 'Pacifico', value: 'Pacifico' },
  { name: 'Lobster', value: 'Lobster' },
  { name: 'Dancing Script', value: 'Dancing Script' },
  { name: 'Great Vibes', value: 'Great Vibes' },
  { name: 'Sacramento', value: 'Sacramento' },
  { name: 'Kaushan Script', value: 'Kaushan Script' },
  { name: 'Permanent Marker', value: 'Permanent Marker' },
  { name: 'Amatic SC', value: 'Amatic SC' },
  { name: 'Caveat', value: 'Caveat' },
  { name: 'Shadows Into Light', value: 'Shadows Into Light' },

  { name: 'Monospace', value: 'monospace' },
];

// "Type" = weight + style. Picker for built-in fonts uses these defaults;
// custom-imported Google fonts expose only the variants they actually have.
export interface FontType {
  name: string;
  weight: string;
  style: 'normal' | 'italic';
}

export const FONT_TYPES: FontType[] = [
  { name: 'Light',       weight: '300', style: 'normal' },
  { name: 'Regular',     weight: '400', style: 'normal' },
  { name: 'Medium',      weight: '500', style: 'normal' },
  { name: 'Bold',        weight: '700', style: 'normal' },
  { name: 'Extra Bold',  weight: '900', style: 'normal' },
  { name: 'Italic',      weight: '400', style: 'italic' },
  { name: 'Bold Italic', weight: '700', style: 'italic' },
];

// Backwards-compat alias for any old imports.
export const FONT_WEIGHTS = FONT_TYPES;

// ============================================================================
// UI catalogs (for shape/texture pickers)
// ============================================================================

export const SHAPE_OPTIONS: { value: BannerShape; label: string; hint: string }[] = [
  { value: 'rectangle',     label: 'Rectangle', hint: 'Classic flat-edge banner' },
  { value: 'rounded',       label: 'Rounded',   hint: 'Soft corners' },
  { value: 'pill',          label: 'Pill',      hint: 'Fully rounded ends' },
  { value: 'wave',          label: 'Wave',      hint: 'Smooth wavy edges' },
  { value: 'zigzag',        label: 'Zigzag',    hint: 'Sawtooth edges' },
  { value: 'ribbon',        label: 'Ribbon',    hint: 'Notched V-cut ends' },
  { value: 'parallelogram', label: 'Slant',     hint: 'Slanted parallelogram' },
  { value: 'arrow',         label: 'Arrow',     hint: 'Pointing right with chevron tip' },
  { value: 'tag',           label: 'Tag',       hint: 'Price-tag with hole punch' },
];

export const TEXTURE_OPTIONS: { value: TextureType; label: string }[] = [
  { value: 'none',       label: 'None' },
  { value: 'stripes',    label: 'Stripes' },
  { value: 'dots',       label: 'Dots' },
  { value: 'grid',       label: 'Grid' },
  { value: 'checker',    label: 'Checker' },
  { value: 'crosshatch', label: 'Hatch' },
  { value: 'plus',       label: 'Plus' },
  { value: 'triangles',  label: 'Tri' },
  { value: 'noise',      label: 'Noise' },
];
