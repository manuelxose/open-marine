import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// ── Types ─────────────────────────────────────────────────────────────

export interface StoredPosition {
  timestamp: number;
  date: string; // ISO date (YYYY-MM-DD) for index
  lat: number;
  lon: number;
  sog: number;
  cog: number;
}

export interface StoredDatapoint {
  path: string;
  timestamp: number;
  value: number;
}

export interface StoredAlarmEvent {
  id?: number; // auto-increment
  alarmId: string;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
  resolvedAt?: number;
}

// ── Constants ─────────────────────────────────────────────────────────

const DB_NAME = 'omi-database';
const DB_VERSION = 2;

const STORE_POSITIONS = 'positions';
const STORE_DATAPOINTS = 'datapoints';
const STORE_ALARM_HISTORY = 'alarm-history';

const POSITION_THROTTLE_MS = 10_000; // Max 1 position per 10s
const DEFAULT_PRUNE_DAYS = 30;

// ── Service ───────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class IdbStoreService {
  private db: IDBDatabase | null = null;
  private lastPositionSave = 0;
  private initPromise: Promise<void> | null = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /** Initialize database. Safe to call multiple times. */
  async init(): Promise<void> {
    if (!this.isBrowser) return;
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._openDatabase().then((db) => {
      this.db = db;
    });
    return this.initPromise;
  }

  /** Check if the DB is ready */
  get isReady(): boolean {
    return this.db !== null;
  }

  // ── Position Store ────────────────────────────────────────────────

  /**
   * Save a position to IDB for track history.
   * Throttled to max once every 10 seconds.
   */
  async savePosition(position: Omit<StoredPosition, 'date'>): Promise<void> {
    if (!this.db) return;
    const now = Date.now();
    if (now - this.lastPositionSave < POSITION_THROTTLE_MS) return;
    this.lastPositionSave = now;

    const record: StoredPosition = {
      ...position,
      date: new Date(position.timestamp).toISOString().slice(0, 10),
    };

    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_POSITIONS, 'readwrite');
      tx.objectStore(STORE_POSITIONS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get position history for a date range.
   */
  async getPositionHistory(from: Date, to: Date): Promise<StoredPosition[]> {
    if (!this.db) return [];

    return new Promise<StoredPosition[]>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_POSITIONS, 'readonly');
      const store = tx.objectStore(STORE_POSITIONS);
      const range = IDBKeyRange.bound(from.getTime(), to.getTime());
      const request = store.getAll(range);
      request.onsuccess = () => resolve(request.result as StoredPosition[]);
      request.onerror = () => reject(request.error);
    });
  }

  // ── Datapoint Store ───────────────────────────────────────────────

  /**
   * Save a datapoint snapshot for playback/trend analysis.
   */
  async saveDatapoint(dp: StoredDatapoint): Promise<void> {
    if (!this.db) return;

    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_DATAPOINTS, 'readwrite');
      tx.objectStore(STORE_DATAPOINTS).put(dp);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get datapoints for a specific path in a time range.
   */
  async getDatapoints(path: string, from: number, to: number): Promise<StoredDatapoint[]> {
    if (!this.db) return [];

    return new Promise<StoredDatapoint[]>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_DATAPOINTS, 'readonly');
      const store = tx.objectStore(STORE_DATAPOINTS);
      const index = store.index('path');
      const range = IDBKeyRange.only(path);
      const request = index.getAll(range);
      request.onsuccess = () => {
        const all = request.result as StoredDatapoint[];
        resolve(all.filter((dp) => dp.timestamp >= from && dp.timestamp <= to));
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Alarm History Store ───────────────────────────────────────────

  /**
   * Record an alarm event for audit trail.
   */
  async saveAlarmEvent(event: Omit<StoredAlarmEvent, 'id'>): Promise<void> {
    if (!this.db) return;

    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_ALARM_HISTORY, 'readwrite');
      tx.objectStore(STORE_ALARM_HISTORY).add(event);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get the full alarm history.
   */
  async getAlarmHistory(): Promise<StoredAlarmEvent[]> {
    if (!this.db) return [];

    return new Promise<StoredAlarmEvent[]>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_ALARM_HISTORY, 'readonly');
      const request = tx.objectStore(STORE_ALARM_HISTORY).getAll();
      request.onsuccess = () => resolve(request.result as StoredAlarmEvent[]);
      request.onerror = () => reject(request.error);
    });
  }

  // ── Maintenance ───────────────────────────────────────────────────

  /**
   * Delete data older than N days.
   */
  async pruneOldData(daysToKeep: number = DEFAULT_PRUNE_DAYS): Promise<{ positions: number; datapoints: number }> {
    if (!this.db) return { positions: 0, datapoints: 0 };

    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    let positions = 0;
    let datapoints = 0;

    // Prune positions
    positions = await this._pruneStore(STORE_POSITIONS, 'timestamp', cutoff);
    // Prune datapoints
    datapoints = await this._pruneStore(STORE_DATAPOINTS, 'timestamp', cutoff);

    return { positions, datapoints };
  }

  /**
   * Clear all stored data.
   */
  async clearAll(): Promise<void> {
    if (!this.db) return;

    const storeNames = [STORE_POSITIONS, STORE_DATAPOINTS, STORE_ALARM_HISTORY];
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        tx.objectStore(name).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Private ───────────────────────────────────────────────────────

  private _openDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Positions store
        if (!db.objectStoreNames.contains(STORE_POSITIONS)) {
          const posStore = db.createObjectStore(STORE_POSITIONS, {
            keyPath: 'timestamp',
          });
          posStore.createIndex('date', 'date', { unique: false });
        }

        // Datapoints store
        if (!db.objectStoreNames.contains(STORE_DATAPOINTS)) {
          const dpStore = db.createObjectStore(STORE_DATAPOINTS, {
            keyPath: ['path', 'timestamp'],
          });
          dpStore.createIndex('path', 'path', { unique: false });
          dpStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Alarm history store
        if (!db.objectStoreNames.contains(STORE_ALARM_HISTORY)) {
          db.createObjectStore(STORE_ALARM_HISTORY, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async _pruneStore(storeName: string, indexName: string, cutoff: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  }
}
