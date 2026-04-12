// 行业筛选条件
export interface IndustryFilter {
  include: string[];
  exclude: string[];
}

// 范围筛选条件
export interface RangeFilter {
  min: number | null;
  max: number | null;
}

// 分页参数
export interface Pagination {
  page: number;
  size: number;
}

// 基本面筛选条件V2
export interface FundamentalFilterV2 {
  logic: 'AND' | 'OR';
  roe_min?: number;           // ROE最小值 %
  roe_years?: number;         // 连续N年ROE达标
  pe?: RangeFilter;           // PE范围
  pb?: RangeFilter;           // PB范围
  peg_max?: number;           // PEG最大值
  min_list_days?: number;     // 最小上市天数
  exclude_st?: boolean;       // 排除ST股
}

// 流动性筛选条件V2
export interface LiquidityFilterV2 {
  logic: 'AND' | 'OR';
  turnover?: RangeFilter;     // 换手率范围 %
  amount?: RangeFilter;       // 日成交额范围 万元
  north_ratio?: RangeFilter;  // 北向持股比例范围 %
  north_net_buy?: boolean;    // 北向净买入
}

// 技术面筛选条件V2
export interface TechnicalFilterV2 {
  logic: 'AND' | 'OR';
  ma_trend?: 'bullish' | 'bearish' | 'neutral';
  ma_short?: number;          // 短期均线周期
  ma_long?: number;           // 长期均线周期
  rs?: RangeFilter;           // RS评分范围
  rs_index_code?: string;     // RS基准指数代码
  volume_breakout?: boolean;  // 要求放量突破
  volume_ratio?: RangeFilter; // 量比范围
}

// 选股请求V2
export interface ScreenerRequestV2 {
  trade_date?: string;        // 交易日期 YYYY-MM-DD
  logic?: 'AND' | 'OR';       // 三层间逻辑
  exclude_st?: boolean;       // 排除ST股
  min_list_days?: number;     // 最小上市天数
  industry?: IndustryFilter;
  market_cap?: RangeFilter;   // 市值筛选（亿元）
  price?: RangeFilter;        // 价格筛选（元）
  change?: RangeFilter;       // 涨跌幅筛选（%）
  fundamental?: FundamentalFilterV2;
  liquidity?: LiquidityFilterV2;
  technical?: TechnicalFilterV2;
  pagination: Pagination;
  sort_by?: string;           // 排序字段
  sort_order?: 'asc' | 'desc';
}

// 基本面数据
export interface FundamentalData {
  roe: number;
  pe_ttm: number;
  pb: number;
  peg: number;
}

// 流动性数据
export interface LiquidityData {
  turnover_rate: number;
  amount: number;
  north_ratio: number;
  north_net_buy: number;
}

// 技术面数据
export interface TechnicalData {
  ma50: number;
  ma200: number;
  ma_trend: string;
  rs: number;
  volume_ratio: number;
  volume_breakout: boolean;
}

// 股票项V2
export interface StockItemV2 {
  ts_code: string;
  name: string;
  industry: string;
  market_cap: number;    // 市值（亿元）
  close: number;         // 收盘价（元）
  change_rate: number;   // 涨跌幅（%）
  fundamental: FundamentalData;
  liquidity: LiquidityData;
  technical: TechnicalData;
}

// 筛选统计摘要
export interface FilterSummary {
  total_stocks: number;
  industry_passed: number;
  market_cap_passed: number;
  price_passed: number;
  change_passed: number;
  fundamental_passed: number;
  liquidity_passed: number;
  technical_passed: number;
}

// 分页信息
export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  total_pages: number;
}

// 选股响应V2
export interface ScreenerResponseV2 {
  total: number;
  trade_date: string;
  items: StockItemV2[];
  summary: FilterSummary;
  conditions?: any;  // 实际应用的筛选条件
  pagination: PaginationInfo;
  duration_ms: number;
}

// API响应包装
export interface ScreenerApiResponse {
  code: number;
  msg: string;
  data: ScreenerResponseV2;
}

// 选股模板
export interface ScreenerTemplate {
  id: string;
  name: string;
  description: string;
  request: ScreenerRequestV2;
}

// 模板列表响应
export interface TemplatesResponse {
  templates: ScreenerTemplate[];
}

// 指数信息
export interface IndexInfo {
  ts_code: string;
  name: string;
}

// 指数列表响应
export interface IndexesResponse {
  indexes: IndexInfo[];
}

// 行业列表响应
export interface IndustriesResponse {
  industries: string[];
}

// ==================== 旧类型别名（保持兼容） ====================

// 为组件内部使用提供驼峰别名的类型
export type StockItem = StockItemV2;
export type ScreenerScanRequest = ScreenerRequestV2;
export type ScreenerScanResponse = ScreenerApiResponse;
export type ScreenerPreset = ScreenerTemplate;
