export interface IndicatorConfig {
  name: string;
  params: Record<string, any>;
  condition: Record<string, any>;
}

export interface ScreenerFilter {
  minVolume: number;
  excludeST: boolean;
  excludeSuspend: boolean;
}

export interface ScreenerScanRequest {
  market: string;
  logic: 'AND' | 'OR';
  indicators: IndicatorConfig[];
  filter: ScreenerFilter;
  limit: number;
  offset: number;
}

export interface IndicatorResult {
  name: string;
  values: Record<string, any>;
  signals: string[];
  extra: Record<string, any>;
}

export interface StockResult {
  code: string;
  name: string;
  close: number;
  changePercent: number;
  volume: number;
  amount: number;
  tradeDate: string;
  matched: boolean;
  indicators: Record<string, IndicatorResult>;
}

export interface ScreenerScanResponse {
  total: number;
  scanTime: string;
  market: string;
  duration: number;
  conditions: any;
  results: StockResult[];
}

export interface ScreenerTemplate {
  id: string;
  name: string;
  description: string;
  logic?: 'AND' | 'OR';
  indicators: IndicatorConfig[];
}

export interface IndicatorDefinition {
  name: string;
  description: string;
  params: Record<string, any>;
}
