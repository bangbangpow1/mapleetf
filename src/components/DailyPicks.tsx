import { useState } from 'react';
import { Calendar, Star, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import type { ProcessedETF } from '../types';

interface Props {
  etfs: ProcessedETF[];
  onSelectETF: (etf: ProcessedETF) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_TIPS: Record<string, string> = {
  Monday: "Mondays often see higher volatility as markets react to weekend news. Focus on momentum plays and look for gap openings. ETFs with strong Friday closes may continue the trend.",
  Tuesday: "Tuesdays tend to stabilize after Monday's moves. Historically a good day for mean-reversion plays. Watch for sector rotation opportunities in banking and energy ETFs.",
  Wednesday: "Mid-week often brings economic data releases from Bank of Canada and Statistics Canada. Bond ETFs (ZAG) may react to rate signals. Tech ETFs often find direction.",
  Thursday: "Thursdays see increased institutional volume as weekly trends solidify. Good day for position sizing. Dividend ETFs often see accumulation before ex-dividend dates.",
  Friday: "Fridays can see profit-taking before the weekend, especially in volatile sectors. Consider trimming short-term positions. Long-term investors can find entry points on dips.",
};

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

export function DailyPicks({ etfs, onSelectETF }: Props) {
  const today = new Date().getDay();
  const initialDay = today >= 1 && today <= 5 ? today - 1 : 0;
  const [selectedDay, setSelectedDay] = useState(initialDay);

  const dayName = DAYS[selectedDay];

  // Rank ETFs by their historical performance on this day
  const rankedETFs = [...etfs]
    .map(etf => ({
      etf,
      dayStats: etf.dayOfWeek[dayName],
    }))
    .filter(d => d.dayStats && d.dayStats.count > 0)
    .sort((a, b) => {
      const scoreA = a.dayStats.avgReturn * 0.6 + (a.dayStats.winRate - 50) * 0.4;
      const scoreB = b.dayStats.avgReturn * 0.6 + (b.dayStats.winRate - 50) * 0.4;
      return scoreB - scoreA;
    });

  return (
    <div className="space-y-5">
      {/* Day Selector */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Select Trading Day</h2>
          {initialDay === selectedDay && today >= 1 && today <= 5 && (
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Today</span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {DAYS.map((day, i) => (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                selectedDay === i
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Best ETFs for selected day */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-white">Best ETFs for {dayName}</h2>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
            Based on {rankedETFs[0]?.dayStats.count || 0}+ historical {dayName}s
          </span>
        </div>

        <div className="space-y-3">
          {rankedETFs.map((item, index) => {
            const { etf, dayStats } = item;
            const pos = dayStats.avgReturn >= 0;
            return (
              <button
                key={etf.symbol}
                onClick={() => onSelectETF(etf)}
                className="w-full rounded-xl bg-[#141b2d] border border-slate-700/50 p-4 hover:border-slate-600 transition-all text-left relative"
              >
                {index === 0 && (
                  <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                    🏆 TOP PICK
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-white">{etf.symbol}</span>
                      <span className="text-xs text-slate-500">{etf.category}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{etf.name}</p>
                  </div>
                  <div className="text-right mr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-slate-500">{dayName} Avg:</span>
                      <span className={`text-sm font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos ? '+' : ''}{dayStats.avgReturn.toFixed(3)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Win Rate:</span>
                      <span className={`text-xs font-semibold ${dayStats.winRate >= 55 ? 'text-emerald-400' : dayStats.winRate >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                        {dayStats.winRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">${etf.price.toFixed(2)}</p>
                      <p className={`text-xs ${etf.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
                      </p>
                    </div>
                    <Sparkline data={etf.historicalData.slice(-14).map(d => d.close)} color={pos ? '#34d399' : '#f87171'} />
                  </div>
                </div>
                {/* Day performance bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${pos ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.max(5, dayStats.winRate))}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day-of-Week Comparison */}
      <div className="rounded-2xl bg-[#141b2d] border border-slate-700/50 p-5">
        <h3 className="font-semibold text-white mb-4">Weekly Pattern Overview</h3>
        <div className="space-y-3">
          {DAYS.map((day, i) => {
            const dayAvg = etfs.reduce((sum, etf) => {
              const stats = etf.dayOfWeek[day];
              return sum + (stats ? stats.avgReturn : 0);
            }, 0) / etfs.length;
            const dayWin = etfs.reduce((sum, etf) => {
              const stats = etf.dayOfWeek[day];
              return sum + (stats ? stats.winRate : 50);
            }, 0) / etfs.length;
            const isSelected = i === selectedDay;
            const pos = dayAvg >= 0;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  isSelected ? 'bg-indigo-500/15 border border-indigo-500/30' : 'hover:bg-slate-800/50'
                }`}
              >
                <span className={`text-sm font-medium w-20 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {day}
                </span>
                <div className="flex-1">
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pos ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.max(3, dayWin))}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pos ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                    {' '}{pos ? '+' : ''}{dayAvg.toFixed(3)}%
                  </span>
                  <span className="text-xs text-slate-500">WR: {dayWin.toFixed(0)}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trading Tip */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/15 rounded-lg mt-0.5">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">{dayName} Trading Tip</h3>
            <p className="text-sm text-white/80 leading-relaxed">{DAY_TIPS[dayName]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
