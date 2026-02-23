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
// SCANNER HOOK — sequential with 250ms delay, smart caching
// ============================================================

// Quick: ~50 top Canadian stocks & ETFs
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

// Standard: ~150 stocks
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

export type ScanMode = 'quick' | 'standard' | 'full';

export function useScanner() {
  const [scanResults, setScanResults] = useState<ProcessedETF[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('quick');
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

  const flushScanCache = useCallback((mode?: ScanMode) => {
    if (mode) {
      localStorage.removeItem(SCANNER_CACHE_KEY + '_' + mode);
    } else {
      // Flush all scan caches
      localStorage.removeItem(SCANNER_CACHE_KEY + '_quick');
      localStorage.removeItem(SCANNER_CACHE_KEY + '_standard');
      localStorage.removeItem(SCANNER_CACHE_KEY + '_full');
    }
  }, []);

  const cancelScan = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // Build the symbol list for a given mode
  const getUniverseForMode = (mode: ScanMode) => {
    const seen = new Set<string>();
    const universe: { symbol: string; yahooSymbol: string; name: string; category: string }[] = [];

    const addSymbols = (symbols: string[]) => {
      for (const sym of symbols) {
        if (seen.has(sym)) continue;
        seen.add(sym);
        const found = SCANNER_UNIVERSE.find(s => s.yahooSymbol === sym);
        if (found) {
          universe.push(found);
        } else {
          const etf = ETF_LIST.find(e => e.yahooSymbol === sym);
          if (etf) {
            universe.push({ symbol: etf.symbol, yahooSymbol: etf.yahooSymbol, name: etf.name, category: etf.category });
          }
        }
      }
    };

    if (mode === 'quick') {
      addSymbols(QUICK_SCAN_SYMBOLS);
    } else if (mode === 'standard') {
      addSymbols(STANDARD_SCAN_SYMBOLS);
    } else {
      for (const stock of SCANNER_UNIVERSE) {
        if (!seen.has(stock.yahooSymbol)) {
          seen.add(stock.yahooSymbol);
          universe.push(stock);
        }
      }
      for (const etf of ETF_LIST) {
        if (!seen.has(etf.yahooSymbol)) {
          seen.add(etf.yahooSymbol);
          universe.push({ symbol: etf.symbol, yahooSymbol: etf.yahooSymbol, name: etf.name, category: etf.category });
        }
      }
    }
    return universe;
  };

  // ---- Main scan function ----
  // forceAll = true: flush cache and rescan everything
  // forceAll = false: use cache + only retry failed symbols
  const runScan = useCallback(async (mode: ScanMode = 'quick', forceAll = false) => {
    const fullUniverse = getUniverseForMode(mode);

    // If force, flush the cache for this mode
    if (forceAll) {
      flushScanCache(mode);
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

    if (retrying) {
      setScanStatus(`Retrying ${symbolsToScan.length} previously failed symbols (${existingResults.length} cached)...`);
      setTotalToScan(symbolsToScan.length);
    } else {
      setScanStatus('Initializing scanner...');
      setTotalToScan(symbolsToScan.length);
    }

    setScannedCount(0);

    // Start with existing cached results (if retrying)
    const newResults: ProcessedETF[] = [];
    const newFailedSymbols: string[] = [];
    let failed = 0;

    // Show cached results immediately if retrying
    if (retrying && existingResults.length > 0) {
      setScanResults(existingResults);
    }

    // ---- SEQUENTIAL SCANNING with 250ms delay between each call ----
    for (let i = 0; i < symbolsToScan.length; i++) {
      if (cancelRef.current) {
        setScanStatus(`Scan cancelled. ${newResults.length} new + ${existingResults.length} cached results.`);
        // Save partial progress — remaining unsscanned symbols are still "failed"
        const remainingFailed = symbolsToScan.slice(i).map(s => s.yahooSymbol);
        newFailedSymbols.push(...remainingFailed);
        break;
      }

      const stock = symbolsToScan[i];
      setScanStatus(`[${i + 1}/${symbolsToScan.length}] Scanning ${stock.symbol} (${stock.name})`);

      // Create log entry
      const logEntry = createLogEntry(stock.yahooSymbol, Math.floor(i / 10) + 1, 1);
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

      // Update UI after each stock
      setScannedCount(i + 1);
      setFailedCount(failed);
      setScanProgress(((i + 1) / symbolsToScan.length) * 100);

      // Merge new results with existing cached results for display
      const allResults = [...existingResults, ...newResults].sort((a, b) => b.signalConfidence - a.signalConfidence);
      setScanResults(allResults);

      // Update logs every few stocks (not every single one to avoid perf issues)
      if (i % 3 === 0 || i === symbolsToScan.length - 1) {
        setScanLogs([...logsRef.current]);
      }

      // ---- 250ms DELAY between each API call ----
      if (i < symbolsToScan.length - 1 && !cancelRef.current) {
        await delay(250);
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

    if (retrying) {
      setScanStatus(`Done! Retried ${symbolsToScan.length} symbols. ${newResults.length} recovered, ${failed} still failing. Total: ${finalResults.length} stocks.`);
    } else {
      setScanStatus(`Done! ${finalResults.length} stocks analyzed, ${failed} skipped.`);
    }

    // Save to cache with the list of still-failed symbols
    if (finalResults.length > 0) {
      saveScanCache(finalResults, newFailedSymbols, mode);
    }
  }, [flushScanCache]);

  // Force re-scan: flush cache + rescan everything
  const forceRescan = useCallback((mode: ScanMode = 'quick') => {
    runScan(mode, true);
  }, [runScan]);

  // Normal scan: use cache + retry failures only
  const normalScan = useCallback((mode: ScanMode = 'quick') => {
    runScan(mode, false);
  }, [runScan]);

  // Auto-load cache on mount
  useEffect(() => {
    for (const mode of ['full', 'standard', 'quick'] as ScanMode[]) {
      const cached = loadScanCache(mode);
      if (cached) {
        setScanResults(cached.results);
        setLastScan(new Date(cached.timestamp));
        setScanMode(mode);
        setCachedCount(cached.results.length);
        // Show how many failed last time
        if (cached.failedSymbols?.length > 0) {
          setScanStatus(`${cached.results.length} cached results · ${cached.failedSymbols.length} failed last time (will retry on next scan)`);
        }
        return;
      }
    }
  }, []);

  return {
    scanResults, scanning, scanProgress, scanStatus, lastScan,
    scanMode, scannedCount, totalToScan, failedCount,
    totalStocksInUniverse: getUniverseForMode(scanMode).length,
    scanLogs, scanStartTime,
    isRetryMode, cachedCount,
    // Normal scan: uses cache, only retries failed
    runScan: (mode: ScanMode = 'quick') => normalScan(mode),
    // Force re-scan: flushes cache, scans everything fresh
    forceRescan: (mode: ScanMode = 'quick') => forceRescan(mode),
    // Flush cache without scanning
    flushCache: flushScanCache,
    cancelScan,
  };
}
