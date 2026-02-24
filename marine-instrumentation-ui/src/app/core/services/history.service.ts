import { Injectable } from '@angular/core';
import { HistoryPoint } from '../../state/datapoints/datapoint.models';

interface HistoryRecord extends HistoryPoint {
  path: string;
  source?: string;
}

type HistoryStoreName = 'history';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private readonly dbName = 'omi-history';
  private readonly dbVersion = 1;
  private readonly storeName: HistoryStoreName = 'history';
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryStore = new Map<string, HistoryPoint[]>();

  async addPoint(path: string, point: HistoryPoint, source?: string): Promise<void> {
    return this.addPoints(path, [point], source);
  }

  async addPoints(path: string, points: HistoryPoint[], source?: string): Promise<void> {
    if (!points.length) return;
    const db = await this.openDb();
    if (!db) {
      this.addPointsMemory(path, points);
      return;
    }

    await this.withStore(db, 'readwrite', (store) => {
      for (const point of points) {
        const record: HistoryRecord = {
          path,
          timestamp: point.timestamp,
          value: point.value,
        };
        if (source !== undefined) {
          record.source = source;
        }
        store.put(record);
      }
    });
  }

  async getRange(path: string, from: number, to: number): Promise<HistoryPoint[]> {
    const db = await this.openDb();
    if (!db) {
      return this.getRangeMemory(path, from, to);
    }

    const results: HistoryPoint[] = [];
    const range = IDBKeyRange.bound([path, from], [path, to]);
    await this.withStore(db, 'readonly', (store) => {
      const request = store.openCursor(range);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const value = cursor.value as HistoryRecord;
        results.push({ timestamp: value.timestamp, value: value.value });
        cursor.continue();
      };
    });
    return results;
  }

  async getLatest(path: string, limit = 100): Promise<HistoryPoint[]> {
    const db = await this.openDb();
    if (!db) {
      return this.getLatestMemory(path, limit);
    }

    const results: HistoryPoint[] = [];
    const range = IDBKeyRange.bound([path, 0], [path, Number.MAX_SAFE_INTEGER]);
    await this.withStore(db, 'readonly', (store) => {
      const request = store.openCursor(range, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || results.length >= limit) return;
        const value = cursor.value as HistoryRecord;
        results.push({ timestamp: value.timestamp, value: value.value });
        cursor.continue();
      };
    });
    return results.reverse();
  }

  async clearPath(path: string): Promise<void> {
    const db = await this.openDb();
    if (!db) {
      this.memoryStore.delete(path);
      return;
    }

    await this.withStore(db, 'readwrite', (store) => {
      const index = store.index('byPath');
      const request = index.openKeyCursor(IDBKeyRange.only(path));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
    });
  }

  async clearBefore(timestamp: number): Promise<void> {
    const db = await this.openDb();
    if (!db) {
      for (const [path, points] of this.memoryStore.entries()) {
        this.memoryStore.set(
          path,
          points.filter((point) => point.timestamp >= timestamp),
        );
      }
      return;
    }

    await this.withStore(db, 'readwrite', (store) => {
      const index = store.index('byTimestamp');
      const request = index.openKeyCursor(IDBKeyRange.upperBound(timestamp));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
    });
  }

  private addPointsMemory(path: string, points: HistoryPoint[]): void {
    const current = this.memoryStore.get(path) ?? [];
    const next = current.concat(points).sort((a, b) => a.timestamp - b.timestamp);
    this.memoryStore.set(path, next);
  }

  private getRangeMemory(path: string, from: number, to: number): HistoryPoint[] {
    const current = this.memoryStore.get(path) ?? [];
    return current.filter((point) => point.timestamp >= from && point.timestamp <= to);
  }

  private getLatestMemory(path: string, limit: number): HistoryPoint[] {
    const current = this.memoryStore.get(path) ?? [];
    return current.slice(-limit);
  }

  private async openDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (!('indexedDB' in window)) {
      return null;
    }

    this.dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: ['path', 'timestamp'],
          });
          store.createIndex('byPath', 'path', { unique: false });
          store.createIndex('byTimestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Failed to open history database', request.error);
        resolve(null);
      };
      request.onblocked = () => {
        console.warn('History database upgrade blocked');
      };
    });

    return this.dbPromise;
  }

  private withStore(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      run(store);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
