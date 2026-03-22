import React from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { translations, Language } from '../../translations';
import { TrendingUp, TrendingDown, Info, Database } from 'lucide-react';

interface SmartMoneyData {
  date: string;
  index: number;
  inflow: number;
}

interface SmartMoneyTrackerProps {
  data: SmartMoneyData[];
  language?: Language;
}

const SmartMoneyTracker: React.FC<SmartMoneyTrackerProps> = ({ data, language = 'en' }) => {
  const t = translations[language];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161A1E] border border-[#1F2226] p-3 rounded-lg shadow-xl">
          <p className="text-[10px] text-[#848E9C] mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-white font-medium">{t.indexPrice}:</span>
              <span className="text-[10px] text-blue-400 font-bold">{payload[0].value.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-white font-medium">{t.netInflow}:</span>
              <span className={`text-[10px] font-bold ${payload[1].value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {payload[1].value > 0 ? '+' : ''}{payload[1].value.toLocaleString()}M
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const latestData = data[data.length - 1];
  const isPositiveSignal = latestData?.inflow > 0;

  return (
    <div className="space-y-6">
      {/* Signal Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0B0E11] border border-[#1F2226] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#848E9C] uppercase font-bold mb-1">{t.smartMoneySignal}</p>
            <div className={`flex items-center gap-2 ${isPositiveSignal ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositiveSignal ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="text-lg font-bold">{isPositiveSignal ? t.bullishBias : t.bearishBias}</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPositiveSignal ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Info size={20} className={isPositiveSignal ? 'text-emerald-500' : 'text-red-500'} />
          </div>
        </div>

        <div className="bg-[#0B0E11] border border-[#1F2226] rounded-xl p-4">
          <p className="text-[10px] text-[#848E9C] uppercase font-bold mb-1">{t.northboundFunds} (24H)</p>
          <div className="flex items-end gap-2">
            <span className={`text-xl font-bold ${latestData?.inflow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {latestData?.inflow > 0 ? '+' : ''}{latestData?.inflow.toLocaleString()}M
            </span>
            <span className="text-[10px] text-[#474D57] mb-1">CNY</span>
          </div>
        </div>

        <div className="bg-[#0B0E11] border border-[#1F2226] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Database size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-[#848E9C] uppercase font-bold">Data Source</p>
            <p className="text-xs font-bold text-white">Tushare Pro API</p>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-[#0B0E11] border border-[#1F2226] rounded-xl p-4 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2226" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#474D57" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#848E9C' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#474D57" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              domain={['auto', 'auto']}
              tick={{ fill: '#848E9C' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#474D57" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#848E9C' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }}
            />
            <Bar 
              yAxisId="right"
              dataKey="inflow" 
              name={t.netInflow}
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.inflow >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.6} />
              ))}
            </Bar>
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="index" 
              name={t.indexPrice}
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#3B82F6', strokeWidth: 2, fill: '#0B0E11' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Insight Footer */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-500 mt-0.5" />
          <p className="text-xs text-[#848E9C] leading-relaxed">
            {language === 'en' 
              ? 'Institutional "Smart Money" tracking identifies significant capital movements before major market shifts. Consistent net inflows often precede bullish trends in the Shanghai Composite Index.'
              : '机构“聪明钱”追踪可在重大市场转变前识别出显著的资金动向。持续的净流入通常预示着上证指数的看涨趋势。'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmartMoneyTracker;
