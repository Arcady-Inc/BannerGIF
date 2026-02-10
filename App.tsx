import React, { useState } from 'react';
import ConfigPanel from './components/ConfigPanel';
import PreviewArea from './components/PreviewArea';
import { BannerConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<BannerConfig>({
    text: "GALENTINE'S DAY SALE",
    width: 700,
    height: 50,
    bgColor: "#C2185B",
    textColor: "#FFFFFF",
    fontFamily: "Open Sans",
    fontSize: 32,
    fontWeight: "400",
    frameDuration: 100,
    numFrames: 20,
    spacing: 6,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      {/* Left Sidebar: Fixed Width */}
      <div className="w-[380px] flex-shrink-0 h-full relative z-30">
        <ConfigPanel 
          config={config} 
          onChange={setConfig} 
          isGenerating={isGenerating} 
        />
      </div>

      {/* Right Content: Fluid */}
      <div className="flex-1 h-full relative z-10 flex flex-col min-w-0">
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