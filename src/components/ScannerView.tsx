import { useState } from 'react';
import { Radar, RefreshCw, Loader2, Plus, Check, Filter, Zap, Target, ArrowUpCircle, PauseCircle, AlertTriangle, Eye } from 'lucide-react';
import type { ProcessedETF } from '../types';

interface ScannerHook {
  scanResults: ProcessedETF[];
  scanning: boolean;
  scanProgress: number;
  lastScan: Date | null;
  runScan: () => void;
}

interface WatchlistHook {
  addToWatchlist: (symbol: string, yahooSymbol: string, name: string) => void;
  removeFromWatchlist: (yahooSymbol: string) => void;
  isInWatchlist: (yahooSymbol: string) => boolean;
}

interface Props {
  scanner: ScannerHook;
  watchlist: WatchlistHook;
  onSelectETF: (etf: ProcessedETF) => void;
}

type FilterType = 'all' | 'strong-buy' | 'buy' | 'hold' | 'sell' | 'short-term' | 'long-term';
type SortType = 'confidence' | 'change' | 'momentum' | 'short-score' | 'long-score';

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64; const h = 24;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

const SIGNAL_ICONS: Record<string, typeof Zap> = {
  'STRONG BUY': Zap,
  'BUY': ArrowUpCircle,
  'HOLD': PauseCircle,
  'WATCH': Eye,
  'SELL': AlertTriangle,
};

