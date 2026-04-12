import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import {
  ScreenerRequestV2,
  ScreenerResponseV2,
  ScreenerTemplate,
  StockItemV2,
  IndustryFilter,
  RangeFilter,
  FundamentalFilterV2,
  LiquidityFilterV2,
  TechnicalFilterV2,
  TemplatesResponse,
  IndexesResponse,
  IndustriesResponse,
  IndexInfo
} from '../../types/screener';
import { translations, Language } from '../../translations';

interface StockScreenerProps {
  language: Language;
}

export const StockScreener: React.FC<StockScreenerProps> = ({ language }) => {
  const t = translations[language];

  // State - 元数据
  const [templates, setTemplates] = useState<ScreenerTemplate[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Filter State - 顶层条件
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [excludeSt, setExcludeSt] = useState<boolean>(true);
  const [minListDays, setMinListDays] = useState<number>(250);
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>({ include: [], exclude: [] });
  const [marketCap, setMarketCap] = useState<RangeFilter>({ min: null, max: null });
  const [priceRange, setPriceRange] = useState<RangeFilter>({ min: null, max: null });
  const [changeRange, setChangeRange] = useState<RangeFilter>({ min: null, max: null });

  // Filter State - 基本面
  const [fundamental, setFundamental] = useState<FundamentalFilterV2>({
    logic: 'AND',
    roe_min: 15,
    roe_years: 3,
    pe: { min: null, max: 30 },
    pb: { min: null, max: 3 },
    exclude_st: true
  });

  // Filter State - 流动性
  const [liquidity, setLiquidity] = useState<LiquidityFilterV2>({
    logic: 'AND',
    turnover: { min: 1, max: null },
    amount: { min: 5000, max: null },
    north_ratio: { min: null, max: null },
    north_net_buy: false
  });

  // Filter State - 技术面
  const [technical, setTechnical] = useState<TechnicalFilterV2>({
    logic: 'AND',
    ma_trend: 'bullish',
    rs: { min: 80, max: null },
    rs_index_code: '000300.SH',
    volume_breakout: false,
    volume_ratio: { min: 1.5, max: null }
  });

  // Results State
  const [scanResult, setScanResult] = useState<ScreenerResponseV2 | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortBy, setSortBy] = useState<string>('market_cap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Initial fetch - 使用真实的后端接口
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, industriesRes, indexesRes] = await Promise.all([
          axios.get<TemplatesResponse>('/api/v2/stock/cnstock/screener/templates'),
          axios.get<IndustriesResponse>('/api/v1/stock/cnstock/screener/industries'),
          axios.get<IndexesResponse>('/api/v1/stock/cnstock/screener/indexes')
        ]);

        const templatesData = templatesRes.data.templates || [];
        const industriesData = industriesRes.data.industries || [];
        const indexesData = indexesRes.data.indexes || [];

        setTemplates(templatesData);
        setIndustries(industriesData);
        setIndexes(indexesData);

        // Load first template by default
        if (templatesData.length > 0) {
          applyTemplate(templatesData[0]);
        }
      } catch (error) {
        console.error('Failed to fetch screener metadata:', error);
      }
    };
    fetchData();
  }, []);

  const applyTemplate = (template: ScreenerTemplate) => {
    if (!template || !template.request) return;
    setSelectedTemplateId(template.id);
    const req = template.request;

    if (req.logic) setLogic(req.logic);
    if (req.exclude_st !== undefined) setExcludeSt(req.exclude_st);
    if (req.min_list_days) setMinListDays(req.min_list_days);
    if (req.industry) setIndustryFilter(req.industry);
    if (req.market_cap) setMarketCap(req.market_cap);
    if (req.price) setPriceRange(req.price);
    if (req.change) setChangeRange(req.change);
    if (req.fundamental) setFundamental(prev => ({ ...prev, ...req.fundamental! }));
    if (req.liquidity) setLiquidity(prev => ({ ...prev, ...req.liquidity! }));
    if (req.technical) setTechnical(prev => ({ ...prev, ...req.technical! }));
    if (req.sort_by) setSortBy(req.sort_by);
    if (req.sort_order) setSortOrder(req.sort_order);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = templates.find(tpl => tpl.id === e.target.value);
    if (template) {
      applyTemplate(template);
    }
  };

  // 递归移除对象中的 null 和 undefined 值
  const removeNulls = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
      const filtered = obj.map(removeNulls).filter(v => v !== undefined);
      return filtered.length > 0 ? filtered : undefined;
    }
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        const value = removeNulls(obj[key]);
        if (value !== undefined) {
          result[key] = value;
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }
    return obj;
  };

  const handleScan = async (newPage = 1, newSortBy = sortBy, newSortOrder = sortOrder) => {
    setLoading(true);
    try {
      // 构建V2请求参数
      const rawBody: any = {
        trade_date: new Date().toISOString().split('T')[0],
        logic,
        exclude_st: excludeSt,
        min_list_days: minListDays,
        industry: (industryFilter.include.length > 0 || industryFilter.exclude.length > 0) ? industryFilter : undefined,
        market_cap: (marketCap.min !== null || marketCap.max !== null) ? marketCap : undefined,
        price: (priceRange.min !== null || priceRange.max !== null) ? priceRange : undefined,
        change: (changeRange.min !== null || changeRange.max !== null) ? changeRange : undefined,
        fundamental: {
          logic: fundamental.logic,
          roe_min: fundamental.roe_min,
          roe_years: fundamental.roe_years,
          pe: fundamental.pe,
          pb: fundamental.pb,
          peg_max: fundamental.peg_max,
          min_list_days: fundamental.min_list_days,
          exclude_st: fundamental.exclude_st
        },
        liquidity: {
          logic: liquidity.logic,
          turnover: liquidity.turnover,
          amount: liquidity.amount,
          north_ratio: liquidity.north_ratio,
          north_net_buy: liquidity.north_net_buy
        },
        technical: {
          logic: technical.logic,
          ma_trend: technical.ma_trend,
          ma_short: technical.ma_short,
          ma_long: technical.ma_long,
          rs: technical.rs,
          rs_index_code: technical.rs_index_code,
          volume_breakout: technical.volume_breakout,
          volume_ratio: technical.volume_ratio
        },
        pagination: { page: newPage, size: pageSize },
        sort_by: newSortBy,
        sort_order: newSortOrder
      };

      // 清理 null/undefined 值
      const requestBody = removeNulls(rawBody);

      // 使用V2接口
      const response = await axios.post('/api/v2/stock/cnstock/screener', requestBody);
      if (response.data.code === 0) {
        setScanResult(response.data.data);
        setPage(newPage);
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    handleScan(1, field, newOrder);
  };

  const resetConditions = () => {
    if (templates.length > 0) {
      applyTemplate(templates[0]);
    } else {
      setLogic('AND');
      setExcludeSt(true);
      setMinListDays(250);
      setIndustryFilter({ include: [], exclude: [] });
      setMarketCap({ min: null, max: null });
      setPriceRange({ min: null, max: null });
      setChangeRange({ min: null, max: null });
      setFundamental({
        logic: 'AND',
        roe_min: 15,
        roe_years: 3,
        pe: { min: null, max: 30 },
        pb: { min: null, max: 3 },
        exclude_st: true
      });
      setLiquidity({
        logic: 'AND',
        turnover: { min: 1, max: null },
        amount: { min: 5000, max: null },
        north_net_buy: false
      });
      setTechnical({
        logic: 'AND',
        ma_trend: 'bullish',
        rs: { min: 80, max: null },
        rs_index_code: '000300.SH',
        volume_breakout: false
      });
    }
    setSortBy('market_cap');
    setSortOrder('desc');
  };

  const formatAmount = (amt: number) => {
    if (!amt) return '-';
    if (amt >= 10000) return (amt / 10000).toFixed(2) + '亿';
    return amt.toFixed(2) + '万';
  };

  const getChangeColor = (changeVal: number) => {
    if (changeVal > 0) return 'text-[#f5222d]';
    if (changeVal < 0) return 'text-[#52c41a]';
    return 'text-gray-500';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Sidebar: Configuration */}
      <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
        <div className="bg-[#151619] border border-white/10 rounded-xl p-6 space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-3 h-3" />
              {t.quickSelect}
            </label>
            <select
              value={selectedTemplateId || ''}
              onChange={handleTemplateChange}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
            >
              <option value="">{t.none}</option>
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
            {selectedTemplateId && (
              <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/70 leading-relaxed">
                  {templates.find(tpl => tpl.id === selectedTemplateId)?.description}
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />

          {/* Global Logic */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{t.logic}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${logic === 'AND' ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {logic === 'AND' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </div>
                <input type="radio" className="hidden" name="logic" checked={logic === 'AND'} onChange={() => setLogic('AND')} />
                <span className="text-xs text-white/70">{t.all}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${logic === 'OR' ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {logic === 'OR' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </div>
                <input type="radio" className="hidden" name="logic" checked={logic === 'OR'} onChange={() => setLogic('OR')} />
                <span className="text-xs text-white/70">{t.any}</span>
              </label>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Basic Filters */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{t.filter}</label>

            {/* Exclude ST & Min List Days */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${excludeSt ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {excludeSt && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                </div>
                <input type="checkbox" className="hidden" checked={excludeSt} onChange={(e) => setExcludeSt(e.target.checked)} />
                <span className="text-xs text-white/70">{t.excludeST}</span>
              </label>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.listDays} Min</label>
                <input
                  type="number"
                  value={minListDays || ''}
                  onChange={(e) => setMinListDays(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 uppercase font-bold">{t.industry}</label>
              <div className="flex flex-wrap gap-1.5">
                {industries.slice(0, 8).map(ind => (
                  <button
                    key={ind}
                    onClick={() => {
                      const isIncluded = industryFilter.include.includes(ind);
                      if (isIncluded) {
                        setIndustryFilter({ ...industryFilter, include: industryFilter.include.filter(i => i !== ind) });
                      } else {
                        setIndustryFilter({ ...industryFilter, include: [...industryFilter.include, ind], exclude: industryFilter.exclude.filter(i => i !== ind) });
                      }
                    }}
                    className={`px-2 py-1 rounded text-[10px] transition-colors ${industryFilter.include.includes(ind) ? 'bg-red-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Cap */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.marketCap} (Min 亿)</label>
                <input
                  type="number"
                  value={marketCap.min || ''}
                  onChange={(e) => setMarketCap({ ...marketCap, min: parseFloat(e.target.value) || null })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.marketCap} (Max 亿)</label>
                <input
                  type="number"
                  value={marketCap.max || ''}
                  onChange={(e) => setMarketCap({ ...marketCap, max: parseFloat(e.target.value) || null })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.minPrice}</label>
                <input
                  type="number"
                  value={priceRange.min || ''}
                  onChange={(e) => setPriceRange({ ...priceRange, min: parseFloat(e.target.value) || null })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.maxPrice}</label>
                <input
                  type="number"
                  value={priceRange.max || ''}
                  onChange={(e) => setPriceRange({ ...priceRange, max: parseFloat(e.target.value) || null })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            {/* Change */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.change} % Min</label>
                <input
                  type="number"
                  value={changeRange.min || ''}
                  onChange={(e) => setChangeRange({ ...changeRange, min: parseFloat(e.target.value) || null })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.change} % Max</label>
                <input
                  type="number"
                  value={changeRange.max || ''}
                  onChange={(e) => setChangeRange({ ...changeRange, max: parseFloat(e.target.value) || null })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Fundamental */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{t.fundamental}</label>
              <select
                value={fundamental.logic || 'AND'}
                onChange={(e) => setFundamental({ ...fundamental, logic: e.target.value as 'AND' | 'OR' })}
                className="bg-black border border-white/10 rounded px-2 py-0.5 text-[10px] focus:outline-none"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.roe} %</label>
                <input
                  type="number"
                  value={fundamental.roe_min || ''}
                  onChange={(e) => setFundamental({ ...fundamental, roe_min: parseFloat(e.target.value) || undefined })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.years}</label>
                <input
                  type="number"
                  value={fundamental.roe_years || ''}
                  onChange={(e) => setFundamental({ ...fundamental, roe_years: parseInt(e.target.value) || undefined })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.pe} Min</label>
                <input
                  type="number"
                  value={fundamental.pe?.min || ''}
                  onChange={(e) => setFundamental({ ...fundamental, pe: { ...fundamental.pe!, min: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.pe} Max</label>
                <input
                  type="number"
                  value={fundamental.pe?.max || ''}
                  onChange={(e) => setFundamental({ ...fundamental, pe: { ...fundamental.pe!, max: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.pb} Min</label>
                <input
                  type="number"
                  value={fundamental.pb?.min || ''}
                  onChange={(e) => setFundamental({ ...fundamental, pb: { ...fundamental.pb!, min: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.pb} Max</label>
                <input
                  type="number"
                  value={fundamental.pb?.max || ''}
                  onChange={(e) => setFundamental({ ...fundamental, pb: { ...fundamental.pb!, max: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Liquidity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{t.liquidity}</label>
              <select
                value={liquidity.logic || 'AND'}
                onChange={(e) => setLiquidity({ ...liquidity, logic: e.target.value as 'AND' | 'OR' })}
                className="bg-black border border-white/10 rounded px-2 py-0.5 text-[10px] focus:outline-none"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.turnoverRate} % Min</label>
                <input
                  type="number"
                  value={liquidity.turnover?.min || ''}
                  onChange={(e) => setLiquidity({ ...liquidity, turnover: { ...liquidity.turnover!, min: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.turnoverRate} % Max</label>
                <input
                  type="number"
                  value={liquidity.turnover?.max || ''}
                  onChange={(e) => setLiquidity({ ...liquidity, turnover: { ...liquidity.turnover!, max: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.amount} (Min 万)</label>
                <input
                  type="number"
                  value={liquidity.amount?.min || ''}
                  onChange={(e) => setLiquidity({ ...liquidity, amount: { ...liquidity.amount!, min: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.amount} (Max 万)</label>
                <input
                  type="number"
                  value={liquidity.amount?.max || ''}
                  onChange={(e) => setLiquidity({ ...liquidity, amount: { ...liquidity.amount!, max: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.northHold} % Min</label>
                <input
                  type="number"
                  value={liquidity.north_ratio?.min || ''}
                  onChange={(e) => setLiquidity({ ...liquidity, north_ratio: { ...liquidity.north_ratio!, min: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer group mt-5">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${liquidity.north_net_buy ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {liquidity.north_net_buy && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                </div>
                <input type="checkbox" className="hidden" checked={!!liquidity.north_net_buy} onChange={(e) => setLiquidity({ ...liquidity, north_net_buy: e.target.checked })} />
                <span className="text-xs text-white/70">{t.northNetBuy}</span>
              </label>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Technical */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{t.technical}</label>
              <select
                value={technical.logic || 'AND'}
                onChange={(e) => setTechnical({ ...technical, logic: e.target.value as 'AND' | 'OR' })}
                className="bg-black border border-white/10 rounded px-2 py-0.5 text-[10px] focus:outline-none"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.maTrend}</label>
                <select
                  value={technical.ma_trend || ''}
                  onChange={(e) => setTechnical({ ...technical, ma_trend: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                >
                  <option value="">{t.none}</option>
                  <option value="bullish">{t.bullish}</option>
                  <option value="bearish">{t.bearish}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.rs} Min</label>
                <input
                  type="number"
                  value={technical.rs?.min || ''}
                  onChange={(e) => setTechnical({ ...technical, rs: { ...technical.rs!, min: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.indexCode}</label>
                <select
                  value={technical.rs_index_code || ''}
                  onChange={(e) => setTechnical({ ...technical, rs_index_code: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                >
                  {indexes.map(idx => (
                    <option key={idx.ts_code} value={idx.ts_code}>{idx.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.volumeRatio} Min</label>
                <input
                  type="number"
                  value={technical.volume_ratio?.min || ''}
                  onChange={(e) => setTechnical({ ...technical, volume_ratio: { ...technical.volume_ratio!, min: parseFloat(e.target.value) || null } })}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${technical.volume_breakout ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {technical.volume_breakout && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                </div>
                <input type="checkbox" className="hidden" checked={!!technical.volume_breakout} onChange={(e) => setTechnical({ ...technical, volume_breakout: e.target.checked })} />
                <span className="text-xs text-white/70">{t.breakout}</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={resetConditions}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t.reset}
            </button>
            <button
              onClick={() => handleScan(1)}
              disabled={loading}
              className="flex-[2] px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t.startScan}
            </button>
          </div>
        </div>
      </div>

      {/* Right Area: Results */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Stats Bar */}
        <div className="bg-[#151619] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <div className="space-y-0.5 flex-shrink-0">
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.results}</p>
              <p className="text-lg font-mono text-white">{scanResult?.total || 0}</p>
            </div>
            {scanResult && scanResult.summary && (
              <>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.industryPassed}</p>
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.industry_passed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.fundamental}</p>
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.fundamental_passed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.liquidity}</p>
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.liquidity_passed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.technical}</p>
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.technical_passed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.duration}</p>
                  <p className="text-sm font-mono text-white/70">{(scanResult.duration_ms / 1000).toFixed(2)}s</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{t.limit}:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="bg-black border border-white/10 rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-[#151619] border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col min-h-[600px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.code}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.name}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.industry}</th>
                  <th
                    className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('market_cap')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.marketCap}
                      {sortBy === 'market_cap' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('close')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.close}
                      {sortBy === 'close' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('change_rate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.changePercent}
                      {sortBy === 'change_rate' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.amount}
                      {sortBy === 'amount' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.indicators}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 relative">
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                        <p className="text-sm text-white/70">{t.scanning}</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && (scanResult?.items ?? []).map((stock, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={stock.ts_code}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-white/90">{stock.ts_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-white">{stock.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-white/60">{stock.industry}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-sm text-white/60">{formatAmount(stock.market_cap)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono text-sm ${getChangeColor(stock.change_rate)}`}>{stock.close.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono text-sm ${getChangeColor(stock.change_rate)}`}>
                        {stock.change_rate > 0 ? '+' : ''}{stock.change_rate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-sm text-white/60">{formatAmount(stock.liquidity.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {stock.fundamental.roe > 15 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            ROE: {stock.fundamental.roe.toFixed(1)}%
                          </span>
                        )}
                        {stock.liquidity.north_net_buy > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            {t.northNetBuy}
                          </span>
                        )}
                        {stock.technical.ma_trend === 'bullish' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            {t.bullish}
                          </span>
                        )}
                        {stock.technical.volume_breakout && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            {t.breakout}
                          </span>
                        )}
                        {stock.technical.rs > 80 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            RS: {stock.technical.rs.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}

                {!loading && (!scanResult || scanResult.items.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-white/30">
                        <Search className="w-12 h-12" />
                        <p className="text-sm">{t.noResults}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {scanResult && scanResult.total > 0 && (
            <div className="mt-auto border-t border-white/10 p-4 flex items-center justify-center gap-4">
              <button
                disabled={page === 1 || loading}
                onClick={() => handleScan(page - 1)}
                className="p-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, Math.ceil(scanResult.total / pageSize)) }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => handleScan(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === p ? 'bg-red-500 text-white' : 'hover:bg-white/5 text-white/50'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                {Math.ceil(scanResult.total / pageSize) > 5 && <span className="text-white/30">...</span>}
              </div>
              <button
                disabled={page >= Math.ceil(scanResult.total / pageSize) || loading}
                onClick={() => handleScan(page + 1)}
                className="p-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
