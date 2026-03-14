import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LongShortRatioChartProps {
  data: any[];
}

const LongShortRatioChart: React.FC<LongShortRatioChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2226" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis stroke="#848E9C" fontSize={10} domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#161A1E', border: '1px solid #1F2226', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="topTrader" 
            name="Top Traders" 
            stroke="#2196F3" 
            dot={false} 
            strokeWidth={2} 
          />
          <Line 
            type="monotone" 
            dataKey="retail" 
            name="Retail" 
            stroke="#9C27B0" 
            dot={false} 
            strokeWidth={2} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LongShortRatioChart;
