import type { HistoricalDataPoint, TechnicalIndicators, DayOfWeekStats, ProcessedETF, ETFMetadata } from './types';

// --- Technical Indicator Calculations ---

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return calculateSMA(prices, prices.length);
  const k = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recentChanges = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;
  for (const c of recentChanges) {
    if (c > 0) avgGain += c;
    else avgLoss += Math.abs(c);
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;

  // Calculate signal line (9-period EMA of MACD)
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const e12 = calculateEMA(prices.slice(0, i), 12);
    const e26 = calculateEMA(prices.slice(0, i), 26);
    macdValues.push(e12 - e26);
  }
  const signal = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macd;
  return { macd, signal, histogram: macd - signal };
}

export function calculateVolatility(prices: number[], period: number = 20): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  const slice = prices.slice(-Math.min(period + 1, prices.length));
  for (let i = 1; i < slice.length; i++) {
    returns.push((slice[i] - slice[i - 1]) / slice[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility in %
}

export function calculateMomentum(prices: number[], period: number = 10): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return ((current - past) / past) * 100;
}

export function calculateTechnicals(prices: number[]): TechnicalIndicators {
  return {
    rsi: calculateRSI(prices),
    sma20: calculateSMA(prices, 20),
    sma50: calculateSMA(prices, 50),
    ema12: calculateEMA(prices, 12),
    ema26: calculateEMA(prices, 26),
    ...calculateMACD(prices),
    macdSignal: calculateMACD(prices).signal,
    macdHistogram: calculateMACD(prices).histogram,
    momentum: calculateMomentum(prices),
    volatility: calculateVolatility(prices),
  };
}

// --- Day-of-Week Analysis ---

export function analyzeDayOfWeek(data: HistoricalDataPoint[]): Record<string, DayOfWeekStats> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayReturns: Record<string, number[]> = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  };

  for (let i = 1; i < data.length; i++) {
    const date = new Date(data[i].timestamp * 1000);
    const dayName = dayNames[date.getDay()];
    if (dayReturns[dayName] !== undefined) {
      const ret = ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;
      dayReturns[dayName].push(ret);
    }
  }

  const stats: Record<string, DayOfWeekStats> = {};
  for (const [day, returns] of Object.entries(dayReturns)) {
    const wins = returns.filter(r => r > 0).length;
    stats[day] = {
      avgReturn: returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0,
      winRate: returns.length > 0 ? (wins / returns.length) * 100 : 50,
      count: returns.length,
    };
  }
  return stats;
}

// --- Signal Generation ---

export function generateSignal(
  technicals: TechnicalIndicators,
  price: number,
  changePercent: number
): { signal: ProcessedETF['signal']; confidence: number; reasoning: string[] } {
  let score = 50;
  const reasoning: string[] = [];

  // RSI signals
  if (technicals.rsi < 30) {
    score += 20;
    reasoning.push(`RSI at ${technicals.rsi.toFixed(1)} — oversold territory, potential bounce`);
  } else if (technicals.rsi < 40) {
    score += 10;
    reasoning.push(`RSI at ${technicals.rsi.toFixed(1)} — approaching oversold`);
  } else if (technicals.rsi > 70) {
    score -= 15;
    reasoning.push(`RSI at ${technicals.rsi.toFixed(1)} — overbought, caution advised`);
  } else if (technicals.rsi > 60) {
    score += 5;
    reasoning.push(`RSI at ${technicals.rsi.toFixed(1)} — bullish momentum`);
  } else {
    reasoning.push(`RSI at ${technicals.rsi.toFixed(1)} — neutral zone`);
  }

  // SMA signals
  if (price > technicals.sma20 && price > technicals.sma50) {
    score += 15;
    reasoning.push('Price above both 20-day and 50-day SMA — strong uptrend');
  } else if (price > technicals.sma20) {
    score += 8;
    reasoning.push('Price above 20-day SMA — short-term uptrend');
  } else if (price < technicals.sma20 && price < technicals.sma50) {
    score -= 10;
    reasoning.push('Price below both moving averages — downtrend');
  }

  // MACD signals
  if (technicals.macdHistogram > 0 && technicals.macd > 0) {
    score += 10;
    reasoning.push('MACD histogram positive — bullish momentum confirmed');
  } else if (technicals.macdHistogram < 0 && technicals.macd < 0) {
    score -= 8;
    reasoning.push('MACD histogram negative — bearish momentum');
  }

  // Momentum
  if (technicals.momentum > 5) {
    score += 8;
    reasoning.push(`Strong 10-day momentum: +${technicals.momentum.toFixed(1)}%`);
  } else if (technicals.momentum > 2) {
    score += 4;
    reasoning.push(`Positive momentum: +${technicals.momentum.toFixed(1)}%`);
  } else if (technicals.momentum < -5) {
    score -= 8;
    reasoning.push(`Weak momentum: ${technicals.momentum.toFixed(1)}%`);
  }

  // Recent price action
  if (changePercent > 1) {
    score += 5;
  } else if (changePercent < -1) {
    score -= 5;
  }

  // Clamp
  score = Math.max(10, Math.min(95, score));

  let signal: ProcessedETF['signal'];
  if (score >= 80) signal = 'STRONG BUY';
  else if (score >= 65) signal = 'BUY';
  else if (score >= 45) signal = 'HOLD';
  else if (score >= 30) signal = 'WATCH';
  else signal = 'SELL';

  return { signal, confidence: score, reasoning };
}

