import type { ETFMetadata, HistoricalDataPoint, SearchResult } from './types';
import type { ScanLogEntry } from './scannerLog';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// On native Android/iOS, use CapacitorHttp which bypasses CORS entirely.
// On web, fall through to the CORS proxy approach.
const isNative = Capacitor.isNativePlatform();

async function nativeFetch(url: string): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> }> {
  const response = await CapacitorHttp.get({
    url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      'Accept': 'application/json',
    },
  });
  // CapacitorHttp auto-parses JSON responses — data is already an object
  const parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  const body = JSON.stringify(parsed);
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    text: async () => body,
    json: async () => parsed,
  };
}

// ============================================================
// CORE ETF LIST (initial tracked set — 12 popular Canadian ETFs)
// ============================================================
export const ETF_LIST: ETFMetadata[] = [
  { symbol: 'XIU', yahooSymbol: 'XIU.TO', name: 'iShares S&P/TSX 60 Index ETF', category: 'Canadian Equity', mer: 0.18, dividendYield: 2.8, description: "Tracks the S&P/TSX 60 — Canada's largest 60 companies." },
  { symbol: 'XIC', yahooSymbol: 'XIC.TO', name: 'iShares Core S&P/TSX Composite', category: 'Canadian Equity', mer: 0.06, dividendYield: 2.6, description: 'Broad Canadian market exposure with 230+ holdings.' },
  { symbol: 'XEQT', yahooSymbol: 'XEQT.TO', name: 'iShares Core Equity ETF Portfolio', category: 'Global Equity', mer: 0.20, dividendYield: 1.8, description: 'All-in-one 100% equity portfolio with global diversification.' },
  { symbol: 'VEQT', yahooSymbol: 'VEQT.TO', name: 'Vanguard All-Equity ETF Portfolio', category: 'Global Equity', mer: 0.24, dividendYield: 1.7, description: "Vanguard's all-equity global portfolio ETF." },
  { symbol: 'ZEB', yahooSymbol: 'ZEB.TO', name: 'BMO Equal Weight Banks Index ETF', category: 'Financials', mer: 0.28, dividendYield: 4.2, description: "Equal-weight exposure to Canada's Big Six banks." },
  { symbol: 'ZAG', yahooSymbol: 'ZAG.TO', name: 'BMO Aggregate Bond Index ETF', category: 'Fixed Income', mer: 0.09, dividendYield: 3.5, description: 'Broad Canadian investment-grade bond exposure.' },
  { symbol: 'TEC', yahooSymbol: 'TEC.TO', name: 'TD Global Technology Leaders ETF', category: 'Technology', mer: 0.39, dividendYield: 0.3, description: 'Global technology leaders including Apple, Microsoft, NVIDIA.' },
  { symbol: 'VFV', yahooSymbol: 'VFV.TO', name: 'Vanguard S&P 500 Index ETF (CAD)', category: 'US Equity', mer: 0.09, dividendYield: 1.3, description: 'Low-cost S&P 500 in Canadian dollars.' },
  { symbol: 'XGD', yahooSymbol: 'XGD.TO', name: 'iShares S&P/TSX Global Gold ETF', category: 'Gold & Mining', mer: 0.61, dividendYield: 1.0, description: 'Gold mining companies — inflation and uncertainty hedge.' },
  { symbol: 'XEG', yahooSymbol: 'XEG.TO', name: 'iShares S&P/TSX Capped Energy ETF', category: 'Energy', mer: 0.61, dividendYield: 3.1, description: 'Canadian energy sector — oil & gas producers.' },
  { symbol: 'XDIV', yahooSymbol: 'XDIV.TO', name: 'iShares Core MSCI Cdn Quality Div', category: 'Dividend', mer: 0.11, dividendYield: 4.5, description: 'High-quality Canadian dividend stocks at low MER.' },
  { symbol: 'VBAL', yahooSymbol: 'VBAL.TO', name: 'Vanguard Balanced ETF Portfolio', category: 'Balanced', mer: 0.24, dividendYield: 2.2, description: '60/40 balanced portfolio for moderate risk.' },
];

