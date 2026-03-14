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
