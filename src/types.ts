export interface BannerConfig {
  text: string;
  width: number;
  height: number;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  frameDuration: number; // ms
  numFrames: number;
  spacing: number; // Space between repeated text
}

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

export const FONT_WEIGHTS = [
  { name: 'Light', value: '300' },
  { name: 'Normal', value: '400' },
  { name: 'Medium', value: '500' },
  { name: 'Bold', value: '700' },
  { name: 'Extra Bold', value: '900' },
];