import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProcessedETF, WatchlistItem, SearchResult } from './types';
import { ETF_LIST, SCANNER_UNIVERSE, TOTAL_SCANNER_STOCKS, fetchETFData, fetchETFDataLogged, parseChartData, generateFallbackData, searchStocks, delay } from './api';
import { processETFData } from './analysis';
import type { ScanLogEntry } from './scannerLog';
import { createLogEntry, resetLogCounter } from './scannerLog';

const CACHE_KEY = 'mapleetf_cache_v2';
const WATCHLIST_KEY = 'mapleetf_watchlist';
const SCANNER_CACHE_KEY = 'mapleetf_scanner_v4';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CacheData {
  timestamp: number;
  etfs: ProcessedETF[];
}

interface ScanCacheData {
  timestamp: number;
  results: ProcessedETF[];
  failedSymbols: string[]; // Track which symbols failed so we can retry only those
}

// ============================================================
// MAIN ETF DATA HOOK
// ============================================================
export function useETFData() {
  const [etfs, setEtfs] = useState<ProcessedETF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'cached' | 'fallback'>('fallback');
  const [fetchProgress, setFetchProgress] = useState(0);

  const loadCache = (): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CacheData = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) return data;
      }
    } catch { /* ignore */ }
    return null;
  };

  const saveCache = (etfData: ProcessedETF[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        etfs: etfData.map(e => ({ ...e, historicalData: e.historicalData.slice(-60) })),
      }));
    } catch { /* ignore */ }
  };

  const fetchAllData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    setFetchProgress(0);

    if (!force) {
      const cached = loadCache();
      if (cached) {
        setEtfs(cached.etfs);
        setLastUpdated(new Date(cached.timestamp));
        setDataSource('cached');
        setLoading(false);
        return;
      }
    }

    const results: ProcessedETF[] = [];
    let liveCount = 0;

    // Fetch core ETFs sequentially with 250ms delay between each
    for (let i = 0; i < ETF_LIST.length; i++) {
      const meta = ETF_LIST[i];
      try {
        const rawData = await fetchETFData(meta.yahooSymbol);
        if (rawData) {
          const historicalData = parseChartData(rawData);
          if (historicalData.length > 10) {
            liveCount++;
            results.push(processETFData(meta, historicalData, 'live'));
            setFetchProgress(((i + 1) / ETF_LIST.length) * 100);
            if (i < ETF_LIST.length - 1) await delay(250);
            continue;
          }
        }
      } catch { /* fall through */ }
      const fallbackData = generateFallbackData(meta.symbol);
      results.push(processETFData(meta, fallbackData, 'fallback'));
      setFetchProgress(((i + 1) / ETF_LIST.length) * 100);
      if (i < ETF_LIST.length - 1) await delay(250);
    }

    setEtfs(results);
    setLastUpdated(new Date());
    setDataSource(liveCount > 0 ? 'live' : 'fallback');

    if (liveCount === 0) {
      setError('Could not fetch live data. Showing estimates. Refresh to try again.');
    }

    if (liveCount > 0) saveCache(results);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  return { etfs, loading, error, lastUpdated, dataSource, refresh: () => fetchAllData(true), fetchProgress };
}

