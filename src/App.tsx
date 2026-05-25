import React, { useEffect, useState } from 'react';
import ConfigPanel from './components/ConfigPanel';
import PreviewArea from './components/PreviewArea';
import { BannerConfig, DEFAULT_CONFIG } from './types';
import { CustomFont, loadAllCustomFonts } from './utils/customFonts';

const App: React.FC = () => {
  const [config, setConfig] = useState<BannerConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);

  // Hydrate custom fonts from IndexedDB on mount. Not awaited at render-time —
  // app boots immediately and fonts join document.fonts asynchronously; the
  // canvas picks them up on the next animation frame after each one loads.
  useEffect(() => {
    loadAllCustomFonts().then(setCustomFonts);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden font-sans bg-[#0F172A]">
      <div className="w-full md:w-[360px] flex-shrink-0 max-h-[45vh] md:max-h-none md:h-full relative z-30 overflow-auto md:overflow-hidden">
        <ConfigPanel
          config={config}
          onChange={setConfig}
          isGenerating={isGenerating}
          customFonts={customFonts}
          onCustomFontsChange={setCustomFonts}
        />
      </div>

      <div className="flex-1 min-h-0 relative z-10 flex flex-col min-w-0 bg-[#F1F5F9]">
        <PreviewArea
          config={config}
          onChange={setConfig}
          setGenerating={setIsGenerating}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
};

export default App;
