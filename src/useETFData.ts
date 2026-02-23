import { useState, useEffect, useCallback } from 'react';
import type { ProcessedETF, WatchlistItem, SearchResult } from './types';
import { ETF_LIST, SCANNER_UNIVERSE, fetchETFData, parseChartData, generateFallbackData, searchStocks } from './api';
import { processETFData } from './analysis';

const CACHE_KEY = 'mapleetf_cache_v2';
const WATCHLIST_KEY = 'mapleetf_watchlist';
const SCANNER_CACHE_KEY = 'mapleetf_scanner_v2';
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
    const batchSize = 4;

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
    const results: ProcessedETF[] = [];
    for (const item of items) {
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
    }
    setWatchlistData(results);
    setLoadingWatchlist(false);
  }, [items]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  return { items, watchlistData, loadingWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, refreshWatchlist };
}

// ============================================================
// SCANNER HOOK — scans 80+ stocks to find best buys/sells
// ============================================================
export function useScanner() {
  const [scanResults, setScanResults] = useState<ProcessedETF[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const loadScanCache = (): { timestamp: number; results: ProcessedETF[] } | null => {
    try {
      const cached = localStorage.getItem(SCANNER_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) return data;
      }
    } catch { /* ignore */ }
    return null;
  };

  const runScan = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadScanCache();
      if (cached) {
        setScanResults(cached.results);
        setLastScan(new Date(cached.timestamp));
        return;
      }
    }

    setScanning(true);
    setScanProgress(0);
    const results: ProcessedETF[] = [];
    const batchSize = 6;
    const universe = SCANNER_UNIVERSE;

    for (let i = 0; i < universe.length; i += batchSize) {
      const batch = universe.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (stock) => {
          try {
            const raw = await fetchETFData(stock.yahooSymbol);
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
              }
            }
          } catch { /* skip */ }
          return null;
        })
      );
      for (const r of batchResults) {
        if (r) results.push(r);
      }
      setScanProgress(((i + batch.length) / universe.length) * 100);
    }

    // Sort by signal confidence
    results.sort((a, b) => b.signalConfidence - a.signalConfidence);
    setScanResults(results);
    setLastScan(new Date());
    setScanning(false);

    try {
      localStorage.setItem(SCANNER_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        results: results.map(r => ({ ...r, historicalData: r.historicalData.slice(-30) })),
      }));
    } catch { /* storage full */ }
  }, []);

  useEffect(() => { runScan(); }, [runScan]);

  return { scanResults, scanning, scanProgress, lastScan, runScan: () => runScan(true) };
}
