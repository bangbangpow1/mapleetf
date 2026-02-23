import { useState } from 'react';
import { Zap, Target, TrendingUp, Shield, DollarSign, BarChart3, ArrowRight } from 'lucide-react';
import type { ProcessedETF } from '../types';

interface Props {
  etfs: ProcessedETF[];
  onSelectETF: (etf: ProcessedETF) => void;
}

function BarChartSVG({ data, activeTab }: { data: { name: string; value: number }[]; activeTab: string }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(20, Math.min(50, 600 / data.length - 4));
  const totalWidth = data.length * (barWidth + 4);
  const height = 200;
  const color = activeTab === 'short' ? '#22d3ee' : '#a78bfa';
  const topColor = activeTab === 'short' ? '#06b6d4' : '#8b5cf6';

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(totalWidth, 300)} height={height + 30} className="mx-auto">
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * height;
          const x = i * (barWidth + 4) + 2;
          const isTop = i < 3;
          return (
            <g key={d.name}>
              <rect
                x={x}
                y={height - barH}
                width={barWidth}
                height={barH}
                rx={4}
                fill={isTop ? topColor : color}
                opacity={isTop ? 1 : 0.4}
              />
              <text
                x={x + barWidth / 2}
                y={height + 14}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
              >
                {d.name}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - barH - 4}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RadarChartSVG({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const cx = 120; const cy = 120; const r = 90;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  // Grid circles
  const circles = [0.25, 0.5, 0.75, 1].map(scale => {
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
    }).join(' ');
    return <polygon key={scale} points={pts} fill="none" stroke="#334155" strokeWidth="0.5" />;
  });

  // Data polygon
  const dataPts = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const val = Math.min(100, Math.max(0, d.value)) / 100;
    return `${cx + Math.cos(angle) * r * val},${cy + Math.sin(angle) * r * val}`;
  }).join(' ');

  // Labels
  const labels = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const lx = cx + Math.cos(angle) * (r + 18);
    const ly = cy + Math.sin(angle) * (r + 18);
    return (
      <text key={d.label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="10">
        {d.label}
      </text>
    );
  });

  return (
    <svg width={240} height={240} className="mx-auto">
      {circles}
      <polygon points={dataPts} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
      {labels}
    </svg>
  );
}

