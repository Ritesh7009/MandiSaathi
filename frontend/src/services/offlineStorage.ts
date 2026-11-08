/**
 * IndexedDB Structured Storage for Offline Mandi Price Intelligence
 * Enables zero-connectivity field price lookup with reporting dates,
 * synchronization timestamps, and automatic stale warnings (>24 hours).
 */

import { PriceRecord, Commodity, Mandi } from '../types';

const DB_NAME = 'mandisaathi_offline_db';
const DB_VERSION = 1;

const STORE_PRICES = 'price_records';
const STORE_COMMODITIES = 'commodities';
const STORE_MANDIS = 'mandis';
const STORE_METADATA = 'metadata';

// 24 hours freshness threshold
export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface CachedPriceRecord extends PriceRecord {
  cachedAt: number;
  syncTimestamp: string;
}

export interface CachedQueryResult {
  records: PriceRecord[];
  lastSyncedAt: number | null;
  isStale: boolean;
  totalCached: number;
}

let dbInstance: IDBDatabase | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Price records store
      if (!db.objectStoreNames.contains(STORE_PRICES)) {
        const priceStore = db.createObjectStore(STORE_PRICES, { keyPath: 'id' });
        priceStore.createIndex('commodityCode', 'commodityCode', { unique: false });
        priceStore.createIndex('mandiCode', 'mandiCode', { unique: false });
        priceStore.createIndex('state', 'state', { unique: false });
        priceStore.createIndex('district', 'district', { unique: false });
        priceStore.createIndex('priceDate', 'priceDate', { unique: false });
        priceStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // Commodities store
      if (!db.objectStoreNames.contains(STORE_COMMODITIES)) {
        db.createObjectStore(STORE_COMMODITIES, { keyPath: 'code' });
      }

      // Mandis store
      if (!db.objectStoreNames.contains(STORE_MANDIS)) {
        db.createObjectStore(STORE_MANDIS, { keyPath: 'code' });
      }

      // Metadata store (sync timestamp, telemetry)
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Persists retrieved price records into IndexedDB with current timestamp.
 */
export async function savePriceRecords(records: PriceRecord[]): Promise<void> {
  if (!records || records.length === 0) return;
  const db = await getDb();
  const now = Date.now();
  const syncIso = new Date(now).toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRICES, STORE_METADATA], 'readwrite');
    const priceStore = tx.objectStore(STORE_PRICES);
    const metaStore = tx.objectStore(STORE_METADATA);

    for (const record of records) {
      const cachedRecord: CachedPriceRecord = {
        ...record,
        cachedAt: now,
        syncTimestamp: syncIso,
      };
      priceStore.put(cachedRecord);
    }

    metaStore.put({
      key: 'last_price_sync',
      timestamp: now,
      iso: syncIso,
      count: records.length,
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves cached prices matching commodityCode and/or mandiCode.
 */
export async function getCachedPrices(
  commodityCode?: string,
  mandiCode?: string
): Promise<CachedQueryResult> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRICES, STORE_METADATA], 'readonly');
    const priceStore = tx.objectStore(STORE_PRICES);
    const metaStore = tx.objectStore(STORE_METADATA);

    const priceReq = priceStore.getAll();
    const metaReq = metaStore.get('last_price_sync');

    tx.oncomplete = () => {
      const allRecords = (priceReq.result || []) as CachedPriceRecord[];
      const meta = metaReq.result as { timestamp: number } | undefined;
      const lastSyncedAt = meta?.timestamp ?? (allRecords.length > 0 ? (allRecords[0]?.cachedAt ?? null) : null);

      let filtered = allRecords;
      if (commodityCode) {
        filtered = filtered.filter((r) => r.commodityCode.toUpperCase() === commodityCode.toUpperCase());
      }
      if (mandiCode) {
        filtered = filtered.filter((r) => r.mandiCode.toUpperCase() === mandiCode.toUpperCase());
      }

      // Sort by priceDate desc
      filtered.sort((a, b) => (b.priceDate || '').localeCompare(a.priceDate || ''));

      const isStale = lastSyncedAt ? Date.now() - lastSyncedAt > STALE_THRESHOLD_MS : true;

      resolve({
        records: filtered,
        lastSyncedAt,
        isStale,
        totalCached: allRecords.length,
      });
    };

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Cache commodities for offline filter dropdowns
 */
export async function saveCommodities(commodities: Commodity[]): Promise<void> {
  if (!commodities || commodities.length === 0) return;
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMMODITIES, 'readwrite');
    const store = tx.objectStore(STORE_COMMODITIES);
    commodities.forEach((c) => store.put(c));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedCommodities(): Promise<Commodity[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COMMODITIES, 'readonly');
      const store = tx.objectStore(STORE_COMMODITIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Cache mandis for offline filter dropdowns
 */
export async function saveMandis(mandis: Mandi[]): Promise<void> {
  if (!mandis || mandis.length === 0) return;
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MANDIS, 'readwrite');
    const store = tx.objectStore(STORE_MANDIS);
    mandis.forEach((m) => store.put(m));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedMandis(): Promise<Mandi[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MANDIS, 'readonly');
      const store = tx.objectStore(STORE_MANDIS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Metadata and cache statistics
 */
export async function getOfflineStorageStats(): Promise<{
  recordCount: number;
  lastSyncedAt: number | null;
  isStale: boolean;
}> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PRICES, STORE_METADATA], 'readonly');
      const priceStore = tx.objectStore(STORE_PRICES);
      const metaStore = tx.objectStore(STORE_METADATA);

      const countReq = priceStore.count();
      const metaReq = metaStore.get('last_price_sync');

      tx.oncomplete = () => {
        const count = countReq.result || 0;
        const meta = metaReq.result as { timestamp: number } | undefined;
        const lastSyncedAt = meta?.timestamp || null;
        const isStale = lastSyncedAt ? Date.now() - lastSyncedAt > STALE_THRESHOLD_MS : true;
        resolve({ recordCount: count, lastSyncedAt, isStale });
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return { recordCount: 0, lastSyncedAt: null, isStale: true };
  }
}

/**
 * Clears cached offline price data
 */
export async function clearOfflineCache(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PRICES, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_PRICES).clear();
    tx.objectStore(STORE_METADATA).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