const SIGNAL_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  'STRONG BUY': { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  'BUY': { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', badge: 'bg-green-500' },
  'HOLD': { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500' },
  'WATCH': { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', badge: 'bg-blue-500' },
  'SELL': { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', badge: 'bg-red-500' },
};

export function ScannerView({ scanner, watchlist, onSelectETF }: Props) {
  const { scanResults, scanning, scanProgress, lastScan, runScan } = scanner;
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('confidence');

  let filtered = [...scanResults];

  // Apply filter
  switch (filter) {
    case 'strong-buy': filtered = filtered.filter(e => e.signal === 'STRONG BUY'); break;
    case 'buy': filtered = filtered.filter(e => e.signal === 'BUY' || e.signal === 'STRONG BUY'); break;
    case 'hold': filtered = filtered.filter(e => e.signal === 'HOLD'); break;
    case 'sell': filtered = filtered.filter(e => e.signal === 'SELL' || e.signal === 'WATCH'); break;
    case 'short-term': filtered = filtered.filter(e => e.shortTermScore > e.longTermScore); break;
    case 'long-term': filtered = filtered.filter(e => e.longTermScore >= e.shortTermScore); break;
  }

  // Apply sort
  switch (sort) {
    case 'confidence': filtered.sort((a, b) => b.signalConfidence - a.signalConfidence); break;
    case 'change': filtered.sort((a, b) => b.changePercent - a.changePercent); break;
    case 'momentum': filtered.sort((a, b) => b.technicals.momentum - a.technicals.momentum); break;
    case 'short-score': filtered.sort((a, b) => b.shortTermScore - a.shortTermScore); break;
    case 'long-score': filtered.sort((a, b) => b.longTermScore - a.longTermScore); break;
  }

  // Stats
  const signalCounts = {
    'STRONG BUY': scanResults.filter(e => e.signal === 'STRONG BUY').length,
    'BUY': scanResults.filter(e => e.signal === 'BUY').length,
    'HOLD': scanResults.filter(e => e.signal === 'HOLD').length,
    'WATCH': scanResults.filter(e => e.signal === 'WATCH').length,
    'SELL': scanResults.filter(e => e.signal === 'SELL').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-lg">
              <Radar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Market Scanner</h2>
              <p className="text-sm text-white/80">
                Scans {80}+ Canadian stocks, ETFs & popular US tickers
              </p>
            </div>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-lg text-white text-sm hover:bg-white/25 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Re-scan'}
          </button>
        </div>

        {!scanning && scanResults.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(signalCounts).filter(([, c]) => c > 0).map(([signal, count]) => (
              <div key={signal} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="text-xs text-white">{count} {signal}</span>
              </div>
            ))}
          </div>
        )}

        {lastScan && !scanning && (
          <p className="text-xs text-white/50 mt-3">
            Last scanned: {lastScan.toLocaleTimeString()} · {scanResults.length} stocks analyzed
          </p>
        )}
      </div>

      {/* Scanning progress */}
      {scanning && (
        <div className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-6 text-center">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-2">Scanning the Market</h3>
          <p className="text-sm text-slate-400 mb-4">
            Fetching real-time data from Yahoo Finance for 80+ stocks...
          </p>
          <div className="w-64 mx-auto bg-slate-800 rounded-full h-2.5 mb-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-violet-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{Math.round(scanProgress)}% — analyzing technical indicators...</p>
        </div>
      )}

      {!scanning && scanResults.length > 0 && (
        <>
          {/* Filters & Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500 uppercase tracking-wider">Filter</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'strong-buy', label: '🔥 Strong Buy' },
                  { id: 'buy', label: '↑ Buys' },
                  { id: 'hold', label: '⏸ Hold' },
                  { id: 'sell', label: '↓ Sell/Watch' },
                  { id: 'short-term', label: '⚡ Short-Term' },
                  { id: 'long-term', label: '🎯 Long-Term' },
                ] as { id: FilterType; label: string }[]).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filter === f.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Sort by</span>
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortType)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 outline-none"
              >
                <option value="confidence">Signal Confidence</option>
                <option value="change">Daily Change %</option>
                <option value="momentum">Momentum</option>
                <option value="short-score">Short-Term Score</option>
                <option value="long-score">Long-Term Score</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-500">{filtered.length} results</p>

          {/* Top Picks Summary */}
          {filter === 'all' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-emerald-400">Best Short-Term Play</h3>
                </div>
                {filtered.length > 0 && (() => {
                  const best = [...filtered].sort((a, b) => b.shortTermScore - a.shortTermScore)[0];
                  return (
                    <button onClick={() => onSelectETF(best)} className="text-left w-full">
                      <p className="text-white font-bold">{best.symbol} <span className="text-slate-400 font-normal text-xs">{best.name}</span></p>
                      <p className="text-emerald-400 text-sm">Score: {best.shortTermScore}/100 · Confidence: {best.signalConfidence}%</p>
                    </button>
                  );
                })()}
              </div>
              <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-purple-400">Best Long-Term Hold</h3>
                </div>
                {filtered.length > 0 && (() => {
                  const best = [...filtered].sort((a, b) => b.longTermScore - a.longTermScore)[0];
                  return (
                    <button onClick={() => onSelectETF(best)} className="text-left w-full">
                      <p className="text-white font-bold">{best.symbol} <span className="text-slate-400 font-normal text-xs">{best.name}</span></p>
                      <p className="text-purple-400 text-sm">Score: {best.longTermScore}/100 · Confidence: {best.signalConfidence}%</p>
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="space-y-2">
            {filtered.map((etf, idx) => {
              const colors = SIGNAL_COLORS[etf.signal];
              const Icon = SIGNAL_ICONS[etf.signal] || PauseCircle;
              const pos = etf.changePercent >= 0;
              const inWatchlist = watchlist.isInWatchlist(etf.yahooSymbol);
              const isShortTerm = etf.shortTermScore > etf.longTermScore;

              return (
                <div
                  key={etf.yahooSymbol}
                  className={`rounded-xl border ${colors.bg} transition-all hover:brightness-110`}
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => onSelectETF(etf)}
                      className="flex-1 p-3 text-left flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </div>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${colors.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${colors.badge}`}>
                            {etf.signal}
                          </span>
                          <span className="font-bold text-white text-sm">{etf.symbol}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isShortTerm ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {isShortTerm ? '⚡ Short' : '🎯 Long'}
                          </span>
                          <span className="text-xs text-slate-500 hidden sm:inline">{etf.category}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{etf.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-white">${etf.price.toFixed(2)}</p>
                        <p className={`text-xs font-medium ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pos ? '+' : ''}{etf.changePercent.toFixed(2)}%
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 ml-2">
                        <Sparkline data={etf.historicalData.slice(-14).map(d => d.close)} color={pos ? '#34d399' : '#f87171'} />
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Conf</p>
                          <p className="text-xs font-bold text-white">{etf.signalConfidence}%</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        if (inWatchlist) watchlist.removeFromWatchlist(etf.yahooSymbol);
                        else watchlist.addToWatchlist(etf.symbol, etf.yahooSymbol, etf.name);
                      }}
                      className={`px-3 self-stretch flex items-center transition-colors border-l border-slate-800/50 ${
                        inWatchlist ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-amber-400'
                      }`}
                      title={inWatchlist ? 'In watchlist' : 'Add to watchlist'}
                    >
                      {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400">No stocks match this filter.</p>
            </div>
          )}
        </>
      )}

      {!scanning && scanResults.length === 0 && (
        <div className="text-center py-16">
          <Radar className="w-12 h-12 text-purple-500/30 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Market Scanner</h3>
          <p className="text-sm text-slate-400 mb-4">
            Scans 80+ Canadian stocks, ETFs, and popular US tickers to find the best trades.
          </p>
          <button
            onClick={runScan}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors"
          >
            Start Scan
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-4">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          ⚠️ The scanner analyzes real price data from Yahoo Finance using RSI, MACD, SMA, and momentum indicators.
          This is not financial advice. Always do your own research.
        </p>
      </div>
    </div>
  );
}
