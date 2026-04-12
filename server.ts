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
      // Convert symbol format: BTCUSDT -> BTC/USDT
      const match = (symbol as string).match(/^([A-Z]+?)(USDT|BUSD|BTC|ETH|BNB)$/);
      const symbolWithSlash = match ? `${match[1]}/${match[2]}` : symbol;

      const response = await axios.get(`${BACKEND_URL}/api/v2/crypto/klines`, {
        headers: { "X-API-Key": API_KEY },
        params: { exchange, symbol: symbolWithSlash, interval, limit }
      });

      // Transform: unwrap data array, convert RFC3339 time to unix timestamp
      const data = (response.data?.data || []).map((d: any) => ({
        time: Math.floor(new Date(d.time).getTime() / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching klines:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch klines",
        message: error.response?.data || error.message
      });
    }
  });

  // ============================================
  // Crypto API - Proxy to Backend V2
  // ============================================

  // Helper function to proxy Crypto requests to backend V2
  const proxyCryptoRequest = async (endpoint: string, req: express.Request, res: express.Response) => {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
        headers: { "X-API-Key": API_KEY },
        params: req.query
      });
      res.json(response.data);
    } catch (error: any) {
      console.error(`Crypto API error (${endpoint}):`, error.message);
      res.status(error.response?.status || 500).json({
        error: "Backend unavailable",
        endpoint,
        message: error.response?.data || error.message
      });
    }
  };

  // 1. Fear & Greed Index
  apiRouter.get("/v2/crypto/indicator/fear-greed", (req, res) => {
    proxyCryptoRequest("/api/v2/crypto/indicator/fear-greed", req, res);
  });

  // 2. Capital Flow History
  apiRouter.get("/v2/crypto/capital-flow/history", (req, res) => {
    proxyCryptoRequest("/api/v2/crypto/capital-flow/history", req, res);
  });

  // 3. Cycle Indicators - Backend does not have this endpoint
  apiRouter.get("/v2/crypto/cycle-indicators", (req, res) => {
    res.status(404).json({ error: "Not implemented", message: "This endpoint is not available on backend" });
  });

  // 4. Funding Rate Heatmap
  apiRouter.get("/v2/crypto/funding-rate/heatmap", (req, res) => {
    proxyCryptoRequest("/api/v2/crypto/funding-rate/heatmap", req, res);
  });

  // 5. Open Interest Aggregated Kline
  apiRouter.get("/v2/crypto/open-interest/agg-kline", (req, res) => {
    proxyCryptoRequest("/api/v2/crypto/open-interest/agg-kline", req, res);
  });

  // 6. Liquidation Map
  apiRouter.get("/v2/crypto/liquidation/agg-map", (req, res) => {
    proxyCryptoRequest("/api/v2/crypto/liquidation/agg-map", req, res);
  });

  // 7. Orderbook Heatmap
  apiRouter.get("/v2/crypto/order-book/heatmap", (req, res) => {
    proxyCryptoRequest("/api/v2/crypto/order-book/heatmap", req, res);
  });

  // 8. Long/Short Ratios - Use top-trader endpoint instead
  apiRouter.get("/v2/crypto/long-short/ratios", (req, res) => {
    res.status(404).json({ error: "Not implemented", message: "Use /v2/crypto/long-short/top-trader instead" });
  });

  // 9. Large Orders
  apiRouter.get("/v2/crypto/large-order/market", (req, res) => {
    proxyCryptoRequest("/api/v2/crypto/large-order/market", req, res);
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

  // ============================================
  // A股选股接口 - Proxy to Backend
  // ============================================

  // 14. A股选股 - V1/V2 Templates
  apiRouter.get(["/v1/stock/cnstock/screener/templates", "/v2/stock/cnstock/screener/templates"], async (req, res) => {
    try {
      const version = req.path.includes("/v2/") ? "v2" : "v1";
      const response = await axios.get(`${BACKEND_URL}/api/${version}/stock/cnstock/screener/templates`, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Failed to fetch cnstock templates:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch templates",
        message: error.response?.data || error.message
      });
    }
  });

  // 15. A股选股 - Industries
  apiRouter.get("/v1/stock/cnstock/screener/industries", async (req, res) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/stock/cnstock/screener/industries`, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Failed to fetch industries:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch industries",
        message: error.response?.data || error.message
      });
    }
  });

  // 16. A股选股 - Indexes
  apiRouter.get("/v1/stock/cnstock/screener/indexes", async (req, res) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/stock/cnstock/screener/indexes`, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Failed to fetch indexes:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch indexes",
        message: error.response?.data || error.message
      });
    }
  });

  // 17. A股选股 - Indicators
  apiRouter.get("/v1/stock/cnstock/screener/indicators", async (req, res) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/stock/cnstock/screener/indicators`, {
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

  // 18. A股选股 - V1 Scan
  apiRouter.post("/v1/stock/cnstock/screener", async (req, res) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/stock/cnstock/screener`, req.body, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("V1 screener scan error:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to scan stocks",
        message: error.response?.data || error.message
      });
    }
  });

  // 19. A股选股 - V2 Scan (支持AND/OR逻辑)
  apiRouter.post("/v2/stock/cnstock/screener", async (req, res) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v2/stock/cnstock/screener`, req.body, {
        headers: { "X-API-Key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("V2 screener scan error:", error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to scan stocks",
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
