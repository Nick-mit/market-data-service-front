export interface IndustryFilter {
  include: string[];
  exclude: string[];
}

export interface RangeFilter {
  min: number | null;
  max: number | null;
}

export interface FundamentalConfig {
  logic: 'AND' | 'OR';
  roe?: { min: number; years: number };
  pe?: RangeFilter;
  pb?: RangeFilter;
  listDays?: { min: number };
  excludeST: boolean;
}

export interface LiquidityConfig {
  logic: 'AND' | 'OR';
  turnoverRate?: RangeFilter;
  amount?: RangeFilter;
  northHold?: { ratioMin: number; netBuy: boolean };
}

export interface TechnicalConfig {
  logic: 'AND' | 'OR';
  ma?: { trend: 'bullish' | 'bearish' | 'none'; ma50AboveMa200: boolean };
  rs?: { min: number; indexCode: string };
  volume?: { ratioMin: number; ratioMax: number | null; breakout: boolean };
}

export interface ScreenerScanRequest {
  tradeDate: string;
  logic: 'AND' | 'OR';
  industry: IndustryFilter;
  marketCap: RangeFilter;
  price: RangeFilter;
  change: RangeFilter;
  fundamental: FundamentalConfig;
  liquidity: LiquidityConfig;
  technical: TechnicalConfig;
  pagination: { page: number; size: number };
  sort: { field: string; order: 'asc' | 'desc' };
}

export interface StockItem {
  tsCode: string;
  name: string;
  industry: string;
  close: number;
  changeRate: number;
  marketCap: number;
  fundamental: {
    roe: number;
    peTtm: number;
    pb: number;
  };
  liquidity: {
    turnoverRate: number;
    amount: number;
    northRatio: number;
    northNetBuy: number;
  };
  technical: {
    ma50: number;
    ma200: number;
    maTrend: string;
    rs: number;
    volumeRatio: number;
    volumeBreakout: boolean;
  };
}

export interface ScreenerSummary {
  totalStocks: number;
  industryPassed: number;
  fundamentalPassed: number;
  liquidityPassed: number;
  technicalPassed: number;
}

export interface ScreenerScanResponse {
  code: number;
  msg: string;
  data: {
    total: number;
    tradeDate: string;
    scanTime: string;
    durationMs: number;
    pagination: {
      page: number;
      size: number;
      total: number;
      totalPages: number;
    };
    summary: ScreenerSummary;
    items: StockItem[];
  };
}

export interface ScreenerPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<ScreenerScanRequest>;
}
