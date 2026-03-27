import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Loader2, 
  Info,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  ScreenerScanRequest,
  ScreenerScanResponse, 
  ScreenerPreset,
  StockItem,
  IndustryFilter,
  RangeFilter,
  FundamentalConfig,
  LiquidityConfig,
  TechnicalConfig
} from '../../types/screener';
import { translations, Language } from '../../translations';

interface StockScreenerProps {
  language: Language;
}

export const StockScreener: React.FC<StockScreenerProps> = ({ language }) => {
  const t = translations[language];
  
  // State
  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [indexes, setIndexes] = useState<{ code: string; name: string }[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  
  // New Filter State
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>({ include: [], exclude: [] });
  const [marketCap, setMarketCap] = useState<RangeFilter>({ min: null, max: null });
  const [price, setPrice] = useState<RangeFilter>({ min: null, max: null });
  const [change, setChange] = useState<RangeFilter>({ min: null, max: null });
  
  const [fundamental, setFundamental] = useState<FundamentalConfig>({
    logic: 'AND',
    roe: { min: 10, years: 3 },
    pe: { min: null, max: 50 },
    pb: { min: null, max: 5 },
    listDays: { min: 365 },
    excludeST: true
  });
  
  const [liquidity, setLiquidity] = useState<LiquidityConfig>({
    logic: 'AND',
    turnoverRate: { min: 1, max: null },
    amount: { min: 5000, max: null },
    northHold: { ratioMin: 0, netBuy: false }
  });
  
  const [technical, setTechnical] = useState<TechnicalConfig>({
    logic: 'AND',
    ma: { trend: 'bullish', ma50AboveMa200: false },
    rs: { min: 80, indexCode: '000300.SH' },
    volume: { ratioMin: 1.2, ratioMax: null, breakout: false }
  });

  const [scanResult, setScanResult] = useState<ScreenerScanResponse['data'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<string>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [presetsRes, industriesRes, indexesRes] = await Promise.all([
          axios.get('/api/v1/stock/cnstock/screener/presets'),
          axios.get('/api/v1/stock/cnstock/screener/industries'),
          axios.get('/api/v1/stock/cnstock/screener/indexes')
        ]);
        
        const presetsData = presetsRes.data.data || [];
        const industriesData = industriesRes.data.data || [];
        const indexesData = indexesRes.data.data || [];

        setPresets(presetsData);
        setIndustries(industriesData);
        setIndexes(indexesData);
        
        // Load first preset by default
        if (presetsData.length > 0) {
          applyPreset(presetsData[0]);
        }
      } catch (error) {
        console.error('Failed to fetch screener metadata:', error);
      }
    };
    fetchData();
  }, []);

  const applyPreset = (preset: ScreenerPreset) => {
    if (!preset) return;
    setSelectedPresetId(preset.id);
    const config = preset.config;
    if (!config) return;

    if (config.logic) setLogic(config.logic);
    if (config.industry) setIndustryFilter(config.industry);
    if (config.marketCap) setMarketCap(config.marketCap);
    if (config.price) setPrice(config.price);
    if (config.change) setChange(config.change);
    if (config.fundamental) setFundamental(prev => ({ ...prev, ...config.fundamental }));
    if (config.liquidity) setLiquidity(prev => ({ ...prev, ...config.liquidity }));
    if (config.technical) setTechnical(prev => ({ ...prev, ...config.technical }));
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = presets.find(p => p.id === e.target.value);
    if (preset) {
      applyPreset(preset);
    }
  };

  const handleScan = async (newPage = 1, newSortBy = sortBy, newSortOrder = sortOrder) => {
    setLoading(true);
    try {
      const requestBody: ScreenerScanRequest = {
        tradeDate: new Date().toISOString().split('T')[0],
        logic,
        industry: industryFilter,
        marketCap,
        price,
        change,
        fundamental,
        liquidity,
        technical,
        pagination: { page: newPage, size: pageSize },
        sort: { field: newSortBy, order: newSortOrder }
      };

      const response = await axios.post('/api/v1/stock/cnstock/screener', requestBody);
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
    if (presets.length > 0) {
      applyPreset(presets[0]);
    } else {
      setLogic('AND');
      setIndustryFilter({ include: [], exclude: [] });
      setMarketCap({ min: null, max: null });
      setPrice({ min: null, max: null });
      setChange({ min: null, max: null });
      setFundamental({
        logic: 'AND',
        roe: { min: 10, years: 3 },
        pe: { min: null, max: 50 },
        pb: { min: null, max: 5 },
        listDays: { min: 365 },
        excludeST: true
      });
      setLiquidity({
        logic: 'AND',
        turnoverRate: { min: 1, max: null },
        amount: { min: 5000, max: null },
        northHold: { ratioMin: 0, netBuy: false }
      });
      setTechnical({
        logic: 'AND',
        ma: { trend: 'bullish', ma50AboveMa200: false },
        rs: { min: 80, indexCode: '000300.SH' },
        volume: { ratioMin: 1.2, ratioMax: null, breakout: false }
      });
    }
    setSortBy('marketCap');
    setSortOrder('desc');
  };

  const formatVolume = (vol: number) => {
    if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿';
    if (vol >= 10000) return (vol / 10000).toFixed(2) + '万';
    return vol.toString();
  };

  const formatAmount = (amt: number) => {
    if (amt >= 10000) return (amt / 10000).toFixed(2) + '亿';
    return amt.toFixed(2) + '万';
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-[#f5222d]';
    if (change < 0) return 'text-[#52c41a]';
    return 'text-gray-500';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Sidebar: Configuration */}
      <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2 custom-scrollbar">
        <div className="bg-[#151619] border border-white/10 rounded-xl p-6 space-y-6">
          {/* Preset Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-3 h-3" />
              {t.quickSelect}
            </label>
            <select 
              value={selectedPresetId || ''}
              onChange={handlePresetChange}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
            >
              <option value="">{t.none}</option>
              {presets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
            {selectedPresetId && (
              <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/70 leading-relaxed">
                  {presets.find(p => p.id === selectedPresetId)?.description}
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
                  onChange={(e) => setMarketCap({...marketCap, min: parseFloat(e.target.value) || null})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.marketCap} (Max 亿)</label>
                <input 
                  type="number"
                  value={marketCap.max || ''}
                  onChange={(e) => setMarketCap({...marketCap, max: parseFloat(e.target.value) || null})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            {/* Price & Change */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.minPrice}</label>
                <input 
                  type="number"
                  value={price.min || ''}
                  onChange={(e) => setPrice({...price, min: parseFloat(e.target.value) || null})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.maxPrice}</label>
                <input 
                  type="number"
                  value={price.max || ''}
                  onChange={(e) => setPrice({...price, max: parseFloat(e.target.value) || null})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.change} % Min</label>
                <input 
                  type="number"
                  value={change.min || ''}
                  onChange={(e) => setChange({...change, min: parseFloat(e.target.value) || null})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.change} % Max</label>
                <input 
                  type="number"
                  value={change.max || ''}
                  onChange={(e) => setChange({...change, max: parseFloat(e.target.value) || null})}
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
                onChange={(e) => setFundamental({...fundamental, logic: e.target.value as 'AND' | 'OR'})}
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
                  value={fundamental.roe?.min || ''}
                  onChange={(e) => setFundamental({...fundamental, roe: { ...fundamental.roe!, min: parseFloat(e.target.value) || 0 }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.years}</label>
                <input 
                  type="number"
                  value={fundamental.roe?.years || ''}
                  onChange={(e) => setFundamental({...fundamental, roe: { ...fundamental.roe!, years: parseInt(e.target.value) || 1 }})}
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
                  onChange={(e) => setFundamental({...fundamental, pe: { ...fundamental.pe!, min: parseFloat(e.target.value) || null }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.pe} Max</label>
                <input 
                  type="number"
                  value={fundamental.pe?.max || ''}
                  onChange={(e) => setFundamental({...fundamental, pe: { ...fundamental.pe!, max: parseFloat(e.target.value) || null }})}
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
                  onChange={(e) => setFundamental({...fundamental, pb: { ...fundamental.pb!, min: parseFloat(e.target.value) || null }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.pb} Max</label>
                <input 
                  type="number"
                  value={fundamental.pb?.max || ''}
                  onChange={(e) => setFundamental({...fundamental, pb: { ...fundamental.pb!, max: parseFloat(e.target.value) || null }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.listDays} Min</label>
                <input 
                  type="number"
                  value={fundamental.listDays?.min || ''}
                  onChange={(e) => setFundamental({...fundamental, listDays: { ...fundamental.listDays!, min: parseInt(e.target.value) || 0 }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer group mt-5">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${fundamental.excludeST ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {fundamental.excludeST && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                </div>
                <input type="checkbox" className="hidden" checked={!!fundamental.excludeST} onChange={(e) => setFundamental({...fundamental, excludeST: e.target.checked})} />
                <span className="text-xs text-white/70">{t.excludeST}</span>
              </label>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Liquidity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{t.liquidity}</label>
              <select 
                value={liquidity.logic || 'AND'}
                onChange={(e) => setLiquidity({...liquidity, logic: e.target.value as 'AND' | 'OR'})}
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
                  value={liquidity.turnoverRate?.min || ''}
                  onChange={(e) => setLiquidity({...liquidity, turnoverRate: { ...liquidity.turnoverRate!, min: parseFloat(e.target.value) || null }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.turnoverRate} % Max</label>
                <input 
                  type="number"
                  value={liquidity.turnoverRate?.max || ''}
                  onChange={(e) => setLiquidity({...liquidity, turnoverRate: { ...liquidity.turnoverRate!, max: parseFloat(e.target.value) || null }})}
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
                  onChange={(e) => setLiquidity({...liquidity, amount: { ...liquidity.amount!, min: parseFloat(e.target.value) || null }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.amount} (Max 万)</label>
                <input 
                  type="number"
                  value={liquidity.amount?.max || ''}
                  onChange={(e) => setLiquidity({...liquidity, amount: { ...liquidity.amount!, max: parseFloat(e.target.value) || null }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.northHold} % Min</label>
                <input 
                  type="number"
                  value={liquidity.northHold?.ratioMin || ''}
                  onChange={(e) => setLiquidity({...liquidity, northHold: { ...liquidity.northHold!, ratioMin: parseFloat(e.target.value) || 0 }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer group mt-5">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${liquidity.northHold?.netBuy ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {liquidity.northHold?.netBuy && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                </div>
                <input type="checkbox" className="hidden" checked={!!liquidity.northHold?.netBuy} onChange={(e) => setLiquidity({...liquidity, northHold: { ...liquidity.northHold!, netBuy: e.target.checked }})} />
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
                onChange={(e) => setTechnical({...technical, logic: e.target.value as 'AND' | 'OR'})}
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
                  value={technical.ma?.trend || 'none'}
                  onChange={(e) => setTechnical({...technical, ma: { ...technical.ma!, trend: e.target.value as any }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                >
                  <option value="none">{t.none}</option>
                  <option value="bullish">{t.bullish}</option>
                  <option value="bearish">{t.bearish}</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group mt-5">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${technical.ma?.ma50AboveMa200 ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {technical.ma?.ma50AboveMa200 && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                </div>
                <input type="checkbox" className="hidden" checked={!!technical.ma?.ma50AboveMa200} onChange={(e) => setTechnical({...technical, ma: { ...technical.ma!, ma50AboveMa200: e.target.checked }})} />
                <span className="text-xs text-white/70">MA50 &gt; MA200</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.rs} Min</label>
                <input 
                  type="number"
                  value={technical.rs?.min || ''}
                  onChange={(e) => setTechnical({...technical, rs: { ...technical.rs!, min: parseFloat(e.target.value) || 0 }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.rs} Index</label>
                <select 
                  value={technical.rs?.indexCode || ''}
                  onChange={(e) => setTechnical({...technical, rs: { ...technical.rs!, indexCode: e.target.value }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                >
                  {indexes.map(idx => (
                    <option key={idx.code} value={idx.code}>{idx.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.volumeRatio} Min</label>
                <input 
                  type="number"
                  value={technical.volume?.ratioMin || ''}
                  onChange={(e) => setTechnical({...technical, volume: { ...technical.volume!, ratioMin: parseFloat(e.target.value) || 0 }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase font-bold">{t.volumeRatio} Max</label>
                <input 
                  type="number"
                  value={technical.volume?.ratioMax || ''}
                  onChange={(e) => setTechnical({...technical, volume: { ...technical.volume!, ratioMax: parseFloat(e.target.value) || null }})}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${technical.volume?.breakout ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                  {technical.volume?.breakout && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                </div>
                <input type="checkbox" className="hidden" checked={!!technical.volume?.breakout} onChange={(e) => setTechnical({...technical, volume: { ...technical.volume!, breakout: e.target.checked }})} />
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
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.industryPassed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.fundamental}</p>
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.fundamentalPassed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.liquidity}</p>
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.liquidityPassed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.technical}</p>
                  <p className="text-sm font-mono text-white/70">{scanResult.summary.technicalPassed}</p>
                </div>
                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                <div className="space-y-0.5 flex-shrink-0">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.duration}</p>
                  <p className="text-sm font-mono text-white/70">{(scanResult.durationMs / 1000).toFixed(2)}s</p>
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
                <tr className="border-bottom border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.code}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.name}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.industry}</th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('marketCap')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.marketCap}
                      {sortBy === 'marketCap' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
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
                    onClick={() => handleSort('changeRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.changePercent}
                      {sortBy === 'changeRate' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('liquidity.amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.amount}
                      {sortBy === 'liquidity.amount' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.indicators}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 relative">
                {loading && (
                  <tr className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
                    <td colSpan={8} className="h-full flex items-center justify-center w-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                        <p className="text-sm text-white/70">{t.scanning}</p>
                      </div>
                    </td>
                  </tr>
                )}
                
                {(scanResult?.results ?? []).map((stock, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={stock.tsCode} 
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-white/90">{stock.tsCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-white">{stock.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-white/60">{stock.industry}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-sm text-white/60">{formatAmount(stock.marketCap)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono text-sm ${getChangeColor(stock.changeRate)}`}>{stock.close.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono text-sm ${getChangeColor(stock.changeRate)}`}>
                        {stock.changeRate > 0 ? '+' : ''}{stock.changeRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-sm text-white/60">{formatAmount(stock.liquidity.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {/* Fundamental Indicators */}
                        {stock.fundamental.roe > 15 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            ROE: {stock.fundamental.roe}%
                          </span>
                        )}
                        {/* Liquidity Indicators */}
                        {stock.liquidity.northNetBuy > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            {t.northNetBuy}
                          </span>
                        )}
                        {/* Technical Indicators */}
                        {stock.technical.maTrend === 'bullish' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            {t.bullish}
                          </span>
                        )}
                        {stock.technical.volumeBreakout && (
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
