import { Injectable, computed, signal } from '@angular/core';
import { AisTarget } from '../../core/models/ais.model';
import { calculateCpa } from '../../core/calculations/cpa';
import { DatapointStoreService } from '../datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { combineLatest, filter, startWith } from 'rxjs';
import { AlarmSettingsService } from '../alarms/alarm-settings.service';

const CPA_WARNING_METERS = 1852; // 1 NM
const TCPA_WARNING_SECONDS = 20 * 60; // 20 Minutes

@Injectable({
  providedIn: 'root'
})
export class AisStoreService {
  // Use a map for O(1) access by properties
  private _targets = signal<Map<string, AisTarget>>(new Map());
  
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

  // Constants
  private readonly TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (Class B is slower)
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // Clean every minute
  
  constructor(
    private datapointStore: DatapointStoreService,
    private alarmSettings: AlarmSettingsService,
  ) {
    // Start cleanup timer
    setInterval(() => this.cleanupStaleTargets(), this.CLEANUP_INTERVAL_MS);

    // Keep risk assessment tied to own-ship motion too (not only target updates).
    this.bindOwnShipRiskUpdates();
  }

  /**
   * Updates or creates a target from partial data.
   * @param mmsi The MMSI identifier
   * @param data Partial data received from Signal K
   */
  updateTarget(mmsi: string, data: Partial<AisTarget>, timestamp: number = Date.now()): void {
    const currentMap = this._targets();
    const existing = currentMap.get(mmsi);

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
    const vesselClass = data.class ?? existing?.class;
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

    // Need to create a new Map to trigger signal change
    const nextMap = new Map(currentMap);
    nextMap.set(mmsi, updated);
    this._targets.set(nextMap);
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
    const currentMap = this._targets();
    const nextMap = new Map(currentMap);

    for (const [mmsi, target] of currentMap) {
      if (now - target.lastUpdated > this.TIMEOUT_MS) {
        nextMap.delete(mmsi);
        changed = true;
      }
    }

    if (changed) {
      this._targets.set(nextMap);
    }
  }

  /**
   * Update CPA calculations for all targets based on Own Ship vector.
   * This should be called periodically or when Own Ship moves.
   */
  updateRisks(ownShip: { lat: number, lon: number, sog: number, cog: number }): void {
    const currentMap = this._targets();
    if (currentMap.size === 0) {
      return;
    }

    let changed = false;
    const nextMap = new Map(currentMap);

    for (const [mmsi, target] of currentMap) {
      const updated = this.calculateRisk(target, ownShip);
      if (
        updated.cpa !== target.cpa ||
        updated.tcpa !== target.tcpa ||
        updated.isDangerous !== target.isDangerous ||
        updated.riskEligible !== target.riskEligible
      ) {
        nextMap.set(mmsi, updated);
        changed = true;
      }
    }

    if (changed) {
      this._targets.set(nextMap);
    }
  }

  private bindOwnShipRiskUpdates(): void {
    combineLatest([
      this.datapointStore.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position),
      this.datapointStore.observe<number>(PATHS.navigation.speedOverGround),
      this.datapointStore.observe<number>(PATHS.navigation.courseOverGroundTrue).pipe(startWith(undefined)),
    ]).pipe(
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
}
