import { useState } from 'react';
import { Radar, RefreshCw, Loader2, Plus, Check, Filter, Zap, Target, ArrowUpCircle, PauseCircle, AlertTriangle, Eye, StopCircle, Bolt, Globe, Layers, Trash2, RotateCcw, Database } from 'lucide-react';
import type { ProcessedETF } from '../types';
import type { ScanMode } from '../useETFData';
import type { ScanLogEntry } from '../scannerLog';
import { ScannerLogs } from './ScannerLogs';

interface ScannerHook {
  scanResults: ProcessedETF[];
  scanning: boolean;
  scanProgress: number;
  scanStatus: string;
  lastScan: Date | null;
  scanMode: ScanMode;
  scannedCount: number;
  totalToScan: number;
  failedCount: number;
  totalStocksInUniverse: number;
  scanLogs: ScanLogEntry[];
  scanStartTime: number;
  isRetryMode: boolean;
  cachedCount: number;
  runScan: (mode?: ScanMode) => void;
  forceRescan: (mode?: ScanMode) => void;
  flushCache: (mode?: ScanMode) => void;
  cancelScan: () => void;
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

type FilterType = 'all' | 'strong-buy' | 'buy' | 'hold' | 'sell' | 'short-term' | 'long-term' | 'tsx' | 'us';
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
  const {
    scanResults, scanning, scanProgress, scanStatus, lastScan,
    scanMode, scannedCount, totalToScan, failedCount, totalStocksInUniverse,
    scanLogs, scanStartTime,
    isRetryMode, cachedCount,
    runScan, forceRescan, flushCache, cancelScan,
  } = scanner;
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('confidence');
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  let filtered = [...scanResults];

  switch (filter) {
    case 'strong-buy': filtered = filtered.filter(e => e.signal === 'STRONG BUY'); break;
    case 'buy': filtered = filtered.filter(e => e.signal === 'BUY' || e.signal === 'STRONG BUY'); break;
    case 'hold': filtered = filtered.filter(e => e.signal === 'HOLD'); break;
    case 'sell': filtered = filtered.filter(e => e.signal === 'SELL' || e.signal === 'WATCH'); break;
    case 'short-term': filtered = filtered.filter(e => e.shortTermScore > e.longTermScore); break;
    case 'long-term': filtered = filtered.filter(e => e.longTermScore >= e.shortTermScore); break;
    case 'tsx': filtered = filtered.filter(e => e.yahooSymbol.includes('.TO')); break;
    case 'us': filtered = filtered.filter(e => !e.yahooSymbol.includes('.TO')); break;
  }

  switch (sort) {
    case 'confidence': filtered.sort((a, b) => b.signalConfidence - a.signalConfidence); break;
    case 'change': filtered.sort((a, b) => b.changePercent - a.changePercent); break;
    case 'momentum': filtered.sort((a, b) => b.technicals.momentum - a.technicals.momentum); break;
    case 'short-score': filtered.sort((a, b) => b.shortTermScore - a.shortTermScore); break;
    case 'long-score': filtered.sort((a, b) => b.longTermScore - a.longTermScore); break;
  }

  const signalCounts = {
    'STRONG BUY': scanResults.filter(e => e.signal === 'STRONG BUY').length,
    'BUY': scanResults.filter(e => e.signal === 'BUY').length,
    'HOLD': scanResults.filter(e => e.signal === 'HOLD').length,
    'WATCH': scanResults.filter(e => e.signal === 'WATCH').length,
    'SELL': scanResults.filter(e => e.signal === 'SELL').length,
  };

  const tsxCount = scanResults.filter(e => e.yahooSymbol.includes('.TO')).length;
  const usCount = scanResults.filter(e => !e.yahooSymbol.includes('.TO')).length;

  // Calculate estimated time: 250ms per stock + ~1s avg fetch time
  const estimateTime = (count: number) => {
    const totalSec = Math.ceil(count * 1.25); // ~1.25s per stock (250ms delay + ~1s fetch)
    if (totalSec > 120) return `~${Math.ceil(totalSec / 60)} min`;
    return `~${totalSec} sec`;
  };

