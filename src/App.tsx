import { useState, useRef, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Calendar, Lightbulb, BarChart3, Leaf, RefreshCw, Wifi, WifiOff,
  Loader2, Search, X, Star, Radar, ArrowRight, Plus, Check, TrendingUp, TrendingDown,
  Download, Smartphone
} from 'lucide-react';
import type { ProcessedETF } from './types';
import { useETFData, useSearch, useWatchlist, useScanner } from './useETFData';
import { Dashboard } from './components/Dashboard';
import { DailyPicks } from './components/DailyPicks';
import { TradeSuggestions } from './components/TradeSuggestions';
import { InvestmentInsights } from './components/InvestmentInsights';
import { ETFDetail } from './components/ETFDetail';
import { WatchlistView } from './components/WatchlistView';
import { ScannerView } from './components/ScannerView';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = any;

type Tab = 'dashboard' | 'daily' | 'suggestions' | 'insights' | 'watchlist' | 'scanner';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedETF, setSelectedETF] = useState<ProcessedETF | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const { etfs, loading, error, lastUpdated, dataSource, refresh, fetchProgress } = useETFData();
  const search = useSearch();
  const watchlist = useWatchlist();
  const scanner = useScanner();

  // Merge scanner results with base ETFs so Daily/Insights/Dashboard use the full scanned universe.
  // Scanner stocks have dividendYield/mer/description = 0/"" by default, so when a scanner result
  // matches a known base ETF, patch in the base ETF's metadata so yields/MER stay accurate.
  const enrichedEtfs = useMemo(() => {
    if (scanner.scanResults.length === 0) return etfs;
    const baseMap = new Map(etfs.map(e => [e.yahooSymbol, e]));
    const mergedScanner = scanner.scanResults.map(e => {
      const base = baseMap.get(e.yahooSymbol);
      if (!base) return e;
      return { ...e, dividendYield: base.dividendYield, mer: base.mer, description: base.description };
    });
    const seen = new Set(mergedScanner.map(e => e.yahooSymbol));
    const baseOnly = etfs.filter(e => !seen.has(e.yahooSymbol));
    return [...mergedScanner, ...baseOnly];
  }, [etfs, scanner.scanResults]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        search.setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [search]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  // PWA Install Prompt
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Only show if not dismissed before
      const dismissed = localStorage.getItem('mapleetf_install_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('mapleetf_install_dismissed', 'true');
  };

  const handleSelectETF = (etf: ProcessedETF) => setSelectedETF(etf);
  const handleBack = () => setSelectedETF(null);

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Home', icon: LayoutDashboard },
    { id: 'scanner' as Tab, label: 'Scanner', icon: Radar },
    { id: 'daily' as Tab, label: 'Daily', icon: Calendar },
    { id: 'suggestions' as Tab, label: 'Signals', icon: Lightbulb },
    { id: 'insights' as Tab, label: 'Insights', icon: BarChart3 },
    { id: 'watchlist' as Tab, label: 'Watchlist', icon: Star, badge: watchlist.items.length },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* ======== TOP BAR ======== */}
      <header className="sticky top-0 z-50 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-white leading-tight">MapleETF</h1>
              <p className="text-[10px] text-slate-500 leading-tight">Market Scanner</p>
            </div>
          </div>

          {/* ======== SEARCH BAR ======== */}
          <div ref={searchRef} className="relative flex-1 max-w-md">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-text ${
                searchOpen
                  ? 'bg-[#1a2235] border border-emerald-500/50 ring-2 ring-emerald-500/20'
                  : 'bg-[#141b2d] border border-slate-700/50 hover:border-slate-600'
              }`}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search.query}
                onChange={(e) => { search.setQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search any stock or ETF..."
                className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full"
              />
              {search.query && (
                <button onClick={(e) => { e.stopPropagation(); search.setQuery(''); search.setSearchedStock(null); }}>
                  <X className="w-4 h-4 text-slate-500 hover:text-white" />
                </button>
              )}
              {search.searching && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
            </div>

            {/* Search Dropdown */}
            {searchOpen && search.results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#141b2d] border border-slate-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-80 overflow-y-auto z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Search Results — Click to view analysis</p>
                </div>
                {search.results.map((r) => {
                  const inWatchlist = watchlist.isInWatchlist(r.symbol);
                  return (
                    <div key={r.symbol} className="flex items-center border-b border-slate-800/50 last:border-0">
                      <button
                        onClick={() => { search.loadStock(r); setSearchOpen(false); }}
                        className="flex-1 flex items-center gap-3 px-3 py-3 hover:bg-slate-800/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                          {r.type === 'ETF' ? '📊' : '📈'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{r.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{r.exchange}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{r.name}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inWatchlist) watchlist.removeFromWatchlist(r.symbol);
                          else watchlist.addToWatchlist(r.symbol.replace('.TO', ''), r.symbol, r.name);
                        }}
                        className={`px-3 py-3 transition-colors ${inWatchlist ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-amber-400'}`}
                        title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {searchOpen && search.query.length > 0 && search.results.length === 0 && !search.searching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#141b2d] border border-slate-700/50 rounded-xl shadow-2xl shadow-black/50 p-4 z-50">
                <p className="text-sm text-slate-400 text-center">No results for "{search.query}"</p>
                <p className="text-xs text-slate-600 text-center mt-1">Try a ticker symbol like AAPL, SHOP.TO, or XIU.TO</p>
              </div>
            )}
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5 bg-[#141b2d] rounded-xl p-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSelectedETF(null); search.setSearchedStock(null); }}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all relative ${
                    activeTab === tab.id
                      ? 'bg-slate-700/60 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.badge ? (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold flex items-center justify-center text-black">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Status & Refresh */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              {dataSource === 'live' ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> :
               dataSource === 'cached' ? <Wifi className="w-3.5 h-3.5 text-amber-400" /> :
               <WifiOff className="w-3.5 h-3.5 text-slate-500" />}
              <span className="text-[10px] text-slate-500">
                {dataSource === 'live' ? 'Live' : dataSource === 'cached' ? 'Cached' : 'Demo'}
                {lastUpdated && ` · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            </div>
            <button onClick={refresh} disabled={loading} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* PWA Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center gap-3 shadow-lg shadow-emerald-900/20">
            <div className="p-2 bg-white/15 rounded-lg flex-shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white">Install MapleETF on your phone!</h3>
              <p className="text-xs text-white/80">Get the full app experience — works offline, faster loading, home screen icon</p>
            </div>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-lg text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Install
            </button>
            <button onClick={dismissInstall} className="text-white/60 hover:text-white flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !loading && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs text-amber-400 flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={refresh} className="ml-auto text-amber-300 hover:text-amber-200 underline">Retry</button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Fetching Real Market Data</h2>
              <p className="text-sm text-slate-400">Connecting to Yahoo Finance...</p>
            </div>
            <div className="w-64 bg-slate-800 rounded-full h-2 mt-2">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500" style={{ width: `${fetchProgress}%` }} />
            </div>
            <p className="text-xs text-slate-500">{Math.round(fetchProgress)}% complete</p>
          </div>
        </div>
      )}

      {/* ======== SEARCHED STOCK OVERLAY ======== */}
      {search.loadingStock && (
        <div className="max-w-6xl mx-auto px-4 py-10 text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading stock data...</p>
        </div>
      )}

      {search.searchedStock && !search.loadingStock && (
        <main className="max-w-6xl mx-auto px-4 py-6 pb-24 sm:pb-6">
          {/* Add to watchlist bar */}
          <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-[#141b2d] border border-slate-700/50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{search.searchedStock.symbol}</span>
                <span className={`text-sm font-semibold ${search.searchedStock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {search.searchedStock.changePercent >= 0 ? <TrendingUp className="w-3.5 h-3.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 inline" />}
                  {' '}{search.searchedStock.changePercent >= 0 ? '+' : ''}{search.searchedStock.changePercent.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-slate-500">{search.searchedStock.name}</p>
            </div>
            <button
              onClick={() => {
                const s = search.searchedStock!;
                if (watchlist.isInWatchlist(s.yahooSymbol)) {
                  watchlist.removeFromWatchlist(s.yahooSymbol);
                } else {
                  watchlist.addToWatchlist(s.symbol, s.yahooSymbol, s.name);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                watchlist.isInWatchlist(search.searchedStock.yahooSymbol)
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
              }`}
            >
              {watchlist.isInWatchlist(search.searchedStock.yahooSymbol) ? (
                <><Check className="w-4 h-4" /> In Watchlist</>
              ) : (
                <><Plus className="w-4 h-4" /> Add to Watchlist</>
              )}
            </button>
            <button
              onClick={() => search.setSearchedStock(null)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ETFDetail etf={search.searchedStock} onBack={() => search.setSearchedStock(null)} />
        </main>
      )}

      {/* ======== MAIN CONTENT ======== */}
      {!loading && etfs.length > 0 && !search.searchedStock && !search.loadingStock && (
        <main className="max-w-6xl mx-auto px-4 py-6 pb-24 sm:pb-6">
          {selectedETF ? (
            <>
              {/* Watchlist add bar on detail view */}
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    if (watchlist.isInWatchlist(selectedETF.yahooSymbol)) {
                      watchlist.removeFromWatchlist(selectedETF.yahooSymbol);
                    } else {
                      watchlist.addToWatchlist(selectedETF.symbol, selectedETF.yahooSymbol, selectedETF.name);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    watchlist.isInWatchlist(selectedETF.yahooSymbol)
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:text-amber-400'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${watchlist.isInWatchlist(selectedETF.yahooSymbol) ? 'fill-amber-400' : ''}`} />
                  {watchlist.isInWatchlist(selectedETF.yahooSymbol) ? 'In Watchlist' : 'Add to Watchlist'}
                </button>
              </div>
              <ETFDetail etf={selectedETF} onBack={handleBack} />
            </>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard etfs={enrichedEtfs} trackedEtfs={etfs} onSelectETF={handleSelectETF} />}
              {activeTab === 'daily' && <DailyPicks etfs={enrichedEtfs} onSelectETF={handleSelectETF} />}
              {activeTab === 'suggestions' && <TradeSuggestions etfs={enrichedEtfs} onSelectETF={handleSelectETF} />}
              {activeTab === 'insights' && <InvestmentInsights etfs={enrichedEtfs} onSelectETF={handleSelectETF} />}
              {activeTab === 'watchlist' && (
                <WatchlistView
                  watchlist={watchlist}
                  onSelectETF={handleSelectETF}
                />
              )}
              {activeTab === 'scanner' && (
                <ScannerView
                  scanner={scanner}
                  watchlist={watchlist}
                  onSelectETF={handleSelectETF}
                />
              )}
            </>
          )}
        </main>
      )}

      {/* ======== MOBILE BOTTOM NAV ======== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-slate-800/60" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around py-1.5 px-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedETF(null); search.setSearchedStock(null); }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all relative ${
                  activeTab === tab.id ? 'text-emerald-400' : 'text-slate-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{tab.label}</span>
                {tab.badge ? (
                  <span className="absolute -top-0.5 right-0 w-4 h-4 bg-amber-500 rounded-full text-[8px] font-bold flex items-center justify-center text-black">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
