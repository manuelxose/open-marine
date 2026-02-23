import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, of, timeout } from 'rxjs';
import { ChartSettingsService } from '../../features/chart/services/chart-settings.service';
import {
  EnrichmentResult,
  EnrichmentStatus,
  VesselInfo,
  VesselPort,
  countryToFlagEmoji,
  decodeFlagFromMmsi,
  decodeVesselType,
} from './vessel-enrichment.models';
import {
  DEFAULT_VESSEL_ENRICHMENT_CONFIG,
  VESSEL_ENRICHMENT_CONFIG,
} from './vessel-enrichment.providers';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const CACHE_KEY_PREFIX = 'omi-vessel-';
const MIN_REQUEST_INTERVAL_MS = 1000;
const MAX_REQUESTS_PER_HOUR = 50;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const HTTP_TIMEOUT_MS = 8000;
const EXTERNAL_API_BACKOFF_MS = 15 * 60 * 1000;

interface VesselObserverPort {
  port?: unknown;
  name?: unknown;
  country?: unknown;
  arrived?: unknown;
  arrivedAt?: unknown;
  departed?: unknown;
  departedAt?: unknown;
}

interface VesselObserverResponse {
  data?: unknown;
  imo?: unknown;
  imoNumber?: unknown;
  flag?: unknown;
  flagCountry?: unknown;
  shipType?: unknown;
  vesselType?: unknown;
  yearBuild?: unknown;
  yearBuilt?: unknown;
  grossTonnage?: unknown;
  gt?: unknown;
  length?: unknown;
  beam?: unknown;
  photo?: unknown;
  image?: unknown;
  lastPorts?: unknown;
  ports?: unknown;
}

@Injectable({ providedIn: 'root' })
export class VesselEnrichmentService {
  private readonly http = inject(HttpClient);
  private readonly chartSettings = inject(ChartSettingsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly config =
    inject(VESSEL_ENRICHMENT_CONFIG, { optional: true }) ?? DEFAULT_VESSEL_ENRICHMENT_CONFIG;

  private readonly subjects = new Map<string, BehaviorSubject<EnrichmentResult>>();
  private readonly pendingQueue: string[] = [];
  private readonly pendingSet = new Set<string>();

  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private processingQueue = false;
  private lastRequestAt = 0;
  private requestHistory: number[] = [];
  private externalApiBackoffUntil = 0;

  getEnrichedInfo(mmsi: string): Observable<EnrichmentResult> {
    const normalizedMmsi = this.normalizeMmsi(mmsi);
    if (!normalizedMmsi) {
      return of({ status: 'unavailable' as EnrichmentStatus, info: null });
    }

    const subject = this.getOrCreateSubject(normalizedMmsi);

    if (subject.value.status === 'loaded' || subject.value.status === 'loading') {
      return subject.asObservable();
    }

    const cached = this.loadFromCache(normalizedMmsi);
    if (cached) {
      subject.next({ status: 'loaded', info: cached });
      return subject.asObservable();
    }

    if (!this.chartSettings.snapshot.enableVesselEnrichment) {
      subject.next({ status: 'loaded', info: this.buildMinimalFromMmsi(normalizedMmsi) });
      return subject.asObservable();
    }

    subject.next({ status: 'loading', info: null });
    this.enqueueFetch(normalizedMmsi);

    return subject.asObservable();
  }

  prefetchBatch(mmsiList: string[]): void {
    if (!this.chartSettings.snapshot.enableVesselEnrichment) {
      return;
    }

    const uniqueMmsi = Array.from(new Set(mmsiList.map((mmsi) => this.normalizeMmsi(mmsi)).filter(Boolean))) as string[];
    const uncached = uniqueMmsi.filter((mmsi) => !this.loadFromCache(mmsi));

    for (const mmsi of uncached.slice(0, 10)) {
      this.enqueueFetch(mmsi);
    }
  }

  refresh(mmsi: string): void {
    const normalizedMmsi = this.normalizeMmsi(mmsi);
    if (!normalizedMmsi) {
      return;
    }

    this.clearCacheEntry(normalizedMmsi);
    const subject = this.getOrCreateSubject(normalizedMmsi);

    if (!this.chartSettings.snapshot.enableVesselEnrichment) {
      subject.next({ status: 'loaded', info: this.buildMinimalFromMmsi(normalizedMmsi) });
      return;
    }

    subject.next({ status: 'loading', info: null });
    this.enqueueFetch(normalizedMmsi);
  }

  purgeExpiredCache(): void {
    if (!this.isBrowser) {
      return;
    }

    const now = Date.now();
    const keysToDelete: string[] = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) {
        continue;
      }

      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          keysToDelete.push(key);
          continue;
        }

