import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend API configuration
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3101";
const API_KEY = process.env.VITE_API_KEY || "7fXZt817QOeBr4H2XH/mDmhKO+2yybe1prDYDSg4HOD8gC7qeiZBfscuZgtMnVOK";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Content Security Policy - allow eval for lightweight-charts and ws for Vite HMR
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: ws: wss:; worker-src 'self' blob:;"
    );
    next();
  });

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

  // ========== CoinAnk API Proxy ==========
  // Proxy all /v1/coinank/* requests to backend service
  apiRouter.use("/v1/coinank", async (req, res) => {
    const path = req.path;
    const method = req.method.toLowerCase();
    const query = req.query;

    console.log(`[CoinAnk Proxy] ${method.toUpperCase()} ${path}`, query);

    try {
      const config: any = {
        method,
        url: `${BACKEND_URL}/api/v1/coinank${path}`,
        params: query,
        headers: {
          "X-API-Key": API_KEY,
          "Content-Type": "application/json",
        },
      };

      if (method === "post" || method === "put") {
        config.data = req.body;
      }

      const response = await axios(config);
      res.json(response.data);
    } catch (error: any) {
      console.error(`[CoinAnk Proxy Error] ${error.message}`);
      const status = error.response?.status || 500;
      const data = error.response?.data || { error: "Proxy error", message: error.message };
      res.status(status).json(data);
    }
  });

  app.use("/api", apiRouter);

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development (must be before error handler)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Use Vite's connect middleware directly
    app.use((req, res, next) => {
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler (must be after all other middleware)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