// ============================================================
// EXPANDED SCANNER UNIVERSE — 300+ stocks & ETFs across all markets
// ============================================================
export const SCANNER_UNIVERSE: { symbol: string; yahooSymbol: string; name: string; category: string }[] = [

  // ===== TSX — BANKS (Big 6 + smaller) =====
  { symbol: 'RY', yahooSymbol: 'RY.TO', name: 'Royal Bank of Canada', category: 'Banks' },
  { symbol: 'TD', yahooSymbol: 'TD.TO', name: 'Toronto-Dominion Bank', category: 'Banks' },
  { symbol: 'BNS', yahooSymbol: 'BNS.TO', name: 'Bank of Nova Scotia', category: 'Banks' },
  { symbol: 'BMO', yahooSymbol: 'BMO.TO', name: 'Bank of Montreal', category: 'Banks' },
  { symbol: 'CM', yahooSymbol: 'CM.TO', name: 'CIBC', category: 'Banks' },
  { symbol: 'NA', yahooSymbol: 'NA.TO', name: 'National Bank of Canada', category: 'Banks' },
  { symbol: 'CWB', yahooSymbol: 'CWB.TO', name: 'Canadian Western Bank', category: 'Banks' },
  { symbol: 'LB', yahooSymbol: 'LB.TO', name: 'Laurentian Bank', category: 'Banks' },
  { symbol: 'EQB', yahooSymbol: 'EQB.TO', name: 'EQB Inc (Equitable Bank)', category: 'Banks' },

  // ===== TSX — ENERGY (Oil, Gas, Pipelines) =====
  { symbol: 'ENB', yahooSymbol: 'ENB.TO', name: 'Enbridge Inc', category: 'Energy' },
  { symbol: 'CNQ', yahooSymbol: 'CNQ.TO', name: 'Canadian Natural Resources', category: 'Energy' },
  { symbol: 'SU', yahooSymbol: 'SU.TO', name: 'Suncor Energy', category: 'Energy' },
  { symbol: 'TRP', yahooSymbol: 'TRP.TO', name: 'TC Energy Corp', category: 'Energy' },
  { symbol: 'CVE', yahooSymbol: 'CVE.TO', name: 'Cenovus Energy', category: 'Energy' },
  { symbol: 'IMO', yahooSymbol: 'IMO.TO', name: 'Imperial Oil', category: 'Energy' },
  { symbol: 'PPL', yahooSymbol: 'PPL.TO', name: 'Pembina Pipeline', category: 'Energy' },
  { symbol: 'ARX', yahooSymbol: 'ARX.TO', name: 'ARC Resources', category: 'Energy' },
  { symbol: 'KEY', yahooSymbol: 'KEY.TO', name: 'Keyera Corp', category: 'Energy' },
  { symbol: 'MEG', yahooSymbol: 'MEG.TO', name: 'MEG Energy', category: 'Energy' },
  { symbol: 'WCP', yahooSymbol: 'WCP.TO', name: 'Whitecap Resources', category: 'Energy' },
  { symbol: 'BTE', yahooSymbol: 'BTE.TO', name: 'Baytex Energy', category: 'Energy' },
  { symbol: 'TVE', yahooSymbol: 'TVE.TO', name: 'Tamarack Valley Energy', category: 'Energy' },
  { symbol: 'PSK', yahooSymbol: 'PSK.TO', name: 'PrairieSky Royalty', category: 'Energy' },
  { symbol: 'TPZ', yahooSymbol: 'TPZ.TO', name: 'Topaz Energy', category: 'Energy' },
  { symbol: 'FRU', yahooSymbol: 'FRU.TO', name: 'Freehold Royalties', category: 'Energy' },
  { symbol: 'VET', yahooSymbol: 'VET.TO', name: 'Vermilion Energy', category: 'Energy' },
  { symbol: 'TOU', yahooSymbol: 'TOU.TO', name: 'Tourmaline Oil', category: 'Energy' },
  { symbol: 'CPG', yahooSymbol: 'CPG.TO', name: 'Crescent Point Energy', category: 'Energy' },
  { symbol: 'PEY', yahooSymbol: 'PEY.TO', name: 'Peyto Exploration', category: 'Energy' },
  { symbol: 'ERF', yahooSymbol: 'ERF.TO', name: 'Enerplus Corp', category: 'Energy' },

  // ===== TSX — MINING & MATERIALS =====
  { symbol: 'ABX', yahooSymbol: 'ABX.TO', name: 'Barrick Gold', category: 'Mining' },
  { symbol: 'FNV', yahooSymbol: 'FNV.TO', name: 'Franco-Nevada', category: 'Mining' },
  { symbol: 'NTR', yahooSymbol: 'NTR.TO', name: 'Nutrien Ltd', category: 'Materials' },
  { symbol: 'WPM', yahooSymbol: 'WPM.TO', name: 'Wheaton Precious Metals', category: 'Mining' },
  { symbol: 'AEM', yahooSymbol: 'AEM.TO', name: 'Agnico Eagle Mines', category: 'Mining' },
  { symbol: 'K', yahooSymbol: 'K.TO', name: 'Kinross Gold', category: 'Mining' },
  { symbol: 'FM', yahooSymbol: 'FM.TO', name: 'First Quantum Minerals', category: 'Mining' },
  { symbol: 'TECK.B', yahooSymbol: 'TECK-B.TO', name: 'Teck Resources', category: 'Mining' },
  { symbol: 'LUN', yahooSymbol: 'LUN.TO', name: 'Lundin Mining', category: 'Mining' },
  { symbol: 'HBM', yahooSymbol: 'HBM.TO', name: 'Hudbay Minerals', category: 'Mining' },
  { symbol: 'ELD', yahooSymbol: 'ELD.TO', name: 'Eldorado Gold', category: 'Mining' },
  { symbol: 'OR', yahooSymbol: 'OR.TO', name: 'Osisko Gold Royalties', category: 'Mining' },
  { symbol: 'CS', yahooSymbol: 'CS.TO', name: 'Capstone Copper', category: 'Mining' },
  { symbol: 'BTO', yahooSymbol: 'BTO.TO', name: 'B2Gold Corp', category: 'Mining' },
  { symbol: 'SSL', yahooSymbol: 'SSL.TO', name: 'Sandstorm Gold', category: 'Mining' },
  { symbol: 'IVN', yahooSymbol: 'IVN.TO', name: 'Ivanhoe Mines', category: 'Mining' },
  { symbol: 'ERO', yahooSymbol: 'ERO.TO', name: 'Ero Copper', category: 'Mining' },
  { symbol: 'CCL.B', yahooSymbol: 'CCL-B.TO', name: 'CCL Industries', category: 'Materials' },
  { symbol: 'WFG', yahooSymbol: 'WFG.TO', name: 'West Fraser Timber', category: 'Materials' },
  { symbol: 'ITP', yahooSymbol: 'ITP.TO', name: 'Intertape Polymer', category: 'Materials' },

  // ===== TSX — TECHNOLOGY =====
  { symbol: 'SHOP', yahooSymbol: 'SHOP.TO', name: 'Shopify Inc', category: 'Technology' },
  { symbol: 'CSU', yahooSymbol: 'CSU.TO', name: 'Constellation Software', category: 'Technology' },
  { symbol: 'OTEX', yahooSymbol: 'OTEX.TO', name: 'Open Text Corp', category: 'Technology' },
  { symbol: 'BB', yahooSymbol: 'BB.TO', name: 'BlackBerry Ltd', category: 'Technology' },
  { symbol: 'LSPD', yahooSymbol: 'LSPD.TO', name: 'Lightspeed Commerce', category: 'Technology' },
  { symbol: 'DCBO', yahooSymbol: 'DCBO.TO', name: 'Docebo Inc', category: 'Technology' },
  { symbol: 'TOI', yahooSymbol: 'TOI.TO', name: 'Topicus.com', category: 'Technology' },
  { symbol: 'TIXT', yahooSymbol: 'TIXT.TO', name: 'TELUS International', category: 'Technology' },
  { symbol: 'KXS', yahooSymbol: 'KXS.TO', name: 'Kinaxis Inc', category: 'Technology' },
  { symbol: 'DSG', yahooSymbol: 'DSG.TO', name: 'Descartes Group', category: 'Technology' },
  { symbol: 'GIB.A', yahooSymbol: 'GIB-A.TO', name: 'CGI Group', category: 'Technology' },
  { symbol: 'ENGH', yahooSymbol: 'ENGH.TO', name: 'Enghouse Systems', category: 'Technology' },
  { symbol: 'CLS', yahooSymbol: 'CLS.TO', name: 'Celestica Inc', category: 'Technology' },
  { symbol: 'AT', yahooSymbol: 'AT.TO', name: 'AcuityAds Holdings', category: 'Technology' },
  { symbol: 'NVEI', yahooSymbol: 'NVEI.TO', name: 'Nuvei Corp', category: 'Technology' },

  // ===== TSX — TELECOM =====
  { symbol: 'BCE', yahooSymbol: 'BCE.TO', name: 'BCE Inc', category: 'Telecom' },
  { symbol: 'T', yahooSymbol: 'T.TO', name: 'TELUS Corp', category: 'Telecom' },
  { symbol: 'RCI.B', yahooSymbol: 'RCI-B.TO', name: 'Rogers Communications', category: 'Telecom' },
  { symbol: 'QBR.B', yahooSymbol: 'QBR-B.TO', name: 'Quebecor Inc', category: 'Telecom' },
  { symbol: 'CCA', yahooSymbol: 'CCA.TO', name: 'Cogeco Communications', category: 'Telecom' },
  { symbol: 'SJR.B', yahooSymbol: 'SJR-B.TO', name: 'Shaw Communications', category: 'Telecom' },

  // ===== TSX — FINANCIALS (Non-Bank) =====
  { symbol: 'MFC', yahooSymbol: 'MFC.TO', name: 'Manulife Financial', category: 'Insurance' },
  { symbol: 'SLF', yahooSymbol: 'SLF.TO', name: 'Sun Life Financial', category: 'Insurance' },
  { symbol: 'IFC', yahooSymbol: 'IFC.TO', name: 'Intact Financial', category: 'Insurance' },
  { symbol: 'GWO', yahooSymbol: 'GWO.TO', name: 'Great-West Lifeco', category: 'Insurance' },
  { symbol: 'IAG', yahooSymbol: 'IAG.TO', name: 'iA Financial Group', category: 'Insurance' },
  { symbol: 'FFH', yahooSymbol: 'FFH.TO', name: 'Fairfax Financial', category: 'Insurance' },
  { symbol: 'BAM', yahooSymbol: 'BAM.TO', name: 'Brookfield Asset Mgmt', category: 'Financials' },
  { symbol: 'BN', yahooSymbol: 'BN.TO', name: 'Brookfield Corp', category: 'Financials' },
  { symbol: 'POW', yahooSymbol: 'POW.TO', name: 'Power Corp of Canada', category: 'Financials' },
  { symbol: 'IGM', yahooSymbol: 'IGM.TO', name: 'IGM Financial', category: 'Financials' },
  { symbol: 'X', yahooSymbol: 'X.TO', name: 'TMX Group', category: 'Financials' },
  { symbol: 'CIX', yahooSymbol: 'CIX.TO', name: 'CI Financial', category: 'Financials' },
  { symbol: 'FSZ', yahooSymbol: 'FSZ.TO', name: 'Fiera Capital', category: 'Financials' },
  { symbol: 'DFY', yahooSymbol: 'DFY.TO', name: 'Definity Financial', category: 'Insurance' },
  { symbol: 'BIP.UN', yahooSymbol: 'BIP-UN.TO', name: 'Brookfield Infra Partners', category: 'Infrastructure' },
  { symbol: 'BEP.UN', yahooSymbol: 'BEP-UN.TO', name: 'Brookfield Renewable', category: 'Renewables' },

  // ===== TSX — REAL ESTATE (REITs) =====
  { symbol: 'REI.UN', yahooSymbol: 'REI-UN.TO', name: 'RioCan REIT', category: 'Real Estate' },
  { symbol: 'CAR.UN', yahooSymbol: 'CAR-UN.TO', name: 'Canadian Apartment REIT', category: 'Real Estate' },
  { symbol: 'AP.UN', yahooSymbol: 'AP-UN.TO', name: 'Allied Properties REIT', category: 'Real Estate' },
  { symbol: 'HR.UN', yahooSymbol: 'HR-UN.TO', name: 'H&R REIT', category: 'Real Estate' },
  { symbol: 'DIR.UN', yahooSymbol: 'DIR-UN.TO', name: 'Dream Industrial REIT', category: 'Real Estate' },
  { symbol: 'GRT.UN', yahooSymbol: 'GRT-UN.TO', name: 'Granite REIT', category: 'Real Estate' },
  { symbol: 'SRU.UN', yahooSymbol: 'SRU-UN.TO', name: 'SmartCentres REIT', category: 'Real Estate' },
  { symbol: 'CHP.UN', yahooSymbol: 'CHP-UN.TO', name: 'Choice Properties REIT', category: 'Real Estate' },
  { symbol: 'CRT.UN', yahooSymbol: 'CRT-UN.TO', name: 'CT REIT', category: 'Real Estate' },
  { symbol: 'KMP.UN', yahooSymbol: 'KMP-UN.TO', name: 'Killam Apartment REIT', category: 'Real Estate' },
  { symbol: 'IIP.UN', yahooSymbol: 'IIP-UN.TO', name: 'InterRent REIT', category: 'Real Estate' },
  { symbol: 'MEQ', yahooSymbol: 'MEQ.TO', name: 'Mainstreet Equity', category: 'Real Estate' },
  { symbol: 'FSV', yahooSymbol: 'FSV.TO', name: 'FirstService Corp', category: 'Real Estate' },
  { symbol: 'CUF.UN', yahooSymbol: 'CUF-UN.TO', name: 'Cominar REIT', category: 'Real Estate' },

  // ===== TSX — RAIL & TRANSPORT =====
  { symbol: 'CNR', yahooSymbol: 'CNR.TO', name: 'Canadian National Railway', category: 'Transport' },
  { symbol: 'CP', yahooSymbol: 'CP.TO', name: 'Canadian Pacific Kansas City', category: 'Transport' },
  { symbol: 'AC', yahooSymbol: 'AC.TO', name: 'Air Canada', category: 'Transport' },
  { symbol: 'CAE', yahooSymbol: 'CAE.TO', name: 'CAE Inc', category: 'Aerospace' },
  { symbol: 'BBD.B', yahooSymbol: 'BBD-B.TO', name: 'Bombardier Inc', category: 'Aerospace' },

  // ===== TSX — CONSUMER =====
  { symbol: 'L', yahooSymbol: 'L.TO', name: 'Loblaw Companies', category: 'Consumer' },
  { symbol: 'ATD', yahooSymbol: 'ATD.TO', name: 'Alimentation Couche-Tard', category: 'Consumer' },
  { symbol: 'DOL', yahooSymbol: 'DOL.TO', name: 'Dollarama Inc', category: 'Consumer' },
  { symbol: 'MRU', yahooSymbol: 'MRU.TO', name: 'Metro Inc', category: 'Consumer' },
  { symbol: 'GIL', yahooSymbol: 'GIL.TO', name: 'Gildan Activewear', category: 'Consumer' },
  { symbol: 'WN', yahooSymbol: 'WN.TO', name: 'George Weston Ltd', category: 'Consumer' },
  { symbol: 'EMP.A', yahooSymbol: 'EMP-A.TO', name: 'Empire Company (Sobeys)', category: 'Consumer' },
  { symbol: 'NWC', yahooSymbol: 'NWC.TO', name: 'North West Company', category: 'Consumer' },
  { symbol: 'PBH', yahooSymbol: 'PBH.TO', name: 'Premium Brands Holdings', category: 'Consumer' },
  { symbol: 'BYD', yahooSymbol: 'BYD.TO', name: 'Boyd Group Services', category: 'Consumer' },
  { symbol: 'REAL', yahooSymbol: 'REAL.TO', name: 'Real Matters', category: 'Consumer' },
  { symbol: 'CTC.A', yahooSymbol: 'CTC-A.TO', name: 'Canadian Tire Corp', category: 'Consumer' },
  { symbol: 'MG', yahooSymbol: 'MG.TO', name: 'Magna International', category: 'Automotive' },
  { symbol: 'LNR', yahooSymbol: 'LNR.TO', name: 'Linamar Corp', category: 'Automotive' },
  { symbol: 'QSR', yahooSymbol: 'QSR.TO', name: 'Restaurant Brands Intl', category: 'Consumer' },
  { symbol: 'MTY', yahooSymbol: 'MTY.TO', name: 'MTY Food Group', category: 'Consumer' },
  { symbol: 'ONEX', yahooSymbol: 'ONEX.TO', name: 'Onex Corp', category: 'Financials' },

  // ===== TSX — HEALTHCARE & PHARMA =====
  { symbol: 'WEED', yahooSymbol: 'WEED.TO', name: 'Canopy Growth', category: 'Cannabis' },
  { symbol: 'TLRY', yahooSymbol: 'TLRY.TO', name: 'Tilray Brands', category: 'Cannabis' },
  { symbol: 'BHC', yahooSymbol: 'BHC.TO', name: 'Bausch Health', category: 'Healthcare' },
  { symbol: 'WELL', yahooSymbol: 'WELL.TO', name: 'WELL Health Technologies', category: 'Healthcare' },

  // ===== TSX — UTILITIES =====
  { symbol: 'FTS', yahooSymbol: 'FTS.TO', name: 'Fortis Inc', category: 'Utilities' },
  { symbol: 'EMA', yahooSymbol: 'EMA.TO', name: 'Emera Inc', category: 'Utilities' },
  { symbol: 'H', yahooSymbol: 'H.TO', name: 'Hydro One', category: 'Utilities' },
  { symbol: 'AQN', yahooSymbol: 'AQN.TO', name: 'Algonquin Power', category: 'Utilities' },
  { symbol: 'CU', yahooSymbol: 'CU.TO', name: 'Canadian Utilities', category: 'Utilities' },
  { symbol: 'ACO.X', yahooSymbol: 'ACO-X.TO', name: 'ATCO Ltd', category: 'Utilities' },
  { symbol: 'CPX', yahooSymbol: 'CPX.TO', name: 'Capital Power', category: 'Utilities' },
  { symbol: 'TA', yahooSymbol: 'TA.TO', name: 'TransAlta Corp', category: 'Utilities' },
  { symbol: 'RNW', yahooSymbol: 'RNW.TO', name: 'TransAlta Renewables', category: 'Renewables' },
  { symbol: 'NPI', yahooSymbol: 'NPI.TO', name: 'Northland Power', category: 'Renewables' },
  { symbol: 'INE', yahooSymbol: 'INE.TO', name: 'Innergex Renewable', category: 'Renewables' },
  { symbol: 'BLX', yahooSymbol: 'BLX.TO', name: 'Boralex Inc', category: 'Renewables' },

  // ===== TSX — INDUSTRIALS =====
  { symbol: 'WSP', yahooSymbol: 'WSP.TO', name: 'WSP Global', category: 'Industrials' },
  { symbol: 'STN', yahooSymbol: 'STN.TO', name: 'Stantec Inc', category: 'Industrials' },
  { symbol: 'AIF', yahooSymbol: 'AIF.TO', name: 'Altus Group', category: 'Industrials' },
  { symbol: 'RBA', yahooSymbol: 'RBA.TO', name: 'RB Global (Ritchie Bros)', category: 'Industrials' },
  { symbol: 'WCN', yahooSymbol: 'WCN.TO', name: 'Waste Connections', category: 'Industrials' },
  { symbol: 'SIS', yahooSymbol: 'SIS.TO', name: 'Savaria Corp', category: 'Industrials' },
  { symbol: 'TFII', yahooSymbol: 'TFII.TO', name: 'TFI International', category: 'Transport' },
  { symbol: 'ARE', yahooSymbol: 'ARE.TO', name: 'Aecon Group', category: 'Industrials' },
  { symbol: 'BDT', yahooSymbol: 'BDT.TO', name: 'Bird Construction', category: 'Industrials' },
  { symbol: 'TIH', yahooSymbol: 'TIH.TO', name: 'Toromont Industries', category: 'Industrials' },
  { symbol: 'FTT', yahooSymbol: 'FTT.TO', name: 'Finning International', category: 'Industrials' },
  { symbol: 'IFP', yahooSymbol: 'IFP.TO', name: 'Interfor Corp', category: 'Industrials' },

  // ===== CANADIAN ETFs — Broad Market =====
  { symbol: 'ZWB', yahooSymbol: 'ZWB.TO', name: 'BMO Covered Call Banks ETF', category: 'ETF - Income' },
  { symbol: 'ZDV', yahooSymbol: 'ZDV.TO', name: 'BMO Canadian Dividend ETF', category: 'ETF - Dividend' },
  { symbol: 'XRE', yahooSymbol: 'XRE.TO', name: 'iShares S&P/TSX REIT ETF', category: 'ETF - Real Estate' },
  { symbol: 'ZSP', yahooSymbol: 'ZSP.TO', name: 'BMO S&P 500 ETF', category: 'ETF - US Equity' },
  { symbol: 'XUU', yahooSymbol: 'XUU.TO', name: 'iShares Core S&P US Total Mkt', category: 'ETF - US Equity' },
  { symbol: 'VCN', yahooSymbol: 'VCN.TO', name: 'Vanguard FTSE Canada All Cap', category: 'ETF - Canadian Equity' },
  { symbol: 'HXS', yahooSymbol: 'HXS.TO', name: 'Global X S&P 500 ETF', category: 'ETF - US Equity' },
  { symbol: 'HCAL', yahooSymbol: 'HCAL.TO', name: 'Hamilton Cdn Bank 1.25x ETF', category: 'ETF - Leveraged' },
  { symbol: 'BTCC.B', yahooSymbol: 'BTCC-B.TO', name: 'Purpose Bitcoin ETF', category: 'ETF - Crypto' },
  { symbol: 'HQU', yahooSymbol: 'HQU.TO', name: 'BetaPro NASDAQ-100 2x', category: 'ETF - Leveraged' },
  { symbol: 'HDIV', yahooSymbol: 'HDIV.TO', name: 'Hamilton Enhanced Dividend ETF', category: 'ETF - Income' },
  { symbol: 'ZQQ', yahooSymbol: 'ZQQ.TO', name: 'BMO NASDAQ 100 ETF', category: 'ETF - Tech' },
  { symbol: 'XQQ', yahooSymbol: 'XQQ.TO', name: 'iShares NASDAQ 100 ETF (CAD)', category: 'ETF - Tech' },
  { symbol: 'VGRO', yahooSymbol: 'VGRO.TO', name: 'Vanguard Growth ETF Portfolio', category: 'ETF - Growth' },
  { symbol: 'ZCN', yahooSymbol: 'ZCN.TO', name: 'BMO S&P/TSX Capped Composite', category: 'ETF - Canadian Equity' },
  { symbol: 'XEI', yahooSymbol: 'XEI.TO', name: 'iShares Core MSCI Cdn Equity', category: 'ETF - Canadian Equity' },
  { symbol: 'ZWC', yahooSymbol: 'ZWC.TO', name: 'BMO Cdn High Div Covered Call', category: 'ETF - Income' },
  { symbol: 'XEF', yahooSymbol: 'XEF.TO', name: 'iShares Core MSCI EAFE', category: 'ETF - International' },
  { symbol: 'XEC', yahooSymbol: 'XEC.TO', name: 'iShares Core MSCI EM', category: 'ETF - Emerging Markets' },
  { symbol: 'ZEM', yahooSymbol: 'ZEM.TO', name: 'BMO MSCI Emerging Markets', category: 'ETF - Emerging Markets' },
  { symbol: 'VEE', yahooSymbol: 'VEE.TO', name: 'Vanguard FTSE Emerging Mkts', category: 'ETF - Emerging Markets' },
  { symbol: 'HXT', yahooSymbol: 'HXT.TO', name: 'Global X S&P/TSX 60 ETF', category: 'ETF - Canadian Equity' },
  { symbol: 'ZEA', yahooSymbol: 'ZEA.TO', name: 'BMO MSCI EAFE ETF', category: 'ETF - International' },
  { symbol: 'VCNS', yahooSymbol: 'VCNS.TO', name: 'Vanguard Conservative ETF', category: 'ETF - Balanced' },
  { symbol: 'ZGRO', yahooSymbol: 'ZGRO.TO', name: 'BMO Growth ETF', category: 'ETF - Growth' },
  { symbol: 'ZBAL', yahooSymbol: 'ZBAL.TO', name: 'BMO Balanced ETF', category: 'ETF - Balanced' },
  { symbol: 'XBAL', yahooSymbol: 'XBAL.TO', name: 'iShares Core Balanced ETF', category: 'ETF - Balanced' },
  { symbol: 'XGRO', yahooSymbol: 'XGRO.TO', name: 'iShares Core Growth ETF', category: 'ETF - Growth' },
  { symbol: 'XBB', yahooSymbol: 'XBB.TO', name: 'iShares Core Cdn Bond ETF', category: 'ETF - Bonds' },
  { symbol: 'ZFL', yahooSymbol: 'ZFL.TO', name: 'BMO Long Federal Bond ETF', category: 'ETF - Bonds' },
  { symbol: 'XSB', yahooSymbol: 'XSB.TO', name: 'iShares Core Short Term Bond', category: 'ETF - Bonds' },
  { symbol: 'HISA', yahooSymbol: 'HISA.TO', name: 'Global X High Interest Savings', category: 'ETF - Cash' },
  { symbol: 'CSAV', yahooSymbol: 'CSAV.TO', name: 'CI High Interest Savings', category: 'ETF - Cash' },
  { symbol: 'PSA', yahooSymbol: 'PSA.TO', name: 'Purpose High Interest Savings', category: 'ETF - Cash' },
  { symbol: 'HYLD', yahooSymbol: 'HYLD.TO', name: 'Hamilton Enhanced US Covered Call', category: 'ETF - Income' },
  { symbol: 'HHL', yahooSymbol: 'HHL.TO', name: 'Hamilton Healthcare Opportunities', category: 'ETF - Healthcare' },
  { symbol: 'FLOT', yahooSymbol: 'FLOT.TO', name: 'BMO Floating Rate High Yield', category: 'ETF - Bonds' },
  { symbol: 'HMMJ', yahooSymbol: 'HMMJ.TO', name: 'Global X Marijuana Life Sciences', category: 'ETF - Cannabis' },
  { symbol: 'EBIT', yahooSymbol: 'EBIT.TO', name: 'Purpose Bitcoin Yield ETF', category: 'ETF - Crypto' },
  { symbol: 'ETHH', yahooSymbol: 'ETHH.TO', name: 'Purpose Ether ETF', category: 'ETF - Crypto' },

  // ===== US — MEGA CAP TECH =====
  { symbol: 'AAPL', yahooSymbol: 'AAPL', name: 'Apple Inc', category: 'US - Technology' },
  { symbol: 'MSFT', yahooSymbol: 'MSFT', name: 'Microsoft Corp', category: 'US - Technology' },
  { symbol: 'NVDA', yahooSymbol: 'NVDA', name: 'NVIDIA Corp', category: 'US - Semiconductors' },
  { symbol: 'GOOGL', yahooSymbol: 'GOOGL', name: 'Alphabet Inc (Google)', category: 'US - Technology' },
  { symbol: 'AMZN', yahooSymbol: 'AMZN', name: 'Amazon.com Inc', category: 'US - E-Commerce' },
  { symbol: 'META', yahooSymbol: 'META', name: 'Meta Platforms', category: 'US - Social Media' },
  { symbol: 'TSLA', yahooSymbol: 'TSLA', name: 'Tesla Inc', category: 'US - Auto/EV' },
  { symbol: 'AVGO', yahooSymbol: 'AVGO', name: 'Broadcom Inc', category: 'US - Semiconductors' },
  { symbol: 'ORCL', yahooSymbol: 'ORCL', name: 'Oracle Corp', category: 'US - Software' },
  { symbol: 'NFLX', yahooSymbol: 'NFLX', name: 'Netflix Inc', category: 'US - Entertainment' },

  // ===== US — TECH / SOFTWARE =====
  { symbol: 'CRM', yahooSymbol: 'CRM', name: 'Salesforce Inc', category: 'US - Software' },
  { symbol: 'ADBE', yahooSymbol: 'ADBE', name: 'Adobe Inc', category: 'US - Software' },
  { symbol: 'AMD', yahooSymbol: 'AMD', name: 'Advanced Micro Devices', category: 'US - Semiconductors' },
  { symbol: 'INTC', yahooSymbol: 'INTC', name: 'Intel Corp', category: 'US - Semiconductors' },
  { symbol: 'CSCO', yahooSymbol: 'CSCO', name: 'Cisco Systems', category: 'US - Networking' },
  { symbol: 'QCOM', yahooSymbol: 'QCOM', name: 'Qualcomm Inc', category: 'US - Semiconductors' },
  { symbol: 'PLTR', yahooSymbol: 'PLTR', name: 'Palantir Technologies', category: 'US - AI/Data' },
  { symbol: 'SNOW', yahooSymbol: 'SNOW', name: 'Snowflake Inc', category: 'US - Cloud' },
  { symbol: 'UBER', yahooSymbol: 'UBER', name: 'Uber Technologies', category: 'US - Tech' },
  { symbol: 'SQ', yahooSymbol: 'SQ', name: 'Block Inc (Square)', category: 'US - Fintech' },
  { symbol: 'COIN', yahooSymbol: 'COIN', name: 'Coinbase Global', category: 'US - Crypto' },
  { symbol: 'MSTR', yahooSymbol: 'MSTR', name: 'MicroStrategy Inc', category: 'US - Crypto/Tech' },
  { symbol: 'NET', yahooSymbol: 'NET', name: 'Cloudflare Inc', category: 'US - Cloud' },
  { symbol: 'SHOP_US', yahooSymbol: 'SHOP', name: 'Shopify Inc (US)', category: 'US - E-Commerce' },
  { symbol: 'PANW', yahooSymbol: 'PANW', name: 'Palo Alto Networks', category: 'US - Cybersecurity' },
  { symbol: 'CRWD', yahooSymbol: 'CRWD', name: 'CrowdStrike Holdings', category: 'US - Cybersecurity' },
  { symbol: 'MU', yahooSymbol: 'MU', name: 'Micron Technology', category: 'US - Semiconductors' },
  { symbol: 'AMAT', yahooSymbol: 'AMAT', name: 'Applied Materials', category: 'US - Semiconductors' },
  { symbol: 'NOW', yahooSymbol: 'NOW', name: 'ServiceNow Inc', category: 'US - Software' },
  { symbol: 'INTU', yahooSymbol: 'INTU', name: 'Intuit Inc', category: 'US - Software' },
  { symbol: 'PYPL', yahooSymbol: 'PYPL', name: 'PayPal Holdings', category: 'US - Fintech' },
  { symbol: 'ARM', yahooSymbol: 'ARM', name: 'Arm Holdings', category: 'US - Semiconductors' },
  { symbol: 'DELL', yahooSymbol: 'DELL', name: 'Dell Technologies', category: 'US - Hardware' },
  { symbol: 'IBM', yahooSymbol: 'IBM', name: 'IBM Corp', category: 'US - Technology' },
  { symbol: 'SMCI', yahooSymbol: 'SMCI', name: 'Super Micro Computer', category: 'US - AI/Hardware' },

  // ===== US — HEALTHCARE & PHARMA =====
  { symbol: 'UNH', yahooSymbol: 'UNH', name: 'UnitedHealth Group', category: 'US - Healthcare' },
  { symbol: 'LLY', yahooSymbol: 'LLY', name: 'Eli Lilly & Co', category: 'US - Pharma' },
  { symbol: 'JNJ', yahooSymbol: 'JNJ', name: 'Johnson & Johnson', category: 'US - Pharma' },
  { symbol: 'PFE', yahooSymbol: 'PFE', name: 'Pfizer Inc', category: 'US - Pharma' },
  { symbol: 'ABBV', yahooSymbol: 'ABBV', name: 'AbbVie Inc', category: 'US - Pharma' },
  { symbol: 'MRK', yahooSymbol: 'MRK', name: 'Merck & Co', category: 'US - Pharma' },
  { symbol: 'TMO', yahooSymbol: 'TMO', name: 'Thermo Fisher Scientific', category: 'US - Life Sciences' },

  // ===== US — FINANCIALS =====
  { symbol: 'JPM', yahooSymbol: 'JPM', name: 'JPMorgan Chase', category: 'US - Banks' },
  { symbol: 'V', yahooSymbol: 'V', name: 'Visa Inc', category: 'US - Payments' },
  { symbol: 'MA', yahooSymbol: 'MA', name: 'Mastercard Inc', category: 'US - Payments' },
  { symbol: 'BAC', yahooSymbol: 'BAC', name: 'Bank of America', category: 'US - Banks' },
  { symbol: 'WFC', yahooSymbol: 'WFC', name: 'Wells Fargo', category: 'US - Banks' },
  { symbol: 'GS', yahooSymbol: 'GS', name: 'Goldman Sachs', category: 'US - Banks' },
  { symbol: 'BRK.B', yahooSymbol: 'BRK-B', name: 'Berkshire Hathaway', category: 'US - Conglomerate' },

  // ===== US — CONSUMER & RETAIL =====
  { symbol: 'WMT', yahooSymbol: 'WMT', name: 'Walmart Inc', category: 'US - Retail' },
  { symbol: 'COST', yahooSymbol: 'COST', name: 'Costco Wholesale', category: 'US - Retail' },
  { symbol: 'HD', yahooSymbol: 'HD', name: 'Home Depot', category: 'US - Retail' },
  { symbol: 'MCD', yahooSymbol: 'MCD', name: 'McDonalds Corp', category: 'US - Restaurants' },
  { symbol: 'SBUX', yahooSymbol: 'SBUX', name: 'Starbucks Corp', category: 'US - Restaurants' },
  { symbol: 'NKE', yahooSymbol: 'NKE', name: 'Nike Inc', category: 'US - Consumer' },
  { symbol: 'KO', yahooSymbol: 'KO', name: 'Coca-Cola Co', category: 'US - Consumer' },
  { symbol: 'PEP', yahooSymbol: 'PEP', name: 'PepsiCo Inc', category: 'US - Consumer' },
  { symbol: 'PG', yahooSymbol: 'PG', name: 'Procter & Gamble', category: 'US - Consumer' },
  { symbol: 'DIS', yahooSymbol: 'DIS', name: 'Walt Disney Co', category: 'US - Entertainment' },

  // ===== US — ENERGY =====
  { symbol: 'XOM', yahooSymbol: 'XOM', name: 'Exxon Mobil', category: 'US - Energy' },
  { symbol: 'CVX', yahooSymbol: 'CVX', name: 'Chevron Corp', category: 'US - Energy' },
  { symbol: 'COP', yahooSymbol: 'COP', name: 'ConocoPhillips', category: 'US - Energy' },

  // ===== US — INDUSTRIALS & DEFENSE =====
  { symbol: 'BA', yahooSymbol: 'BA', name: 'Boeing Co', category: 'US - Aerospace' },
  { symbol: 'LMT', yahooSymbol: 'LMT', name: 'Lockheed Martin', category: 'US - Defense' },
  { symbol: 'RTX', yahooSymbol: 'RTX', name: 'RTX Corp (Raytheon)', category: 'US - Defense' },
  { symbol: 'CAT', yahooSymbol: 'CAT', name: 'Caterpillar Inc', category: 'US - Industrials' },
  { symbol: 'DE', yahooSymbol: 'DE', name: 'Deere & Co', category: 'US - Industrials' },
  { symbol: 'GE', yahooSymbol: 'GE', name: 'GE Aerospace', category: 'US - Industrials' },

  // ===== US — POPULAR ETFs =====
  { symbol: 'SPY', yahooSymbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'US - ETF' },
  { symbol: 'QQQ', yahooSymbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'US - ETF' },
  { symbol: 'IWM', yahooSymbol: 'IWM', name: 'iShares Russell 2000 ETF', category: 'US - ETF' },
  { symbol: 'DIA', yahooSymbol: 'DIA', name: 'SPDR Dow Jones ETF', category: 'US - ETF' },
  { symbol: 'VOO', yahooSymbol: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'US - ETF' },
  { symbol: 'VTI', yahooSymbol: 'VTI', name: 'Vanguard Total Stock Mkt ETF', category: 'US - ETF' },
  { symbol: 'ARKK', yahooSymbol: 'ARKK', name: 'ARK Innovation ETF', category: 'US - ETF' },
  { symbol: 'XLF', yahooSymbol: 'XLF', name: 'Financial Select SPDR', category: 'US - ETF' },
  { symbol: 'XLE', yahooSymbol: 'XLE', name: 'Energy Select SPDR', category: 'US - ETF' },
  { symbol: 'XLK', yahooSymbol: 'XLK', name: 'Technology Select SPDR', category: 'US - ETF' },
  { symbol: 'XLV', yahooSymbol: 'XLV', name: 'Health Care Select SPDR', category: 'US - ETF' },
  { symbol: 'GLD', yahooSymbol: 'GLD', name: 'SPDR Gold Shares', category: 'US - ETF Commodities' },
  { symbol: 'SLV', yahooSymbol: 'SLV', name: 'iShares Silver Trust', category: 'US - ETF Commodities' },
  { symbol: 'TLT', yahooSymbol: 'TLT', name: 'iShares 20+ Year Treasury', category: 'US - ETF Bonds' },
  { symbol: 'SOXX', yahooSymbol: 'SOXX', name: 'iShares Semiconductor ETF', category: 'US - ETF Semis' },
  { symbol: 'SMH', yahooSymbol: 'SMH', name: 'VanEck Semiconductor ETF', category: 'US - ETF Semis' },
  { symbol: 'SOXL', yahooSymbol: 'SOXL', name: 'Direxion Semiconductor 3x', category: 'US - ETF Leveraged' },
  { symbol: 'TQQQ', yahooSymbol: 'TQQQ', name: 'ProShares UltraPro QQQ 3x', category: 'US - ETF Leveraged' },

  // ===== POPULAR MEME / MOMENTUM STOCKS =====
  { symbol: 'GME', yahooSymbol: 'GME', name: 'GameStop Corp', category: 'US - Meme/Retail' },
  { symbol: 'AMC', yahooSymbol: 'AMC', name: 'AMC Entertainment', category: 'US - Meme/Retail' },
  { symbol: 'SOFI', yahooSymbol: 'SOFI', name: 'SoFi Technologies', category: 'US - Fintech' },
  { symbol: 'HOOD', yahooSymbol: 'HOOD', name: 'Robinhood Markets', category: 'US - Fintech' },
  { symbol: 'RIVN', yahooSymbol: 'RIVN', name: 'Rivian Automotive', category: 'US - EV' },
  { symbol: 'LCID', yahooSymbol: 'LCID', name: 'Lucid Group', category: 'US - EV' },
  { symbol: 'NIO', yahooSymbol: 'NIO', name: 'NIO Inc', category: 'US - EV' },
  { symbol: 'BABA', yahooSymbol: 'BABA', name: 'Alibaba Group', category: 'US - China Tech' },
];

