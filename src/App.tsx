import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import axios from 'axios';
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
  Globe,
  Maximize2
} from 'lucide-react';

// Dashboard Components
import { translations, Language } from './translations';

// --- API Client with Auth ---
const apiClient = axios.create({
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY || '',
  },
});

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
  { id: 'aster', name: 'Aster', icon: '' },
  { id: 'bitget', name: 'Bitget', icon: 'https://cryptologos.cc/logos/bitget-token-bgb-logo.png' },
  { id: 'kucoin', name: 'KuCoin', icon: 'https://cryptologos.cc/logos/kucoin-token-kcs-logo.png' },
  { id: 'weex', name: 'Weex', icon: '' },
  { id: 'hyperliquid', name: 'Hyperliquid', icon: 'https://hyperliquid.xyz/favicon.ico' },
  { id: 'binance', name: 'Binance', icon: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png' },
];

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

// Helper function to get timestamp (ms) for API calls
const getEndTimeMs = () => Date.now().toString();

// Extract base coin from symbol (e.g., BTCUSDT -> BTC)
const getBaseCoin = (symbol: string) => symbol.replace('USDT', '').replace('BUSD', '');

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'DOGEUSDT', 'LINKUSDT',
  'MATICUSDT', 'UNIUSDT', 'LTCUSDT', 'BCHUSDT', 'NEARUSDT'
];

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
  
  // Refs for sub-charts
  const subChartsRef = useRef<{ [key: string]: any }>({});
  const subChartContainersRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const subChartSeriesRef = useRef<{ [key: string]: any }>({});

  const [exchange, setExchange] = useState('binance');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [klineInterval, setKLineInterval] = useState('1h');
  const [data, setData] = useState<KLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['sma', 'rsi']);
  const [language, setLanguage] = useState<Language>('en');

  const t = translations[language];

  // Analytical Data State
  const [oiData, setOiData] = useState<any[]>([]);

  // --- Health Check ---
  useEffect(() => {
    apiClient.get('/health')
      .then(r => console.log('Backend Health Check:', r.data))
      .catch(e => console.error('Backend Health Check Failed:', e.message));
  }, []);

  // --- Fetch Cycle Indicators (aggregate from multiple endpoints) ---
  const fetchCycleIndicators = async (): Promise<any[]> => {
    try {
      const [ahr999Res, puellRes, piCycleRes, twoYearMARes] = await Promise.all([
        apiClient.get('/api/v1/coinank/indicator/ahr999', { params: { limit: 2 } }),
        apiClient.get('/api/v1/coinank/indicator/puell', { params: { limit: 2 } }),
        apiClient.get('/api/v1/coinank/indicator/pi-cycle', { params: { limit: 2 } }),
        apiClient.get('/api/v1/coinank/indicator/two-year-ma', { params: { limit: 2 } }),
      ]);

      // Helper to extract value and yesterday from API response
      const extractIndicatorData = (data: any, name: string, statusMap: (val: number) => { status: string; color: string }) => {
        // CoinAnk API typically returns array of data points
        const items = Array.isArray(data) ? data : (data.data?.list || data.list || []);
        if (items.length >= 2) {
          const current = parseFloat(items[0].value || items[0].v || items[0]);
          const yesterday = parseFloat(items[1].value || items[1].v || items[1]);
          const { status, color } = statusMap(current);
          return { name, value: current, yesterday, status, color };
        } else if (items.length === 1) {
          const current = parseFloat(items[0].value || items[0].v || items[0]);
          const { status, color } = statusMap(current);
          return { name, value: current, yesterday: current, status, color };
        }
        return null;
      };

      // Status determination functions
      const ahr999Status = (val: number) => {
        if (val < 0.45) return { status: 'Buy', color: 'emerald' };
        if (val < 1.2) return { status: 'Accumulate', color: 'blue' };
        return { status: 'Hold', color: 'gray' };
      };
      const puellStatus = (val: number) => {
        if (val < 1) return { status: 'Accumulate', color: 'emerald' };
        if (val < 2) return { status: 'Neutral', color: 'gray' };
        return { status: 'Caution', color: 'gray' };
      };
      const piCycleStatus = (val: number) => {
        return { status: val > 0.9 ? 'Caution' : 'Safe', color: val > 0.9 ? 'gray' : 'emerald' };
      };
      const twoYearMAStatus = (val: number) => {
        if (val < 1) return { status: 'Buy', color: 'emerald' };
        if (val < 1.5) return { status: 'Hold', color: 'blue' };
        return { status: 'Sell', color: 'gray' };
      };

      const indicators = [
        extractIndicatorData(ahr999Res.data, 'AHR999', ahr999Status),
        extractIndicatorData(puellRes.data, 'Puell Multiple', puellStatus),
        extractIndicatorData(piCycleRes.data, 'Pi-Cycle', piCycleStatus),
        extractIndicatorData(twoYearMARes.data, '2Y MA Multiplier', twoYearMAStatus),
      ].filter(Boolean);

      return indicators;
    } catch (e: any) {
      console.error('Failed to fetch cycle indicators:', e.message || e);
      return [];
    }
  };

  // --- Fetch Long/Short Ratios (aggregate from multiple endpoints) ---
  const fetchLongShortRatios = async (): Promise<any[]> => {
    try {
      const endTime = getEndTimeMs();
      const exchangeName = exchange.charAt(0).toUpperCase() + exchange.slice(1);
      const [topTraderRes, accountRes] = await Promise.all([
        apiClient.get('/api/v1/coinank/long-short/top-trader', {
          params: { symbol, exchange: exchangeName, interval: klineInterval, endTime, size: 24 }
        }),
        apiClient.get('/api/v1/coinank/long-short/account', {
          params: { symbol, exchange: exchangeName, interval: klineInterval, endTime, size: 24 }
        }),
      ]);

      // API returns: { data: { tss: [...], longShortRatio: [...] } }
      const topTraderData = topTraderRes.data?.data || topTraderRes.data;
      const accountData = accountRes.data?.data || accountRes.data;

      // Convert to chart format
      if (topTraderData?.tss && topTraderData?.longShortRatio) {
        const mergedData = topTraderData.tss.map((ts: number, i: number) => ({
          time: ts,
          topTrader: topTraderData.longShortRatio[i] || 1,
          retail: accountData?.longShortRatio?.[i] || topTraderData.longShortRatio[i] || 1,
        }));
        return mergedData;
      }

      return [];
    } catch (e: any) {
      console.error('Failed to fetch long/short ratios:', e.message || e);
      return [];
    }
  };

  // --- Analytical Data Fetching ---
  const fetchAnalyticalData = async () => {
    try {
      const endTime = getEndTimeMs();
      const baseCoin = getBaseCoin(symbol);

      // Fetch endpoints with proper parameters
      const [fg, cf, fh, oi, lo, hm] = await Promise.all([
        apiClient.get('/api/v1/coinank/indicator/fear-greed'),
        apiClient.get('/api/v1/coinank/capital-flow/history', {
          params: { baseCoin, productType: 'SWAP', interval: klineInterval, endTime, size: 24 }
        }),
        apiClient.get('/api/v1/coinank/funding-rate/heatmap', {
          params: { type: 'marketCap', interval: '1M' }
        }),
        apiClient.get('/api/v1/coinank/open-interest/agg-kline', {
          params: { baseCoin: getBaseCoin(symbol), interval: klineInterval, endTime, size: 24 }
        }),
        // Note: liquidation/agg-map is disabled due to CoinAnk plan limitation
        apiClient.get('/api/v1/coinank/large-order/market', {
          params: { symbol, productType: 'SWAP', amount: 10000000, endTime, size: 10 }
        }),
        apiClient.get('/api/v1/coinank/order-book/heatmap', {
          params: { symbol, exchange: exchange.charAt(0).toUpperCase() + exchange.slice(1), interval: '1m', endTime, size: 10 }
        }),
      ]);

      // Extract fear & greed data
      // API returns: { success, code, data: { timeList: [...], cnnValueList: [...] } }
      const fearGreedApiData = fg.data || fg;
      if (fearGreedApiData?.cnnValueList?.length > 0) {
        const latestValue = fearGreedApiData.cnnValueList[fearGreedApiData.cnnValueList.length - 1];
        setFearGreed({ value: Math.round(latestValue), label: latestValue < 25 ? 'Extreme Fear' : latestValue < 50 ? 'Fear' : latestValue < 75 ? 'Greed' : 'Extreme Greed' });
      }

      // Extract capital flow data
      // CoinAnk API 返回格式: { success: true, code: "1", data: [...] }
      const capitalFlowData = Array.isArray(cf) ? cf : (Array.isArray(cf.data) ? cf.data : []);
      setCapitalFlow(capitalFlowData);

      // Extract funding heatmap data
      // API returns: { success, code, data: { dateList, coinList, dataResult } }
      if (fh.data?.dateList && fh.data?.coinList && fh.data?.dataResult) {
        setFundingHeatmap(fh.data);
      } else if (fh.dateList && fh.coinList && fh.dataResult) {
        setFundingHeatmap(fh);
      }

      // Extract OI data
      const oiData = Array.isArray(oi) ? oi : (oi.data?.list || []);
      setOiData(oiData);

      // Note: liquidation/agg-map endpoint is disabled due to CoinAnk plan limitation
      setLiquidationData([]);

      // Extract large orders
      // API returns: { data: [{ exchangeName, baseCoin, side, price, tradeTurnover, ts, symbol }] }
      const ordersRaw = lo.data || lo;
      if (Array.isArray(ordersRaw) && ordersRaw.length > 0) {
        const formattedOrders = ordersRaw.map((order: any, index: number) => ({
          id: index,
          symbol: order.symbol || 'BTCUSDT',
          side: order.side || 'BUY',
          amount: `$${(order.tradeTurnover / 1e6).toFixed(2)}M`,
          time: new Date(order.ts).toLocaleTimeString(),
          price: order.price?.toFixed(2) || '0',
        }));
        setLargeOrders(formattedOrders);
      }

      // Extract heatmap data
      // API returns: { data: [{ ts, bids: { counts, prices }, asks: { counts, prices } }] }
      const heatmapRaw = hm.data || hm;
      if (Array.isArray(heatmapRaw) && heatmapRaw.length > 0) {
        const formattedHeatmap = heatmapRaw.map((item: any) => ({
          time: item.ts,
          levels: [
            ...(item.bids?.prices?.map((p: number, i: number) => ({
              price: p,
              intensity: (item.bids?.counts?.[i] || 0) / 1000,
            })) || []),
            ...(item.asks?.prices?.map((p: number, i: number) => ({
              price: p,
              intensity: (item.asks?.counts?.[i] || 0) / 1000,
            })) || []),
          ].sort((a, b) => a.price - b.price),
        }));
        setHeatmapData(formattedHeatmap);
      }

      // Fetch aggregated data separately
      const [cycleIndicators, longShortRatios] = await Promise.all([
        fetchCycleIndicators(),
        fetchLongShortRatios(),
      ]);

      setCycleIndicators(cycleIndicators);
      setLongShortData(longShortRatios);

    } catch (e: any) {
      console.error('Failed to fetch analytical data:', e.message || e, e.config?.url);
    }
  };

  useEffect(() => {
    fetchAnalyticalData();
    const intervalId = setInterval(() => {
      fetchAnalyticalData();
    }, 30000); // Poll every 30s
    return () => clearInterval(intervalId);
  }, [symbol, exchange, klineInterval]);

  // --- Indicators Calculation ---
  const indicatorData = useMemo(() => {
    if (data.length < 30) return null;

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    const results: any = {};

    try {
      if (activeIndicators.includes('rsi')) {
        const rsiValues = RSI.calculate({ values: closes, period: 14 });
        results.rsi = data.slice(data.length - rsiValues.length).map((d, i) => ({ time: d.time, value: rsiValues[i] }));
      }
      if (activeIndicators.includes('atr')) {
        const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
        results.atr = data.slice(data.length - atrValues.length).map((d, i) => ({ time: d.time, value: atrValues[i] }));
      }
      if (activeIndicators.includes('macd')) {
        const macdValues = MACD.calculate({ 
          values: closes, 
          fastPeriod: 12, 
          slowPeriod: 26, 
          signalPeriod: 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        });
        const macdData = data.slice(data.length - macdValues.length);
        results.macd = {
          macd: macdData.map((d, i) => ({ time: d.time, value: macdValues[i].MACD })),
          signal: macdData.map((d, i) => ({ time: d.time, value: macdValues[i].signal })),
          histogram: macdData.map((d, i) => ({ time: d.time, value: macdValues[i].histogram }))
        };
      }
      if (activeIndicators.includes('adx')) {
        const adxValues = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
        results.adx = data.slice(data.length - adxValues.length).map((d, i) => ({ time: d.time, value: adxValues[i].adx }));
      }
      if (activeIndicators.includes('cci')) {
        const cciValues = CCI.calculate({ high: highs, low: lows, close: closes, period: 20 });
        results.cci = data.slice(data.length - cciValues.length).map((d, i) => ({ time: d.time, value: cciValues[i] }));
      }
      if (activeIndicators.includes('obv')) {
        const obvValues = OBV.calculate({ close: closes, volume: volumes });
        results.obv = data.slice(data.length - obvValues.length).map((d, i) => ({ time: d.time, value: obvValues[i] }));
      }
    } catch (e) {
      console.error('Indicator calculation error:', e);
    }

    return results;
  }, [data, activeIndicators]);

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/klines`, {
        params: { exchange, symbol, interval: klineInterval }
      });
      if (Array.isArray(response.data)) {
        setData(response.data);
      }
    } catch (error: any) {
      console.error('Fetch error:', error.message || error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [exchange, symbol, klineInterval]);

  // --- Chart Initialization ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cleanup main chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Cleanup sub-charts
    Object.values(subChartsRef.current).forEach(c => (c as any)?.remove());
    subChartsRef.current = {};
    subChartSeriesRef.current = {};

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = 500;

    const chartOptions: any = {
      width,
      height,
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: '#161A1E' },
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: '#1F2226' },
        horzLines: { color: '#1F2226' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: '#1F2226',
        timeVisible: true,
        secondsVisible: false,
      },
    };

    try {
      const chart = LightweightCharts.createChart(container, chartOptions);
      chartRef.current = chart;

      const candlestickOptions = {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      };

      let candleSeries;
      if (typeof (chart as any).addCandlestickSeries === 'function') {
        candleSeries = (chart as any).addCandlestickSeries(candlestickOptions);
      } else {
        candleSeries = (chart as any).addSeries((LightweightCharts as any).CandlestickSeries, candlestickOptions);
      }
      candleSeriesRef.current = candleSeries;

      // Handle Sub-Charts for Oscillators
      const activeOscillators = INDICATORS.filter(ind => ind.type === 'oscillator' && activeIndicators.includes(ind.id));
      
      activeOscillators.forEach(osc => {
        const subContainer = subChartContainersRef.current[osc.id];
        if (!subContainer) return;

        const subChart = LightweightCharts.createChart(subContainer, {
          ...chartOptions,
          height: 150,
          timeScale: {
            ...chartOptions.timeScale,
            visible: false, // Hide timescale for sub-charts
          }
        });

        subChartsRef.current[osc.id] = subChart;

        // Sync timescale
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          subChart.timeScale().setVisibleLogicalRange(range as any);
        });
        subChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          chart.timeScale().setVisibleLogicalRange(range as any);
        });

        // Add series based on type
        if (osc.id === 'macd') {
          subChartSeriesRef.current.macd_line = subChart.addSeries((LightweightCharts as any).LineSeries, { color: '#2196F3', lineWidth: 1, title: 'MACD' });
          subChartSeriesRef.current.macd_signal = subChart.addSeries((LightweightCharts as any).LineSeries, { color: '#FF9800', lineWidth: 1, title: 'Signal' });
          subChartSeriesRef.current.macd_hist = subChart.addSeries((LightweightCharts as any).HistogramSeries, { color: '#26a69a', title: 'Hist' });
        } else {
          const color = osc.id === 'rsi' ? '#9C27B0' : osc.id === 'adx' ? '#FF5722' : '#4CAF50';
          subChartSeriesRef.current[osc.id] = subChart.addSeries((LightweightCharts as any).LineSeries, { color, lineWidth: 2, title: osc.name });
        }
      });

      // Resize observer
      const handleResize = () => {
        if (container) {
          const newWidth = container.clientWidth;
          chart.applyOptions({ width: newWidth });
          Object.values(subChartsRef.current).forEach(c => (c as any).applyOptions({ width: newWidth }));
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        try {
          chart.remove();
        } catch (e) {}
        chartRef.current = null;
        candleSeriesRef.current = null;
        Object.values(subChartsRef.current).forEach(c => {
          try {
            (c as any)?.remove();
          } catch (e) {}
        });
        subChartsRef.current = {};
        subChartSeriesRef.current = {};
        indicatorSeriesRef.current = {};
      };
    } catch (err: any) {
      console.error('Error during chart initialization:', err.message || err);
    }
  }, [exchange, activeIndicators]);

  // --- Indicators Calculation & Rendering ---
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    
    if (!candleSeries || data.length === 0 || !chart) return;

    // Helper to safely set data
    const safeSetData = (series: any, data: any[]) => {
      try {
        series.setData(data);
      } catch (e) {
        console.warn('Failed to set data on series (likely disposed):', e);
      }
    };

    // Clear previous indicator series
    Object.values(indicatorSeriesRef.current).forEach(s => {
      try {
        chart.removeSeries(s);
      } catch (e) {}
    });
    indicatorSeriesRef.current = {};

    // Update main candles
    safeSetData(candleSeries, data);

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // Helper to add line series
    const addLine = (name: string, lineData: any[], color: string, width = 2) => {
      const lineOptions = { color, lineWidth: width, title: name };
      let series;
      try {
        if (typeof (chart as any).addLineSeries === 'function') {
          series = (chart as any).addLineSeries(lineOptions);
        } else {
          series = (chart as any).addSeries((LightweightCharts as any).LineSeries, lineOptions);
        }
        
        if (series) {
          safeSetData(series, lineData);
          indicatorSeriesRef.current[name] = series;
        }
      } catch (e) {
        console.warn(`Failed to add line series ${name}:`, e);
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

    if (activeIndicators.includes('vwap')) {
      const vwapValues = VWAP.calculate({ high: highs, low: lows, close: closes, volume: volumes });
      const vwapData = data.slice(data.length - vwapValues.length).map((d, i) => ({ time: d.time, value: vwapValues[i] }));
      addLine('VWAP', vwapData, '#FFEB3B');
    }

    // Update Sub-Charts Data
    if (indicatorData) {
      Object.keys(indicatorData).forEach(key => {
        const series = subChartSeriesRef.current[key];
        const val = indicatorData[key];
        if (key === 'macd') {
          if (subChartSeriesRef.current.macd_line) safeSetData(subChartSeriesRef.current.macd_line, val.macd);
          if (subChartSeriesRef.current.macd_signal) safeSetData(subChartSeriesRef.current.macd_signal, val.signal);
          if (subChartSeriesRef.current.macd_hist) {
            safeSetData(subChartSeriesRef.current.macd_hist, val.histogram.map((h: any) => ({
              ...h,
              color: h.value >= 0 ? '#26a69a' : '#ef5350'
            })));
          }
        } else if (series) {
          safeSetData(series, val);
        }
      });
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
      <header className="border-b border-[#1F2226] bg-[#161A1E] px-6 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <TrendingUp className="text-black w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">{t.title} <span className="text-[10px] font-normal text-[#848E9C] ml-1">{t.pro}</span></h1>
          </div>

          <div className="h-6 w-px bg-[#1F2226]" />

          {/* Global Filters */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0E11] rounded-lg border border-[#1F2226] hover:border-emerald-500 transition-all">
                <span className="text-xs font-bold text-[#848E9C] uppercase">{language === 'en' ? 'Lang' : '语言'}</span>
                <span className="text-xs font-medium text-white">
                  {language === 'en' ? 'English' : '简体中文'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#848E9C]" />
              </button>
              <div className="absolute left-0 mt-2 w-32 bg-[#161A1E] border border-[#1F2226] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] py-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-[#2B2F36] transition-colors ${language === 'en' ? 'text-emerald-500 font-bold' : 'text-[#848E9C]'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('zh')}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-[#2B2F36] transition-colors ${language === 'zh' ? 'text-emerald-500 font-bold' : 'text-[#848E9C]'}`}
                >
                  简体中文
                </button>
              </div>
            </div>

            {/* Exchange Selector */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0E11] rounded-lg border border-[#1F2226] hover:border-emerald-500 transition-all">
                <span className="text-xs font-bold text-[#848E9C] uppercase">{t.exchange}</span>
                <span className="text-xs font-medium text-white">
                  {EXCHANGES.find(ex => ex.id === exchange)?.name || exchange}
                </span>
                <ChevronDown className="w-3 h-3 text-[#848E9C]" />
              </button>
              <div className="absolute left-0 mt-2 w-40 bg-[#161A1E] border border-[#1F2226] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] py-2">
                {EXCHANGES.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => setExchange(ex.id)}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-[#2B2F36] transition-colors ${exchange === ex.id ? 'text-emerald-500 font-bold' : 'text-[#848E9C]'}`}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Symbol Selector */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0E11] rounded-lg border border-[#1F2226] hover:border-emerald-500 transition-all">
                <Globe className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-bold text-[#848E9C] uppercase">{t.asset}</span>
                <span className="text-xs font-medium text-white">{symbol}</span>
                <ChevronDown className="w-3 h-3 text-[#848E9C]" />
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-[#161A1E] border border-[#1F2226] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] py-2 max-h-[300px] overflow-y-auto">
                {SYMBOLS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSymbol(s)}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-[#2B2F36] transition-colors ${symbol === s ? 'text-emerald-500 font-bold' : 'text-[#848E9C]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval Selector */}
            <div className="flex bg-[#0B0E11] rounded-lg p-1 border border-[#1F2226]">
              {INTERVALS.map(i => (
                <button
                  key={i}
                  onClick={() => setKLineInterval(i)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                    klineInterval === i 
                    ? 'bg-[#2B2F36] text-emerald-500 shadow-sm' 
                    : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t.liveMarket}</span>
          </div>
          <button onClick={() => { fetchData(); fetchAnalyticalData(); }} className="p-2 hover:bg-[#2B2F36] rounded-lg transition-colors group">
            <RefreshCw className={`w-5 h-5 text-[#848E9C] group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 hover:bg-[#2B2F36] rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-[#848E9C]" />
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1800px] mx-auto space-y-6">
        
        {/* Module: Derivatives & Open Interest */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">{t.derivativesOI}</h2>
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-9 space-y-6">
              <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl overflow-hidden shadow-2xl relative">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-4 bg-[#161A1E]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1F2226]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{exchange.toUpperCase()}</span>
                    <span className="text-xs text-[#848E9C]">{symbol}</span>
                    <span className="text-xs text-emerald-500">{klineInterval}</span>
                  </div>
                  <div className="h-3 w-px bg-[#1F2226]" />
                  <div className="flex items-center gap-3">
                    {activeIndicators.map(id => (
                      <span key={id} className="text-[10px] uppercase font-bold text-blue-400">{id}</span>
                    ))}
                  </div>
                </div>
                
                <div ref={chartContainerRef} className="w-full h-[500px]" />
                
                {/* Sub-Charts for Oscillators */}
                <div className="flex flex-col border-t border-[#1F2226]">
                  {INDICATORS.filter(ind => ind.type === 'oscillator' && activeIndicators.includes(ind.id)).map(osc => (
                    <div key={osc.id} className="relative border-b border-[#1F2226] last:border-b-0">
                      <div className="absolute top-2 left-4 z-10 bg-[#161A1E]/80 px-2 py-0.5 rounded text-[10px] font-bold text-[#848E9C] uppercase border border-[#1F2226]">
                        {osc.name}
                      </div>
                      <div 
                        ref={el => subChartContainersRef.current[osc.id] = el} 
                        className="w-full h-[150px]" 
                      />
                    </div>
                  ))}
                </div>
                
                {loading && (
                  <div className="absolute inset-0 bg-[#0B0E11]/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                      <span className="text-sm font-medium text-[#848E9C]">{t.syncing}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-3 space-y-6">
              <div className="bg-[#161A1E] border border-[#1F2226] rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-[#848E9C] uppercase">{t.indicatorControls}</h3>
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
                      <span className="text-xs">{ind.name}</span>
                      <div className={`w-2 h-2 rounded-full ${activeIndicators.includes(ind.id) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-[#474D57]'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#1F2226] bg-[#161A1E] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[#474D57]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t.systemOperational}</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-[#474D57]" />
          <span>{t.apiLatency}: 42ms</span>
          <div className="w-1 h-1 rounded-full bg-[#474D57]" />
          <span>{t.lastUpdate}: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[10px] font-bold uppercase text-[#848E9C] hover:text-white transition-colors">{t.documentation}</button>
          <button className="text-[10px] font-bold uppercase text-[#848E9C] hover:text-white transition-colors">{t.apiKeys}</button>
          <div className="h-4 w-px bg-[#1F2226]" />
          <span className="text-[10px] text-[#474D57]">© 2026 QuantView Pro</span>
        </div>
      </footer>
    </div>
  );
}