// ============================================================
// SEARCH HOOK — search any stock globally
// ============================================================
export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedStock, setSearchedStock] = useState<ProcessedETF | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const res = await searchStocks(query);
      setResults(res);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const loadStock = async (result: SearchResult) => {
    setLoadingStock(true);
    setResults([]);
    setQuery('');
    try {
      const raw = await fetchETFData(result.symbol);
      if (raw) {
        const historicalData = parseChartData(raw);
        if (historicalData.length > 5) {
          const meta = {
            symbol: result.symbol.replace('.TO', ''),
            yahooSymbol: result.symbol,
            name: result.name,
            category: result.exchange + ' - ' + result.type,
            mer: 0,
            dividendYield: 0,
            description: `${result.name} traded on ${result.exchange}. Data from Yahoo Finance.`,
          };
          const processed = processETFData(meta, historicalData, 'live');
          setSearchedStock(processed);
          setLoadingStock(false);
          return;
        }
      }
    } catch { /* fallback */ }
    const meta = {
      symbol: result.symbol.replace('.TO', ''),
      yahooSymbol: result.symbol,
      name: result.name,
      category: result.exchange,
      mer: 0, dividendYield: 0,
      description: `${result.name} — could not load live data.`,
    };
    const fallback = generateFallbackData(result.symbol);
    setSearchedStock(processETFData(meta, fallback, 'fallback'));
    setLoadingStock(false);
  };

  return { query, setQuery, results, searching, searchedStock, setSearchedStock, loadStock, loadingStock };
}

// ============================================================
// WATCHLIST HOOK — persisted in localStorage
// ============================================================
export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [watchlistData, setWatchlistData] = useState<ProcessedETF[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  const save = (newItems: WatchlistItem[]) => {
    setItems(newItems);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newItems));
  };

  const addToWatchlist = (symbol: string, yahooSymbol: string, name: string) => {
    if (items.find(i => i.yahooSymbol === yahooSymbol)) return;
    save([...items, { symbol, yahooSymbol, name, addedAt: Date.now() }]);
  };

  const removeFromWatchlist = (yahooSymbol: string) => {
    save(items.filter(i => i.yahooSymbol !== yahooSymbol));
  };

  const isInWatchlist = (yahooSymbol: string) => items.some(i => i.yahooSymbol === yahooSymbol);

  const refreshWatchlist = useCallback(async () => {
    if (items.length === 0) { setWatchlistData([]); return; }
    setLoadingWatchlist(true);

    // Sequential with 250ms delay to avoid rate limiting
    const results: ProcessedETF[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const raw = await fetchETFData(item.yahooSymbol);
        if (raw) {
          const hist = parseChartData(raw);
          if (hist.length > 5) {
            const meta = {
              symbol: item.symbol,
              yahooSymbol: item.yahooSymbol,
              name: item.name,
              category: 'Watchlist',
              mer: 0, dividendYield: 0,
              description: `${item.name} — added to your watchlist.`,
            };
            results.push(processETFData(meta, hist, 'live'));
            if (i < items.length - 1) await delay(250);
            continue;
          }
        }
      } catch { /* fallback */ }
      const meta = {
        symbol: item.symbol,
        yahooSymbol: item.yahooSymbol,
        name: item.name,
        category: 'Watchlist',
        mer: 0, dividendYield: 0,
        description: item.name,
      };
      results.push(processETFData(meta, generateFallbackData(item.symbol), 'fallback'));
      if (i < items.length - 1) await delay(250);
    }

    setWatchlistData(results);
    setLoadingWatchlist(false);
  }, [items]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  return { items, watchlistData, loadingWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, refreshWatchlist };
}

// ============================================================
// SCANNER HOOK — parallel batches, smart caching, always full scan
// ============================================================

export type ScanMode = 'full';