  const quickCount = new Set(QUICK_SCAN_SYMBOLS).size;
  const standardCount = new Set([...QUICK_SCAN_SYMBOLS, ...STANDARD_SCAN_SYMBOLS]).size;

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
                {totalStocksInUniverse}+ stocks & ETFs · Sequential scanning · 250ms between calls
              </p>
            </div>
          </div>
        </div>

        {/* Scan Mode Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => runScan('quick')}
            disabled={scanning}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center disabled:opacity-50 ${
              scanMode === 'quick' && !scanning
                ? 'bg-white/20 border-2 border-white/40'
                : 'bg-white/10 border-2 border-transparent hover:bg-white/15'
            }`}
          >
            <Bolt className="w-5 h-5 text-yellow-300" />
            <div>
              <p className="font-semibold text-white text-xs sm:text-sm">Quick</p>
              <p className="text-[10px] text-white/60">~{quickCount} stocks</p>
              <p className="text-[10px] text-white/40">{estimateTime(quickCount)}</p>
            </div>
          </button>
          <button
            onClick={() => runScan('standard')}
            disabled={scanning}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center disabled:opacity-50 ${
              scanMode === 'standard' && !scanning
                ? 'bg-white/20 border-2 border-white/40'
                : 'bg-white/10 border-2 border-transparent hover:bg-white/15'
            }`}
          >
            <Layers className="w-5 h-5 text-cyan-300" />
            <div>
              <p className="font-semibold text-white text-xs sm:text-sm">Standard</p>
              <p className="text-[10px] text-white/60">~{standardCount} stocks</p>
              <p className="text-[10px] text-white/40">{estimateTime(standardCount)}</p>
            </div>
          </button>
          <button
            onClick={() => runScan('full')}
            disabled={scanning}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center disabled:opacity-50 ${
              scanMode === 'full' && !scanning
                ? 'bg-white/20 border-2 border-white/40'
                : 'bg-white/10 border-2 border-transparent hover:bg-white/15'
            }`}
          >
            <Globe className="w-5 h-5 text-emerald-300" />
            <div>
              <p className="font-semibold text-white text-xs sm:text-sm">Full Market</p>
              <p className="text-[10px] text-white/60">{totalStocksInUniverse}+ stocks</p>
              <p className="text-[10px] text-white/40">{estimateTime(totalStocksInUniverse)}</p>
            </div>
          </button>
        </div>

        {/* Smart Scan Info */}
        <div className="mt-3 bg-white/10 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-white/60 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-white/70 leading-relaxed">
              <p className="font-semibold text-white/90 mb-1">Smart Caching Enabled</p>
              <p>
                Results are cached for 30 min. Next scan <span className="text-cyan-300 font-medium">only retries failed stocks</span> — 
                previously successful results load instantly from cache. 
                Use <span className="text-amber-300 font-medium">Force Re-Scan</span> to flush cache and rescan everything fresh.
              </p>
            </div>
          </div>
        </div>

