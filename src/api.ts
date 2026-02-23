import type { ETFMetadata, HistoricalDataPoint, SearchResult } from './types';

// ============================================================
// CORE ETF LIST (initial tracked set — 12 popular Canadian ETFs)
// ============================================================
export const ETF_LIST: ETFMetadata[] = [
  { symbol: 'XIU', yahooSymbol: 'XIU.TO', name: 'iShares S&P/TSX 60 Index ETF', category: 'Canadian Equity', mer: 0.18, dividendYield: 2.8, description: "Tracks the S&P/TSX 60 — Canada's largest 60 companies." },
  { symbol: 'XIC', yahooSymbol: 'XIC.TO', name: 'iShares Core S&P/TSX Composite', category: 'Canadian Equity', mer: 0.06, dividendYield: 2.6, description: 'Broad Canadian market exposure with 230+ holdings.' },
  { symbol: 'XEQT', yahooSymbol: 'XEQT.TO', name: 'iShares Core Equity ETF Portfolio', category: 'Global Equity', mer: 0.20, dividendYield: 1.8, description: 'All-in-one 100% equity portfolio with global diversification.' },
  { symbol: 'VEQT', yahooSymbol: 'VEQT.TO', name: 'Vanguard All-Equity ETF Portfolio', category: 'Global Equity', mer: 0.24, dividendYield: 1.7, description: "Vanguard's all-equity global portfolio ETF." },
  { symbol: 'ZEB', yahooSymbol: 'ZEB.TO', name: 'BMO Equal Weight Banks Index ETF', category: 'Financials', mer: 0.28, dividendYield: 4.2, description: "Equal-weight exposure to Canada's Big Six banks." },
  { symbol: 'ZAG', yahooSymbol: 'ZAG.TO', name: 'BMO Aggregate Bond Index ETF', category: 'Fixed Income', mer: 0.09, dividendYield: 3.5, description: 'Broad Canadian investment-grade bond exposure.' },
  { symbol: 'TEC', yahooSymbol: 'TEC.TO', name: 'TD Global Technology Leaders ETF', category: 'Technology', mer: 0.39, dividendYield: 0.3, description: 'Global technology leaders including Apple, Microsoft, NVIDIA.' },
  { symbol: 'VFV', yahooSymbol: 'VFV.TO', name: 'Vanguard S&P 500 Index ETF (CAD)', category: 'US Equity', mer: 0.09, dividendYield: 1.3, description: 'Low-cost S&P 500 in Canadian dollars.' },
  { symbol: 'XGD', yahooSymbol: 'XGD.TO', name: 'iShares S&P/TSX Global Gold ETF', category: 'Gold & Mining', mer: 0.61, dividendYield: 1.0, description: 'Gold mining companies — inflation and uncertainty hedge.' },
  { symbol: 'XEG', yahooSymbol: 'XEG.TO', name: 'iShares S&P/TSX Capped Energy ETF', category: 'Energy', mer: 0.61, dividendYield: 3.1, description: 'Canadian energy sector — oil & gas producers.' },
  { symbol: 'XDIV', yahooSymbol: 'XDIV.TO', name: 'iShares Core MSCI Cdn Quality Div', category: 'Dividend', mer: 0.11, dividendYield: 4.5, description: 'High-quality Canadian dividend stocks at low MER.' },
  { symbol: 'VBAL', yahooSymbol: 'VBAL.TO', name: 'Vanguard Balanced ETF Portfolio', category: 'Balanced', mer: 0.24, dividendYield: 2.2, description: '60/40 balanced portfolio for moderate risk.' },
];

