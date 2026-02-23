import { Star, Trash2, TrendingUp, TrendingDown, RefreshCw, Loader2, PlusCircle } from 'lucide-react';
import type { ProcessedETF } from '../types';

interface WatchlistHook {
  items: { symbol: string; yahooSymbol: string; name: string; addedAt: number }[];
  watchlistData: ProcessedETF[];
  loadingWatchlist: boolean;
  removeFromWatchlist: (yahooSymbol: string) => void;
  refreshWatchlist: () => void;
}

interface Props {
  watchlist: WatchlistHook;
  onSelectETF: (etf: ProcessedETF) => void;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80; const h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

const SIGNAL_COLORS: Record<string, string> = {
  'STRONG BUY': 'bg-emerald-500/20 text-emerald-400',
  'BUY': 'bg-green-500/20 text-green-400',
  'HOLD': 'bg-amber-500/20 text-amber-400',
  'WATCH': 'bg-blue-500/20 text-blue-400',
  'SELL': 'bg-red-500/20 text-red-400',
};

export function WatchlistView({ watchlist, onSelectETF }: Props) {
  const { items, watchlistData, loadingWatchlist, removeFromWatchlist, refreshWatchlist } = watchlist;

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 mx-auto mb-4 flex items-center justify-center">
          <Star className="w-10 h-10 text-amber-500/40" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Your Watchlist is Empty</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Use the search bar at the top to find any stock or ETF in the market, then add it to your watchlist to track it.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <PlusCircle className="w-4 h-4" />
          <span>Search for a stock → Click + to add to watchlist</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your Watchlist</h2>
              <p className="text-sm text-white/80">{items.length} stock{items.length !== 1 ? 's' : ''} tracked with live data</p>
            </div>
          </div>
          <button
            onClick={refreshWatchlist}
            disabled={loadingWatchlist}
            className="flex items-center gap-2 px-3 py-2 bg-white/15 rounded-lg text-white text-sm hover:bg-white/25 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingWatchlist ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loadingWatchlist && (
        <div className="text-center py-10">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400">Fetching watchlist data...</p>
        </div>
      )}

      {/* Watchlist Cards */}
      <div className="space-y-3">
        {watchlistData.map(etf => {
          const pos = etf.changePercent >= 0;
          return (
            <div key={etf.yahooSymbol} className="rounded-xl bg-[#141b2d] border border-slate-700/50 hover:border-slate-600 transition-all">
              <button
                onClick={() => onSelectETF(etf)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-white text-lg">{etf.symbol}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SIGNAL_COLORS[etf.signal]}`}>
                        {etf.signal}
                      </span>
                      {etf.dataSource === 'live' && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">● LIVE</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{etf.name}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-white">${etf.price.toFixed(2)}</p>
                    <p className={`text-sm font-medium flex items-center gap-1 justify-end ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {pos ? '+' : ''}{etf.changePercent.toFixed(2)}%
                    </p>
                  </div>

                  <div className="hidden sm:block">
                    <Sparkline data={etf.historicalData.slice(-20).map(d => d.close)} color={pos ? '#34d399' : '#f87171'} />
                  </div>
                </div>

                {/* Quick stats */}
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="text-slate-500">RSI: <span className={etf.technicals.rsi < 30 ? 'text-emerald-400' : etf.technicals.rsi > 70 ? 'text-red-400' : 'text-white'}>{etf.technicals.rsi.toFixed(0)}</span></span>
                  <span className="text-slate-500">Mom: <span className={etf.technicals.momentum >= 0 ? 'text-emerald-400' : 'text-red-400'}>{etf.technicals.momentum >= 0 ? '+' : ''}{etf.technicals.momentum.toFixed(1)}%</span></span>
                  <span className="text-slate-500">Vol: <span className="text-white">{etf.technicals.volatility.toFixed(1)}%</span></span>
                  <span className="text-slate-500">Confidence: <span className="text-white">{etf.signalConfidence}%</span></span>
                </div>
              </button>

              {/* Remove button */}
              <div className="px-4 pb-3 flex justify-end">
                <button
                  onClick={() => removeFromWatchlist(etf.yahooSymbol)}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        {/* Pending items (not yet loaded) */}
        {items.filter(item => !watchlistData.find(d => d.yahooSymbol === item.yahooSymbol)).map(item => (
          <div key={item.yahooSymbol} className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4 opacity-50">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
              <div>
                <span className="font-bold text-white">{item.symbol}</span>
                <p className="text-xs text-slate-500">{item.name} — loading...</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-4">
        <p className="text-xs text-slate-500 text-center">
          💡 Use the search bar (🔍) at the top to find any stock in the world and add it to your watchlist.
        </p>
      </div>
    </div>
  );
}
