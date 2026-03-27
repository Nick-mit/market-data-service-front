import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  const apiRouter = express.Router();

  apiRouter.use((req, res, next) => {
    console.log(`[API Router] ${req.method} ${req.url}`);
    next();
  });

  apiRouter.get("/klines", async (req, res) => {
    const { exchange = "binance", symbol = "BTCUSDT", interval = "1h", limit = "100" } = req.query;
    console.log(`[API] Klines: ${exchange} ${symbol} ${interval}`);

    try {
      let data = [];
      if (exchange === "binance") {
        const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
          params: { symbol: (symbol as string).toUpperCase(), interval, limit }
        });
        data = response.data.map((d: any) => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));
      } else if (exchange === "kucoin") {
        const kucoinIntervals: any = { "1m": "1min", "5m": "5min", "15m": "15min", "1h": "1hour", "4h": "4hour", "1d": "1day" };
        const kInterval = kucoinIntervals[interval as string] || "1hour";
        const response = await axios.get(`https://api.kucoin.com/api/v1/market/candles`, {
          params: { symbol: (symbol as string).replace("USDT", "-USDT"), type: kInterval }
        });
        data = response.data.data.map((d: any) => ({
          time: parseInt(d[0]),
          open: parseFloat(d[1]),
          close: parseFloat(d[2]),
          high: parseFloat(d[3]),
          low: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        })).reverse();
      } else if (exchange === "bitget") {
        const response = await axios.get(`https://api.bitget.com/api/v2/spot/market/history-candles`, {
          params: { symbol: (symbol as string).toUpperCase(), granularity: interval, limit }
        });
        data = response.data.data.map((d: any) => ({
          time: parseInt(d[0]) / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));
      } else if (exchange === "hyperliquid") {
        const response = await axios.post(`https://api.hyperliquid.xyz/info`, {
          type: "candleSnapshot",
          req: { coin: (symbol as string).replace("USDT", ""), interval, startTime: Date.now() - 1000 * 60 * 60 * 24 * 7 }
        });
        data = response.data.map((d: any) => ({
          time: d.t / 1000,
          open: parseFloat(d.o),
          high: parseFloat(d.h),
          low: parseFloat(d.l),
          close: parseFloat(d.c),
          volume: parseFloat(d.v),
        }));
      } else {
        // Mock data generator for Aster/Weex
        const now = Math.floor(Date.now() / 1000);
        const intervalSec = interval === "1m" ? 60 : interval === "1h" ? 3600 : 86400;
        let lastPrice = 65000 + Math.random() * 1000;
        data = Array.from({ length: parseInt(limit as string) }).map((_, i) => {
          const open = lastPrice;
          const close = open + (Math.random() - 0.5) * 200;
          const high = Math.max(open, close) + Math.random() * 50;
          const low = Math.min(open, close) - Math.random() * 50;
          lastPrice = close;
          return {
            time: now - (parseInt(limit as string) - i) * intervalSec,
            open, high, low, close,
            volume: Math.random() * 100
          };
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching klines:", error.message);
      res.status(500).json({ error: "Failed to fetch data from exchange" });
    }
  });

  // 1. Fear & Greed Index
  apiRouter.get("/v1/coinank/indicator/fear-greed", (req, res) => {
    res.json({ value: 65 + Math.floor(Math.random() * 10), label: "Greed", timestamp: Date.now() });
  });

  // 2. Capital Flow History
  apiRouter.get("/v1/coinank/capital-flow/history", (req, res) => {
    const data = Array.from({ length: 24 }).map((_, i) => ({
      time: Date.now() - (24 - i) * 3600000,
      netFlow: (Math.random() - 0.4) * 500,
      price: 60000 + Math.random() * 5000
    }));
    res.json(data);
  });

  // 3. Cycle Indicators
  apiRouter.get("/v1/coinank/cycle-indicators", (req, res) => {
    res.json([
      { name: "ahr999", value: 1.25, yesterday: 1.20, status: "Invest", color: "emerald" },
      { name: "Pi-Cycle", value: 0.85, yesterday: 0.84, status: "Accumulate", color: "blue" },
      { name: "Puell Multiple", value: 1.12, yesterday: 1.15, status: "Neutral", color: "gray" },
      { name: "2Y MA Multiplier", value: 0.95, yesterday: 0.96, status: "Buy", color: "emerald" }
    ]);
  });

  // 4. Funding Rate Heatmap
  apiRouter.get("/v1/coinank/funding-rate/heatmap", (req, res) => {
    const coins = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOT"];
    const times = Array.from({ length: 12 }).map((_, i) => i + "h ago");
    const data = coins.map(coin => ({
      coin,
      values: times.map(() => (Math.random() * 0.02 - 0.005).toFixed(4))
    }));
    res.json({ coins, times, data });
  });

  // 5. Open Interest Aggregated
  apiRouter.get("/v1/coinank/open-interest/agg-kline", (req, res) => {
    const data = Array.from({ length: 50 }).map((_, i) => ({
      time: Date.now() - (50 - i) * 3600000,
      oi: 15000 + Math.random() * 2000,
      price: 60000 + Math.random() * 5000
    }));
    res.json(data);
  });

  // 6. Liquidation Map
  apiRouter.get("/v1/coinank/liquidation/agg-map", (req, res) => {
    const currentPrice = 65000;
    const data = Array.from({ length: 40 }).map((_, i) => {
      const price = currentPrice - 2000 + i * 100;
      return {
        price,
        amount: Math.random() * 50,
        type: price > currentPrice ? "short" : "long"
      };
    });
    res.json(data);
  });

  // 7. Orderbook Heatmap
  apiRouter.get("/v1/coinank/order-book/heatmap", (req, res) => {
    const currentPrice = 65000;
    const priceLevels = Array.from({ length: 20 }).map((_, i) => currentPrice - 500 + i * 50);
    const timeSteps = Array.from({ length: 30 }).map((_, i) => i);
    const heatmap = timeSteps.map(t => ({
      time: t,
      levels: priceLevels.map(p => ({
        price: p,
        intensity: Math.random()
      }))
    }));
    res.json(heatmap);
  });

  // 8. Long/Short Ratios
  apiRouter.get("/v1/coinank/long-short/ratios", (req, res) => {
    const data = Array.from({ length: 24 }).map((_, i) => ({
      time: Date.now() - (24 - i) * 3600000,
      topTrader: 1.2 + Math.random() * 0.5,
      retail: 0.8 + Math.random() * 0.4
    }));
    res.json(data);
  });

  // 9. Large Orders
  apiRouter.get("/v1/coinank/large-order/market", (req, res) => {
    const orders = [
      { id: 1, symbol: "BTCUSDT", side: "BUY", amount: "1.2M", time: "12:05:01", price: "65230" },
      { id: 2, symbol: "ETHUSDT", side: "SELL", amount: "850K", time: "12:04:45", price: "3450" },
      { id: 3, symbol: "SOLUSDT", side: "BUY", amount: "2.1M", time: "12:04:12", price: "145.2" },
      { id: 4, symbol: "BTCUSDT", side: "SELL", amount: "3.5M", time: "12:03:55", price: "65190" },
    ];
    res.json(orders);
  });

  // 10. Tushare Smart Money (Northbound Funds)
  apiRouter.get("/v1/tushare/smart-money", (req, res) => {
    const data = Array.from({ length: 30 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (30 - i));
      return {
        date: date.toISOString().split('T')[0],
        index: 3000 + Math.sin(i / 5) * 200 + Math.random() * 50,
        inflow: (Math.random() - 0.4) * 5000 // Net inflow in Millions
      };
    });
    res.json(data);
  });

  // 11. Stock Screener - Scan
  apiRouter.post("/v1/stock/cnstock/screener", (req, res) => {
    const { pagination = { page: 1, size: 20 }, sort = { field: 'rs', order: 'desc' } } = req.body;
    const { page, size } = pagination;
    
    // Generate full list first to allow sorting and filtering
    let allItems = Array.from({ length: 128 }).map((_, i) => {
      const id = i + 1;
      const tsCode = `${String(id).padStart(6, '0')}.${Math.random() > 0.5 ? 'SZ' : 'SH'}`;
      const names = ["平安银行", "万科A", "中信证券", "格力电器", "美的集团", "招商银行", "五粮液", "贵州茅台", "伊利股份", "海康威视"];
      const industries = ["银行", "房地产", "证券", "家电", "白酒", "食品", "安防"];
      const name = names[id % names.length];
      const industry = industries[id % industries.length];
      const close = 10 + Math.random() * 100;
      const changeRate = (Math.random() - 0.4) * 10;
      const marketCap = 50 + Math.random() * 5000;
      
      return {
        tsCode,
        name,
        industry,
        close: parseFloat(close.toFixed(2)),
        changeRate: parseFloat(changeRate.toFixed(2)),
        marketCap: parseFloat(marketCap.toFixed(2)),
        fundamental: { 
          roe: parseFloat((5 + Math.random() * 20).toFixed(1)), 
          peTtm: parseFloat((5 + Math.random() * 50).toFixed(1)), 
          pb: parseFloat((0.5 + Math.random() * 5).toFixed(1)) 
        },
        liquidity: { 
          turnoverRate: parseFloat((0.5 + Math.random() * 10).toFixed(1)), 
          amount: Math.floor(Math.random() * 500000), 
          northRatio: parseFloat((0.1 + Math.random() * 5).toFixed(1)), 
          northNetBuy: Math.floor((Math.random() - 0.3) * 10000) 
        },
        technical: { 
          ma50: parseFloat((close * (0.9 + Math.random() * 0.2)).toFixed(2)), 
          ma200: parseFloat((close * (0.8 + Math.random() * 0.4)).toFixed(2)), 
          maTrend: Math.random() > 0.5 ? "bullish" : "bearish", 
          rs: Math.floor(Math.random() * 100), 
          volumeRatio: parseFloat((0.5 + Math.random() * 5).toFixed(1)), 
          volumeBreakout: Math.random() > 0.8 
        }
      };
    });

    // Apply Sorting
    if (sort.field) {
      allItems.sort((a: any, b: any) => {
        let valA, valB;
        if (['roe', 'peTtm', 'pb'].includes(sort.field)) {
          valA = a.fundamental[sort.field];
          valB = b.fundamental[sort.field];
        } else if (['turnoverRate', 'amount', 'northRatio'].includes(sort.field)) {
          valA = a.liquidity[sort.field];
          valB = b.liquidity[sort.field];
        } else if (['rs', 'volumeRatio'].includes(sort.field)) {
          valA = a.technical[sort.field];
          valB = b.technical[sort.field];
        } else {
          valA = a[sort.field];
          valB = b[sort.field];
        }
        
        if (sort.order === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
    }

    const total = allItems.length;
    const items = allItems.slice((page - 1) * size, page * size);

    res.json({
      code: 0,
      msg: "success",
      data: {
        total,
        tradeDate: new Date().toISOString().split('T')[0],
        scanTime: new Date().toISOString(),
        durationMs: 2300,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size)
        },
        summary: {
          totalStocks: 5200,
          industryPassed: 3200,
          fundamentalPassed: 850,
          liquidityPassed: 320,
          technicalPassed: 128
        },
        items
      }
    });
  });

  // 12. Stock Screener - Presets
  apiRouter.get("/v1/stock/cnstock/screener/presets", (req, res) => {
    res.json({
      code: 0,
      msg: "success",
      data: [
        { 
          id: "value_growth", 
          name: "价值成长", 
          description: "ROE>15%连续3年 + PE<30 + PB<3 + 北向持股",
          config: {
            fundamental: { roe: { min: 15, years: 3 }, pe: { max: 30 }, pb: { max: 3 } },
            liquidity: { northHold: { ratioMin: 1 } }
          }
        },
        { 
          id: "momentum", 
          name: "动量突破", 
          description: "均线多头 + RS>80 + 放量突破",
          config: {
            technical: { ma: { trend: "bullish" }, rs: { min: 80 }, volume: { breakout: true } }
          }
        },
        { 
          id: "north_follow", 
          name: "北向跟投", 
          description: "北向持股>2% + 北向净买入 + 活跃成交",
          config: {
            liquidity: { northHold: { ratioMin: 2, netBuy: true }, turnoverRate: { min: 3 } }
          }
        },
        { 
          id: "undervalued_bluechip", 
          name: "低估值蓝筹", 
          description: "PE<15 + PB<1.5 + 市值>500亿 + 均线多头",
          config: {
            marketCap: { min: 500 },
            fundamental: { pe: { max: 15 }, pb: { max: 1.5 } },
            technical: { ma: { trend: "bullish" } }
          }
        },
        { 
          id: "small_cap_growth", 
          name: "小盘成长", 
          description: "市值<200亿 + 换手率>3% + RS>70",
          config: {
            marketCap: { max: 200 },
            liquidity: { turnoverRate: { min: 3 } },
            technical: { rs: { min: 70 } }
          }
        }
      ]
    });
  });

  // 13. Stock Screener - Industries
  apiRouter.get("/v1/stock/cnstock/screener/industries", (req, res) => {
    res.json({
      code: 0,
      msg: "success",
      data: ["银行", "房地产", "证券", "家电", "白酒", "食品", "安防", "半导体", "新能源", "生物医药"]
    });
  });

  // 14. Stock Screener - Indexes
  apiRouter.get("/v1/stock/cnstock/screener/indexes", (req, res) => {
    res.json({
      code: 0,
      msg: "success",
      data: [
        { code: "000300.SH", name: "沪深300" },
        { code: "000001.SH", name: "上证指数" },
        { code: "399001.SZ", name: "深证成指" },
        { code: "399006.SZ", name: "创业板指" },
        { code: "000016.SH", name: "上证50" }
      ]
    });
  });

  app.use("/api", apiRouter);

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