// ============================================================
// EXPANDED TSX SCANNER UNIVERSE — 100+ Canadian stocks & ETFs
// These are scanned to find the best buys/sells across the market
// ============================================================
export const SCANNER_UNIVERSE: { symbol: string; yahooSymbol: string; name: string; category: string }[] = [
  // Big Banks
  { symbol: 'RY', yahooSymbol: 'RY.TO', name: 'Royal Bank of Canada', category: 'Banks' },
  { symbol: 'TD', yahooSymbol: 'TD.TO', name: 'Toronto-Dominion Bank', category: 'Banks' },
  { symbol: 'BNS', yahooSymbol: 'BNS.TO', name: 'Bank of Nova Scotia', category: 'Banks' },
  { symbol: 'BMO', yahooSymbol: 'BMO.TO', name: 'Bank of Montreal', category: 'Banks' },
  { symbol: 'CM', yahooSymbol: 'CM.TO', name: 'CIBC', category: 'Banks' },
  { symbol: 'NA', yahooSymbol: 'NA.TO', name: 'National Bank of Canada', category: 'Banks' },
  // Energy
  { symbol: 'ENB', yahooSymbol: 'ENB.TO', name: 'Enbridge Inc', category: 'Energy' },
  { symbol: 'CNQ', yahooSymbol: 'CNQ.TO', name: 'Canadian Natural Resources', category: 'Energy' },
  { symbol: 'SU', yahooSymbol: 'SU.TO', name: 'Suncor Energy', category: 'Energy' },
  { symbol: 'TRP', yahooSymbol: 'TRP.TO', name: 'TC Energy Corp', category: 'Energy' },
  { symbol: 'CVE', yahooSymbol: 'CVE.TO', name: 'Cenovus Energy', category: 'Energy' },
  { symbol: 'IMO', yahooSymbol: 'IMO.TO', name: 'Imperial Oil', category: 'Energy' },
  { symbol: 'PPL', yahooSymbol: 'PPL.TO', name: 'Pembina Pipeline', category: 'Energy' },
  { symbol: 'ARX', yahooSymbol: 'ARX.TO', name: 'ARC Resources', category: 'Energy' },
  // Mining & Materials
  { symbol: 'ABX', yahooSymbol: 'ABX.TO', name: 'Barrick Gold', category: 'Mining' },
  { symbol: 'FNV', yahooSymbol: 'FNV.TO', name: 'Franco-Nevada', category: 'Mining' },
  { symbol: 'NTR', yahooSymbol: 'NTR.TO', name: 'Nutrien Ltd', category: 'Materials' },
  { symbol: 'WPM', yahooSymbol: 'WPM.TO', name: 'Wheaton Precious Metals', category: 'Mining' },
  { symbol: 'AEM', yahooSymbol: 'AEM.TO', name: 'Agnico Eagle Mines', category: 'Mining' },
  { symbol: 'K', yahooSymbol: 'K.TO', name: 'Kinross Gold', category: 'Mining' },
  { symbol: 'FM', yahooSymbol: 'FM.TO', name: 'First Quantum Minerals', category: 'Mining' },
  { symbol: 'TECK.B', yahooSymbol: 'TECK-B.TO', name: 'Teck Resources', category: 'Mining' },
  // Tech
  { symbol: 'SHOP', yahooSymbol: 'SHOP.TO', name: 'Shopify Inc', category: 'Technology' },
  { symbol: 'CSU', yahooSymbol: 'CSU.TO', name: 'Constellation Software', category: 'Technology' },
  { symbol: 'OTEX', yahooSymbol: 'OTEX.TO', name: 'Open Text Corp', category: 'Technology' },
  { symbol: 'BB', yahooSymbol: 'BB.TO', name: 'BlackBerry Ltd', category: 'Technology' },
  { symbol: 'LSPD', yahooSymbol: 'LSPD.TO', name: 'Lightspeed Commerce', category: 'Technology' },
  // Telecom
  { symbol: 'BCE', yahooSymbol: 'BCE.TO', name: 'BCE Inc', category: 'Telecom' },
  { symbol: 'T', yahooSymbol: 'T.TO', name: 'TELUS Corp', category: 'Telecom' },
  { symbol: 'RCI.B', yahooSymbol: 'RCI-B.TO', name: 'Rogers Communications', category: 'Telecom' },
  // Financials (non-bank)
  { symbol: 'MFC', yahooSymbol: 'MFC.TO', name: 'Manulife Financial', category: 'Insurance' },
  { symbol: 'SLF', yahooSymbol: 'SLF.TO', name: 'Sun Life Financial', category: 'Insurance' },
  { symbol: 'IFC', yahooSymbol: 'IFC.TO', name: 'Intact Financial', category: 'Insurance' },
  { symbol: 'BAM', yahooSymbol: 'BAM.TO', name: 'Brookfield Asset Mgmt', category: 'Financials' },
  { symbol: 'BN', yahooSymbol: 'BN.TO', name: 'Brookfield Corp', category: 'Financials' },
  { symbol: 'POW', yahooSymbol: 'POW.TO', name: 'Power Corp of Canada', category: 'Financials' },
  // Real Estate
  { symbol: 'BPY.UN', yahooSymbol: 'BPY-UN.TO', name: 'Brookfield Property', category: 'Real Estate' },
  { symbol: 'REI.UN', yahooSymbol: 'REI-UN.TO', name: 'RioCan REIT', category: 'Real Estate' },
  { symbol: 'CAR.UN', yahooSymbol: 'CAR-UN.TO', name: 'Canadian Apartment REIT', category: 'Real Estate' },
  // Rail & Transport
  { symbol: 'CNR', yahooSymbol: 'CNR.TO', name: 'Canadian National Railway', category: 'Transport' },
  { symbol: 'CP', yahooSymbol: 'CP.TO', name: 'Canadian Pacific Kansas City', category: 'Transport' },
  { symbol: 'AC', yahooSymbol: 'AC.TO', name: 'Air Canada', category: 'Transport' },
  // Consumer
  { symbol: 'L', yahooSymbol: 'L.TO', name: 'Loblaw Companies', category: 'Consumer' },
  { symbol: 'ATD', yahooSymbol: 'ATD.TO', name: 'Alimentation Couche-Tard', category: 'Consumer' },
  { symbol: 'DOL', yahooSymbol: 'DOL.TO', name: 'Dollarama Inc', category: 'Consumer' },
  { symbol: 'MRU', yahooSymbol: 'MRU.TO', name: 'Metro Inc', category: 'Consumer' },
  { symbol: 'GIL', yahooSymbol: 'GIL.TO', name: 'Gildan Activewear', category: 'Consumer' },
  // Healthcare/Cannabis
  { symbol: 'WEED', yahooSymbol: 'WEED.TO', name: 'Canopy Growth', category: 'Cannabis' },
  // Utilities
  { symbol: 'FTS', yahooSymbol: 'FTS.TO', name: 'Fortis Inc', category: 'Utilities' },
  { symbol: 'EMA', yahooSymbol: 'EMA.TO', name: 'Emera Inc', category: 'Utilities' },
  { symbol: 'H', yahooSymbol: 'H.TO', name: 'Hydro One', category: 'Utilities' },
  { symbol: 'AQN', yahooSymbol: 'AQN.TO', name: 'Algonquin Power', category: 'Utilities' },
  // More ETFs
  { symbol: 'ZWB', yahooSymbol: 'ZWB.TO', name: 'BMO Covered Call Banks ETF', category: 'ETF - Income' },
  { symbol: 'ZDV', yahooSymbol: 'ZDV.TO', name: 'BMO Canadian Dividend ETF', category: 'ETF - Dividend' },
  { symbol: 'XRE', yahooSymbol: 'XRE.TO', name: 'iShares S&P/TSX REIT ETF', category: 'ETF - Real Estate' },
  { symbol: 'ZSP', yahooSymbol: 'ZSP.TO', name: 'BMO S&P 500 ETF', category: 'ETF - US Equity' },
  { symbol: 'XUU', yahooSymbol: 'XUU.TO', name: 'iShares Core S&P US Total Mkt', category: 'ETF - US Equity' },
  { symbol: 'VCN', yahooSymbol: 'VCN.TO', name: 'Vanguard FTSE Canada All Cap', category: 'ETF - Canadian Equity' },
  { symbol: 'HXS', yahooSymbol: 'HXS.TO', name: 'Global X S&P 500 ETF', category: 'ETF - US Equity' },
  { symbol: 'HCAL', yahooSymbol: 'HCAL.TO', name: 'Hamilton Cdn Bank 1.25x ETF', category: 'ETF - Leveraged' },
  { symbol: 'BTCC.B', yahooSymbol: 'BTCC-B.TO', name: 'Purpose Bitcoin ETF', category: 'ETF - Crypto' },
  { symbol: 'HQU', yahooSymbol: 'HQU.TO', name: 'BetaPro NASDAQ-100 2x', category: 'ETF - Leveraged' },
  { symbol: 'HDIV', yahooSymbol: 'HDIV.TO', name: 'Hamilton Enhanced Dividend ETF', category: 'ETF - Income' },
  { symbol: 'ZQQ', yahooSymbol: 'ZQQ.TO', name: 'BMO NASDAQ 100 ETF', category: 'ETF - Tech' },
  { symbol: 'XQQ', yahooSymbol: 'XQQ.TO', name: 'iShares NASDAQ 100 ETF (CAD)', category: 'ETF - Tech' },
  { symbol: 'VGRO', yahooSymbol: 'VGRO.TO', name: 'Vanguard Growth ETF Portfolio', category: 'ETF - Growth' },
  { symbol: 'ZCN', yahooSymbol: 'ZCN.TO', name: 'BMO S&P/TSX Capped Composite', category: 'ETF - Canadian Equity' },
  // Popular US stocks (many Canadians trade these)
  { symbol: 'AAPL', yahooSymbol: 'AAPL', name: 'Apple Inc', category: 'US - Technology' },
  { symbol: 'MSFT', yahooSymbol: 'MSFT', name: 'Microsoft Corp', category: 'US - Technology' },
  { symbol: 'NVDA', yahooSymbol: 'NVDA', name: 'NVIDIA Corp', category: 'US - Technology' },
  { symbol: 'GOOGL', yahooSymbol: 'GOOGL', name: 'Alphabet Inc', category: 'US - Technology' },
  { symbol: 'AMZN', yahooSymbol: 'AMZN', name: 'Amazon.com Inc', category: 'US - Technology' },
  { symbol: 'TSLA', yahooSymbol: 'TSLA', name: 'Tesla Inc', category: 'US - Auto' },
  { symbol: 'META', yahooSymbol: 'META', name: 'Meta Platforms', category: 'US - Technology' },
  { symbol: 'AMD', yahooSymbol: 'AMD', name: 'Advanced Micro Devices', category: 'US - Semiconductors' },
  { symbol: 'PLTR', yahooSymbol: 'PLTR', name: 'Palantir Technologies', category: 'US - Technology' },
  { symbol: 'SPY', yahooSymbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'US - ETF' },
  { symbol: 'QQQ', yahooSymbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'US - ETF' },
];