export function InvestmentInsights({ etfs, onSelectETF }: Props) {
  const [activeTab, setActiveTab] = useState<'short' | 'long'>('short');

  const sortedByScore = [...etfs].sort((a, b) =>
    activeTab === 'short' ? b.shortTermScore - a.shortTermScore : b.longTermScore - a.longTermScore
  );

  const topPick = sortedByScore[0];
  const topDividend = [...etfs].sort((a, b) => b.dividendYield - a.dividendYield).slice(0, 5);
  const topMomentum = [...etfs].sort((a, b) => b.technicals.momentum - a.technicals.momentum).slice(0, 5);

  const barData = sortedByScore.map(e => ({
    name: e.symbol,
    value: activeTab === 'short' ? e.shortTermScore : e.longTermScore,
  }));

  const radarData = topPick ? [
    { label: 'Momentum', value: Math.max(0, Math.min(100, 50 + topPick.technicals.momentum * 5)) },
    { label: 'Stability', value: Math.max(0, Math.min(100, 100 - topPick.technicals.volatility * 2)) },
    { label: 'Yield', value: Math.min(100, topPick.dividendYield * 15) },
    { label: 'Volume', value: Math.min(100, (topPick.volume / 3000000) * 100) },
    { label: 'Value', value: Math.max(0, 100 - topPick.mer * 200) },
  ] : [];

  const shortTermTips = [
    { icon: Zap, title: 'Momentum Trading', desc: 'Focus on ETFs with RSI 40-60 and positive MACD histogram. Look for volume confirmation above the 20-day average.' },
    { icon: TrendingUp, title: 'Swing Trading', desc: 'Look for 2-5 day holds when price pulls back to the 20-day SMA in an uptrend. Energy and gold ETFs offer the most swing opportunities.' },
    { icon: BarChart3, title: 'Volume Signals', desc: 'Trade ETFs with volume 15%+ above their average. This confirms price moves and reduces slippage risk.' },
  ];

  const longTermTips = [
    { icon: Target, title: 'Core Holdings', desc: 'XEQT and VEQT provide all-in-one global diversification at ultra-low MERs. Ideal candidates for dollar-cost averaging every paycheque.' },
    { icon: Shield, title: 'Risk Management', desc: 'Pair equity ETFs with ZAG bonds for stability. VBAL offers a pre-built 60/40 allocation that rebalances automatically.' },
    { icon: DollarSign, title: 'Dividend Growth', desc: 'XDIV and ZEB offer 4%+ yields from quality Canadian companies. Enroll in DRIP to reinvest dividends automatically.' },
  ];

  const tips = activeTab === 'short' ? shortTermTips : longTermTips;
  const topETFs = sortedByScore.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Tab Selector */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('short')}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium transition-all ${
              activeTab === 'short'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            Short-Term
          </button>
          <button
            onClick={() => setActiveTab('long')}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium transition-all ${
              activeTab === 'long'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            Long-Term
          </button>
        </div>
      </div>

      {/* Overview */}
      <div className={`rounded-2xl p-5 text-white ${
        activeTab === 'short'
          ? 'bg-gradient-to-r from-cyan-600 to-blue-700'
          : 'bg-gradient-to-r from-purple-600 to-violet-700'
      }`}>
        <h2 className="text-lg font-bold mb-1">
          {activeTab === 'short' ? '⚡ Short-Term Trading Insights' : '🎯 Long-Term Investment Insights'}
        </h2>
        <p className="text-sm text-white/80 leading-relaxed">
          {activeTab === 'short'
            ? 'Scores based on RSI, MACD momentum, volatility, and recent price action. Best for day-to-week trades.'
            : 'Scores based on trend alignment (SMA), low MER, dividend yield, and price stability. Best for 1+ year holds.'}
        </p>
      </div>

      {/* Score Chart */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h3 className="font-semibold text-white mb-4">
          {activeTab === 'short' ? 'Short-Term' : 'Long-Term'} Score Comparison
        </h3>
        <BarChartSVG data={barData} activeTab={activeTab} />
      </div>

      {/* Radar Analysis */}
      {topPick && (
        <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">Top Pick Analysis</h3>
              <p className="text-sm text-slate-400">{topPick.symbol} — {topPick.name}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              activeTab === 'short' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
            }`}>
              #1 {activeTab === 'short' ? 'Short-Term' : 'Long-Term'}
            </span>
          </div>
          <RadarChartSVG data={radarData} color={activeTab === 'short' ? '#06b6d4' : '#8b5cf6'} />
        </div>
      )}

      {/* Strategy Tips */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white">
          {activeTab === 'short' ? '⚡ Short-Term Strategies' : '🎯 Long-Term Strategies'}
        </h3>
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <div key={index} className="rounded-xl bg-[#141b2d] border border-slate-700/50 p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${activeTab === 'short' ? 'bg-cyan-500/15' : 'bg-purple-500/15'}`}>
                  <Icon className={`w-5 h-5 ${activeTab === 'short' ? 'text-cyan-400' : 'text-purple-400'}`} />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">{tip.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top ETFs List */}
      <div>
        <h3 className="font-semibold text-white mb-3">
          Top {activeTab === 'short' ? 'Short-Term' : 'Long-Term'} ETFs
        </h3>
        <div className="space-y-2">
          {topETFs.map((etf, i) => (
            <button key={etf.symbol} onClick={() => onSelectETF(etf)} className="flex items-center gap-3 w-full rounded-xl bg-[#141b2d] border border-slate-700/50 p-3 hover:border-slate-600 transition-all text-left">
              <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white">{etf.symbol}</span>
                <p className="text-xs text-slate-500 truncate">{etf.name}</p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${activeTab === 'short' ? 'text-cyan-400' : 'text-purple-400'}`}>
                  {activeTab === 'short' ? etf.shortTermScore : etf.longTermScore}/100
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Dividend & Momentum */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Top Dividend ETFs</h3>
          </div>
          <div className="space-y-2">
            {topDividend.map(etf => (
              <button key={etf.symbol} onClick={() => onSelectETF(etf)} className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-slate-800 transition-colors text-left">
                <div>
                  <span className="font-semibold text-white">{etf.symbol}</span>
                  <p className="text-xs text-slate-500">{etf.category}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-400">{etf.dividendYield}%</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Top Momentum ETFs</h3>
          </div>
          <div className="space-y-2">
            {topMomentum.map(etf => (
              <button key={etf.symbol} onClick={() => onSelectETF(etf)} className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-slate-800 transition-colors text-left">
                <div>
                  <span className="font-semibold text-white">{etf.symbol}</span>
                  <p className="text-xs text-slate-500">{etf.category}</p>
                </div>
                <span className={`text-sm font-semibold ${etf.technicals.momentum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {etf.technicals.momentum >= 0 ? '+' : ''}{etf.technicals.momentum.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
