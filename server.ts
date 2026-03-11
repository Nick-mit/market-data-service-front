import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/klines", async (req, res) => {
    const { exchange = "binance", symbol = "BTCUSDT", interval = "1h", limit = "100" } = req.query;

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
        // Kucoin interval mapping
        const kucoinIntervals: any = { "1m": "1min", "5m": "5min", "15m": "15min", "1h": "1hour", "4h": "4hour", "1d": "1day" };
        const kInterval = kucoinIntervals[interval as string] || "1hour";
        const response = await axios.get(`https://api.kucoin.com/api/v1/market/candles`, {
          params: { symbol: (symbol as string).replace("USDT", "-USDT"), type: kInterval }
        });
        // Kucoin returns [time, open, close, high, low, volume, turnover]
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
        // Bitget spot: [ts, open, high, low, close, vol, quoteVol]
        data = response.data.data.map((d: any) => ({
          time: parseInt(d[0]) / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));
      } else if (exchange === "hyperliquid") {
        // Hyperliquid uses a different API structure
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
      } else if (exchange === "aster" || exchange === "weex") {
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
      } else {
        // Fallback or Mock for Aster/Weex if APIs are not easily reachable
        // For demo purposes, we'll return some mock data or try a generic fetch if we had the URLs
        res.status(400).json({ error: "Exchange not fully implemented in this demo" });
        return;
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching klines:", error.message);
      res.status(500).json({ error: "Failed to fetch data from exchange" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
