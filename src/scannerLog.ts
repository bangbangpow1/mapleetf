// ============================================================
// SCANNER LOGGING SYSTEM
// Tracks every API request with timing, status, proxy, throttling detection
// ============================================================

export interface ScanLogEntry {
  id: number;
  timestamp: number;
  symbol: string;
  status: 'pending' | 'success' | 'failed' | 'timeout' | 'throttled' | 'skipped';
  proxy: string;
  proxyFallback: boolean; // did it fall back to 2nd proxy?
  durationMs: number;
  responseSize: number; // bytes
  dataPoints: number; // number of OHLCV bars returned
  httpStatus: number;
  error: string;
  batchIndex: number;
  batchSize: number;
  note: string; // throttling detection, etc.
}

export interface ScanLogStats {
  totalRequests: number;
  successCount: number;
  failedCount: number;
  timeoutCount: number;
  throttledCount: number;
  avgResponseMs: number;
  fastestMs: number;
  slowestMs: number;
  totalDataBytes: number;
  proxy1Count: number;
  proxy2Count: number;
  proxy1FailCount: number;
  startTime: number;
  elapsedSec: number;
  requestsPerSec: number;
}

let logIdCounter = 0;

export function createLogEntry(symbol: string, batchIndex: number, batchSize: number): ScanLogEntry {
  return {
    id: ++logIdCounter,
    timestamp: Date.now(),
    symbol,
    status: 'pending',
    proxy: '',
    proxyFallback: false,
    durationMs: 0,
    responseSize: 0,
    dataPoints: 0,
    httpStatus: 0,
    error: '',
    batchIndex,
    batchSize,
    note: '',
  };
}

export function computeLogStats(logs: ScanLogEntry[], scanStartTime: number): ScanLogStats {
  const completed = logs.filter(l => l.status !== 'pending');
  const successes = completed.filter(l => l.status === 'success');
  const failures = completed.filter(l => l.status === 'failed');
  const timeouts = completed.filter(l => l.status === 'timeout');
  const throttled = completed.filter(l => l.status === 'throttled');
  
  const durations = successes.map(l => l.durationMs).filter(d => d > 0);
  const avgMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const fastestMs = durations.length > 0 ? Math.min(...durations) : 0;
  const slowestMs = durations.length > 0 ? Math.max(...durations) : 0;
  
  const proxy1 = completed.filter(l => l.proxy.includes('corsproxy'));
  const proxy2 = completed.filter(l => l.proxy.includes('allorigins'));
  const proxy1Fails = logs.filter(l => l.proxyFallback);
  
  const elapsed = (Date.now() - scanStartTime) / 1000;
  
  return {
    totalRequests: completed.length,
    successCount: successes.length,
    failedCount: failures.length,
    timeoutCount: timeouts.length,
    throttledCount: throttled.length,
    avgResponseMs: Math.round(avgMs),
    fastestMs: Math.round(fastestMs),
    slowestMs: Math.round(slowestMs),
    totalDataBytes: completed.reduce((sum, l) => sum + l.responseSize, 0),
    proxy1Count: proxy1.length,
    proxy2Count: proxy2.length,
    proxy1FailCount: proxy1Fails.length,
    startTime: scanStartTime,
    elapsedSec: Math.round(elapsed),
    requestsPerSec: elapsed > 0 ? Math.round((completed.length / elapsed) * 10) / 10 : 0,
  };
}

// Detect throttling patterns
export function detectThrottling(logs: ScanLogEntry[]): string[] {
  const warnings: string[] = [];
  
  // Check if recent requests are much slower than earlier ones
  const completed = logs.filter(l => l.status === 'success' && l.durationMs > 0);
  if (completed.length >= 10) {
    const first5 = completed.slice(0, 5);
    const last5 = completed.slice(-5);
    const avgFirst = first5.reduce((s, l) => s + l.durationMs, 0) / 5;
    const avgLast = last5.reduce((s, l) => s + l.durationMs, 0) / 5;
    
    if (avgLast > avgFirst * 3 && avgLast > 2000) {
      warnings.push(`⚠️ THROTTLING DETECTED: Recent requests avg ${Math.round(avgLast)}ms vs initial ${Math.round(avgFirst)}ms (${Math.round(avgLast/avgFirst)}x slower)`);
    } else if (avgLast > avgFirst * 2 && avgLast > 1500) {
      warnings.push(`⚡ Slowdown: Recent avg ${Math.round(avgLast)}ms vs initial ${Math.round(avgFirst)}ms`);
    }
  }
  
  // Check for burst of failures
  const recent20 = logs.slice(-20);
  const recentFails = recent20.filter(l => l.status === 'failed' || l.status === 'timeout');
  if (recentFails.length > 10) {
    warnings.push(`🔴 HIGH FAILURE RATE: ${recentFails.length}/20 recent requests failed`);
  } else if (recentFails.length > 5) {
    warnings.push(`🟡 Elevated failures: ${recentFails.length}/20 recent requests failed`);
  }
  
  // Check for many proxy fallbacks
  const fallbacks = logs.filter(l => l.proxyFallback);
  if (fallbacks.length > logs.length * 0.3 && fallbacks.length > 5) {
    warnings.push(`🔄 Primary proxy failing often: ${fallbacks.length}/${logs.length} requests fell back to secondary proxy`);
  }
  
  // Check for suspiciously fast responses (might be cached/empty)
  const veryFast = completed.filter(l => l.durationMs < 50);
  if (veryFast.length > 5 && veryFast.length > completed.length * 0.3) {
    warnings.push(`💨 ${veryFast.length} responses under 50ms — might be proxy-cached or empty`);
  }
  
  return warnings;
}

export function resetLogCounter() {
  logIdCounter = 0;
}
