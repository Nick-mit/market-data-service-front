import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { translations, Language } from '../../translations';

interface FearGreedGaugeProps {
  value: number;
  language?: Language;
}

const FearGreedGauge: React.FC<FearGreedGaugeProps> = ({ value, language = 'en' }) => {
  const t = translations[language];

  const data = [
    { name: t.fear, value: 25, color: '#ef5350' },
    { name: t.neutral, value: 25, color: '#ff9800' },
    { name: t.greed, value: 25, color: '#8bc34a' },
    { name: t.extremeGreed, value: 25, color: '#26a69a' },
  ];

  const needleData = [
    { value: value },
    { value: 100 - value },
  ];

  return (
    <div className="relative w-full h-48 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} opacity={0.3} />
            ))}
          </Pie>
          <Pie
            data={needleData}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius="0%"
            outerRadius="85%"
            dataKey="value"
            stroke="none"
          >
            <Cell fill="transparent" />
            <Cell fill="transparent" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Needle Overlay */}
      <div 
        className="absolute bottom-[20%] left-1/2 w-1 h-24 bg-white origin-bottom rounded-full transition-transform duration-1000 ease-out"
        style={{ transform: `translateX(-50%) rotate(${ (value / 100) * 180 - 90 }deg)` }}
      />
      <div className="absolute bottom-[20%] left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 translate-y-1/2 border-4 border-[#161A1E]" />
      
      <div className="absolute bottom-4 flex flex-col items-center">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-xs uppercase tracking-widest text-[#848E9C]">
          {value < 25 ? t.extremeFear : value < 50 ? t.fear : value < 75 ? t.greed : t.extremeGreed}
        </span>
      </div>
    </div>
  );
};

export default FearGreedGauge;