// --- Scoring ---

export function calculateShortTermScore(technicals: TechnicalIndicators, changePercent: number): number {
  let score = 50;

  // Momentum weight (high importance for short-term)
  if (technicals.momentum > 5) score += 20;
  else if (technicals.momentum > 2) score += 12;
  else if (technicals.momentum > 0) score += 5;
  else if (technicals.momentum < -5) score -= 15;
  else if (technicals.momentum < 0) score -= 5;

  // RSI - oversold is buy opportunity
  if (technicals.rsi < 30) score += 15;
  else if (technicals.rsi > 70) score += 5; // Riding the trend
  else if (technicals.rsi > 50) score += 8;

  // MACD
  if (technicals.macdHistogram > 0) score += 10;
  else score -= 5;

  // Volatility (higher = more short-term opportunity)
  if (technicals.volatility > 25) score += 10;
  else if (technicals.volatility > 15) score += 5;

  // Recent daily change
  if (changePercent > 1.5) score += 5;
  else if (changePercent < -2) score += 5; // Bounce opportunity

  return Math.max(5, Math.min(98, score));
}

export function calculateLongTermScore(
  technicals: TechnicalIndicators,
  price: number,
  mer: number,
  dividendYield: number
): number {
  let score = 50;

  // Trend (SMA alignment)
  if (price > technicals.sma50) score += 12;
  else score -= 8;

  if (price > technicals.sma20 && technicals.sma20 > technicals.sma50) score += 8;

  // Low cost (MER)
  if (mer < 0.1) score += 15;
  else if (mer < 0.25) score += 10;
  else if (mer < 0.4) score += 5;
  else score -= 5;

  // Dividend yield
  if (dividendYield > 4) score += 12;
  else if (dividendYield > 2.5) score += 8;
  else if (dividendYield > 1) score += 4;

  // Low volatility (stability for long-term)
  if (technicals.volatility < 12) score += 10;
  else if (technicals.volatility < 20) score += 5;
  else if (technicals.volatility > 30) score -= 5;

  // Momentum (positive long-term trend)
  if (technicals.momentum > 0) score += 5;

  return Math.max(5, Math.min(98, score));
}

// --- Full ETF Processing ---

export function processETFData(
  metadata: ETFMetadata,
  historicalData: HistoricalDataPoint[],
  dataSource: ProcessedETF['dataSource']
): ProcessedETF {
  const closes = historicalData.map(d => d.close);
  const technicals = calculateTechnicals(closes);
  const dayOfWeek = analyzeDayOfWeek(historicalData);

  const lastPoint = historicalData[historicalData.length - 1];
  const prevPoint = historicalData.length > 1 ? historicalData[historicalData.length - 2] : lastPoint;

  const price = lastPoint?.close || 0;
  const previousClose = prevPoint?.close || price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  const volume = lastPoint?.volume || 0;

  const shortTermScore = calculateShortTermScore(technicals, changePercent);
  const longTermScore = calculateLongTermScore(technicals, price, metadata.mer, metadata.dividendYield);
  const { signal, confidence, reasoning } = generateSignal(technicals, price, changePercent);

  // Find best trading day
  let bestDay = 'Monday';
  let bestReturn = -Infinity;
  for (const [day, stats] of Object.entries(dayOfWeek)) {
    if (stats.avgReturn > bestReturn) {
      bestReturn = stats.avgReturn;
      bestDay = day;
    }
  }

  // 52-week high/low approximation from available data
  const highs = historicalData.map(d => d.high);
  const lows = historicalData.map(d => d.low);
  const weekHighLow = {
    high: highs.length > 0 ? Math.max(...highs) : price,
    low: lows.length > 0 ? Math.min(...lows) : price,
  };

  // Average volume
  const volumes = historicalData.slice(-20).map(d => d.volume);
  const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : volume;

  return {
    symbol: metadata.symbol,
    yahooSymbol: metadata.yahooSymbol,
    name: metadata.name,
    category: metadata.category,
    price,
    previousClose,
    change,
    changePercent,
    volume,
    historicalData,
    technicals,
    shortTermScore,
    longTermScore,
    signal,
    signalConfidence: confidence,
    signalReasoning: reasoning,
    dayOfWeek,
    bestDay,
    mer: metadata.mer,
    dividendYield: metadata.dividendYield,
    description: metadata.description,
    dataSource,
    weekHighLow,
    avgVolume,
  };
}