export function useScanner() {
  const [scanResults, setScanResults] = useState<ProcessedETF[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('full');
  const [scannedCount, setScannedCount] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([]);
  const [scanStartTime, setScanStartTime] = useState(0);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const cancelRef = useRef(false);
  const logsRef = useRef<ScanLogEntry[]>([]);

  // ---- Cache helpers ----
  const loadScanCache = (mode: ScanMode): ScanCacheData | null => {
    try {
      const key = SCANNER_CACHE_KEY + '_' + mode;
      const cached = localStorage.getItem(key);
      if (cached) {
        const data: ScanCacheData = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) return data;
      }
    } catch { /* ignore */ }
    return null;
  };

  const saveScanCache = (results: ProcessedETF[], failedSymbols: string[], mode: ScanMode) => {
    try {
      const key = SCANNER_CACHE_KEY + '_' + mode;
      const trimmed = results.map(r => ({ ...r, historicalData: r.historicalData.slice(-60) }));
      const json = JSON.stringify({ timestamp: Date.now(), results: trimmed, failedSymbols });
      localStorage.setItem(key, json);
    } catch {
      try {
        const key = SCANNER_CACHE_KEY + '_' + mode;
        const trimmed = results.slice(0, 100).map(r => ({ ...r, historicalData: r.historicalData.slice(-60) }));
        localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), results: trimmed, failedSymbols }));
      } catch { /* give up */ }
    }
  };

  const flushScanCache = useCallback(() => {
    localStorage.removeItem(SCANNER_CACHE_KEY + '_full');
  }, []);

  const cancelScan = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // ---- Main scan function ----
  // forceAll = true: flush cache and rescan everything
  // forceAll = false: use cache + only retry failed symbols
  const runScan = useCallback(async (mode: ScanMode = 'full', forceAll = false) => {
    // Build the full universe: all scanner stocks + any base ETFs not already included
    const seen = new Set(SCANNER_UNIVERSE.map(s => s.yahooSymbol));
    const etfExtras = ETF_LIST
      .filter(e => !seen.has(e.yahooSymbol))
      .map(e => ({ symbol: e.symbol, yahooSymbol: e.yahooSymbol, name: e.name, category: e.category }));
    const fullUniverse = [...SCANNER_UNIVERSE, ...etfExtras];

    // If force, flush the cache
    if (forceAll) {
      flushScanCache();
    }

    // Check cache
    const cached = loadScanCache(mode);
    let existingResults: ProcessedETF[] = [];
    let symbolsToScan: typeof fullUniverse = [];
    let retrying = false;

    if (!forceAll && cached) {
      existingResults = cached.results;
      const failedSet = new Set(cached.failedSymbols || []);

      if (failedSet.size === 0) {
        // All succeeded last time — just show cached results
        setScanResults(cached.results);
        setLastScan(new Date(cached.timestamp));
        setScanMode(mode);
        setCachedCount(cached.results.length);
        setIsRetryMode(false);
        return;
      }

      // Only scan the failed symbols
      symbolsToScan = fullUniverse.filter(s => failedSet.has(s.yahooSymbol));
      retrying = true;
    } else {
      // Scan everything
      symbolsToScan = fullUniverse;
    }

    cancelRef.current = false;
    setScanning(true);
    setScanProgress(0);
    setFailedCount(0);
    setScanMode(mode);
    setIsRetryMode(retrying);
    setCachedCount(existingResults.length);

    // Reset logs
    resetLogCounter();
    logsRef.current = [];
    setScanLogs([]);
    const startTs = Date.now();
    setScanStartTime(startTs);

    setScanStatus('Fetching market data...');
    setTotalToScan(symbolsToScan.length);

    setScannedCount(0);

    // Start with existing cached results (if retrying)
    const newResults: ProcessedETF[] = [];
    const newFailedSymbols: string[] = [];
    let failed = 0;

    // Show cached results immediately if retrying
    if (retrying && existingResults.length > 0) {
      setScanResults(existingResults);
    }

    // ---- PARALLEL SCANNING — 4 concurrent requests per batch, 150ms between batches ----
    const BATCH_SIZE = 4;
    let scannedSoFar = 0;

    for (let batchStart = 0; batchStart < symbolsToScan.length; batchStart += BATCH_SIZE) {
      if (cancelRef.current) {
        setScanStatus('Scan stopped.');
        const remainingFailed = symbolsToScan.slice(batchStart).map(s => s.yahooSymbol);
        newFailedSymbols.push(...remainingFailed);
        break;
      }

      const batch = symbolsToScan.slice(batchStart, batchStart + BATCH_SIZE);
      setScanStatus('Fetching market data...');

      // Run batch in parallel
      await Promise.allSettled(batch.map(async (stock, batchIdx) => {
        const globalIdx = batchStart + batchIdx;
        const logEntry = createLogEntry(stock.yahooSymbol, Math.floor(globalIdx / 10) + 1, 1);
        logsRef.current = [...logsRef.current, logEntry];

        try {
          const raw = await fetchETFDataLogged(stock.yahooSymbol, logEntry);
          if (raw) {
            const hist = parseChartData(raw);
            if (hist.length > 10) {
              const meta = {
                symbol: stock.symbol,
                yahooSymbol: stock.yahooSymbol,
                name: stock.name,
                category: stock.category,
                mer: 0, dividendYield: 0,
                description: `${stock.name} — ${stock.category}`,
              };
              const processed = processETFData(meta, hist, 'live');
              newResults.push(processed);
            } else {
              logEntry.status = 'skipped';
              logEntry.note += `Only ${hist.length} valid data points. `;
              failed++;
              newFailedSymbols.push(stock.yahooSymbol);
            }
          } else {
            failed++;
            newFailedSymbols.push(stock.yahooSymbol);
          }
        } catch (err) {
          logEntry.status = 'failed';
          logEntry.note += `Uncaught: ${String(err).slice(0, 60)}. `;
          failed++;
          newFailedSymbols.push(stock.yahooSymbol);
        }

        if (logEntry.status === 'pending') logEntry.status = 'failed';
      }));

      // Update UI after each batch
      scannedSoFar = Math.min(batchStart + BATCH_SIZE, symbolsToScan.length);
      setScannedCount(scannedSoFar);
      setFailedCount(failed);
      setScanProgress((scannedSoFar / symbolsToScan.length) * 100);

      const allResults = [...existingResults, ...newResults].sort((a, b) => b.signalConfidence - a.signalConfidence);
      setScanResults(allResults);
      setScanLogs([...logsRef.current]);

      // 150ms between batches
      if (batchStart + BATCH_SIZE < symbolsToScan.length && !cancelRef.current) {
        await delay(150);
      }
    }

    // Final merge
    const allResults = [...existingResults, ...newResults].sort((a, b) => b.signalConfidence - a.signalConfidence);
    // Deduplicate by yahooSymbol (in case retry found a previously cached one)
    const deduped = new Map<string, ProcessedETF>();
    for (const r of allResults) {
      // Prefer the freshest result (newResults over existingResults)
      const existing = deduped.get(r.yahooSymbol);
      if (!existing || newResults.includes(r)) {
        deduped.set(r.yahooSymbol, r);
      }
    }
    const finalResults = [...deduped.values()].sort((a, b) => b.signalConfidence - a.signalConfidence);

    setScanResults(finalResults);
    setLastScan(new Date());
    setScanning(false);
    setScanLogs([...logsRef.current]);

    setScanStatus(`Scan complete. ${finalResults.length} stocks analyzed.`);

    // Save to cache with the list of still-failed symbols
    if (finalResults.length > 0) {
      saveScanCache(finalResults, newFailedSymbols, mode);
    }
  }, [flushScanCache]);

  // Force re-scan: flush cache + rescan everything
  const forceRescan = useCallback(() => {
    runScan('full', true);
  }, [runScan]);

  // Normal scan: use cache + retry failures only
  const normalScan = useCallback(() => {
    runScan('full', false);
  }, [runScan]);

  // Auto-load cache on mount
  useEffect(() => {
    const cached = loadScanCache('full');
    if (cached) {
      setScanResults(cached.results);
      setLastScan(new Date(cached.timestamp));
      setScanMode('full');
      setCachedCount(cached.results.length);
    }
  }, []);

  return {
    scanResults, scanning, scanProgress, scanStatus, lastScan,
    scanMode, scannedCount, totalToScan, failedCount,
    totalStocksInUniverse: TOTAL_SCANNER_STOCKS,
    scanLogs, scanStartTime,
    isRetryMode, cachedCount,
    runScan: normalScan,
    forceRescan,
    flushCache: flushScanCache,
    cancelScan,
  };
}
