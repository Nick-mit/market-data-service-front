import React from 'react';
import { translations, Language } from '../../translations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SectorData {
  name: string;
  value: number;
  color: string;
}

interface SectorHeatmapProps {
  language?: Language;
}

const SectorHeatmap: React.FC<SectorHeatmapProps> = ({ language = 'en' }) => {
  const t = translations[language];

  const data: SectorData[] = [
    { name: language === 'en' ? 'Liquor' : '白酒', value: 25, color: '#EF4444' },
    { name: language === 'en' ? 'New Energy' : '新能源', value: 20, color: '#10B981' },
    { name: language === 'en' ? 'Semiconductor' : '半导体', value: 15, color: '#3B82F6' },
    { name: language === 'en' ? 'Banking' : '银行', value: 15, color: '#F59E0B' },
    { name: language === 'en' ? 'AI/Tech' : '人工智能', value: 10, color: '#8B5CF6' },
    { name: language === 'en' ? 'Others' : '其他', value: 15, color: '#474D57' },
  ];

  return (
    <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl p-6 shadow-xl h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-white">
          {language === 'en' ? 'Sector Rotation (24H)' : '行业板块轮动 (24H)'}
        </h3>
        <span className="text-[10px] text-[#848E9C] uppercase tracking-wider">Market Breadth</span>
      </div>
      
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#161A1E', border: '1px solid #1F2226', borderRadius: '8px', fontSize: '10px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              verticalAlign="bottom" 
              align="center" 
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-3">
        {data.slice(0, 3).map((sector, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
              <span className="text-xs text-[#848E9C]">{sector.name}</span>
            </div>
            <span className={`text-xs font-bold ${i === 1 ? 'text-emerald-500' : 'text-red-500'}`}>
              {i === 1 ? '+' : '-'}{(Math.random() * 3).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectorHeatmap;
