export interface HistoricalDataPoint {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  momentum: number;
  volatility: number;
}

export interface DayOfWeekStats {
  avgReturn: number;
  winRate: number;
  count: number;
}

export interface ProcessedETF {
  symbol: string;
  yahooSymbol: string;
  name: string;
  category: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  historicalData: HistoricalDataPoint[];
  technicals: TechnicalIndicators;
  shortTermScore: number;
  longTermScore: number;
  signal: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signalConfidence: number;
  signalReasoning: string[];
  dayOfWeek: Record<string, DayOfWeekStats>;
  bestDay: string;
  mer: number;
  dividendYield: number;
  description: string;
  dataSource: 'live' | 'cached' | 'fallback';
  weekHighLow?: { high: number; low: number };
  avgVolume?: number;
}

export interface ETFMetadata {
  symbol: string;
  yahooSymbol: string;
  name: string;
  category: string;
  mer: number;
  dividendYield: number;
  description: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface WatchlistItem {
  symbol: string;
  yahooSymbol: string;
  name: string;
  addedAt: number;
}
