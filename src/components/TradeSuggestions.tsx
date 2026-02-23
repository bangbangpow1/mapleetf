import { Lightbulb, ArrowUpCircle, PauseCircle, Eye, AlertTriangle, ChevronRight, Zap } from 'lucide-react';
import type { ProcessedETF } from '../types';

interface Props {
  etfs: ProcessedETF[];
  onSelectETF: (etf: ProcessedETF) => void;
}

const SIGNAL_CONFIG = {
  'STRONG BUY': { icon: Zap, bg: 'bg-emerald-500/15 border-emerald-500/25', badge: 'bg-emerald-500', text: 'text-emerald-400', iconColor: 'text-emerald-400' },
  'BUY': { icon: ArrowUpCircle, bg: 'bg-green-500/10 border-green-500/20', badge: 'bg-green-500', text: 'text-green-400', iconColor: 'text-green-400' },
  'HOLD': { icon: PauseCircle, bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500', text: 'text-amber-400', iconColor: 'text-amber-400' },
  'WATCH': { icon: Eye, bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500', text: 'text-blue-400', iconColor: 'text-blue-400' },
  'SELL': { icon: AlertTriangle, bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500', text: 'text-red-400', iconColor: 'text-red-400' },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64; const h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

export function TradeSuggestions({ etfs, onSelectETF }: Props) {
  const sorted = [...etfs].sort((a, b) => b.signalConfidence - a.signalConfidence);

  const signalCounts = {
    'STRONG BUY': sorted.filter(e => e.signal === 'STRONG BUY').length,
    'BUY': sorted.filter(e => e.signal === 'BUY').length,
    'HOLD': sorted.filter(e => e.signal === 'HOLD').length,
    'WATCH': sorted.filter(e => e.signal === 'WATCH').length,
    'SELL': sorted.filter(e => e.signal === 'SELL').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white/15 rounded-lg">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Trade Signals</h2>
            <p className="text-sm text-white/80">Generated from real technical analysis (RSI, MACD, SMA, Momentum)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          {Object.entries(signalCounts).filter(([, c]) => c > 0).map(([signal, count]) => (
            <div key={signal} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="text-sm text-white">{count} {signal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Cards */}
      <div className="space-y-3">
        {sorted.map(etf => {
          const config = SIGNAL_CONFIG[etf.signal];
          const Icon = config.icon;
          const isShortTerm = etf.shortTermScore > etf.longTermScore;

          return (
            <button
              key={etf.symbol}
              onClick={() => onSelectETF(etf)}
              className={`w-full rounded-xl border ${config.bg} p-4 hover:brightness-110 transition-all text-left group`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${config.badge}`}>
                      {etf.signal}
                    </span>
                    <span className="font-bold text-white">{etf.symbol}</span>
                    <span className="text-xs text-slate-400">${etf.price.toFixed(2)}</span>
                    <span className={`text-xs font-medium ${etf.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{etf.name}</p>

                  {/* Signal Reasoning */}
                  <div className="space-y-1 mb-3">
                    {etf.signalReasoning.map((reason, i) => (
                      <p key={i} className={`text-xs ${config.text} leading-relaxed`}>• {reason}</p>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isShortTerm ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {isShortTerm ? '⚡ Short-Term' : '🎯 Long-Term'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">Confidence:</span>
                      <div className="w-20 bg-slate-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            etf.signalConfidence >= 75 ? 'bg-emerald-400' :
                            etf.signalConfidence >= 55 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${etf.signalConfidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-300">{etf.signalConfidence}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Sparkline data={etf.historicalData.slice(-14).map(d => d.close)} color={etf.changePercent >= 0 ? '#34d399' : '#f87171'} />
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Indicator Legend */}
      <div className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">How Signals Are Generated</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
          <div>• <span className="text-slate-300">RSI</span> — Relative Strength Index (oversold/overbought)</div>
          <div>• <span className="text-slate-300">MACD</span> — Moving Average Convergence Divergence</div>
          <div>• <span className="text-slate-300">SMA 20/50</span> — Price vs Simple Moving Averages</div>
          <div>• <span className="text-slate-300">Momentum</span> — 10-day price rate of change</div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          ⚠️ Signals are generated from real technical indicators calculated on historical price data.
          This is not financial advice. Always do your own research and consult a financial advisor.
        </p>
      </div>
    </div>
  );
}
