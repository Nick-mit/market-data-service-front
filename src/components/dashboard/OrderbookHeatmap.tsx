import React, { useEffect, useRef } from 'react';
import { translations, Language } from '../../translations';

interface OrderbookHeatmapProps {
  data: {
    time: number;
    levels: { price: number; intensity: number }[];
  }[];
  language?: Language;
}

const OrderbookHeatmap: React.FC<OrderbookHeatmapProps> = ({ data, language = 'en' }) => {
  const t = translations[language];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const timeSteps = data.length;
    const priceLevels = data[0].levels.length;

    const cellWidth = width / timeSteps;
    const cellHeight = height / priceLevels;

    data.forEach((step, tIndex) => {
      step.levels.forEach((level, pIndex) => {
        // Invert pIndex to have higher prices at the top
        const y = height - (pIndex + 1) * cellHeight;
        const x = tIndex * cellWidth;

        // Color based on intensity (0 to 1)
        // We'll use a blue-purple-red scale
        const intensity = level.intensity;
        let color;
        if (intensity < 0.3) {
          color = `rgba(33, 150, 243, ${intensity * 2})`; // Blue
        } else if (intensity < 0.7) {
          color = `rgba(156, 39, 176, ${intensity})`; // Purple
        } else {
          color = `rgba(239, 83, 80, ${intensity})`; // Red
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      });
    });

    // Draw some price labels
    ctx.fillStyle = '#848E9C';
    ctx.font = '8px sans-serif';
    const labelStep = Math.floor(priceLevels / 4);
    for (let i = 0; i < priceLevels; i += labelStep) {
      const y = height - (i + 0.5) * cellHeight;
      const price = data[0].levels[i].price;
      ctx.fillText(`$${price.toFixed(0)}`, 5, y);
    }

  }, [data]);

  return (
    <div className="w-full h-full relative">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={256} 
        className="w-full h-full rounded-xl"
      />
      <div className="absolute bottom-2 right-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-[8px] text-[#848E9C] uppercase">{t.lowDepth}</span>
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-[8px] text-[#848E9C] uppercase">{t.highDepth}</span>
      </div>
    </div>
  );
};

export default OrderbookHeatmap;