// Total stock count
export const TOTAL_SCANNER_STOCKS = SCANNER_UNIVERSE.length;

// ============================================================
// PROXY DEFINITIONS
// ============================================================
const PROXIES = [
  { name: 'corsproxy.io', make: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
  { name: 'allorigins.win', make: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
];

// ============================================================
// YAHOO FINANCE FETCH with CORS proxy fallback + retry
// ============================================================
async function fetchWithProxy(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> }> {
  // On native Android/iOS: call Yahoo Finance directly — no CORS, no proxy needed
  if (isNative) {
    const response = await nativeFetch(url);
    if (response.ok) return response;
    throw new Error(`Native fetch failed with status ${response.status}`);
  }

  // On web: route through CORS proxies
  for (const proxy of PROXIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(proxy.make(url), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) return response;
    } catch {
      continue;
    }
  }
  throw new Error('All proxy attempts failed');
}

// Delay helper
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface YahooChartResult {
  meta: {
    symbol: string;
    currency: string;
    regularMarketPrice: number;
    previousClose: number;
    chartPreviousClose: number;
  };
  timestamp: number[];
  indicators: {
    quote: [{
      close: (number | null)[];
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      volume: (number | null)[];
    }];
  };
}

// Original (non-logged) fetch — used by search, watchlist, core ETFs
export async function fetchETFData(yahooSymbol: string): Promise<YahooChartResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=6mo&interval=1d&includePrePost=false`;
    const response = await fetchWithProxy(url);
    const data = await response.json();
    if (data?.chart?.result?.[0]) {
      return data.chart.result[0] as YahooChartResult;
    }
    return null;
  } catch (e) {
    console.warn(`Failed to fetch ${yahooSymbol}:`, e);
    return null;
  }
}

// ============================================================
// LOGGED FETCH — used by scanner, logs every request detail
// ============================================================
export async function fetchETFDataLogged(
  yahooSymbol: string,
  logEntry: ScanLogEntry,
): Promise<YahooChartResult | null> {
  const startTime = performance.now();
  const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=6mo&interval=1d&includePrePost=false`;

  // On native: call Yahoo Finance directly, skip proxy loop
  if (isNative) {
    logEntry.proxy = 'native';
    try {
      const response = await nativeFetch(apiUrl);
      logEntry.httpStatus = response.status;
      if (!response.ok) {
        logEntry.status = response.status === 429 ? 'throttled' : 'failed';
        logEntry.note += `HTTP ${response.status} (native). `;
        logEntry.durationMs = performance.now() - startTime;
        return null;
      }
      const text = await response.text();
      logEntry.responseSize = text.length;
      const data = JSON.parse(text);
      if (data?.chart?.result?.[0]) {
        const result = data.chart.result[0] as YahooChartResult;
        logEntry.dataPoints = result.timestamp?.length || 0;
        logEntry.status = 'success';
        logEntry.durationMs = performance.now() - startTime;
        return result;
      }
      logEntry.note += 'No chart data in response. ';
    } catch (err) {
      logEntry.note += `Native error: ${String(err).slice(0, 80)}. `;
    }
    logEntry.durationMs = performance.now() - startTime;
    logEntry.status = 'failed';
    return null;
  }

  for (let proxyIdx = 0; proxyIdx < PROXIES.length; proxyIdx++) {
    const proxy = PROXIES[proxyIdx];
    const proxyUrl = proxy.make(apiUrl);

    if (proxyIdx > 0) {
      logEntry.proxyFallback = true;
      logEntry.note += `Fallback to ${proxy.name}. `;
    }
    logEntry.proxy = proxy.name;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      logEntry.httpStatus = response.status;
      
      if (!response.ok) {
        logEntry.note += `HTTP ${response.status} from ${proxy.name}. `;
        if (response.status === 429) {
          logEntry.status = 'throttled';
          logEntry.note += 'RATE LIMITED (429). ';
          logEntry.durationMs = performance.now() - startTime;
          return null;
        }
        continue; // try next proxy
      }
      
      const text = await response.text();
      logEntry.responseSize = text.length;
      
      // Detect suspiciously small responses (potential throttle/block)
      if (text.length < 100) {
        logEntry.note += `Tiny response (${text.length}b) — may be blocked. `;
      }
      
      const data = JSON.parse(text);
      
      if (data?.chart?.result?.[0]) {
        const result = data.chart.result[0] as YahooChartResult;
        logEntry.dataPoints = result.timestamp?.length || 0;
        logEntry.status = 'success';
        logEntry.durationMs = performance.now() - startTime;
        
        // Flag slow responses
        if (logEntry.durationMs > 5000) {
          logEntry.note += `SLOW (${Math.round(logEntry.durationMs)}ms). `;
        } else if (logEntry.durationMs > 3000) {
          logEntry.note += `Slow (${Math.round(logEntry.durationMs)}ms). `;
        }
        
        // Flag if returned very few data points
        if (logEntry.dataPoints < 20) {
          logEntry.note += `Low data (${logEntry.dataPoints} bars). `;
        }
        
        return result;
      } else {
        logEntry.note += 'No chart data in response. ';
        if (data?.chart?.error) {
          logEntry.note += `API error: ${JSON.stringify(data.chart.error).slice(0, 100)}. `;
        }
      }
    } catch (err) {
      const elapsed = performance.now() - startTime;
      logEntry.durationMs = elapsed;
      
      if (err instanceof DOMException && err.name === 'AbortError') {
        logEntry.status = 'timeout';
        logEntry.note += `Timeout after ${Math.round(elapsed)}ms on ${proxy.name}. `;
      } else {
        logEntry.note += `${proxy.name} error: ${String(err).slice(0, 80)}. `;
      }
      continue; // try next proxy
    }
  }
  
  // All proxies failed
  logEntry.durationMs = performance.now() - startTime;
  if (logEntry.status === 'pending') {
    logEntry.status = 'failed';
  }
  logEntry.note += 'All proxies exhausted.';
  return null;
}

