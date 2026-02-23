import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProcessedETF, WatchlistItem, SearchResult } from './types';
import { ETF_LIST, SCANNER_UNIVERSE, TOTAL_SCANNER_STOCKS, fetchETFData, fetchETFDataLogged, parseChartData, generateFallbackData, searchStocks, delay } from './api';
import { processETFData } from './analysis';
import type { ScanLogEntry } from './scannerLog';
import { createLogEntry, resetLogCounter } from './scannerLog';

const CACHE_KEY = 'mapleetf_cache_v2';
const WATCHLIST_KEY = 'mapleetf_watchlist';
const SCANNER_CACHE_KEY = 'mapleetf_scanner_v3';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CacheData {
  timestamp: number;
  etfs: ProcessedETF[];
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
    const batchSize = 12; // Fetch all 12 core ETFs at once

    for (let i = 0; i < ETF_LIST.length; i += batchSize) {
      const batch = ETF_LIST.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (meta) => {
          try {
            const rawData = await fetchETFData(meta.yahooSymbol);
            if (rawData) {
              const historicalData = parseChartData(rawData);
              if (historicalData.length > 10) {
                liveCount++;
                return processETFData(meta, historicalData, 'live');
              }
            }
          } catch { /* fall through */ }
          const fallbackData = generateFallbackData(meta.symbol);
          return processETFData(meta, fallbackData, 'fallback');
        })
      );
      results.push(...batchResults);
      setFetchProgress(((i + batch.length) / ETF_LIST.length) * 100);
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
    // Fallback
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
    // Fetch all watchlist items in parallel (up to 25 at a time)
    const results = await Promise.all(
      items.map(async (item): Promise<ProcessedETF> => {
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
              return processETFData(meta, hist, 'live');
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
        return processETFData(meta, generateFallbackData(item.symbol), 'fallback');
      })
    );
    setWatchlistData(results);
    setLoadingWatchlist(false);
  }, [items]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  return { items, watchlistData, loadingWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, refreshWatchlist };
}

// ============================================================
// SCANNER HOOK — 3 scan modes across 300+ stocks
// ============================================================

// Quick: ~50 top Canadian stocks & ETFs
const QUICK_SCAN_SYMBOLS = [
  // Top ETFs
  'XIU.TO','XIC.TO','XEQT.TO','VEQT.TO','VFV.TO','TEC.TO','ZEB.TO','ZAG.TO','XGD.TO','XEG.TO',
  'XDIV.TO','VGRO.TO','ZSP.TO','ZQQ.TO','XQQ.TO','HCAL.TO','HDIV.TO',
  // Big banks
  'RY.TO','TD.TO','BNS.TO','BMO.TO','CM.TO','NA.TO',
  // Top energy
  'ENB.TO','CNQ.TO','SU.TO','TRP.TO','TOU.TO',
  // Top mining
  'ABX.TO','FNV.TO','WPM.TO','AEM.TO',
  // Top tech
  'SHOP.TO','CSU.TO',
  // Top industrials & consumer
  'CNR.TO','CP.TO','BAM.TO','BN.TO','ATD.TO','DOL.TO','L.TO',
  // Insurance
  'MFC.TO','SLF.TO',
  // Utilities
  'FTS.TO','H.TO',
  // Top US
  'AAPL','MSFT','NVDA','GOOGL','AMZN','TSLA','META','SPY','QQQ',
];

