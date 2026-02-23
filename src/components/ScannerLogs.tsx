import { useState, useEffect, useRef } from 'react';
import { ScrollText, AlertTriangle, CheckCircle2, XCircle, Clock, Zap, ChevronDown, ChevronUp, Trash2, Download, BarChart3, Wifi, WifiOff } from 'lucide-react';
import type { ScanLogEntry } from '../scannerLog';
import { computeLogStats, detectThrottling } from '../scannerLog';

interface Props {
  logs: ScanLogEntry[];
  scanStartTime: number;
  scanning: boolean;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '✅' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: '❌' },
  timeout: { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', label: '⏱️' },
  throttled: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: '🚫' },
  skipped: { icon: WifiOff, color: 'text-slate-400', bg: 'bg-slate-500/10', label: '⏭️' },
  pending: { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '⏳' },
};

export function ScannerLogs({ logs, scanStartTime, scanning }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'slow'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during scan
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, autoScroll]);

  if (logs.length === 0) return null;

  const stats = computeLogStats(logs, scanStartTime);
  const warnings = detectThrottling(logs);

  // Filter logs
  let filteredLogs = [...logs];
  switch (filter) {
    case 'success': filteredLogs = filteredLogs.filter(l => l.status === 'success'); break;
    case 'failed': filteredLogs = filteredLogs.filter(l => l.status !== 'success' && l.status !== 'pending'); break;
    case 'slow': filteredLogs = filteredLogs.filter(l => l.durationMs > 3000); break;
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  const formatMs = (ms: number) => {
    if (ms < 1) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const exportLogs = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      stats,
      warnings,
      logs: logs.map(l => ({
        ...l,
        timestampISO: new Date(l.timestamp).toISOString(),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapleetf-scan-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-[#0d1420] border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500/15 rounded-lg">
            <ScrollText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Scanner Logs
              {scanning && (
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </h3>
            <p className="text-[10px] text-slate-500">
              {stats.totalRequests} requests · {stats.successCount} ✅ · {stats.failedCount + stats.timeoutCount} ❌ · Avg {stats.avgResponseMs}ms · {stats.requestsPerSec}/sec
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/15 px-2 py-1 rounded-lg">
              <AlertTriangle className="w-3 h-3" />
              {warnings.length}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800">
          {/* Stats Bar */}
          <div className="px-4 py-3 bg-[#111827] border-b border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Requests</p>
                <p className="text-sm font-bold text-white">{stats.totalRequests}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Success</p>
                <p className="text-sm font-bold text-emerald-400">{stats.successCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Failed</p>
                <p className="text-sm font-bold text-red-400">{stats.failedCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Timeouts</p>
                <p className="text-sm font-bold text-orange-400">{stats.timeoutCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Avg Speed</p>
                <p className="text-sm font-bold text-cyan-400">{stats.avgResponseMs}ms</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Fastest</p>
                <p className="text-sm font-bold text-emerald-300">{stats.fastestMs}ms</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Slowest</p>
                <p className="text-sm font-bold text-red-300">{stats.slowestMs}ms</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Data</p>
                <p className="text-sm font-bold text-purple-400">{formatBytes(stats.totalDataBytes)}</p>
              </div>
            </div>

            {/* Proxy stats */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-400">
                  Proxy 1 (corsproxy): <span className="text-white font-medium">{stats.proxy1Count}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-blue-400" />
                <span className="text-slate-400">
                  Proxy 2 (allorigins): <span className="text-white font-medium">{stats.proxy2Count}</span>
                </span>
              </div>
              {stats.proxy1FailCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400">
                    {stats.proxy1FailCount} fallbacks
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3 text-slate-400" />
                <span className="text-slate-400">
                  {stats.requestsPerSec} req/sec · {stats.elapsedSec}s elapsed
                </span>
              </div>
            </div>

            {/* Speed histogram bar */}
            {stats.totalRequests > 0 && (() => {
              const buckets = [0, 0, 0, 0, 0]; // <500, 500-1k, 1-2k, 2-5k, 5k+
              for (const log of logs) {
                if (log.status !== 'success') continue;
                if (log.durationMs < 500) buckets[0]++;
                else if (log.durationMs < 1000) buckets[1]++;
                else if (log.durationMs < 2000) buckets[2]++;
                else if (log.durationMs < 5000) buckets[3]++;
                else buckets[4]++;
              }
              const max = Math.max(...buckets, 1);
              const labels = ['<500ms', '0.5-1s', '1-2s', '2-5s', '5s+'];
              const colors = ['bg-emerald-400', 'bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-400'];
              return (
                <div className="mt-3">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Response Time Distribution</p>
                  <div className="flex items-end gap-1 h-8">
                    {buckets.map((count, i) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-full rounded-t ${colors[i]} transition-all duration-300`}
                          style={{ height: `${(count / max) * 28}px`, minHeight: count > 0 ? '3px' : '0px' }}
                        />
                        <span className="text-[8px] text-slate-600 mt-0.5">{labels[i]}</span>
                        <span className="text-[8px] text-slate-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Throttling Warnings */}
          {warnings.length > 0 && (
            <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/10">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400 py-0.5">{w}</p>
              ))}
            </div>
          )}

          {/* Filter & Controls */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800 bg-[#111827]">
            <div className="flex gap-1.5">
              {([
                { id: 'all', label: 'All', count: logs.length },
                { id: 'success', label: '✅ OK', count: logs.filter(l => l.status === 'success').length },
                { id: 'failed', label: '❌ Errors', count: logs.filter(l => l.status !== 'success' && l.status !== 'pending').length },
                { id: 'slow', label: '🐌 Slow', count: logs.filter(l => l.durationMs > 3000).length },
              ] as { id: typeof filter; label: string; count: number }[]).map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    filter === f.id
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-amber-500 w-3 h-3"
                />
                Auto-scroll
              </label>
              <button
                onClick={exportLogs}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                title="Export logs as JSON"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>

          {/* Log Entries */}
          <div
            ref={scrollRef}
            className="max-h-80 overflow-y-auto font-mono text-[11px] leading-relaxed"
          >
            {filteredLogs.map((log) => {
              const config = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
              const isSlow = log.durationMs > 3000;
              const isVerySlow = log.durationMs > 5000;
              
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 px-4 py-1.5 border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors ${
                    isVerySlow ? 'bg-red-500/5' : isSlow ? 'bg-orange-500/5' : ''
                  }`}
                >
                  {/* Timestamp */}
                  <span className="text-slate-600 flex-shrink-0 w-16">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  
                  {/* Status badge */}
                  <span className={`flex-shrink-0 w-5 text-center ${config.color}`}>
                    {config.label}
                  </span>
                  
                  {/* Batch */}
                  <span className="text-slate-600 flex-shrink-0 w-8">
                    B{log.batchIndex}
                  </span>
                  
                  {/* Symbol */}
                  <span className={`font-bold flex-shrink-0 w-20 truncate ${
                    log.status === 'success' ? 'text-emerald-400' :
                    log.status === 'failed' || log.status === 'timeout' ? 'text-red-400' :
                    log.status === 'throttled' ? 'text-yellow-400' :
                    'text-slate-400'
                  }`}>
                    {log.symbol}
                  </span>
                  
                  {/* Duration */}
                  <span className={`flex-shrink-0 w-14 text-right ${
                    isVerySlow ? 'text-red-400 font-bold' :
                    isSlow ? 'text-orange-400' :
                    log.durationMs > 1500 ? 'text-yellow-400' :
                    log.durationMs > 0 ? 'text-slate-400' :
                    'text-slate-600'
                  }`}>
                    {log.durationMs > 0 ? formatMs(log.durationMs) : '—'}
                  </span>
                  
                  {/* Response size */}
                  <span className="text-slate-600 flex-shrink-0 w-14 text-right">
                    {log.responseSize > 0 ? formatBytes(log.responseSize) : '—'}
                  </span>
                  
                  {/* Data points */}
                  <span className="text-slate-600 flex-shrink-0 w-10 text-right">
                    {log.dataPoints > 0 ? `${log.dataPoints}pts` : '—'}
                  </span>
                  
                  {/* Proxy */}
                  <span className={`flex-shrink-0 w-16 text-right ${
                    log.proxyFallback ? 'text-amber-500' : 'text-slate-600'
                  }`}>
                    {log.proxy ? log.proxy.split('.')[0] : '—'}
                    {log.proxyFallback && ' ↩'}
                  </span>
                  
                  {/* HTTP status */}
                  <span className={`flex-shrink-0 w-8 text-right ${
                    log.httpStatus >= 200 && log.httpStatus < 300 ? 'text-emerald-500' :
                    log.httpStatus === 429 ? 'text-yellow-400' :
                    log.httpStatus > 0 ? 'text-red-400' :
                    'text-slate-600'
                  }`}>
                    {log.httpStatus > 0 ? log.httpStatus : '—'}
                  </span>
                  
                  {/* Notes */}
                  <span className={`flex-1 truncate ${
                    log.note.includes('THROTTLE') || log.note.includes('RATE LIMIT') ? 'text-yellow-400' :
                    log.note.includes('SLOW') ? 'text-orange-400' :
                    log.note.includes('error') || log.note.includes('Error') ? 'text-red-400/70' :
                    log.note.includes('Fallback') ? 'text-amber-500/70' :
                    'text-slate-600'
                  }`}>
                    {log.note || (log.status === 'success' ? 'OK' : '')}
                  </span>
                </div>
              );
            })}
            
            {filteredLogs.length === 0 && (
              <div className="px-4 py-6 text-center text-slate-600 text-xs">
                No logs matching this filter
              </div>
            )}
          </div>

          {/* Footer with legend */}
          <div className="px-4 py-2 bg-[#111827] border-t border-slate-800 flex items-center justify-between">
            <div className="flex gap-3 text-[10px] text-slate-600">
              <span>✅ Success</span>
              <span>❌ Failed</span>
              <span>⏱️ Timeout</span>
              <span>🚫 Throttled</span>
              <span>⏭️ Skipped</span>
              <span>↩ Proxy Fallback</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600">
                {filteredLogs.length} entries shown
              </span>
              <button
                onClick={() => { }}
                className="text-[10px] text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1"
                title="Clear logs"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
