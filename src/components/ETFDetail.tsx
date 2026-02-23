import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart2, Shield, Activity, Zap, Target, Clock } from 'lucide-react';
import type { ProcessedETF } from '../types';

interface Props {
  etf: ProcessedETF;
  onBack: () => void;
}

function PriceChart({ data, color, height = 200 }: { data: { date: string; close: number }[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const closes = data.map(d => d.close);
  const min = Math.min(...closes) * 0.998;
  const max = Math.max(...closes) * 1.002;
  const range = max - min || 1;
  const w = 600;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - 20 - ((d.close - min) / range) * (height - 30);
    return `${x},${y}`;
  }).join(' ');

  const fillPts = `0,${height - 20} ${pts} ${w},${height - 20}`;

  // Y-axis labels
  const yLabels = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max];
  // X-axis labels (show ~6 dates)
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const y = height - 20 - ((val - min) / range) * (height - 30);
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={w} y2={y} stroke="#1e293b" strokeWidth="0.5" />
              <text x={w - 2} y={y - 3} textAnchor="end" fill="#475569" fontSize="9">${val.toFixed(2)}</text>
            </g>
          );
        })}
        <polygon points={fillPts} fill="url(#chartGrad)" />
        <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
        {/* X labels */}
        {xLabels.map((d, i) => {
          const idx = data.indexOf(d);
          const x = (idx / (data.length - 1)) * w;
          return (
            <text key={i} x={x} y={height - 4} textAnchor="middle" fill="#475569" fontSize="8">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function ETFDetail({ etf, onBack }: Props) {
  const isPositive = etf.changePercent >= 0;
  const chartColor = isPositive ? '#34d399' : '#f87171';
  const recentData = etf.historicalData.slice(-60);
  const weekData = etf.historicalData.slice(-7);

  // Calculate period returns from historical data
  const calcReturn = (days: number) => {
    const data = etf.historicalData;
    if (data.length < days + 1) return 0;
    const now = data[data.length - 1].close;
    const then = data[data.length - 1 - days].close;
    return ((now - then) / then) * 100;
  };

  const periodReturns = [
    { label: '1 Day', value: etf.changePercent },
    { label: '1 Week', value: calcReturn(5) },
    { label: '1 Month', value: calcReturn(21) },
    { label: '3 Month', value: calcReturn(63) },
  ];

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-[#141b2d] border border-slate-700/50 hover:border-slate-600 transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{etf.symbol}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              etf.signal === 'STRONG BUY' ? 'bg-emerald-500/20 text-emerald-400' :
              etf.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
              etf.signal === 'HOLD' ? 'bg-amber-500/20 text-amber-400' :
              etf.signal === 'WATCH' ? 'bg-blue-500/20 text-blue-400' :
              'bg-red-500/20 text-red-400'
            }`}>{etf.signal}</span>
            {etf.dataSource === 'live' && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">● LIVE</span>
            )}
            {etf.dataSource === 'fallback' && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Demo Data</span>
            )}
          </div>
          <p className="text-sm text-slate-400">{etf.name}</p>
        </div>
      </div>

      {/* Price & Chart */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-xs text-slate-500 mb-1">Current Price (CAD)</p>
            <p className="text-4xl font-bold text-white">${etf.price.toFixed(2)}</p>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPositive ? '+' : ''}{etf.changePercent.toFixed(2)}%
            <span className="text-xs opacity-70">(${Math.abs(etf.change).toFixed(2)})</span>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            {recentData.length > 30 ? '~3 Month' : `${recentData.length} Day`} Chart
          </p>
          <PriceChart data={recentData} color={chartColor} height={200} />
        </div>

        {weekData.length > 2 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-4">Weekly Chart</p>
            <PriceChart data={weekData} color="#818cf8" height={120} />
          </div>
        )}
      </div>

      {/* Period Returns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {periodReturns.map(stat => (
          <div key={stat.label} className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stat.value >= 0 ? '+' : ''}{stat.value.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-cyan-300">Short-Term Score</h3>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-cyan-400">{etf.shortTermScore}</span>
            <span className="text-sm text-cyan-600 mb-1">/100</span>
          </div>
          <div className="w-full bg-cyan-900/30 rounded-full h-2.5">
            <div className="bg-cyan-400 h-2.5 rounded-full transition-all" style={{ width: `${etf.shortTermScore}%` }} />
          </div>
          <p className="text-xs text-cyan-500 mt-2">
            {etf.shortTermScore >= 75 ? '🔥 Excellent for day/swing trading' : etf.shortTermScore >= 55 ? '📊 Decent short-term opportunity' : '⏸️ Better suited for longer holds'}
          </p>
        </div>
        <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-purple-300">Long-Term Score</h3>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-purple-400">{etf.longTermScore}</span>
            <span className="text-sm text-purple-600 mb-1">/100</span>
          </div>
          <div className="w-full bg-purple-900/30 rounded-full h-2.5">
            <div className="bg-purple-400 h-2.5 rounded-full transition-all" style={{ width: `${etf.longTermScore}%` }} />
          </div>
          <p className="text-xs text-purple-500 mt-2">
            {etf.longTermScore >= 80 ? '🏆 Top-tier buy-and-hold ETF' : etf.longTermScore >= 60 ? '✅ Solid long-term choice' : '⚠️ Consider alternatives for long holds'}
          </p>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Technical Indicators (Real Data)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">RSI (14)</p>
            <p className={`text-lg font-bold ${
              etf.technicals.rsi < 30 ? 'text-emerald-400' :
              etf.technicals.rsi > 70 ? 'text-red-400' : 'text-white'
            }`}>{etf.technicals.rsi.toFixed(1)}</p>
            <p className="text-[10px] text-slate-600">
              {etf.technicals.rsi < 30 ? 'Oversold' : etf.technicals.rsi > 70 ? 'Overbought' : 'Neutral'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">SMA 20</p>
            <p className="text-lg font-bold text-white">${etf.technicals.sma20.toFixed(2)}</p>
            <p className={`text-[10px] ${etf.price > etf.technicals.sma20 ? 'text-emerald-500' : 'text-red-500'}`}>
              Price {etf.price > etf.technicals.sma20 ? 'above' : 'below'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">SMA 50</p>
            <p className="text-lg font-bold text-white">${etf.technicals.sma50.toFixed(2)}</p>
            <p className={`text-[10px] ${etf.price > etf.technicals.sma50 ? 'text-emerald-500' : 'text-red-500'}`}>
              Price {etf.price > etf.technicals.sma50 ? 'above' : 'below'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">MACD</p>
            <p className={`text-lg font-bold ${etf.technicals.macd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {etf.technicals.macd.toFixed(3)}
            </p>
            <p className={`text-[10px] ${etf.technicals.macdHistogram >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              Histogram: {etf.technicals.macdHistogram >= 0 ? '+' : ''}{etf.technicals.macdHistogram.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Momentum (10d)</p>
            <p className={`text-lg font-bold ${etf.technicals.momentum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {etf.technicals.momentum >= 0 ? '+' : ''}{etf.technicals.momentum.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Volatility (Ann.)</p>
            <p className="text-lg font-bold text-white">{etf.technicals.volatility.toFixed(1)}%</p>
            <p className={`text-[10px] ${etf.technicals.volatility > 25 ? 'text-red-500' : etf.technicals.volatility > 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {etf.technicals.volatility > 25 ? 'High' : etf.technicals.volatility > 15 ? 'Moderate' : 'Low'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h3 className="font-semibold text-white mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Dividend Yield</p>
              <p className="font-semibold text-white">{etf.dividendYield}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BarChart2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">MER</p>
              <p className="font-semibold text-white">{etf.mer}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="font-semibold text-white">{etf.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <BarChart2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Volume</p>
              <p className="font-semibold text-white">{(etf.volume / 1000000).toFixed(2)}M</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg Volume (20d)</p>
              <p className="font-semibold text-white">{((etf.avgVolume || 0) / 1000000).toFixed(2)}M</p>
            </div>
          </div>
          {etf.weekHighLow && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">6mo Range</p>
                <p className="font-semibold text-white">${etf.weekHighLow.low.toFixed(2)} - ${etf.weekHighLow.high.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signal Reasoning */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h3 className="font-semibold text-white mb-3">Signal Analysis</h3>
        <div className="space-y-2">
          {etf.signalReasoning.map((reason, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <p className="text-sm text-slate-300">{reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Best Trading Days */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h3 className="font-semibold text-white mb-3">Historical Day-of-Week Performance</h3>
        <p className="text-xs text-slate-500 mb-4">Based on {etf.historicalData.length} trading days of data</p>
        <div className="space-y-2">
          {DAYS.map(day => {
            const stats = etf.dayOfWeek[day];
            if (!stats) return null;
            const isBest = day === etf.bestDay;
            const pos = stats.avgReturn >= 0;
            return (
              <div key={day} className={`flex items-center gap-3 p-3 rounded-xl ${isBest ? 'bg-emerald-500/10 border border-emerald-500/20' : ''}`}>
                <span className={`text-sm font-medium w-24 ${isBest ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {day} {isBest && '⭐'}
                </span>
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${pos ? 'bg-emerald-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, Math.max(5, stats.winRate))}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-20 text-right ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pos ? '+' : ''}{stats.avgReturn.toFixed(3)}%
                </span>
                <span className="text-xs text-slate-500 w-16 text-right">
                  WR: {stats.winRate.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* About */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h3 className="font-semibold text-white mb-2">About</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{etf.description}</p>
        <p className="text-xs text-slate-600 mt-3">Yahoo Finance Symbol: {etf.yahooSymbol}</p>
      </div>
    </div>
  );
}
