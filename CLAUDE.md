# MapleETF — Project Reference for Claude

## Overview
**MapleETF** is a Canadian stock and ETF scanner/analyzer app.
- React + TypeScript + Vite SPA
- Hosted on GitHub Pages (web) AND packaged as a standalone Android APK via Capacitor
- Data source: Yahoo Finance unofficial API (`query1.finance.yahoo.com/v8/finance/chart`)
- No backend — all data fetching happens client-side

---

## Project Structure
```
/root/financeapp/
├── src/
│   ├── App.tsx                  # Root component, enrichedEtfs merge logic, bottom nav
│   ├── api.ts                   # All data fetching (Yahoo Finance, CORS proxy, CapacitorHttp)
│   ├── analysis.ts              # Technical indicators: RSI, MACD, SMA, EMA, scoring
│   ├── types.ts                 # TypeScript interfaces (ProcessedETF, ETFMetadata, etc.)
│   ├── useETFData.ts            # Main state hook: scanner, ETF data, cache, watchlist
│   ├── scannerLog.ts            # Scanner logging
│   ├── components/
│   │   ├── Dashboard.tsx        # Home tab — receives enrichedEtfs + trackedEtfs (base 12)
│   │   ├── DailyPicks.tsx       # Daily picks tab — uses enrichedEtfs from scanner
│   │   ├── TradeSuggestions.tsx # Trade suggestions tab
│   │   ├── InvestmentInsights.tsx # Insights tab — top dividends, MER, etc.
│   │   ├── ScannerView.tsx      # Scanner control UI
│   │   ├── ScannerLogs.tsx      # Scanner log display
│   │   ├── ETFDetail.tsx        # Detailed ETF/stock view with charts
│   │   └── WatchlistView.tsx    # Watchlist management
│   └── utils/
│       └── cn.ts                # Tailwind class merge utility
├── android/                     # Capacitor Android project
│   └── app/src/main/res/
│       ├── mipmap-anydpi-v26/   # Adaptive icon XMLs (API 26+)
│       │   ├── ic_launcher.xml
│       │   └── ic_launcher_round.xml
│       ├── mipmap-{density}/    # PNG icons at mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi
│       │   ├── ic_launcher.png          # Full icon (leaf on emerald bg) — legacy
│       │   ├── ic_launcher_foreground.png # Adaptive foreground at 108/162/216/324/432px
│       │   └── ic_launcher_round.png
│       ├── drawable/
│       │   └── ic_launcher_background.xml  # Solid emerald #10b981
│       ├── drawable-v24/
│       │   └── ic_launcher_foreground.xml  # NOT used by adaptive icon (ref is @mipmap/)
│       └── values/
│           └── ic_launcher_background.xml  # color #10b981
├── capacitor.config.ts          # appId: com.mapleetf.app, appName: MapleETF
├── index.html                   # viewport-fit=cover for Android safe area
├── vite.config.ts
└── package.json
```

---

## Build Commands

### Web (GitHub Pages)
```bash
npm run build        # outputs to dist/
```

### Android APK
```bash
npm run build
npx cap sync android
cd android && JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ANDROID_HOME=/root/android-sdk ./gradlew assembleDebug
# APK output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Clean build (flush Gradle cache)
```bash
./gradlew clean assembleDebug
```

---

## Environment / Dependencies
- **Java:** `/usr/lib/jvm/java-21-openjdk-amd64` (Java 21)
- **Android SDK:** `/root/android-sdk`
  - `ANDROID_HOME=/root/android-sdk`
  - sdkmanager: `/root/android-sdk/cmdline-tools/latest/bin/sdkmanager`
  - Installed: `build-tools;35.0.0`, `platforms;android-36`
- **Node deps:** React 19, Capacitor 8, Recharts, Lucide-React, Tailwind
- **SVG rendering:** `rsvg-convert` (librsvg) — needed for complex SVGs with gradients. ImageMagick CANNOT render radial gradient SVGs correctly.

---

## App Version
- `versionCode`: 1
- `versionName`: "0.1"

---

## Data Architecture

### Yahoo Finance API
- Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1y&interval=1d`
- **1 year** of historical daily OHLCV data
- No official API key needed (unofficial API)

### CORS Handling
- **Web:** Requests go through CORS proxies (`corsproxy.io`, `allorigins.win`). Each user's browser uses its own IP — GitHub Pages itself does NOT make API calls.
- **Android APK:** Uses `CapacitorHttp` (native HTTP), bypasses CORS entirely. Each phone uses its own IP. No proxy needed.

### `nativeFetch()` in api.ts
Custom wrapper around `CapacitorHttp.get()` that returns a `fetch()`-compatible object with `.text()` and `.json()` methods. Detected via `Capacitor.isNativePlatform()`.

---

## Scanner

### Universe
- **286 Canadian stocks** in `SCANNER_UNIVERSE` (defined in `api.ts`)
- **12 base ETFs** in `ETF_LIST` (XIU, XIC, VFV, ZEB, XEI, ZDV, VDY, XIT, ZLB, XUT, XRE, CDZ)
- Duplicate `TFII.TO` was removed — keep `symbol:'TFII'`, `category:'Transport'`
- Count is **dynamic**: `SCANNER_UNIVERSE.length` — not hardcoded