        {/* Signal counts */}
        {!scanning && scanResults.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(signalCounts).filter(([, c]) => c > 0).map(([signal, count]) => (
              <div key={signal} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="text-xs text-white">{count} {signal}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <span className="text-xs text-white/60">🇨🇦 {tsxCount} TSX · 🇺🇸 {usCount} US</span>
            </div>
          </div>
        )}

        {lastScan && !scanning && (
          <p className="text-xs text-white/50 mt-3">
            Last {scanMode} scan: {lastScan.toLocaleTimeString()} · {scanResults.length} stocks analyzed
            {failedCount > 0 && ` · ${failedCount} failed (will retry on next scan)`}
          </p>
        )}
      </div>

      {/* Scanning progress */}
      {scanning && (
        <div className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <div>
                <h3 className="text-white font-semibold">
                  {isRetryMode ? '🔄 Retry Scan' : scanMode === 'quick' ? '⚡ Quick' : scanMode === 'standard' ? '📊 Standard' : '🌐 Full Market'} Scan
                  <span className="text-xs font-normal text-slate-400 ml-2">
                    (1 at a time · 250ms delay)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{scanStatus}</p>
                {isRetryMode && cachedCount > 0 && (
                  <p className="text-xs text-cyan-400 mt-0.5">
                    💾 {cachedCount} results loaded from cache · retrying {totalToScan} failed symbols
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={cancelScan}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Stop
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-violet-400 h-3 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{scannedCount} / {totalToScan} stocks</span>
            <span>{Math.round(scanProgress)}%</span>
            <span>{scanResults.length} found · {failedCount} failed</span>
          </div>

          {/* ETA */}
          {scannedCount > 3 && (
            <div className="mt-2 text-xs text-slate-600 text-center">
              {(() => {
                const elapsed = (Date.now() - scanStartTime) / 1000;
                const rate = scannedCount / elapsed;
                const remaining = totalToScan - scannedCount;
                const estSec = Math.ceil(remaining / rate);
                return estSec > 60 ? `~${Math.ceil(estSec / 60)} min remaining` : `~${estSec} sec remaining`;
              })()}
            </div>
          )}

          {/* Streaming results */}
          {scanResults.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Results so far (updating live):</p>
              <div className="flex flex-wrap gap-2">
                {scanResults.slice(0, 15).map(etf => {
                  const colors = SIGNAL_COLORS[etf.signal];
                  return (
                    <button
                      key={etf.yahooSymbol}
                      onClick={() => onSelectETF(etf)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${colors.bg} hover:brightness-125 transition-all`}
                    >
                      <span className={`font-bold ${colors.text}`}>{etf.signal}</span>
                      <span className="text-white font-semibold">{etf.symbol}</span>
                      <span className={etf.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(1)}%
                      </span>
                    </button>
                  );
                })}
                {scanResults.length > 15 && (
                  <span className="text-xs text-slate-500 self-center">+{scanResults.length - 15} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!scanning && scanResults.length > 0 && (
        <>
          {/* Filters, Sort, and Force Re-scan */}
          <div className="flex flex-col gap-3">
            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => runScan(scanMode)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Scan (retry failed)
              </button>
              <button
                onClick={() => forceRescan(scanMode)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Force Re-Scan
              </button>
              <button
                onClick={() => {
                  flushCache();
                  setCacheMsg('Cache flushed! Start a new scan to fetch fresh data.');
                  setTimeout(() => setCacheMsg(null), 4000);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Flush Cache
              </button>
              {cacheMsg && (
                <span className="text-xs text-emerald-400 ml-2 animate-pulse">{cacheMsg}</span>
              )}
              <span className="text-xs text-slate-600 ml-auto">
                💾 {scanResults.length} cached · {failedCount > 0 ? `${failedCount} to retry` : '0 failures'}
              </span>
            </div>

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
                    { id: 'tsx', label: '🇨🇦 TSX Only' },
                    { id: 'us', label: '🇺🇸 US Only' },
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
              const isTSX = etf.yahooSymbol.includes('.TO');

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
                          <span className={`text-[10px] px-1 py-0.5 rounded ${isTSX ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                            {isTSX ? '🇨🇦' : '🇺🇸'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isShortTerm ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {isShortTerm ? '⚡' : '🎯'}
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
          <h3 className="text-white font-semibold mb-2">Ready to Scan {totalStocksInUniverse}+ Stocks</h3>
          <p className="text-sm text-slate-400 mb-2 max-w-lg mx-auto">
            The scanner fetches real price data from Yahoo Finance one stock at a time with a 250ms delay between each call to avoid rate limiting.
            Results are cached — subsequent scans only retry failed stocks.
          </p>
          <p className="text-xs text-slate-500 mb-6 max-w-lg mx-auto">
            ⏱️ Each stock takes ~1-2 seconds. Quick scan ≈ 1 min, Standard ≈ 3 min, Full ≈ 6 min.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => runScan('quick')}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-medium transition-colors"
            >
              <Bolt className="w-5 h-5" />
              Quick Scan (~{quickCount}, {estimateTime(quickCount)})
            </button>
            <button
              onClick={() => runScan('standard')}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors"
            >
              <Layers className="w-5 h-5" />
              Standard (~{standardCount}, {estimateTime(standardCount)})
            </button>
            <button
              onClick={() => runScan('full')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            >
              <Globe className="w-5 h-5" />
              Full ({totalStocksInUniverse}+, {estimateTime(totalStocksInUniverse)})
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-4">
            💡 You can also search any stock using the 🔍 search bar above — not limited to this list
          </p>
        </div>
      )}

      {/* Scanner Logs */}
      {scanLogs.length > 0 && (
        <ScannerLogs
          logs={scanLogs}
          scanStartTime={scanStartTime}
          scanning={scanning}
        />
      )}

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-4">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          ⚠️ Sequential scanning with 250ms delay between each API call to prevent rate limiting.
          Results are cached for 30 min — next scan only retries failed stocks.
          Use "Force Re-Scan" to flush cache and rescan all {totalStocksInUniverse}+ stocks fresh.
          This is not financial advice.
        </p>
      </div>
    </div>
  );
}

// Need these for the estimate calculations
const QUICK_SCAN_SYMBOLS = [
  'XIU.TO','XIC.TO','XEQT.TO','VEQT.TO','VFV.TO','TEC.TO','ZEB.TO','ZAG.TO','XGD.TO','XEG.TO',
  'XDIV.TO','VGRO.TO','ZSP.TO','ZQQ.TO','XQQ.TO','HCAL.TO','HDIV.TO',
  'RY.TO','TD.TO','BNS.TO','BMO.TO','CM.TO','NA.TO',
  'ENB.TO','CNQ.TO','SU.TO','TRP.TO','TOU.TO',
  'ABX.TO','FNV.TO','WPM.TO','AEM.TO',
  'SHOP.TO','CSU.TO',
  'CNR.TO','CP.TO','BAM.TO','BN.TO','ATD.TO','DOL.TO','L.TO',
  'MFC.TO','SLF.TO',
  'FTS.TO','H.TO',
  'AAPL','MSFT','NVDA','GOOGL','AMZN','TSLA','META','SPY','QQQ',
];

const STANDARD_SCAN_SYMBOLS = [
  ...QUICK_SCAN_SYMBOLS,
  'HXS.TO','BTCC-B.TO','HQU.TO','ZCN.TO','VCN.TO','XUU.TO','ZWB.TO','ZDV.TO','XRE.TO',
  'ZWC.TO','XEF.TO','XEC.TO','XGRO.TO','XBAL.TO','ZGRO.TO','ZBAL.TO','VCNS.TO',
  'XBB.TO','ZFL.TO','HISA.TO','XEI.TO','HXT.TO',
  'EQB.TO','CWB.TO',
  'CVE.TO','IMO.TO','PPL.TO','ARX.TO','KEY.TO','MEG.TO','WCP.TO','BTE.TO','TPZ.TO','VET.TO','CPG.TO',
  'NTR.TO','K.TO','FM.TO','TECK-B.TO','LUN.TO','HBM.TO','IVN.TO','BTO.TO','ELD.TO','ERO.TO',
  'BB.TO','LSPD.TO','DCBO.TO','KXS.TO','DSG.TO','GIB-A.TO','CLS.TO','NVEI.TO',
  'BCE.TO','T.TO','RCI-B.TO','QBR-B.TO',
  'IFC.TO','GWO.TO','IAG.TO','FFH.TO','POW.TO','X.TO','BIP-UN.TO','BEP-UN.TO',
  'REI-UN.TO','CAR-UN.TO','GRT-UN.TO','DIR-UN.TO','SRU-UN.TO','CHP-UN.TO',
  'AC.TO','CAE.TO','BBD-B.TO',
  'MRU.TO','GIL.TO','WN.TO','CTC-A.TO','MG.TO','QSR.TO','PBH.TO',
  'EMA.TO','AQN.TO','CU.TO','CPX.TO','NPI.TO',
  'WSP.TO','STN.TO','WCN.TO','TIH.TO','FTT.TO',
  'WEED.TO','TLRY.TO',
  'AMD','AVGO','NFLX','CRM','ADBE','INTC','QCOM','PLTR','COIN','JPM','V','MA',
  'WMT','COST','HD','DIS','XOM','BA','GE','UNH','LLY','JNJ',
  'IWM','VOO','VTI','ARKK','GLD','SOXX','SMH',
];