        const info = JSON.parse(raw) as Partial<VesselInfo>;
        if (!info.fetchedAt || now - info.fetchedAt > CACHE_TTL_MS) {
          keysToDelete.push(key);
        }
      } catch {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      localStorage.removeItem(key);
    }
  }

  private getOrCreateSubject(mmsi: string): BehaviorSubject<EnrichmentResult> {
    const existing = this.subjects.get(mmsi);
    if (existing) {
      return existing;
    }

    const created = new BehaviorSubject<EnrichmentResult>({
      status: 'idle',
      info: null,
    });
    this.subjects.set(mmsi, created);
    return created;
  }

  private enqueueFetch(mmsi: string): void {
    if (this.pendingSet.has(mmsi)) {
      return;
    }

    this.pendingQueue.push(mmsi);
    this.pendingSet.add(mmsi);

    if (!this.processingQueue) {
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.pendingQueue.length > 0) {
        const mmsi = this.pendingQueue.shift();
        if (!mmsi) {
          continue;
        }
        this.pendingSet.delete(mmsi);

        const subject = this.getOrCreateSubject(mmsi);

        const cached = this.loadFromCache(mmsi);
        if (cached) {
          subject.next({ status: 'loaded', info: cached });
          continue;
        }

        if (!this.chartSettings.snapshot.enableVesselEnrichment) {
          subject.next({ status: 'loaded', info: this.buildMinimalFromMmsi(mmsi) });
          continue;
        }

        if (subject.value.status !== 'loading') {
          subject.next({ status: 'loading', info: null });
        }

        if (!this.canRequestNow()) {
          const minimal = this.buildMinimalFromMmsi(mmsi);
          this.saveToCache(mmsi, minimal);
          subject.next({
            status: 'loaded',
            info: minimal,
            errorMessage: 'hourly-rate-limit',
          });
          continue;
        }

        if (Date.now() < this.externalApiBackoffUntil) {
          const minimal = this.buildMinimalFromMmsi(mmsi);
          this.saveToCache(mmsi, minimal);
          subject.next({
            status: 'loaded',
            info: minimal,
            errorMessage: 'external-api-backoff',
          });
          continue;
        }

        const waitMs = this.msUntilNextRequest(Date.now());
        if (waitMs > 0) {
          await this.delay(waitMs);
        }

        const requestAt = Date.now();
        this.lastRequestAt = requestAt;
        this.requestHistory.push(requestAt);

        try {
          const enriched = await this.fetchFromApi(mmsi);
          this.externalApiBackoffUntil = 0;
          this.saveToCache(mmsi, enriched);
          subject.next({ status: 'loaded', info: enriched });
        } catch {
          this.externalApiBackoffUntil = Date.now() + EXTERNAL_API_BACKOFF_MS;
          const minimal = this.buildMinimalFromMmsi(mmsi);
          this.saveToCache(mmsi, minimal);
          subject.next({ status: 'loaded', info: minimal });
        }
      }
    } finally {
      this.processingQueue = false;
      if (this.pendingQueue.length > 0) {
        void this.processQueue();
      }
    }
  }

  private async fetchFromApi(mmsi: string): Promise<VesselInfo> {
    const url = this.buildProviderUrl(mmsi);
    const response = await firstValueFrom(
      this.http.get<VesselObserverResponse>(url).pipe(timeout(HTTP_TIMEOUT_MS)),
    );

    return this.mapApiResponse(mmsi, response);
  }

  private mapApiResponse(mmsi: string, rawResponse: VesselObserverResponse): VesselInfo {
    const response = this.unwrapDataObject(rawResponse);
    const fallbackFlag = decodeFlagFromMmsi(mmsi);
    const responseFlag = this.resolveFlagCountry(response);
    const flagCountry = responseFlag ?? fallbackFlag?.country;

    const info: VesselInfo = {
      mmsi,
      fetchedAt: Date.now(),
      source: 'vessel-observer',
      externalUrl: this.buildExternalUrl(mmsi),
    };

    if (flagCountry) {
      info.flagCountry = flagCountry;
      info.flagEmoji = countryToFlagEmoji(flagCountry);
    } else if (fallbackFlag?.emoji) {
      info.flagEmoji = fallbackFlag.emoji;
    }

    const imo = this.asString(response.imo) ?? this.asString(response.imoNumber);
    if (imo) {
      info.imoNumber = imo;
    }

    const shipType = response.shipType ?? response.vesselType;
    if (shipType !== undefined && shipType !== null) {
      info.vesselTypeDescription = decodeVesselType(shipType as number | string);
    }

    const yearBuilt = this.asInteger(response.yearBuild) ?? this.asInteger(response.yearBuilt);
    if (yearBuilt) {
      info.yearBuilt = yearBuilt;
    }

    const grossTonnage = this.asInteger(response.grossTonnage) ?? this.asInteger(response.gt);
    if (grossTonnage) {
      info.grossTonnage = grossTonnage;
    }

    const length = this.asNumber(response.length);
    if (length) {
      info.length = length;
    }

    const beam = this.asNumber(response.beam);
    if (beam) {
      info.beam = beam;
    }

    const photoUrl = this.asString(response.photo) ?? this.asString(response.image);
    if (photoUrl) {
      info.photoUrl = photoUrl;
    }

    const lastPorts = this.resolvePorts(response);
    if (lastPorts.length > 0) {
      info.lastPorts = lastPorts;
    }

    return info;
  }

  private buildMinimalFromMmsi(mmsi: string): VesselInfo {
    const flag = decodeFlagFromMmsi(mmsi);
    const info: VesselInfo = {
      mmsi,
      fetchedAt: Date.now(),
      source: 'mmsi-decode',
      externalUrl: this.buildExternalUrl(mmsi),
    };

    if (flag?.country) {
      info.flagCountry = flag.country;
    }
    if (flag?.emoji) {
      info.flagEmoji = flag.emoji;
    }

    return info;
  }

  private loadFromCache(mmsi: string): VesselInfo | null {
    if (!this.isBrowser) {
      return null;
    }

    const key = `${CACHE_KEY_PREFIX}${mmsi}`;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const info = JSON.parse(raw) as Partial<VesselInfo>;
      if (!info || typeof info.fetchedAt !== 'number') {
        localStorage.removeItem(key);
        return null;
      }

      if (Date.now() - info.fetchedAt > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }

      return info as VesselInfo;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  private saveToCache(mmsi: string, info: VesselInfo): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      if (this.countCacheEntries() >= CACHE_MAX_ENTRIES) {
        this.evictOldestCacheEntries(20);
      }
      localStorage.setItem(`${CACHE_KEY_PREFIX}${mmsi}`, JSON.stringify(info));
    } catch {
      // Ignore quota and serialization errors on cache writes.
    }
  }

  private clearCacheEntry(mmsi: string): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${mmsi}`);
  }

  private evictOldestCacheEntries(count: number): void {
    if (!this.isBrowser) {
      return;
    }

    const entries: Array<{ key: string; fetchedAt: number }> = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) {
        continue;
      }

      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          continue;
        }
        const parsed = JSON.parse(raw) as Partial<VesselInfo>;
        if (typeof parsed.fetchedAt === 'number') {
          entries.push({ key, fetchedAt: parsed.fetchedAt });
        }
      } catch {
        // Ignore corrupted entries while sorting eviction candidates.
      }
    }

    entries
      .sort((left, right) => left.fetchedAt - right.fetchedAt)
      .slice(0, count)
      .forEach((entry) => localStorage.removeItem(entry.key));
  }

  private countCacheEntries(): number {
    if (!this.isBrowser) {
      return 0;
    }

    let count = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        count += 1;
      }
    }
    return count;
  }

  private normalizeMmsi(mmsi: string): string {
    return typeof mmsi === 'string' ? mmsi.trim() : '';
  }

  private buildExternalUrl(mmsi: string): string {
    const base = this.config.externalDetailsBaseUrl.replace(/\/+$/, '');
    return `${base}/mmsi:${encodeURIComponent(mmsi)}`;
  }

  private buildProviderUrl(mmsi: string): string {
    const raw = this.config.vesselObserverBaseUrl.trim();
    if (raw.length === 0) {
      throw new Error('Missing vessel enrichment provider URL');
    }

    const encodedMmsi = encodeURIComponent(mmsi);
    if (raw.includes('{mmsi}')) {
      return raw.replaceAll('{mmsi}', encodedMmsi);
    }

    if (raw.includes('?')) {
      return `${raw}&mmsi=${encodedMmsi}`;
    }

    const normalized = raw.replace(/\/+$/, '');
    return `${normalized}/${encodedMmsi}`;
  }

  private canRequestNow(): boolean {
    const cutoff = Date.now() - REQUEST_WINDOW_MS;
    this.requestHistory = this.requestHistory.filter((timestamp) => timestamp > cutoff);
    return this.requestHistory.length < MAX_REQUESTS_PER_HOUR;
  }

  private msUntilNextRequest(now: number): number {
    const elapsed = now - this.lastRequestAt;
    return elapsed >= MIN_REQUEST_INTERVAL_MS ? 0 : MIN_REQUEST_INTERVAL_MS - elapsed;
  }

  private resolveFlagCountry(response: VesselObserverResponse): string | undefined {
    const direct = this.normalizeIsoCode(this.asString(response.flagCountry));
    if (direct) {
      return direct;
    }

    const flag = response.flag;
    if (typeof flag === 'string') {
      return this.normalizeIsoCode(flag);
    }

    if (!flag || typeof flag !== 'object') {
      return undefined;
    }

    const record = flag as Record<string, unknown>;
    return this.normalizeIsoCode(
      this.asString(record['code']) ??
      this.asString(record['iso2']) ??
      this.asString(record['countryCode']) ??
      this.asString(record['country']),
    );
  }

  private resolvePorts(response: VesselObserverResponse): VesselPort[] {
    const source = response.lastPorts ?? response.ports;
    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .slice(0, 3)
      .map((port): VesselObserverPort => (typeof port === 'object' && port ? (port as VesselObserverPort) : {}))
      .map((port) => {
        const mapped: VesselPort = {
          portName: this.asString(port.port) ?? this.asString(port.name) ?? 'Unknown Port',
        };

        const country = this.asString(port.country);
        if (country) {
          mapped.country = country;
        }

        const arrivedAt = this.asString(port.arrived) ?? this.asString(port.arrivedAt);
        if (arrivedAt) {
          mapped.arrivedAt = arrivedAt;
        }

        const departedAt = this.asString(port.departed) ?? this.asString(port.departedAt);
        if (departedAt) {
          mapped.departedAt = departedAt;
        }

        return mapped;
      });
  }

  private unwrapDataObject(response: VesselObserverResponse): VesselObserverResponse {
    if (!response || typeof response !== 'object') {
      return {};
    }

    const embedded = response.data;
    if (embedded && typeof embedded === 'object') {
      return embedded as VesselObserverResponse;
    }
    return response;
  }

  private asString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return undefined;
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private asInteger(value: unknown): number | undefined {
    const numberValue = this.asNumber(value);
    if (numberValue === undefined) {
      return undefined;
    }
    const intValue = Math.round(numberValue);
    return Number.isFinite(intValue) ? intValue : undefined;
  }

  private normalizeIsoCode(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