### Scan Modes
- Multiple modes (e.g., all stocks, ETFs only, etc.)
- `totalStocksInUniverse` uses `getUniverseForMode(scanMode).length`

### Parallelization
- **Batch size: 4** concurrent requests
- **150ms delay** between batches
- ~18s to scan full universe (down from ~70s sequential)
- Scanner cache: **60 days** of history (for day-of-week analysis)

### `enrichedEtfs` (in App.tsx)
Merges scanner results with base ETF metadata:
- Scanner results for known base ETFs get their `dividendYield`, `mer`, `description` patched from `ETF_LIST`
- Prevents scanner overwriting these with 0 (scanner doesn't know MER/yield)
- Used by Dashboard, DailyPicks, TradeSuggestions, InvestmentInsights
- `trackedEtfs` (base 12 only) passed to Dashboard for "Tracked ETFs" grid

---

## Technical Analysis (analysis.ts)
- RSI, MACD (called ONCE, result reused), SMA20, SMA50, EMA12, EMA26, momentum, volatility
- `calculateLongTermScore`: skips MER/dividendYield scoring when value is 0 (scanner stocks don't have this data)
- Signals: STRONG BUY / BUY / HOLD / SELL / WATCH

---

## Android Icon System
- **API 26+ (adaptive):** `mipmap-anydpi-v26/ic_launcher.xml` → background=`@color/ic_launcher_background` (#10b981 emerald), foreground=`@mipmap/ic_launcher_foreground`
- **Foreground PNGs** at adaptive sizes: mdpi=108px, hdpi=162px, xhdpi=216px, xxhdpi=324px, xxxhdpi=432px
- **Legacy PNGs** (`ic_launcher.png`): mdpi=48px, hdpi=72px, xhdpi=96px, xxhdpi=144px, xxxhdpi=192px
- **Icon graphic:** Noto-style maple leaf emoji (red/orange gradient body, orange wind lines)
- **Background:** Emerald green `#10b981`
- **SVG source:** `/tmp/maple_noto.svg` (noto emoji maple leaf from SVG Repo)
- To regenerate icons: use `rsvg-convert` NOT ImageMagick (IM can't render radial gradients)

### Icon regeneration command pattern
```bash
rsvg-convert -w SIZE -h SIZE /tmp/maple_noto.svg -o /tmp/leaf.png
# Then composite with emerald bg using ImageMagick for ic_launcher.png
convert -size SIZExSIZE xc:"#10b981" /tmp/leaf.png -gravity Center -composite output.png
```

---

## Android Safe Area Fix
- `index.html`: `<meta name="viewport" content="..., viewport-fit=cover">`
- Bottom nav in `App.tsx`: `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}`
- Prevents nav bar hiding behind Android system navigation buttons

---

## Known Issues / Past Bugs Fixed
1. **MACD called 3x** in `calculateTechnicals` → fixed, stored in `macdResult` variable
2. **MER=0 / dividendYield=0** giving false score bonus → fixed with `if (mer > 0)` guards
3. **Top Dividend ETFs showing 0%** → fixed via `enrichedEtfs` merge patching base ETF metadata
4. **Bottom nav hidden on Android** → fixed with `viewport-fit=cover` + safe area inset
5. **APK data not loading** → `nativeFetch()` was missing `.json()` method
6. **Icon showing default after install** → adaptive icon vector (anydpi-v26) was overriding PNGs; fixed by using proper PNG foreground files at adaptive sizes
7. **Icon rendering white/flat** → ImageMagick fails on radial gradient SVGs; fixed by using `rsvg-convert`
8. **Duplicate TFII.TO** in SCANNER_UNIVERSE → removed duplicate

---

## Dynamic Universe (Alpha Vantage)
- API key: `LLEPIHOWJBA24LHF` (stored in `api.ts` as `ALPHA_VANTAGE_KEY`)
- Function: `fetchDynamicUniverse()` in `api.ts`
- Fetches `LISTING_STATUS` from Alpha Vantage — all active TSX main board stocks/ETFs
- Filters: active status only, Toronto Stock Exchange only (not Venture), no warrants/rights
- Combines with hardcoded US stocks from SCANNER_UNIVERSE
- Cached in localStorage for 24 hours (key: `mapleetf_listing_v1`)
- Falls back to hardcoded `SCANNER_UNIVERSE` if API fails
- On app load, pre-fetches universe size so header shows correct count
- `universeSize` state in `useScanner()` reflects the dynamic count

## What NOT to do
- Do NOT use `find`, `grep`, `cat` shell commands — use Claude's dedicated tools
- Do NOT use ImageMagick to render complex SVGs with gradients — use `rsvg-convert`
- Do NOT hardcode `totalStocksInUniverse` — it's dynamic from array length
- Do NOT call `npx cap sync android` expecting it to update icon resources — it only syncs web assets
- Do NOT run `gradlew` without exporting `JAVA_HOME` and `ANDROID_HOME`