export function parseChartData(result: YahooChartResult): HistoricalDataPoint[] {
  const { timestamp, indicators } = result;
  const quote = indicators.quote[0];
  const points: HistoricalDataPoint[] = [];

  for (let i = 0; i < timestamp.length; i++) {
    const close = quote.close[i];
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const vol = quote.volume[i];
    if (close != null && open != null && high != null && low != null && vol != null) {
      const d = new Date(timestamp[i] * 1000);
      points.push({
        date: d.toISOString().split('T')[0],
        timestamp: timestamp[i],
        open, high, low, close,
        volume: vol,
      });
    }
  }
  return points;
}

// ============================================================
// SEARCH — Yahoo Finance autocomplete API
// ============================================================
export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&listsCount=0&enableFuzzyQuery=false`;
    const response = await fetchWithProxy(url);
    const data = await response.json();
    if (data?.quotes) {
      return data.quotes
        .filter((q: { quoteType?: string }) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        .map((q: { symbol: string; shortname?: string; longname?: string; exchDisp?: string; quoteType?: string }) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchDisp || 'Unknown',
          type: q.quoteType || 'EQUITY',
        }));
    }
    return [];
  } catch (e) {
    console.warn('Search failed:', e);
    return [];
  }
}

// ============================================================
// FALLBACK DATA GENERATOR
// ============================================================
export function generateFallbackData(symbol: string): HistoricalDataPoint[] {
  const points: HistoricalDataPoint[] = [];
  let price = 30 + (symbol.charCodeAt(0) % 100);
  const vol = 0.01 + (symbol.length % 5) * 0.003;

  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);
  const random = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 6);
  const d = new Date(startDate);

  while (d <= today) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const dailyReturn = (random() - 0.48) * vol * 2;
      price = price * (1 + dailyReturn);
      points.push({
        date: d.toISOString().split('T')[0],
        timestamp: Math.floor(d.getTime() / 1000),
        open: price * (1 + (random() - 0.5) * vol * 0.5),
        high: price * (1 + random() * vol),
        low: price * (1 - random() * vol),
        close: price,
        volume: Math.floor(500000 + random() * 3000000),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return points;
}
