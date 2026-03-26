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
        // Exchange not supported - return empty data
        console.warn(`Exchange ${exchange} not supported`);
        res.status(400).json({ error: `Exchange ${exchange} not supported` });
        return;
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching klines:", error.message);
      res.status(500).json({ error: "Failed to fetch data from exchange" });
    }
  });

  // ============================================
  // CoinAnk API - Proxy to Backend (No Mock Data)
  // ============================================

  // Helper function to proxy CoinAnk requests to backend
  const proxyCoinAnkRequest = async (endpoint: string, req: express.Request, res: express.Response) => {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
        headers: { "X-API-Key": API_KEY },
        params: req.query
      });
      res.json(response.data);
    } catch (error: any) {
      console.error(`CoinAnk API error (${endpoint}):`, error.message);
      res.status(error.response?.status || 500).json({
        error: "Backend unavailable",
        endpoint,
        message: error.response?.data || error.message
      });
    }
  };

  // 1. Fear & Greed Index
  apiRouter.get("/v1/coinank/indicator/fear-greed", (req, res) => {
    proxyCoinAnkRequest("/api/v1/coinank/indicator/fear-greed", req, res);
  });

  // 2. Capital Flow History
  apiRouter.get("/v1/coinank/capital-flow/history", (req, res) => {
    proxyCoinAnkRequest("/api/v1/coinank/capital-flow/history", req, res);
  });

  // 3. Cycle Indicators - Backend does not have this endpoint
  apiRouter.get("/v1/coinank/cycle-indicators", (req, res) => {
    res.status(404).json({ error: "Not implemented", message: "This endpoint is not available on backend" });
  });

  // 4. Funding Rate Heatmap
  apiRouter.get("/v1/coinank/funding-rate/heatmap", (req, res) => {
    proxyCoinAnkRequest("/api/v1/coinank/funding-rate/heatmap", req, res);
  });

  // 5. Open Interest Aggregated Kline
  apiRouter.get("/v1/coinank/open-interest/agg-kline", (req, res) => {
    proxyCoinAnkRequest("/api/v1/coinank/open-interest/agg-kline", req, res);
  });

  // 6. Liquidation Map
  apiRouter.get("/v1/coinank/liquidation/agg-map", (req, res) => {
    proxyCoinAnkRequest("/api/v1/coinank/liquidation/agg-map", req, res);
  });

  // 7. Orderbook Heatmap
  apiRouter.get("/v1/coinank/order-book/heatmap", (req, res) => {
    proxyCoinAnkRequest("/api/v1/coinank/order-book/heatmap", req, res);
  });

  // 8. Long/Short Ratios - Backend has different endpoints
  apiRouter.get("/v1/coinank/long-short/ratios", (req, res) => {
    res.status(404).json({ error: "Not implemented", message: "Use /v1/coinank/long-short/top-trader instead" });
  });

  // 9. Large Orders
  apiRouter.get("/v1/coinank/large-order/market", (req, res) => {
    proxyCoinAnkRequest("/api/v1/coinank/large-order/market", req, res);
  });

  // 10. Tushare Smart Money - Backend does not have this endpoint
  apiRouter.get("/v1/tushare/smart-money", (req, res) => {
    res.status(404).json({ error: "Not implemented", message: "This endpoint is not available on backend" });
  });

  // Backend API base URL and auth key
  const BACKEND_URL = "http://localhost:3101";
  const API_KEY = "7fXZt817QOeBr4H2XH/mDmhKO+2yybe1prDYDSg4HOD8gC7qeiZBfscuZgtMnVOK";

  // 11. Stock Screener - Scan (forward to backend)
  apiRouter.post("/screener/scan", async (req, res) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/stock/screener/scan`, req.body, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Screener scan error:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to scan stocks",
        message: error.response?.data || error.message
      });
    }
  });

  // 12. Stock Screener - Templates (proxy to backend)
  apiRouter.get("/screener/templates", async (req, res) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/stock/screener/templates`, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Failed to fetch templates:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch templates",
        message: error.response?.data || error.message
      });
    }
  });

  // 13. Stock Screener - Indicators (proxy to backend)
  apiRouter.get("/screener/indicators", async (req, res) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/stock/screener/indicators`, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Failed to fetch indicators:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch indicators",
        message: error.response?.data || error.message
      });
    }
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
