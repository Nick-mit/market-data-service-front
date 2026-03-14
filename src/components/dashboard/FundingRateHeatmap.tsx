import React from 'react';

interface FundingRateHeatmapProps {
  data: {
    coins: string[];
    times: string[];
    data: { coin: string; values: string[] }[];
  };
}

const FundingRateHeatmap: React.FC<FundingRateHeatmapProps> = ({ data }) => {
  const getColor = (val: string) => {
    const num = parseFloat(val);
    if (num > 0.01) return 'bg-red-500';
    if (num > 0.005) return 'bg-red-500/60';
    if (num > 0) return 'bg-red-500/20';
    if (num < -0.01) return 'bg-emerald-500';
    if (num < -0.005) return 'bg-emerald-500/60';
    return 'bg-emerald-500/20';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-[10px] uppercase text-[#848E9C] border border-[#1F2226]">Asset</th>
            {data.times.map(t => (
              <th key={t} className="p-2 text-center text-[10px] uppercase text-[#848E9C] border border-[#1F2226] min-w-[40px]">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.data.map(row => (
            <tr key={row.coin}>
              <td className="p-2 text-xs font-bold text-white border border-[#1F2226] bg-[#0B0E11]">
                {row.coin}
              </td>
              {row.values.map((val, i) => (
                <td 
                  key={i} 
                  className={`p-2 border border-[#1F2226] text-[10px] text-center transition-all hover:scale-110 cursor-help ${getColor(val)}`}
                  title={`${row.coin}: ${val}%`}
                >
                  <span className="opacity-0 hover:opacity-100 font-bold">{val}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FundingRateHeatmap;
