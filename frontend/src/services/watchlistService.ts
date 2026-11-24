/**
 * Watchlist & Price Alerts Service
 * Manages farmer saved crops, preferred mandis, and opt-in price alerts.
 * Persists locally with reactive listeners.
 */

export interface PriceAlertSetting {
  enabled: boolean;
  frequency: 'INSTANT_FILING' | 'DAILY_MORNING';
  percentageChangeThreshold: number; // e.g. 5%
  lastNotifiedDate: string | null;
}

const STORAGE_KEY_CROPS = 'mandisaathi_saved_crops';
const STORAGE_KEY_MANDIS = 'mandisaathi_saved_mandis';
const STORAGE_KEY_ALERTS = 'mandisaathi_price_alerts';

// Defaults tailored to North-West agrarian belt (Punjab, Haryana, Rajasthan)
const DEFAULT_SAVED_CROPS = ['WHEAT', 'MUSTARD', 'CUMIN'];
const DEFAULT_SAVED_MANDIS = ['KHANNA_PB', 'SIRSA_HR', 'JODHPUR_GRAIN_RJ'];

export function getSavedCrops(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CROPS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CROPS, JSON.stringify(DEFAULT_SAVED_CROPS));
      return DEFAULT_SAVED_CROPS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SAVED_CROPS;
  }
}

export function toggleSavedCrop(cropCode: string): string[] {
  const current = getSavedCrops();
  const upper = cropCode.toUpperCase();
  const next = current.includes(upper)
    ? current.filter((c) => c !== upper)
    : [...current, upper];
  try {
    localStorage.setItem(STORAGE_KEY_CROPS, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('mandisaathi:watchlist_changed', { detail: { type: 'crop', list: next } }));
  } catch {
    // ignore storage exceptions
  }
  return next;
}

export function isCropSaved(cropCode: string): boolean {
  if (!cropCode) return false;
  return getSavedCrops().includes(cropCode.toUpperCase());
}

export function getSavedMandis(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MANDIS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_MANDIS, JSON.stringify(DEFAULT_SAVED_MANDIS));
      return DEFAULT_SAVED_MANDIS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SAVED_MANDIS;
  }
}

export function toggleSavedMandi(mandiCode: string): string[] {
  const current = getSavedMandis();
  const upper = mandiCode.toUpperCase();
  const next = current.includes(upper)
    ? current.filter((m) => m !== upper)
    : [...current, upper];
  try {
    localStorage.setItem(STORAGE_KEY_MANDIS, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('mandisaathi:watchlist_changed', { detail: { type: 'mandi', list: next } }));
  } catch {
    // ignore storage exceptions
  }
  return next;
}

export function isMandiSaved(mandiCode: string): boolean {
  if (!mandiCode) return false;
  return getSavedMandis().includes(mandiCode.toUpperCase());
}

export function getPriceAlertSettings(): PriceAlertSetting {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTS);
    if (!raw) {
      const def: PriceAlertSetting = {
        enabled: true,
        frequency: 'DAILY_MORNING',
        percentageChangeThreshold: 5,
        lastNotifiedDate: new Date().toISOString().split('T')[0] ?? null,
      };
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(def));
      return def;
    }
    return JSON.parse(raw);
  } catch {
    return {
      enabled: true,
      frequency: 'DAILY_MORNING',
      percentageChangeThreshold: 5,
      lastNotifiedDate: null,
    };
  }
}

export function updatePriceAlertSettings(settings: Partial<PriceAlertSetting>): PriceAlertSetting {
  const current = getPriceAlertSettings();
  const updated: PriceAlertSetting = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('mandisaathi:alerts_changed', { detail: updated }));
  } catch {
    // ignore storage exceptions
  }
  return updated;
}
