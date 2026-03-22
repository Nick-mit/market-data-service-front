import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { translations, Language } from '../../translations';

// 后端返回的数据格式:
// {
//   ts: number,        // 时间戳（13位毫秒）
//   h1net: number,     // 1小时净资金流入
//   ...
// }

interface CapitalFlowItem {
  ts: number;
  h1net: number;
  [key: string]: any;
}

interface CapitalFlowChartProps {
  data: CapitalFlowItem[];
  language?: Language;
}

const CapitalFlowChart: React.FC<CapitalFlowChartProps> = ({ data, language = 'en' }) => {
  const t = translations[language];
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-[#848E9C] text-sm">
        {t.loading || 'Loading data...'}
      </div>
    );
  }

  // Transform data for chart - map ts to begin, h1net to netFlow
  const chartData = data.map(item => ({
    begin: item.ts,
    netFlow: item.h1net
  })).reverse();

  // 格式化数值显示
  const formatValue = (val: number) => {
    if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(2)}K`;
    return val.toFixed(2);
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  };

  return (
    <div className="w-full h-64">
      {isMounted && (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2226" vertical={false} />
          <XAxis
            dataKey="begin"
            tickFormatter={formatTime}
            stroke="#848E9C"
            fontSize={10}
            interval="preserveStartEnd"
          />
          <YAxis
            orientation="left"
            stroke="#848E9C"
            fontSize={10}
            tickFormatter={formatValue}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#161A1E', border: '1px solid #1F2226', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
            labelFormatter={(label) => formatTime(Number(label))}
            formatter={(value: number) => [formatValue(value), t.capitalFlow || 'Net Flow']}
          />
          <Bar
            dataKey="netFlow"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.netFlow >= 0 ? '#26a69a' : '#ef5350'}
                opacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
};

export default CapitalFlowChart;
