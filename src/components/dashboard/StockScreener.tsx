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
  IndicatorConfig, 
  ScreenerFilter, 
  ScreenerScanResponse, 
  ScreenerTemplate, 
  IndicatorDefinition,
  StockResult
} from '../../types/screener';
import { translations, Language } from '../../translations';

interface StockScreenerProps {
  language: Language;
}

export const StockScreener: React.FC<StockScreenerProps> = ({ language }) => {
  const t = translations[language];
  
  // State
  const [templates, setTemplates] = useState<ScreenerTemplate[]>([]);
  const [indicators, setIndicators] = useState<IndicatorDefinition[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [activeIndicators, setActiveIndicators] = useState<IndicatorConfig[]>([]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [filters, setFilters] = useState<ScreenerFilter>({
    minVolume: 0,
    maxVolume: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minChange: undefined,
    maxChange: undefined,
    excludeST: true,
    excludeSuspend: true
  });
  const [scanResult, setScanResult] = useState<ScreenerScanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showIndicatorModal, setShowIndicatorModal] = useState<boolean>(false);

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, indicatorsRes] = await Promise.all([
          axios.get('/api/screener/templates'),
          axios.get('/api/screener/indicators')
        ]);
        setTemplates(templatesRes.data.templates);
        setIndicators(indicatorsRes.data.indicators);
        
        // Load first template by default
        if (templatesRes.data.templates.length > 0) {
          applyTemplate(templatesRes.data.templates[0]);
        }
      } catch (error) {
        console.error('Failed to fetch screener metadata:', error);
      }
    };
    fetchData();
  }, []);

  const applyTemplate = (template: ScreenerTemplate) => {
    setSelectedTemplateId(template.id);
    setActiveIndicators(template.indicators.map(ind => ({ ...ind })));
    if (template.logic) setLogic(template.logic);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = templates.find(t => t.id === e.target.value);
    if (template) {
      applyTemplate(template);
    }
  };

  const addIndicator = (indicatorDef: IndicatorDefinition) => {
    const newIndicator: IndicatorConfig = {
      name: indicatorDef.name,
      params: { ...indicatorDef.params },
      condition: indicatorDef.name === 'macd' ? { signal: 'golden_cross' } : { value: '<=30' }
    };
    setActiveIndicators([...activeIndicators, newIndicator]);
    setShowIndicatorModal(false);
  };

  const removeIndicator = (index: number) => {
    const newIndicators = [...activeIndicators];
    newIndicators.splice(index, 1);
    setActiveIndicators(newIndicators);
  };

  const updateIndicatorParam = (index: number, key: string, value: any) => {
    const newIndicators = [...activeIndicators];
    newIndicators[index].params[key] = value;
    setActiveIndicators(newIndicators);
  };

  const updateIndicatorCondition = (index: number, key: string, value: any) => {
    const newIndicators = [...activeIndicators];
    newIndicators[index].condition[key] = value;
    setActiveIndicators(newIndicators);
  };

  const handleScan = async (newPage = 1, newSortBy = sortBy, newSortOrder = sortOrder) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/screener/scan', {
        market: 'astock',
        logic,
        indicators: activeIndicators,
        filter: filters,
        limit: pageSize,
        offset: (newPage - 1) * pageSize,
        sortBy: newSortBy,
        sortOrder: newSortOrder
      });
      setScanResult(response.data);
      setPage(newPage);
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
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
    }
    setFilters({
      minVolume: 0,
      maxVolume: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minChange: undefined,
      maxChange: undefined,
      excludeST: true,
      excludeSuspend: true
    });
    setSortBy('');
    setSortOrder('desc');
  };

  const formatVolume = (vol: number) => {
    if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿';
    if (vol >= 10000) return (vol / 10000).toFixed(2) + '万';
    return vol.toString();
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-[#f5222d]';
    if (change < 0) return 'text-[#52c41a]';
    return 'text-gray-500';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Sidebar: Configuration */}
      <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6">
        <div className="bg-[#151619] border border-white/10 rounded-xl p-6 space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-3 h-3" />
              {t.quickSelect}
            </label>
            <select 
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
            >
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
            {selectedTemplateId && (
              <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/70 leading-relaxed">
                  {t.description}: {templates.find(tpl => tpl.id === selectedTemplateId)?.description}
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />

          {/* Indicators Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-3 h-3" />
                {t.indicators}
              </label>
              <button 
                onClick={() => setShowIndicatorModal(true)}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {t.addIndicator}
              </button>
            </div>

            <div className="space-y-3">
              {activeIndicators.map((ind, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4 relative group">
                  <button 
                    onClick={() => removeIndicator(idx)}
                    className="absolute top-3 right-3 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="pr-8">
                    <h4 className="text-sm font-medium text-white uppercase tracking-tight">
                      {ind.name.toUpperCase()} 
                      <span className="text-xs text-white/40 ml-2 font-normal">
                        ({indicators.find(d => d.name === ind.name)?.description})
                      </span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(ind.params).map(paramKey => (
                      <div key={paramKey} className="space-y-1.5">
                        <label className="text-[10px] text-white/40 uppercase font-bold">{paramKey}</label>
                        <input 
                          type="number"
                          value={ind.params[paramKey]}
                          onChange={(e) => updateIndicatorParam(idx, paramKey, parseInt(e.target.value))}
                          className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-red-500/30"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-bold">{t.condition}</label>
                    <div className="flex gap-2">
                      {ind.name === 'macd' ? (
                        <select 
                          value={ind.condition.signal}
                          onChange={(e) => updateIndicatorCondition(idx, 'signal', e.target.value)}
                          className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-red-500/30"
                        >
                          <option value="golden_cross">{t.goldenCross}</option>
                          <option value="dead_cross">{t.deadCross}</option>
                        </select>
                      ) : (
                        <>
                          <select 
                            className="bg-black border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-red-500/30"
                            onChange={(e) => {
                              const val = ind.condition.value || '';
                              const op = e.target.value;
                              const num = val.replace(/[<>=]+/, '');
                              updateIndicatorCondition(idx, 'value', op + num);
                            }}
                          >
                            <option value="<=">&lt;=</option>
                            <option value=">=">&gt;=</option>
                            <option value="<">&lt;</option>
                            <option value=">">&gt;</option>
                            <option value="=">=</option>
                          </select>
                          <input 
                            type="number"
                            value={ind.condition.value?.replace(/[<>=]+/, '') || ''}
                            onChange={(e) => {
                              const op = ind.condition.value?.match(/[<>=]+/)?.[0] || '<=';
                              updateIndicatorCondition(idx, 'value', op + e.target.value);
                            }}
                            className="flex-1 bg-black border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-red-500/30"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Logic & Basic Filters */}
          <div className="space-y-6">
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

            <div className="space-y-4">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{t.filter}</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.excludeST ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                    {filters.excludeST && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={filters.excludeST} onChange={(e) => setFilters({...filters, excludeST: e.target.checked})} />
                  <span className="text-xs text-white/70">{t.excludeST}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.excludeSuspend ? 'border-red-500 bg-red-500/20' : 'border-white/20 group-hover:border-white/40'}`}>
                    {filters.excludeSuspend && <CheckCircle2 className="w-3 h-3 text-red-500" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={filters.excludeSuspend} onChange={(e) => setFilters({...filters, excludeSuspend: e.target.checked})} />
                  <span className="text-xs text-white/70">{t.excludeSuspend}</span>
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-bold">{t.minPrice}</label>
                    <input 
                      type="number"
                      value={filters.minPrice || ''}
                      onChange={(e) => setFilters({...filters, minPrice: parseFloat(e.target.value) || undefined})}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-bold">{t.maxPrice}</label>
                    <input 
                      type="number"
                      value={filters.maxPrice || ''}
                      onChange={(e) => setFilters({...filters, maxPrice: parseFloat(e.target.value) || undefined})}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-bold">{t.minChange}</label>
                    <input 
                      type="number"
                      value={filters.minChange || ''}
                      onChange={(e) => setFilters({...filters, minChange: parseFloat(e.target.value) || undefined})}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-bold">{t.maxChange}</label>
                    <input 
                      type="number"
                      value={filters.maxChange || ''}
                      onChange={(e) => setFilters({...filters, maxChange: parseFloat(e.target.value) || undefined})}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-bold">{t.minVolume} (手)</label>
                    <input 
                      type="number"
                      value={filters.minVolume || ''}
                      onChange={(e) => setFilters({...filters, minVolume: parseInt(e.target.value) || 0})}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-bold">{t.maxVolume} (手)</label>
                    <input 
                      type="number"
                      value={filters.maxVolume || ''}
                      onChange={(e) => setFilters({...filters, maxVolume: parseInt(e.target.value) || undefined})}
                      className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-red-500/30"
                    />
                  </div>
                </div>
              </div>
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
          <div className="flex items-center gap-6">
            <div className="space-y-0.5">
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.results}</p>
              <p className="text-lg font-mono text-white">{scanResult?.total || 0}</p>
            </div>
            {scanResult && (
              <>
                <div className="w-px h-8 bg-white/10" />
                <div className="space-y-0.5">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.duration}</p>
                  <p className="text-lg font-mono text-white">{(scanResult.duration / 1000000000).toFixed(1)}s</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="space-y-0.5">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{t.scanTime}</p>
                  <p className="text-sm font-mono text-white/70">{new Date(scanResult.scanTime).toLocaleString()}</p>
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
                    onClick={() => handleSort('changePercent')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.changePercent}
                      {sortBy === 'changePercent' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('volume')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.volume}
                      {sortBy === 'volume' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.indicators}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 relative">
                {loading && (
                  <tr className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
                    <td colSpan={6} className="h-full flex items-center justify-center w-full">
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
                    key={stock.code} 
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-white/90">{stock.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-white">{stock.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono text-sm ${getChangeColor(stock.changePercent)}`}>{stock.close.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono text-sm ${getChangeColor(stock.changePercent)}`}>
                        {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-sm text-white/60">{formatVolume(stock.volume)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(stock.indicators).map(([key, indicator]) => {
                          const res = indicator as any;
                          return (
                            <div key={key} className="flex flex-col gap-1">
                              {res.signals.map((sig: string) => (
                                <span key={sig} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                                  sig === 'golden_cross' || sig === 'oversold' 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                }`}>
                                  {key.toUpperCase()}: {sig === 'golden_cross' ? t.goldenCross : sig === 'oversold' ? t.oversold : sig}
                                </span>
                              ))}
                              {res.values.value && (
                                <span className="text-[10px] text-white/40 ml-1">
                                  {key.toUpperCase()}: {res.values.value.toFixed(1)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </motion.tr>
                ))}

                {!loading && (!scanResult || scanResult.results.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
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

      {/* Indicator Selection Modal */}
      <AnimatePresence>
        {showIndicatorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIndicatorModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#151619] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{t.addIndicator}</h3>
                <button onClick={() => setShowIndicatorModal(false)} className="text-white/40 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {indicators.map(ind => (
                  <button 
                    key={ind.name}
                    onClick={() => addIndicator(ind)}
                    className="w-full text-left p-4 rounded-xl border border-white/5 hover:border-red-500/30 hover:bg-red-500/5 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-red-400">{ind.name}</span>
                      <Plus className="w-4 h-4 text-white/20 group-hover:text-red-400" />
                    </div>
                    <p className="text-xs text-white/40">{ind.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
