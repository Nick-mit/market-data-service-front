import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { translations, Language } from '../../translations';

interface LiquidationMapProps {
  data: any[];
  language?: Language;
}

const LiquidationMap: React.FC<LiquidationMapProps> = ({ data, language = 'en' }) => {
  const t = translations[language];
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#848E9C] text-sm">
        {t.loading || 'No liquidation data available'}
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      {isMounted && (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2226" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="price"
            type="number"
            orientation="left"
            stroke="#848E9C"
            fontSize={10}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#161A1E', border: '1px solid #1F2226', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
            formatter={(value: any) => [`$${value.toFixed(2)}M`, t.liquidation]}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.type === 'short' ? '#ef5350' : '#26a69a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
};

export default LiquidationMap;
