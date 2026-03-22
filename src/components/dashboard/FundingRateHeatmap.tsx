import React from 'react';
import { translations, Language } from '../../translations';

// 后端返回的数据格式:
// {
//   dateList: number[],      // 时间戳数组
//   coinList: string[],     // 币种名称数组
//   dataResult: number[][]  // 二维数组，dataResult[i][j] = coinList[i] 在 dateList[j] 的值
// }

interface FundingRateHeatmapProps {
  data: {
    dateList: number[];
    coinList: string[];
    dataResult: number[][];
  };
  language?: Language;
}

const FundingRateHeatmap: React.FC<FundingRateHeatmapProps> = ({ data, language = 'en' }) => {
  const t = translations[language];

  // Handle empty or invalid data
  if (!data || !data.dateList || !data.coinList || !data.dataResult) {
    return (
      <div className="flex items-center justify-center h-32 text-[#848E9C] text-sm">
        {t.loading || 'Loading data...'}
      </div>
    );
  }

  // 格式化时间戳为可读字符串
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getColor = (val: number) => {
    if (val > 0.01) return 'bg-red-500';
    if (val > 0.005) return 'bg-red-500/60';
    if (val > 0) return 'bg-red-500/20';
    if (val < -0.01) return 'bg-emerald-500';
    if (val < -0.005) return 'bg-emerald-500/60';
    return 'bg-emerald-500/20';
  };

  // 格式化数值显示
  const formatValue = (val: number) => {
    if (val === 0) return '0.00%';
    return `${(val * 100).toFixed(4)}%`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-[10px] uppercase text-[#848E9C] border border-[#1F2226]">{t.asset}</th>
            {data.dateList.map((ts, i) => (
              <th key={i} className="p-2 text-center text-[10px] uppercase text-[#848E9C] border border-[#1F2226] min-w-[40px]">
                {formatTime(ts)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.coinList.map((coin, rowIndex) => (
            <tr key={coin}>
              <td className="p-2 text-xs font-bold text-white border border-[#1F2226] bg-[#0B0E11]">
                {coin}
              </td>
              {data.dataResult[rowIndex]?.map((val, colIndex) => (
                <td
                  key={colIndex}
                  className={`p-2 border border-[#1F2226] text-[10px] text-center transition-all hover:scale-110 cursor-help ${getColor(val)}`}
                  title={`${coin}: ${formatValue(val)}`}
                >
                  <span className="opacity-0 hover:opacity-100 font-bold">{formatValue(val)}</span>
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
