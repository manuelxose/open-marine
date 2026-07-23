import { Injectable, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { BehaviorSubject, retry, tap, bufferTime, map, filter, Subscription } from 'rxjs';
import { APP_ENVIRONMENT, AppEnvironment } from '../../core/config/app-environment.token';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import type { DataPoint } from '../../state/datapoints/datapoint.models';
import { AisStoreService } from '../../state/ais/ais-store.service';
import { AisClass, AisNavStatus, AisTarget } from '../../core/models/ais.model';
import { normalizeDelta } from './signalk-mapper';
import { NormalizedDataPoint, SignalKHelloMessage, SignalKMessage } from './signalk-message.types';

const AIS_STATE_ALIAS: Record<string, AisNavStatus> = {
  underway: AisNavStatus.UnderWayUsingEngine,
  underwayusingengine: AisNavStatus.UnderWayUsingEngine,
  underwaysailing: AisNavStatus.UnderWaySailing,
  sailing: AisNavStatus.UnderWaySailing,
  atanchor: AisNavStatus.AtAnchor,
  anchor: AisNavStatus.AtAnchor,
  moored: AisNavStatus.Moored,
  aground: AisNavStatus.Aground,
  fishing: AisNavStatus.EngagedInFishing,
  engagedinfishing: AisNavStatus.EngagedInFishing,
  notundercommand: AisNavStatus.NotUnderCommand,
  nuc: AisNavStatus.NotUnderCommand,
  restrictedmaneuverability: AisNavStatus.RestrictedManeuverability,
  restrictedmanoeuverability: AisNavStatus.RestrictedManeuverability,
  constrainedbydraft: AisNavStatus.ConstrainedByDraft,
  aissart: AisNavStatus.AISSART,
  sart: AisNavStatus.AISSART,
  notdefined: AisNavStatus.NotDefined,
  unknown: AisNavStatus.NotDefined,
};

@Injectable({
  providedIn: 'root',
})
export class SignalKClientService implements OnDestroy {
  private socket$: WebSocketSubject<SignalKMessage> | null = null;
  private connectionSubscription: Subscription | null = null;
  private selfContext: string | null = null;
  private connectedUrl: string | null = null;

  // Connection State
  private _connected = new BehaviorSubject<boolean>(false);
  public connected$ = this._connected.asObservable();

  constructor(
    @Inject(APP_ENVIRONMENT) private env: AppEnvironment,
    @Inject(PLATFORM_ID) private platformId: object,
    private store: DatapointStoreService,
    private aisStore: AisStoreService,
  ) {}

  public connect(wsUrl?: string): void {
    if (!isPlatformBrowser(this.platformId)) return; // Don't connect in SSR

    const url = wsUrl ?? this.env.signalKWsUrl;
    if (this.socket$) {
      if (this.connectedUrl === url) return;
      this.disconnect();
    }
    console.log(`Connecting to Signal K WS at ${url}`);
    this.connectedUrl = url;

    this.socket$ = webSocket<SignalKMessage>({
      url,
      openObserver: {
        next: () => {
          console.log('Signal K WS Connected');
          this._connected.next(true);
          void this.seedInitialSelfSnapshot(url);
        },
      },
      closeObserver: {
        next: () => {
          console.log('Signal K WS Closed');
          this._connected.next(false);
          this.socket$ = null; // Allow reconnect
          this.connectedUrl = null;
        },
      },
    });

    // Main subscription
    this.connectionSubscription = this.socket$
      .pipe(
        tap((msg) => this.captureSelfContext(msg)),
        retry({ delay: 3000 }), // Simple retry logic
        map((msg: SignalKMessage) => normalizeDelta(msg)),
        filter((points) => points.length > 0),
        // Buffer updates to batch writes to store ~10 times a second
        bufferTime(100),
        filter((buffer) => buffer.length > 0),
      )
      .subscribe({
        next: (bufferOfArrays: NormalizedDataPoint[][]) => {
          // Flatten
          const allPoints = bufferOfArrays.flat();

          const uniqueSelfUpdates = new Map<string, NormalizedDataPoint>();

          for (const p of allPoints) {
            // Self check
            if (this.isSelfContext(p.context)) {
              // Ignore aggregate snapshots for self ("") - datapoint store is path-based.
              if (p.path) {
                uniqueSelfUpdates.set(p.path, p);
              }
            }
            // AIS check
            else if (p.context && p.context.startsWith('vessels.')) {
              this.processAisUpdate(p);
            }
          }

          if (uniqueSelfUpdates.size > 0) {
            this.store.update(Array.from(uniqueSelfUpdates.values()));
          }
        },
        error: (err) => console.error('WS Error', err),
      });
  }

  private async seedInitialSelfSnapshot(wsUrl: string): Promise<void> {
    try {
      const apiUrl = this.selfSnapshotUrlFromWs(wsUrl);
      const response = await fetch(apiUrl, { method: 'GET' });
      if (!response.ok) return;
      const snapshot = await response.json() as Record<string, unknown>;
      const points = this.flattenSignalKSnapshot(snapshot);
      if (points.length > 0) {
        this.store.update(points);
      }
    } catch (err) {
      console.debug('Initial Signal K self snapshot unavailable', err);
    }
  }

  private selfSnapshotUrlFromWs(wsUrl: string): string {
    const url = new URL(wsUrl);
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/\/stream\/?$/, '/api/vessels/self');
    return url.toString();
  }

  private flattenSignalKSnapshot(snapshot: Record<string, unknown>): DataPoint[] {
    const points: DataPoint[] = [];
    this.collectSnapshotPoints(snapshot, '', points);
    return points;
  }

  private collectSnapshotPoints(node: unknown, prefix: string, points: DataPoint[]): void {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const record = node as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(record, 'value') && prefix) {
      const timestampValue = record['timestamp'];
      const timestamp = typeof timestampValue === 'string' ? Date.parse(timestampValue) : Date.now();
      const sourceValue = record['$source'];
      points.push({
        path: prefix,
        value: record['value'],
        timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
        source: typeof sourceValue === 'string' ? sourceValue : 'signalk-rest',
      });
      return;
    }

    for (const [key, value] of Object.entries(record)) {
      if (key === 'meta' || key === '$source' || key === 'timestamp' || key === 'uuid') continue;
      this.collectSnapshotPoints(value, prefix ? `${prefix}.${key}` : key, points);
    }
  }

  private processAisUpdate(point: NormalizedDataPoint): void {
    if (!point.context) return;
    if (this.isSelfContext(point.context)) return;

    const mmsi = this.extractMmsi(point.context);
    if (!mmsi) return;

    const data = this.mapAisPointToTarget(point.path, point.value);
    if (Object.keys(data).length > 0) {
      this.aisStore.updateTarget(mmsi, data, point.timestamp);
    }
  }

  private extractMmsi(context: string): string | null {
    const candidate = context.startsWith('vessels.') ? context.slice('vessels.'.length) : context;

    const exact = candidate.match(/^\d{9}$/)?.[0];
    if (exact) {
      return exact;
    }

    const embedded = candidate.match(/\b\d{9}\b/)?.[0];
    return embedded ?? null;
  }

  private mapAisPointToTarget(path: string, value: unknown): Partial<AisTarget> {
    const data: Partial<AisTarget> = {};

    switch (path) {
      case '': {
        this.fillFromAggregateSnapshot(this.asRecord(value), data);
        break;
      }
      case 'navigation.position': {
        const position = this.parsePosition(value);
        if (position) {
          data.latitude = position.latitude;
          data.longitude = position.longitude;
        }
        break;
      }
      case 'navigation.speedOverGround': {
        const sog = this.extractNumber(value);
        if (sog !== undefined) data.sog = sog;
        break;
      }
      case 'navigation.courseOverGroundTrue':
      case 'navigation.courseOverGroundMagnetic': {
        const cog = this.extractNumber(value);
        if (cog !== undefined) data.cog = cog;
        break;
      }
      case 'navigation.headingTrue':
      case 'navigation.headingMagnetic': {
        const heading = this.extractNumber(value);
        if (heading !== undefined) data.heading = heading;
        break;
      }
      case 'navigation.rateOfTurn': {
        const rot = this.extractNumber(value);
        if (rot !== undefined) data.rot = rot;
        break;
      }
      case 'navigation.state': {
        const state = this.parseAisState(value);
        if (state !== undefined) data.state = state;
        break;
      }
      case 'name': {
        const name = this.extractString(value);
        if (name !== undefined) data.name = name;
        break;
      }
      case 'communication.callsignVhf':
      case 'communication.callsignHf':
      case 'communication.callsign': {
        const callsign = this.extractString(value);
        if (callsign !== undefined) data.callsign = callsign;
        break;
      }
      case 'navigation.destination': {
        const destination = this.parseDestination(value);
        if (destination !== undefined) data.destination = destination;
        break;
      }
      case 'navigation.destination.commonName':
      case 'navigation.destination.name':
      case 'navigation.destination.id':
      case 'navigation.destination.value': {
        const destination = this.parseDestination(value);
        if (destination !== undefined) data.destination = destination;
        break;
      }
      case 'design.length': {
        const length = this.extractNumber(value, ['overall', 'value', 'meters', 'm']);
        if (length !== undefined) data.length = length;
        break;
      }
      case 'design.beam': {
        const beam = this.extractNumber(value, ['overall', 'value', 'meters', 'm']);
        if (beam !== undefined) data.beam = beam;
        break;
      }
      case 'design.draft': {
        const draft = this.extractNumber(value, ['current', 'value', 'maximum', 'meters', 'm']);
        if (draft !== undefined) data.draft = draft;
        break;
      }
      case 'design.aisShipType':
      case 'design.aisShipType.name':
      case 'design.aisShipType.id':
      case 'design.vesselType':
      case 'design.type': {
        const vesselType = this.parseVesselType(value);
        if (vesselType !== undefined) data.vesselType = vesselType;
        break;
      }
      case 'sensors.ais.class':
      case 'design.aisClass':
      case 'communication.netAIS.class': {
        const vesselClass = this.parseAisClass(value);
        if (vesselClass !== undefined) data.class = vesselClass;
        break;
      }
      case 'registrations.imo':
      case 'registrations.imoNumber':
      case 'registrations.imo.number': {
        const imo = this.parseImo(value);
        if (imo !== undefined) data.imo = imo;
        break;
      }
    }

    return data;
  }

  private fillFromAggregateSnapshot(
    snapshot: Record<string, unknown> | null,
    data: Partial<AisTarget>,
  ): void {
    if (!snapshot) {
      return;
    }

    const name = this.extractString(snapshot['name']);
    if (name !== undefined) data.name = name;

    const communication = this.asRecord(snapshot['communication']);
    const callsign =
      this.extractString(communication?.['callsignVhf']) ??
      this.extractString(communication?.['callsignHf']) ??
      this.extractString(communication?.['callsign']);
    if (callsign !== undefined) data.callsign = callsign;

    const navigation = this.asRecord(snapshot['navigation']);
    const position = this.parsePosition(navigation?.['position']);
    if (position) {
      data.latitude = position.latitude;
      data.longitude = position.longitude;
    }

    const sog = this.extractNumber(navigation?.['speedOverGround']);
    if (sog !== undefined) data.sog = sog;

    const cog =
      this.extractNumber(navigation?.['courseOverGroundTrue']) ??
      this.extractNumber(navigation?.['courseOverGroundMagnetic']);
    if (cog !== undefined) data.cog = cog;

    const heading =
      this.extractNumber(navigation?.['headingTrue']) ??
      this.extractNumber(navigation?.['headingMagnetic']);
    if (heading !== undefined) data.heading = heading;

    const rot = this.extractNumber(navigation?.['rateOfTurn']);
    if (rot !== undefined) data.rot = rot;

    const state = this.parseAisState(navigation?.['state']);
    if (state !== undefined) data.state = state;

    const destination = this.parseDestination(navigation?.['destination']);
    if (destination !== undefined) data.destination = destination;

    const registrations = this.asRecord(snapshot['registrations']);
    const imo =
      this.parseImo(registrations?.['imo']) ?? this.parseImo(registrations?.['imoNumber']);
    if (imo !== undefined) data.imo = imo;

    const design = this.asRecord(snapshot['design']);
    const length = this.extractNumber(design?.['length'], ['overall', 'value', 'meters', 'm']);
    if (length !== undefined) data.length = length;

    const beam = this.extractNumber(design?.['beam'], ['overall', 'value', 'meters', 'm']);
    if (beam !== undefined) data.beam = beam;

    const draft = this.extractNumber(design?.['draft'], [
      'current',
      'value',
      'maximum',
      'meters',
      'm',
    ]);
    if (draft !== undefined) data.draft = draft;

    const vesselType =
      this.parseVesselType(design?.['aisShipType']) ??
      this.parseVesselType(design?.['vesselType']) ??
      this.parseVesselType(design?.['type']);
    if (vesselType !== undefined) data.vesselType = vesselType;

    const sensors = this.asRecord(snapshot['sensors']);
    const aisSensor = this.asRecord(sensors?.['ais']);
    const vesselClass =
      this.parseAisClass(aisSensor?.['class']) ?? this.parseAisClass(design?.['aisClass']);
    if (vesselClass !== undefined) data.class = vesselClass;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private parsePosition(value: unknown): { latitude: number; longitude: number } | null {
    const record = this.asRecord(value);
    if (!record) return null;

    const latitude = this.extractNumber(record['latitude']);
    const longitude = this.extractNumber(record['longitude']);
    if (latitude === undefined || longitude === undefined) {
      return null;
    }

    return { latitude, longitude };
  }

  private extractString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const cleaned = value.trim();
    if (
      !cleaned ||
      cleaned === '--' ||
      cleaned.toLowerCase() === 'unknown' ||
      cleaned.toLowerCase() === 'n/a'
    ) {
      return undefined;
    }

    return cleaned;
  }

  private extractNumber(value: unknown, objectKeys: string[] = ['value']): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    const record = this.asRecord(value);
    if (!record) {
      return undefined;
    }

    for (const key of objectKeys) {
      const nested = this.extractNumber(record[key]);
      if (nested !== undefined) {
        return nested;
      }
    }

    return undefined;
  }

  private parseDestination(value: unknown): string | undefined {
    const asText = this.extractString(value);
    if (asText !== undefined) {
      return this.normalizeDestinationText(asText);
    }

    const record = this.asRecord(value);
    if (!record) {
      return undefined;
    }

    const parsed =
      this.extractString(record['commonName']) ??
      this.extractString(record['name']) ??
      this.extractString(record['id']) ??
      this.extractString(record['value']);
    return parsed ? this.normalizeDestinationText(parsed) : undefined;
  }

  private parseAisState(value: unknown): AisNavStatus | undefined {
    const numeric = this.extractNumber(value);
    if (numeric !== undefined) {
      const status = Math.trunc(numeric);
      if (status >= AisNavStatus.UnderWayUsingEngine && status <= AisNavStatus.NotDefined) {
        return status as AisNavStatus;
      }
    }

    const text = this.extractString(value);
    if (!text) {
      return undefined;
    }

    const normalized = text.toLowerCase().replace(/[\s_-]/g, '');
    return AIS_STATE_ALIAS[normalized];
  }

  private parseAisClass(value: unknown): AisClass | undefined {
    const text = this.extractString(value);
    if (text) {
      const normalized = text.toLowerCase().replace(/[\s_-]/g, '');
      if (normalized === 'a' || normalized === 'classa') return AisClass.A;
      if (normalized === 'b' || normalized === 'classb') return AisClass.B;
      if (
        normalized === 'base' ||
        normalized === 'basestation' ||
        normalized === 'shorestation' ||
        normalized === 'coaststation'
      )
        return AisClass.BaseStation;
      if (
        normalized === 'aton' ||
        normalized === 'aidtonavigation' ||
        normalized === 'navigationaid'
      )
        return AisClass.AtoN;
      if (normalized === 'sart' || normalized === 'aissart') return AisClass.SART;
    }

    const record = this.asRecord(value);
    if (record) {
      return this.parseAisClass(record['name'] ?? record['value'] ?? record['id']);
    }

    return undefined;
  }

  private parseVesselType(value: unknown): string | undefined {
    const text = this.extractString(value);
    if (text !== undefined) {
      return text;
    }

    const record = this.asRecord(value);
    if (record) {
      const fromRecord =
        this.extractString(record['name']) ?? this.extractString(record['description']);
      if (fromRecord !== undefined) {
        return fromRecord;
      }
    }

    const numeric = this.extractNumber(value, ['id', 'value']);
    if (numeric !== undefined) {
      const label = this.aisShipTypeLabel(Math.trunc(numeric));
      return label ?? undefined;
    }

    if (!record) {
      return undefined;
    }

    return this.parseVesselType(record['id']) ?? this.parseVesselType(record['value']);
  }

  private parseImo(value: unknown): string | undefined {
    const text = this.extractString(value);
    if (text !== undefined) {
      const directDigits = text.match(/\b\d{7}\b/)?.[0];
      if (directDigits) {
        return directDigits;
      }

      const normalized = text.replace(/^IMO\s*/i, '').trim();
      if (/^\d{7}$/.test(normalized)) {
        return normalized;
      }
    }

    const numeric = this.extractNumber(value, ['number', 'value', 'id', 'imo']);
    if (numeric !== undefined) {
      const imo = Math.trunc(numeric);
      return imo > 0 ? String(imo) : undefined;
    }

    const record = this.asRecord(value);
    if (!record) {
      return undefined;
    }

    return this.parseImo(record['number'] ?? record['value'] ?? record['id'] ?? record['imo']);
  }

  private normalizeDestinationText(raw: string): string {
    const cleaned = raw.trim().replace(/\s*[-/]\s*/g, ', ');
    if (!cleaned) {
      return raw;
    }

    if (cleaned === cleaned.toUpperCase() && /[,\s]/.test(cleaned)) {
      return cleaned.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return cleaned;
  }

  private aisShipTypeLabel(code: number): string | null {
    if (!Number.isFinite(code) || code <= 0) return null;

    if (code >= 70 && code <= 79) return 'Cargo';
    if (code >= 80 && code <= 89) return 'Tanker';
    if (code >= 90 && code <= 99) return 'Other';
    if (code >= 60 && code <= 69) return 'Passenger';
    if (code >= 40 && code <= 49) return 'High Speed Craft';
    if (code >= 50 && code <= 59) return 'Special Craft';

    switch (code) {
      case 30:
        return 'Fishing';
      case 31:
        return 'Towing';
      case 32:
        return 'Towing (Long)';
      case 33:
        return 'Dredging';
      case 34:
        return 'Diving Ops';
      case 35:
        return 'Military';
      case 36:
        return 'Sailing';
      case 37:
        return 'Pleasure Craft';
      default:
        return `Type ${code}`;
    }
  }

  public disconnect(): void {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
      this.connectionSubscription = null;
    }
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    this.connectedUrl = null;
    this._connected.next(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private captureSelfContext(msg: SignalKMessage): void {
    if (!msg || typeof msg !== 'object') return;
    const hello = msg as SignalKHelloMessage;
    const self = hello.self ?? hello.contexts?.['self'];
    if (self && self !== this.selfContext) {
      this.selfContext = self;
      console.log(`[SignalK] self context: ${self}`);
    }
  }

  private isSelfContext(context?: string): boolean {
    if (!context || context === 'self' || context === 'vessels.self') {
      return true;
    }
    return !!this.selfContext && context === this.selfContext;
  }
}
