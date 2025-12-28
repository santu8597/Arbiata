'use client';

import { useEffect, useState } from 'react';
import MetallicPaint from './MettalicPaint';

const MetallicLogo = ({ className = "", size = "large" }: { className?: string; size?: "small" | "medium" | "large" }) => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const createTextImage = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      const isSmall = size === "small";
      const isMedium = size === "medium";
      canvas.width = isSmall ? 300 : isMedium ? 600 : 1000;
      canvas.height = isSmall ? 75 : isMedium ? 150 : 400;
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set up text style with a cursive-style font
      ctx.fillStyle = 'black';
      const fontSize = isSmall ? 45 : isMedium ? 90 : 250;
      ctx.font = `italic bold ${fontSize}px "Times New Roman", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add some curves to make it more cursive-like
      ctx.save();
      ctx.transform(1, 0, -0.15, 1, 0, 0); // Slight italic slant
      
      // Draw "Arbiata" text
      const xPos = isSmall ? 170 : isMedium ? 340 : 550;
      const yPos = isSmall ? 37.5 : isMedium ? 75 : 200;
      ctx.fillText('Arbiata', xPos, yPos); // Offset for transform
      
      ctx.restore();
      
      // Get image data
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setImageData(imgData);
      setIsLoading(false);
    };

    createTextImage();
  }, []);

  const metallicParams = {
    patternScale: 2.2,
    refraction: 0.025,
    edge: 1.1,
    patternBlur: 0.006,
    liquid: 0.08,
    speed: 0.10
  };

  if (isLoading || !imageData) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-6xl md:text-9xl font-black text-gradient-cyber border-white">
          <span className="relative text-10xl ">Arbiata</span>
        </div>
      </div>
    );
  }

  const containerSize = size === "small" 
    ? "w-[120px] h-[30px]" 
    : size === "medium"
    ? "w-[240px] h-[60px]"
    : "w-[500px] h-[200px] md:w-[800px] md:h-[320px]";

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${containerSize} relative`}>
        <MetallicPaint imageData={imageData} params={metallicParams} />
      </div>
    </div>
  );
};

export default MetallicLogo;