// Standard: ~150 stocks (Canadian market + top US)
const STANDARD_SCAN_SYMBOLS = [
  ...QUICK_SCAN_SYMBOLS,
  // More Canadian ETFs
  'HXS.TO','BTCC-B.TO','HQU.TO','ZCN.TO','VCN.TO','XUU.TO','ZWB.TO','ZDV.TO','XRE.TO',
  'ZWC.TO','XEF.TO','XEC.TO','XGRO.TO','XBAL.TO','ZGRO.TO','ZBAL.TO','VCNS.TO',
  'XBB.TO','ZFL.TO','HISA.TO','XEI.TO','HXT.TO',
  // More Banks
  'EQB.TO','CWB.TO',
  // More Energy
  'CVE.TO','IMO.TO','PPL.TO','ARX.TO','KEY.TO','MEG.TO','WCP.TO','BTE.TO','TPZ.TO','VET.TO','CPG.TO',
  // More Mining
  'NTR.TO','K.TO','FM.TO','TECK-B.TO','LUN.TO','HBM.TO','IVN.TO','BTO.TO','ELD.TO','ERO.TO',
  // More Tech
  'BB.TO','LSPD.TO','DCBO.TO','KXS.TO','DSG.TO','GIB-A.TO','CLS.TO','NVEI.TO',
  // Telecom
  'BCE.TO','T.TO','RCI-B.TO','QBR-B.TO',
  // More Financials
  'IFC.TO','GWO.TO','IAG.TO','FFH.TO','POW.TO','X.TO','BIP-UN.TO','BEP-UN.TO',
  // REITs
  'REI-UN.TO','CAR-UN.TO','GRT-UN.TO','DIR-UN.TO','SRU-UN.TO','CHP-UN.TO',
  // Transport
  'AC.TO','CAE.TO','BBD-B.TO',
  // Consumer
  'MRU.TO','GIL.TO','WN.TO','CTC-A.TO','MG.TO','QSR.TO','PBH.TO',
  // Utilities
  'EMA.TO','AQN.TO','CU.TO','CPX.TO','NPI.TO',
  // Industrials
  'WSP.TO','STN.TO','WCN.TO','TIH.TO','FTT.TO',
  // Healthcare/Cannabis
  'WEED.TO','TLRY.TO',
  // More US
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
  const cancelRef = useRef(false);
  const logsRef = useRef<ScanLogEntry[]>([]);

  const loadScanCache = (mode: ScanMode): { timestamp: number; results: ProcessedETF[] } | null => {
    try {
      const key = SCANNER_CACHE_KEY + '_' + mode;
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) return data;
      }
    } catch { /* ignore */ }
    return null;
  };

  const saveScanCache = (results: ProcessedETF[], mode: ScanMode) => {
    try {
      const key = SCANNER_CACHE_KEY + '_' + mode;
      // Limit stored data to avoid hitting localStorage limits
      const trimmed = results.map(r => ({ ...r, historicalData: r.historicalData.slice(-20) }));
      const json = JSON.stringify({ timestamp: Date.now(), results: trimmed });
      localStorage.setItem(key, json);
    } catch {
      // Storage full — try storing fewer results
      try {
        const key = SCANNER_CACHE_KEY + '_' + mode;
        const trimmed = results.slice(0, 100).map(r => ({ ...r, historicalData: r.historicalData.slice(-10) }));
        localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), results: trimmed }));
      } catch { /* give up */ }
    }
  };

  const cancelScan = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const runScan = useCallback(async (force = false, mode: ScanMode = 'quick') => {
    // Check cache first
    if (!force) {
      const cached = loadScanCache(mode);
      if (cached) {
        setScanResults(cached.results);
        setLastScan(new Date(cached.timestamp));
        setScanMode(mode);
        return;
      }
    }

    cancelRef.current = false;
    setScanning(true);
    setScanProgress(0);
    setScanStatus('Initializing scanner...');
    setFailedCount(0);
    setScanMode(mode);
    
    // Reset logs
    resetLogCounter();
    logsRef.current = [];
    setScanLogs([]);
    const startTs = Date.now();
    setScanStartTime(startTs);

    // Build the universe based on mode — deduplicated
    const seen = new Set<string>();
    const universe: typeof SCANNER_UNIVERSE = [];

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

    setTotalToScan(universe.length);
    setScannedCount(0);

    const results: ProcessedETF[] = [];
    const batchSize = mode === 'quick' ? 25 : mode === 'standard' ? 20 : 15;
    const delayMs = mode === 'quick' ? 100 : mode === 'standard' ? 150 : 200;
    let failed = 0;
    let batchIdx = 0;

    for (let i = 0; i < universe.length; i += batchSize) {
      if (cancelRef.current) {
        setScanStatus(`Scan cancelled. Showing ${results.length} results.`);
        break;
      }

      batchIdx++;
      const batch = universe.slice(i, i + batchSize);
      const batchSymbols = batch.map(b => b.symbol);
      const displaySymbols = batchSymbols.length > 8 
        ? batchSymbols.slice(0, 8).join(', ') + ` +${batchSymbols.length - 8} more`
        : batchSymbols.join(', ');
      setScanStatus(`Batch #${batchIdx} (${batch.length} stocks): ${displaySymbols}`);

      const batchResults = await Promise.all(
        batch.map(async (stock) => {
          // Create log entry for this request
          const logEntry = createLogEntry(stock.yahooSymbol, batchIdx, batchSize);
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
                return processETFData(meta, hist, 'live');
              } else {
                logEntry.status = 'skipped';
                logEntry.note += `Only ${hist.length} valid data points. `;
              }
            }
          } catch (err) {
            logEntry.status = 'failed';
            logEntry.note += `Uncaught: ${String(err).slice(0, 60)}. `;
          }
          failed++;
          if (logEntry.status === 'pending') logEntry.status = 'failed';
          return null;
        })
      );

      // Update logs state after each batch
      setScanLogs([...logsRef.current]);

      for (const r of batchResults) {
        if (r) results.push(r);
      }

      const completed = Math.min(i + batchSize, universe.length);
      setScannedCount(completed);
      setFailedCount(failed);
      setScanProgress((completed / universe.length) * 100);

      const sortedPartial = [...results].sort((a, b) => b.signalConfidence - a.signalConfidence);
      setScanResults(sortedPartial);

      if (i + batchSize < universe.length && !cancelRef.current) {
        await delay(delayMs);
      }
    }

    results.sort((a, b) => b.signalConfidence - a.signalConfidence);
    setScanResults(results);
    setLastScan(new Date());
    setScanning(false);
    setScanStatus(`Done! ${results.length} stocks analyzed, ${failed} skipped.`);
    setScanLogs([...logsRef.current]);

    if (results.length > 0) saveScanCache(results, mode);
  }, []);

  // Auto-load cache on mount
  useEffect(() => {
    // Try loading the most recent cached scan
    for (const mode of ['full', 'standard', 'quick'] as ScanMode[]) {
      const cached = loadScanCache(mode);
      if (cached) {
        setScanResults(cached.results);
        setLastScan(new Date(cached.timestamp));
        setScanMode(mode);
        return;
      }
    }
  }, []);

  return {
    scanResults, scanning, scanProgress, scanStatus, lastScan,
    scanMode, scannedCount, totalToScan, failedCount,
    totalStocksInUniverse: TOTAL_SCANNER_STOCKS,
    scanLogs, scanStartTime,
    runScan: (mode: ScanMode = 'quick') => runScan(true, mode),
    cancelScan,
  };
}
