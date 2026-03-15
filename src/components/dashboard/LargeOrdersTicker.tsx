import React from 'react';
import { Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { translations, Language } from '../../translations';

interface LargeOrder {
  id: number;
  symbol: string;
  side: string;
  amount: string;
  time: string;
  price: string;
}

interface LargeOrdersTickerProps {
  orders: LargeOrder[];
  language?: Language;
}

const LargeOrdersTicker: React.FC<LargeOrdersTickerProps> = ({ orders, language = 'en' }) => {
  const t = translations[language];
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center justify-between p-3 bg-[#0B0E11] rounded-lg border border-[#1F2226] hover:border-[#474D57] transition-all">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-md ${order.side === 'BUY' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {order.side === 'BUY' ? 
                <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : 
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{order.symbol}</span>
                <span className={`text-[10px] font-bold px-1 rounded ${order.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                  {order.side === 'BUY' ? t.buy.toUpperCase() : t.sell.toUpperCase()}
                </span>
              </div>
              <div className="text-[10px] text-[#848E9C]">{order.time}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-white">{order.amount}</div>
            <div className="text-[10px] text-[#848E9C]">${order.price}</div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 text-[10px] text-emerald-500 animate-pulse">
          <Zap className="w-3 h-3" />
          <span>LIVE MONITORING ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default LargeOrdersTicker;
