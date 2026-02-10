import React, { useState } from 'react';
import ConfigPanel from './components/ConfigPanel';
import PreviewArea from './components/PreviewArea';
import { BannerConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<BannerConfig>({
    text: "YOUR TEXT HERE",
    width: 700,
    height: 50,
    bgColor: "#C2185B",
    textColor: "#FFFFFF",
    fontFamily: "Inter",
    fontSize: 32,
    fontWeight: "400",
    frameDuration: 100,
    numFrames: 20,
    spacing: 6,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden font-sans bg-[#0F172A]">
      {/* Left Sidebar: Fixed Width on desktop, collapsible on mobile */}
      <div className="w-full md:w-[340px] flex-shrink-0 max-h-[45vh] md:max-h-none md:h-full relative z-30 overflow-auto md:overflow-hidden">
        <ConfigPanel
          config={config}
          onChange={setConfig}
          isGenerating={isGenerating}
        />
      </div>

      {/* Right Content: Fluid */}
      <div className="flex-1 min-h-0 relative z-10 flex flex-col min-w-0 bg-[#F1F5F9]">
        <PreviewArea
          config={config}
          setGenerating={setIsGenerating}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
};

export default App;