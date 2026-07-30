import { Injectable, NgZone, computed, signal } from '@angular/core';
import { AisTarget, AisTrackPoint, inferAisClassFromMmsi } from '../../core/models/ais.model';
import { calculateCpa } from '../../core/calculations/cpa';
import { DatapointStoreService } from '../datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { auditTime, combineLatest, filter, startWith } from 'rxjs';
import { AlarmSettingsService } from '../alarms/alarm-settings.service';

const CPA_WARNING_METERS = 1852; // 1 NM
const TCPA_WARNING_SECONDS = 20 * 60; // 20 Minutes

@Injectable({
  providedIn: 'root'
})
export class AisStoreService {
  // Authoritative live map, mutated synchronously on every incoming AIS field.
  private readonly _live = new Map<string, AisTarget>();
  // Published snapshot for UI consumption; updated in coalesced flushes.
  private _targets = signal<Map<string, AisTarget>>(new Map());
  private readonly _trackBuffer = new Map<string, AisTrackPoint[]>();

  // Coalesce signal emissions: AIS bursts (many fields/vessels per message) would
  // otherwise clone the map and trigger change detection per field.
  private flushScheduled = false;
  private readonly FLUSH_INTERVAL_MS = 250;
  
  // Public signal for UI consumption
  public readonly targets = this._targets.asReadonly();
  
  // Computed values
  public readonly targetCount = computed(() => this._targets().size);
  public readonly dangerousTargets = computed(() => {
    const dangerous: AisTarget[] = [];
    for (const t of this._targets().values()) {
      if (t.isDangerous) dangerous.push(t);
    }
    return dangerous;
  });

  getTrackPoints(mmsi: string): AisTrackPoint[] {
    return this._trackBuffer.get(mmsi) ?? [];
  }

  getAllTracks(): Map<string, AisTrackPoint[]> {
    return this._trackBuffer;
  }

