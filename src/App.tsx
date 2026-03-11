import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { 
  SMA, EMA, VWAP, BollingerBands, MACD, RSI, ADX, CCI, ATR, OBV 
} from 'technicalindicators';
import { 
  TrendingUp, 
  Settings, 
  BarChart3, 
  Layers, 
  RefreshCw, 
  ChevronDown,
  Activity,
  Zap,
  Globe,
  Maximize2
} from 'lucide-react';

// --- Types ---
interface KLine {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const EXCHANGES = [
  { id: 'binance', name: 'Binance', icon: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png' },
  { id: 'kucoin', name: 'KuCoin', icon: 'https://cryptologos.cc/logos/kucoin-token-kcs-logo.png' },
  { id: 'bitget', name: 'Bitget', icon: 'https://cryptologos.cc/logos/bitget-token-bgb-logo.png' },
  { id: 'hyperliquid', name: 'Hyperliquid', icon: 'https://hyperliquid.xyz/favicon.ico' },
  { id: 'aster', name: 'Aster (Mock)', icon: '' },
  { id: 'weex', name: 'Weex (Mock)', icon: '' },
];

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

const INDICATORS = [
  { id: 'sma', name: 'SMA', type: 'overlay' },
  { id: 'ema', name: 'EMA', type: 'overlay' },
  { id: 'vwap', name: 'VWAP', type: 'overlay' },
  { id: 'boll', name: 'Bollinger', type: 'overlay' },
  { id: 'macd', name: 'MACD', type: 'oscillator' },
  { id: 'rsi', name: 'RSI', type: 'oscillator' },
  { id: 'adx', name: 'ADX', type: 'oscillator' },
  { id: 'cci', name: 'CCI', type: 'oscillator' },
  { id: 'atr', name: 'ATR', type: 'oscillator' },
  { id: 'obv', name: 'OBV', type: 'oscillator' },
];

export default function App() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<{ [key: string]: any }>({});

  const [exchange, setExchange] = useState('binance');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [data, setData] = useState<KLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['sma', 'rsi']);

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/klines?exchange=${exchange}&symbol=${symbol}&interval=${interval}`);
      const result = await response.json();
      if (Array.isArray(result)) {
        setData(result);
      }
    } catch (error: any) {
      console.error('Fetch error:', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [exchange, symbol, interval]);

  // --- Chart Initialization ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Ensure we don't create multiple charts
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = 500;

    try {
      const chart = LightweightCharts.createChart(container, {
        layout: {
          background: { type: LightweightCharts.ColorType.Solid, color: '#0B0E11' },
          textColor: '#D1D4DC',
        },
        grid: {
          vertLines: { color: '#1F2226' },
          horzLines: { color: '#1F2226' },
        },
        width: width,
        height: height,
        timeScale: {
          borderColor: '#1F2226',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      if (!chart) {
        console.error('createChart returned null');
        return;
      }
      
      // In v5, addSeries is the generic way, though addCandlestickSeries should work
      // We'll try to be as robust as possible
      let candleSeries;
      const candlestickOptions = {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      };

      if (typeof (chart as any).addCandlestickSeries === 'function') {
        candleSeries = (chart as any).addCandlestickSeries(candlestickOptions);
      } else if (typeof (chart as any).addSeries === 'function' && (LightweightCharts as any).CandlestickSeries) {
        // Fallback to generic addSeries if shorthand is missing (v5 pattern)
        candleSeries = (chart as any).addSeries((LightweightCharts as any).CandlestickSeries, candlestickOptions);
      } else {
        console.error('Neither addCandlestickSeries nor addSeries with CandlestickSeries is a function. Available keys:', Object.keys(chart));
        throw new Error('chart.addCandlestickSeries is not a function');
      }

      if (!candleSeries) {
        console.error('addCandlestickSeries returned null');
        chart.remove();
        return;
      }

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);
      
      // If data is already there, trigger a re-render of indicators
      if (data.length > 0) {
        setLoading(prev => prev); // dummy trigger
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candleSeriesRef.current = null;
        }
      };
    } catch (err: any) {
      console.error('Error during chart initialization:', err.message || err);
    }
  }, [exchange]); // Re-create on exchange change to be safe, or keep []

  // --- Indicators Calculation & Rendering ---
  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0 || !chartRef.current) return;

    // Clear previous indicator series
    Object.values(indicatorSeriesRef.current).forEach(s => chartRef.current?.removeSeries(s));
    indicatorSeriesRef.current = {};

    // Update main candles
    candleSeriesRef.current.setData(data as any[]);

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // Helper to add line series
    const addLine = (name: string, lineData: any[], color: string, width = 2) => {
      const lineOptions = { color, lineWidth: width, title: name };
      let series;
      if (typeof (chartRef.current as any).addLineSeries === 'function') {
        series = chartRef.current!.addLineSeries(lineOptions);
      } else if (typeof (chartRef.current as any).addSeries === 'function' && (LightweightCharts as any).LineSeries) {
        series = chartRef.current!.addSeries((LightweightCharts as any).LineSeries, lineOptions);
      } else {
        console.error('Neither addLineSeries nor addSeries with LineSeries is available');
        return;
      }
      
      if (series) {
        series.setData(lineData);
        indicatorSeriesRef.current[name] = series;
      }
    };

    // Calculate and Add Indicators
    if (activeIndicators.includes('sma')) {
      const smaValues = SMA.calculate({ period: 20, values: closes });
      const smaData = data.slice(data.length - smaValues.length).map((d, i) => ({ time: d.time, value: smaValues[i] }));
      addLine('SMA 20', smaData, '#2196F3');
    }

    if (activeIndicators.includes('ema')) {
      const emaValues = EMA.calculate({ period: 20, values: closes });
      const emaData = data.slice(data.length - emaValues.length).map((d, i) => ({ time: d.time, value: emaValues[i] }));
      addLine('EMA 20', emaData, '#FF9800');
    }

    if (activeIndicators.includes('boll')) {
      const bollValues = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
      const bollData = data.slice(data.length - bollValues.length);
      addLine('Boll Upper', bollData.map((d, i) => ({ time: d.time, value: bollValues[i].upper })), '#9C27B0', 1);
      addLine('Boll Lower', bollData.map((d, i) => ({ time: d.time, value: bollValues[i].lower })), '#9C27B0', 1);
    }

    // Oscillators usually need a separate pane, but for this demo we'll overlay them or just log them
    // In a real app, we'd add another chart instance below for oscillators.
    // Let's implement a simple "Indicator Stats" panel instead of cluttering the main chart with non-price indicators.

  }, [data, activeIndicators]);

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#D1D4DC] font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-[#1F2226] bg-[#161A1E] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-black w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">QuantView</h1>
          </div>

          <div className="h-6 w-px bg-[#1F2226]" />

          {/* Exchange Selector */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#0B0E11] rounded-lg p-1 border border-[#1F2226]">
              {EXCHANGES.slice(0, 4).map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setExchange(ex.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    exchange === ex.id 
                    ? 'bg-[#2B2F36] text-white shadow-sm' 
                    : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2B2F36] rounded-lg border border-[#1F2226]">
            <Globe className="w-4 h-4 text-[#848E9C]" />
            <span className="text-sm font-medium text-white">{symbol}</span>
            <ChevronDown className="w-4 h-4 text-[#848E9C]" />
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-[#2B2F36] rounded-lg transition-colors">
            <RefreshCw className={`w-5 h-5 text-[#848E9C] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 hover:bg-[#2B2F36] rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-[#848E9C]" />
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto grid grid-cols-12 gap-6">
        {/* Left Sidebar: Controls */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Market Info Card */}
          <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#848E9C]">Market Info</h2>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#848E9C] mb-1 block">Symbol</label>
                <input 
                  type="text" 
                  value={symbol} 
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[#0B0E11] border border-[#1F2226] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#848E9C] mb-1 block">Interval</label>
                <div className="grid grid-cols-3 gap-2">
                  {INTERVALS.map(i => (
                    <button
                      key={i}
                      onClick={() => setInterval(i)}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        interval === i 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                        : 'bg-[#0B0E11] border-[#1F2226] text-[#848E9C] hover:border-[#474D57]'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Indicators Card */}
          <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#848E9C]">Indicators</h2>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="space-y-2">
              {INDICATORS.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => toggleIndicator(ind.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    activeIndicators.includes(ind.id)
                    ? 'bg-[#2B2F36] text-white'
                    : 'text-[#848E9C] hover:bg-[#2B2F36]/50'
                  }`}
                >
                  <span>{ind.name}</span>
                  <div className={`w-2 h-2 rounded-full ${activeIndicators.includes(ind.id) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-[#474D57]'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-4 bg-[#161A1E]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1F2226]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{exchange.toUpperCase()}</span>
                <span className="text-xs text-[#848E9C]">{symbol}</span>
                <span className="text-xs text-emerald-500">{interval}</span>
              </div>
              <div className="h-3 w-px bg-[#1F2226]" />
              <div className="flex items-center gap-3">
                {activeIndicators.map(id => (
                  <span key={id} className="text-[10px] uppercase font-bold text-blue-400">{id}</span>
                ))}
              </div>
            </div>
            
            <div ref={chartContainerRef} className="w-full h-[500px]" />
            
            {loading && (
              <div className="absolute inset-0 bg-[#0B0E11]/50 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                  <span className="text-sm font-medium text-[#848E9C]">Syncing Market Data...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase text-[#848E9C]">Volume Analysis</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-mono font-bold text-white">
                  {data.length > 0 ? (data[data.length-1].volume).toLocaleString() : '0'}
                </span>
                <span className="text-xs text-[#848E9C] mb-1">24h Vol</span>
              </div>
            </div>

            <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-bold uppercase text-[#848E9C]">Volatility (ATR)</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-mono font-bold text-white">
                  {data.length > 14 ? ATR.calculate({ high: data.map(d=>d.high), low: data.map(d=>d.low), close: data.map(d=>d.close), period: 14 }).pop()?.toFixed(2) : 'N/A'}
                </span>
                <span className="text-xs text-[#848E9C] mb-1">Normal Range</span>
              </div>
            </div>

            <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase text-[#848E9C]">Momentum (RSI)</h3>
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-mono font-bold ${
                  data.length > 14 && RSI.calculate({ values: data.map(d=>d.close), period: 14 }).pop()! > 70 ? 'text-red-500' : 
                  data.length > 14 && RSI.calculate({ values: data.map(d=>d.close), period: 14 }).pop()! < 30 ? 'text-emerald-500' : 'text-white'
                }`}>
                  {data.length > 14 ? RSI.calculate({ values: data.map(d=>d.close), period: 14 }).pop()?.toFixed(2) : 'N/A'}
                </span>
                <span className="text-xs text-[#848E9C] mb-1">Relative Strength</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#1F2226] bg-[#161A1E] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[#474D57]">
          <span>System Status: <span className="text-emerald-500">Operational</span></span>
          <div className="w-1 h-1 rounded-full bg-[#474D57]" />
          <span>API Latency: 42ms</span>
          <div className="w-1 h-1 rounded-full bg-[#474D57]" />
          <span>Last Update: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[10px] font-bold uppercase text-[#848E9C] hover:text-white transition-colors">Documentation</button>
          <button className="text-[10px] font-bold uppercase text-[#848E9C] hover:text-white transition-colors">API Keys</button>
        </div>
      </footer>
    </div>
  );
}
