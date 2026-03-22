import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { translations, Language } from '../../translations';

interface LongShortRatioChartProps {
  data: any[];
  language?: Language;
}

const LongShortRatioChart: React.FC<LongShortRatioChartProps> = ({ data, language = 'en' }) => {
  const t = translations[language];
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Wait for next tick to ensure container has dimensions
    const timer = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#848E9C] text-sm">
        {t.loading || 'Loading data...'}
      </div>
    );
  }

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  };

  return (
    <div className="w-full h-64">
      {isMounted && (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2226" vertical={false} />
          <XAxis dataKey="time" tickFormatter={formatTime} stroke="#848E9C" fontSize={10} />
          <YAxis stroke="#848E9C" fontSize={10} domain={[0.9, 1.1]} />
          <ReferenceLine y={1} stroke="#848E9C" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ backgroundColor: '#161A1E', border: '1px solid #1F2226', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
            labelFormatter={(label) => formatTime(Number(label))}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          <Line
            type="monotone"
            dataKey="topTrader"
            name={t.topTraders || 'Top Traders'}
            stroke="#2196F3"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="retail"
            name={t.retail || 'Retail'}
            stroke="#9C27B0"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
      )}
    </div>
  );
};

export default LongShortRatioChart;