  // Constants
  private readonly TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (Class B is slower)
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // Clean every minute
  private readonly TRACK_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
  private readonly TRACK_MIN_DISTANCE_M = 10;
  private readonly TRACK_MAX_SAMPLE_INTERVAL_MS = 30 * 1000;
  private readonly TRACK_MAX_POINTS_PER_TARGET = 120;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  
  constructor(
    private datapointStore: DatapointStoreService,
    private alarmSettings: AlarmSettingsService,
    private zone: NgZone,
  ) {
    this.scheduleCleanup();

    // Keep risk assessment tied to own-ship motion too (not only target updates).
    this.bindOwnShipRiskUpdates();
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.cleanupTimer = setTimeout(() => {
        this.cleanupTimer = null;
        this.cleanupStaleTargets();
        this.scheduleCleanup();
      }, this.CLEANUP_INTERVAL_MS);
    });
  }

  /**
   * Updates or creates a target from partial data.
   * @param mmsi The MMSI identifier
   * @param data Partial data received from Signal K
   */
  updateTarget(mmsi: string, data: Partial<AisTarget>, timestamp: number = Date.now()): void {
    const existing = this._live.get(mmsi);

    let updated: AisTarget = {
      mmsi,
      lastUpdated: timestamp,
      // Persist existing data
      latitude: data.latitude ?? existing?.latitude ?? 0,
      longitude: data.longitude ?? existing?.longitude ?? 0,
    };

    const name = data.name ?? existing?.name;
    if (name !== undefined) updated.name = name;
    const callsign = data.callsign ?? existing?.callsign;
    if (callsign !== undefined) updated.callsign = callsign;
    const sog = data.sog ?? existing?.sog;
    if (sog !== undefined) updated.sog = sog;
    const cog = data.cog ?? existing?.cog;
    if (cog !== undefined) updated.cog = cog;
    const heading = data.heading ?? existing?.heading;
    if (heading !== undefined) updated.heading = heading;
    const rot = data.rot ?? existing?.rot;
    if (rot !== undefined) updated.rot = rot;
    const state = data.state ?? existing?.state;
    if (state !== undefined) updated.state = state;
    const vesselClass = data.class ?? existing?.class ?? inferAisClassFromMmsi(mmsi);
    if (vesselClass !== undefined) updated.class = vesselClass;
    const destination = data.destination ?? existing?.destination;
    if (destination !== undefined) updated.destination = destination;
    const imo = data.imo ?? existing?.imo;
    if (imo !== undefined) updated.imo = imo;
    const vesselType = data.vesselType ?? existing?.vesselType;
    if (vesselType !== undefined) updated.vesselType = vesselType;
    const length = data.length ?? existing?.length;
    if (length !== undefined) updated.length = length;
    const beam = data.beam ?? existing?.beam;
    if (beam !== undefined) updated.beam = beam;
    const draft = data.draft ?? existing?.draft;
    if (draft !== undefined) updated.draft = draft;
    const cpa = existing?.cpa;
    if (cpa !== undefined) updated.cpa = cpa;
    const tcpa = existing?.tcpa;
    if (tcpa !== undefined) updated.tcpa = tcpa;
    const isDangerous = existing?.isDangerous;
    if (isDangerous !== undefined) updated.isDangerous = isDangerous;
    const riskEligible = existing?.riskEligible;
    if (riskEligible !== undefined) updated.riskEligible = riskEligible;

    // Calculate CPA if we have relevant data
    if ((data.latitude !== undefined && data.longitude !== undefined) || 
        (data.sog !== undefined && data.cog !== undefined)) {
        updated = this.calculateRisk(updated);
    }

    this._live.set(mmsi, updated);

    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      Number.isFinite(updated.latitude) &&
      Number.isFinite(updated.longitude)
    ) {
      const trackPoint: AisTrackPoint = {
        latitude: updated.latitude,
        longitude: updated.longitude,
        timestamp,
        ...(typeof updated.sog === 'number' && Number.isFinite(updated.sog) ? { sog: updated.sog } : {}),
        ...(typeof updated.cog === 'number' && Number.isFinite(updated.cog) ? { cog: updated.cog } : {}),
      };
      this.recordTrackPoint(mmsi, {
        ...trackPoint,
      });
    }

    this.scheduleFlush();
  }

  /**
   * Publish the live map to the UI signal at most once per FLUSH_INTERVAL_MS.
   * Collapses high-frequency AIS bursts into a single change-detection pass.
   */
  private scheduleFlush(): void {
    if (this.flushScheduled) {
      return;
    }
    this.flushScheduled = true;
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.flushScheduled = false;
        const snapshot = new Map(this._live);
        this.zone.run(() => this._targets.set(snapshot));
      }, this.FLUSH_INTERVAL_MS);
    });
  }

  private calculateRisk(
    target: AisTarget,
    ownShip?: { lat: number; lon: number; sog: number; cog: number },
  ): AisTarget {
    const currentPos = ownShip
      ? { latitude: ownShip.lat, longitude: ownShip.lon }
      : this.datapointStore.get<{ latitude: number; longitude: number }>(PATHS.navigation.position)?.value;
    const currentSog = ownShip
      ? ownShip.sog
      : this.datapointStore.get<number>(PATHS.navigation.speedOverGround)?.value;
    const currentCog = ownShip
      ? ownShip.cog
      : this.datapointStore.get<number>(PATHS.navigation.courseOverGroundTrue)?.value;

    if (
      !currentPos ||
      typeof currentPos.latitude !== 'number' ||
      typeof currentPos.longitude !== 'number' ||
      typeof target.latitude !== 'number' ||
      typeof target.longitude !== 'number'
    ) {
      return {
        ...target,
        riskEligible: false,
        isDangerous: false,
      };
    }

    const ownSog = typeof currentSog === 'number' && Number.isFinite(currentSog) ? currentSog : 0;
    const targetSog = typeof target.sog === 'number' && Number.isFinite(target.sog) ? target.sog : 0;
    const ownCog = typeof currentCog === 'number' && Number.isFinite(currentCog) ? currentCog : 0;
    const targetCog = typeof target.cog === 'number' && Number.isFinite(target.cog) ? target.cog : 0;
    const minOwnSog = this.positiveOr(this.alarmSettings.snapshot.cpaRiskOwnShipMinSpeedMps, 0.5);
    const minTargetSog = this.positiveOr(this.alarmSettings.snapshot.cpaRiskTargetMinSpeedMps, 0.5);
    const hasCourseData =
      typeof currentCog === 'number' &&
      Number.isFinite(currentCog) &&
      typeof target.cog === 'number' &&
      Number.isFinite(target.cog);

    const res = calculateCpa(
      currentPos.latitude, currentPos.longitude, ownSog, ownCog,
      target.latitude, target.longitude, targetSog, targetCog
    );

    const riskEligible =
      hasCourseData &&
      ownSog >= minOwnSog &&
      targetSog >= minTargetSog &&
      res.tCpa > 0;

    const isDangerous = 
      riskEligible &&
      res.tCpa < TCPA_WARNING_SECONDS && 
      res.dCpa < CPA_WARNING_METERS;

    return {
      ...target,
      cpa: res.dCpa,
      tcpa: res.tCpa,
      riskEligible,
      isDangerous
    };
  }

  private cleanupStaleTargets(): void {
    const now = Date.now();
    let changed = false;

    // Mutate the live map in place (deleting the current key during Map
    // iteration is safe) — no unconditional full-map clone.
    for (const [mmsi, target] of this._live) {
      if (now - target.lastUpdated > this.TIMEOUT_MS) {
        this._live.delete(mmsi);
        this._trackBuffer.delete(mmsi);
        changed = true;
      }
    }

    for (const [mmsi, points] of this._trackBuffer.entries()) {
      const first = points[0];
      if (!first || now - first.timestamp <= this.TRACK_MAX_AGE_MS) {
        continue;
      }
      let firstFreshIndex = 0;
      while (
        firstFreshIndex < points.length &&
        now - points[firstFreshIndex]!.timestamp > this.TRACK_MAX_AGE_MS
      ) {
        firstFreshIndex += 1;
      }
      if (firstFreshIndex >= points.length) {
        this._trackBuffer.delete(mmsi);
        continue;
      }
      this._trackBuffer.set(mmsi, points.slice(firstFreshIndex));
    }

    if (changed) {
      this.scheduleFlush();
    }
  }

  /**
   * Update CPA calculations for all targets based on Own Ship vector.
   * This should be called periodically or when Own Ship moves.
   */
  updateRisks(ownShip: { lat: number, lon: number, sog: number, cog: number }): void {
    if (this._live.size === 0) {
      return;
    }

    let changed = false;

    for (const [mmsi, target] of this._live) {
      const updated = this.calculateRisk(target, ownShip);
      if (
        updated.cpa !== target.cpa ||
        updated.tcpa !== target.tcpa ||
        updated.isDangerous !== target.isDangerous ||
        updated.riskEligible !== target.riskEligible
      ) {
        this._live.set(mmsi, updated);
        changed = true;
      }
    }

    if (changed) {
      this.scheduleFlush();
    }
  }

  private bindOwnShipRiskUpdates(): void {
    combineLatest([
      this.datapointStore.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position),
      this.datapointStore.observe<number>(PATHS.navigation.speedOverGround),
      this.datapointStore.observe<number>(PATHS.navigation.courseOverGroundTrue).pipe(startWith(undefined)),
    ]).pipe(
      auditTime(500),
      filter(([position, sog]) => {
        return !!position &&
          !!position.value &&
          typeof position.value.latitude === 'number' &&
          typeof position.value.longitude === 'number' &&
          !!sog &&
          typeof sog.value === 'number';
      }),
    ).subscribe(([position, sog, cog]) => {
      const value = position!.value;
      this.updateRisks({
        lat: value.latitude,
        lon: value.longitude,
        sog: sog!.value,
        cog: typeof cog?.value === 'number' ? cog.value : 0,
      });
    });
  }

  private positiveOr(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private recordTrackPoint(mmsi: string, point: AisTrackPoint): void {
    const existing = this._trackBuffer.get(mmsi) ?? [];
    if (existing.length > 0) {
      const last = existing[existing.length - 1];
      if (last) {
        const distanceM = this.haversineApproxMeters(
          last.latitude,
          last.longitude,
          point.latitude,
          point.longitude,
        );
        const elapsedMs = Math.max(0, point.timestamp - last.timestamp);
        const moving = distanceM >= 1;
        if (
          distanceM < this.TRACK_MIN_DISTANCE_M
          && (!moving || elapsedMs < this.TRACK_MAX_SAMPLE_INTERVAL_MS)
        ) {
          return;
        }
      }
    }

    const next = [...existing, point];
    const trimmed =
      next.length > this.TRACK_MAX_POINTS_PER_TARGET
        ? next.slice(next.length - this.TRACK_MAX_POINTS_PER_TARGET)
        : next;

    this._trackBuffer.set(mmsi, trimmed);
  }

  private haversineApproxMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusM = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos((lat1 * Math.PI) / 180)
      * Math.cos((lat2 * Math.PI) / 180)
      * Math.sin(dLon / 2) ** 2;
    return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