// ============================================================
// YAHOO FINANCE FETCH with CORS proxy fallback
// ============================================================
async function fetchWithProxy(url: string): Promise<Response> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  for (const makeProxy of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(makeProxy(url), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) return response;
    } catch {
      continue;
    }
  }
  throw new Error('All proxy attempts failed');
}

export interface YahooChartResult {
  meta: {
    symbol: string;
    currency: string;
    regularMarketPrice: number;
    previousClose: number;
    chartPreviousClose: number;
  };
  timestamp: number[];
  indicators: {
    quote: [{
      close: (number | null)[];
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      volume: (number | null)[];
    }];
  };
}

export async function fetchETFData(yahooSymbol: string): Promise<YahooChartResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=6mo&interval=1d&includePrePost=false`;
    const response = await fetchWithProxy(url);
    const data = await response.json();
    if (data?.chart?.result?.[0]) {
      return data.chart.result[0] as YahooChartResult;
    }
    return null;
  } catch (e) {
    console.warn(`Failed to fetch ${yahooSymbol}:`, e);
    return null;
  }
}

export function parseChartData(result: YahooChartResult): HistoricalDataPoint[] {
  const { timestamp, indicators } = result;
  const quote = indicators.quote[0];
  const points: HistoricalDataPoint[] = [];

  for (let i = 0; i < timestamp.length; i++) {
    const close = quote.close[i];
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const vol = quote.volume[i];
    if (close != null && open != null && high != null && low != null && vol != null) {
      const d = new Date(timestamp[i] * 1000);
      points.push({
        date: d.toISOString().split('T')[0],
        timestamp: timestamp[i],
        open, high, low, close,
        volume: vol,
      });
    }
  }
  return points;
}

// ============================================================
// SEARCH — Yahoo Finance autocomplete API
// ============================================================
export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&listsCount=0&enableFuzzyQuery=false`;
    const response = await fetchWithProxy(url);
    const data = await response.json();
    if (data?.quotes) {
      return data.quotes
        .filter((q: { quoteType?: string }) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        .map((q: { symbol: string; shortname?: string; longname?: string; exchDisp?: string; quoteType?: string }) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchDisp || 'Unknown',
          type: q.quoteType || 'EQUITY',
        }));
    }
    return [];
  } catch (e) {
    console.warn('Search failed:', e);
    return [];
  }
}

// ============================================================
// FALLBACK DATA GENERATOR
// ============================================================
export function generateFallbackData(symbol: string): HistoricalDataPoint[] {
  const points: HistoricalDataPoint[] = [];
  let price = 30 + (symbol.charCodeAt(0) % 100);
  const vol = 0.01 + (symbol.length % 5) * 0.003;

  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);
  const random = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 6);
  const d = new Date(startDate);

  while (d <= today) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const dailyReturn = (random() - 0.48) * vol * 2;
      price = price * (1 + dailyReturn);
      points.push({
        date: d.toISOString().split('T')[0],
        timestamp: Math.floor(d.getTime() / 1000),
        open: price * (1 + (random() - 0.5) * vol * 0.5),
        high: price * (1 + random() * vol),
        low: price * (1 - random() * vol),
        close: price,
        volume: Math.floor(500000 + random() * 3000000),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return points;
}
