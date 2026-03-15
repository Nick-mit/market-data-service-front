import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { translations, Language } from '../../translations';

interface CycleIndicator {
  name: string;
  value: number;
  yesterday: number;
  status: string;
  color: string;
}

interface CycleIndicatorCardsProps {
  indicators: CycleIndicator[];
  language?: Language;
}

const CycleIndicatorCards: React.FC<CycleIndicatorCardsProps> = ({ indicators, language = 'en' }) => {
  const t = translations[language];

  const getStatusTranslation = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'invest') return t.invest;
    if (s === 'accumulate') return t.accumulate;
    if (s === 'neutral') return t.neutral_status;
    if (s === 'buy') return t.buy;
    return status;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {indicators.map((ind) => {
        const diff = ind.value - ind.yesterday;
        const isUp = diff > 0;
        
        return (
          <div key={ind.name} className="bg-[#161A1E] border border-[#1F2226] rounded-xl p-4 shadow-lg hover:border-[#474D57] transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#848E9C] uppercase tracking-wider">{ind.name}</span>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                ind.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                ind.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                'bg-gray-500/10 text-gray-500'
              }`}>
                {getStatusTranslation(ind.status)}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold text-white">{ind.value.toFixed(2)}</span>
              <div className={`flex items-center text-[10px] mb-1 ${isUp ? 'text-emerald-500' : 'text-[#ef5350]'}`}>
                {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(diff).toFixed(2)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CycleIndicatorCards;
