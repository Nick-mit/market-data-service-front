import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Cell } from 'recharts';

interface CapitalFlowChartProps {
  data: any[];
}

const CapitalFlowChart: React.FC<CapitalFlowChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2226" vertical={false} />
          <XAxis 
            dataKey="time" 
            hide 
          />
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            stroke="#848E9C" 
            fontSize={10}
            tickFormatter={(val) => `${val}M`}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#26a69a" 
            fontSize={10}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#161A1E', border: '1px solid #1F2226', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Bar 
            yAxisId="left" 
            dataKey="netFlow" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.netFlow >= 0 ? '#26a69a' : '#ef5350'} opacity={0.6} />
            ))}
          </Bar>
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="price" 
            stroke="#2196F3" 
            dot={false} 
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CapitalFlowChart;
