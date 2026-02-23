import { TrendingUp, TrendingDown, Flame, BarChart3, Activity, Zap, Target, Search, Radar, Smartphone } from 'lucide-react';
import type { ProcessedETF } from '../types';

interface Props {
  etfs: ProcessedETF[];
  onSelectETF: (etf: ProcessedETF) => void;
}

function Sparkline({ data, color, width = 100, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
      <polygon
        fill={`url(#sg-${color.replace('#', '')})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}

export function Dashboard({ etfs, onSelectETF }: Props) {
  if (etfs.length === 0) return null;

  const gainers = etfs.filter(e => e.changePercent > 0);
  const losers = etfs.filter(e => e.changePercent < 0);
  const avgChange = etfs.reduce((s, e) => s + e.changePercent, 0) / etfs.length;
  const sorted = [...etfs].sort((a, b) => b.changePercent - a.changePercent);
  const topGainer = sorted[0];
  const topLoser = sorted[sorted.length - 1];
  const topVolume = [...etfs].sort((a, b) => b.volume - a.volume)[0];
  const topShort = [...etfs].sort((a, b) => b.shortTermScore - a.shortTermScore).slice(0, 4);
  const topLong = [...etfs].sort((a, b) => b.longTermScore - a.longTermScore).slice(0, 4);

  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#141b2d] to-[#1a2440] border border-slate-700/50 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-xs text-slate-500 mb-1">🍁 TSX · Toronto Stock Exchange</p>
          <h1 className="text-2xl font-bold text-white mb-1">Canadian Stock & ETF Scanner</h1>
          <p className="text-sm text-slate-400">
            {dayNames[today.getDay()]}, {monthNames[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${avgChange >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-sm text-slate-300">
                Market {avgChange >= 0 ? 'Bullish' : 'Bearish'} ({avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%)
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {gainers.length}↑ · {losers.length}↓
            </span>
          </div>
        </div>
      </div>

      {/* Feature callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#141b2d] border border-purple-500/20 p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-500/15 rounded-lg">
            <Radar className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Market Scanner</p>
            <p className="text-xs text-slate-500">Scans 80+ stocks to find the best trades — not just 12 ETFs</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#141b2d] border border-emerald-500/20 p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/15 rounded-lg">
            <Search className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Search Any Stock</p>
            <p className="text-xs text-slate-500">Use 🔍 above to search any stock worldwide & add to watchlist</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-500">Gainers</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{gainers.length}</p>
        </div>
        <div className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-500">Decliners</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{losers.length}</p>
        </div>
        <div className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-slate-500">Top Gainer</span>
          </div>
          <p className="text-lg font-bold text-white">{topGainer.symbol}</p>
          <p className="text-xs text-emerald-400">+{topGainer.changePercent.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-500">Most Active</span>
          </div>
          <p className="text-lg font-bold text-white">{topVolume.symbol}</p>
          <p className="text-xs text-slate-400">{(topVolume.volume / 1000000).toFixed(1)}M vol</p>
        </div>
      </div>

      {/* Hot Movers */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Today's Movers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => onSelectETF(topGainer)} className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 hover:bg-emerald-500/15 transition-all text-left">
            <p className="text-xs text-emerald-400 mb-1">🚀 Biggest Gainer</p>
            <p className="font-bold text-white">{topGainer.symbol}</p>
            <p className="text-xs text-slate-400 truncate">{topGainer.name}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-emerald-400">+{topGainer.changePercent.toFixed(2)}%</span>
              <span className="text-sm text-slate-300">${topGainer.price.toFixed(2)}</span>
            </div>
            <div className="mt-2">
              <Sparkline data={topGainer.historicalData.slice(-20).map(d => d.close)} color="#34d399" />
            </div>
          </button>
          <button onClick={() => onSelectETF(topLoser)} className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 hover:bg-red-500/15 transition-all text-left">
            <p className="text-xs text-red-400 mb-1">📉 Biggest Decliner</p>
            <p className="font-bold text-white">{topLoser.symbol}</p>
            <p className="text-xs text-slate-400 truncate">{topLoser.name}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-red-400">{topLoser.changePercent.toFixed(2)}%</span>
              <span className="text-sm text-slate-300">${topLoser.price.toFixed(2)}</span>
            </div>
            <div className="mt-2">
              <Sparkline data={topLoser.historicalData.slice(-20).map(d => d.close)} color="#f87171" />
            </div>
          </button>
          <button onClick={() => onSelectETF(topVolume)} className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 hover:bg-blue-500/15 transition-all text-left">
            <p className="text-xs text-blue-400 mb-1">📊 Most Active</p>
            <p className="font-bold text-white">{topVolume.symbol}</p>
            <p className="text-xs text-slate-400 truncate">{topVolume.name}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-blue-400">{(topVolume.volume / 1000000).toFixed(1)}M</span>
              <span className="text-sm text-slate-300">${topVolume.price.toFixed(2)}</span>
            </div>
            <div className="mt-2">
              <Sparkline data={topVolume.historicalData.slice(-20).map(d => d.close)} color="#60a5fa" />
            </div>
          </button>
        </div>
      </div>

      {/* Quick Picks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            Best Short-Term
          </h2>
          <div className="space-y-2">
            {topShort.map(etf => (
              <button key={etf.symbol} onClick={() => onSelectETF(etf)} className="flex items-center gap-3 w-full rounded-xl bg-[#141b2d] border border-slate-700/50 p-3 hover:border-slate-600 transition-all text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{etf.symbol}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{etf.shortTermScore}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{etf.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">${etf.price.toFixed(2)}</p>
                  <p className={`text-xs font-medium ${etf.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
                  </p>
                </div>
                <div className="w-16">
                  <Sparkline data={etf.historicalData.slice(-14).map(d => d.close)} color={etf.changePercent >= 0 ? '#34d399' : '#f87171'} width={64} height={28} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            Best Long-Term
          </h2>
          <div className="space-y-2">
            {topLong.map(etf => (
              <button key={etf.symbol} onClick={() => onSelectETF(etf)} className="flex items-center gap-3 w-full rounded-xl bg-[#141b2d] border border-slate-700/50 p-3 hover:border-slate-600 transition-all text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{etf.symbol}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">{etf.longTermScore}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{etf.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">${etf.price.toFixed(2)}</p>
                  <p className={`text-xs font-medium ${etf.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
                  </p>
                </div>
                <div className="w-16">
                  <Sparkline data={etf.historicalData.slice(-14).map(d => d.close)} color={etf.changePercent >= 0 ? '#34d399' : '#f87171'} width={64} height={28} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Install on Phone */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/15 rounded-xl flex-shrink-0">
            <Smartphone className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">📱 Install on Your Phone</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">
              MapleETF is a Progressive Web App — install it on your Android or iPhone for a native app experience!
            </p>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold mt-0.5">Android:</span>
                <span>Open in Chrome → Tap the 3-dot menu (⋮) → "Add to Home screen" or look for the install banner</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-0.5">iPhone:</span>
                <span>Open in Safari → Tap the Share button (⬆) → "Add to Home Screen"</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold mt-0.5">Desktop:</span>
                <span>Chrome/Edge → Click the install icon (⊕) in the address bar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All ETFs */}
      <div>
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          All Tracked ETFs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {etfs.map(etf => {
            const pos = etf.changePercent >= 0;
            return (
              <button key={etf.symbol} onClick={() => onSelectETF(etf)} className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4 hover:border-slate-600 transition-all text-left group">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{etf.symbol}</span>
                      <span className="text-xs text-slate-500">{etf.category}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{etf.name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${pos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {pos ? '+' : ''}{etf.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="mb-2">
                  <Sparkline data={etf.historicalData.slice(-30).map(d => d.close)} color={pos ? '#34d399' : '#f87171'} height={40} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white">${etf.price.toFixed(2)}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-slate-500">MER {etf.mer}%</span>
                    <span className="text-slate-500">Yield {etf.dividendYield}%</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                    <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${etf.shortTermScore}%` }} />
                  </div>
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                    <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${etf.longTermScore}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>Short {etf.shortTermScore}</span>
                  <span>Long {etf.longTermScore}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
