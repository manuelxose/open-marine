import { Injectable, computed, signal } from '@angular/core';
import { AisTarget } from '../../core/models/ais.model';
import { calculateCpa } from '../../core/calculations/cpa';
import { DatapointStoreService } from '../datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';

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
  
  constructor(private datapointStore: DatapointStoreService) {
    // Start cleanup timer
    setInterval(() => this.cleanupStaleTargets(), this.CLEANUP_INTERVAL_MS);
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
    const state = data.state ?? existing?.state;
    if (state !== undefined) updated.state = state;
    const vesselClass = data.class ?? existing?.class;
    if (vesselClass !== undefined) updated.class = vesselClass;
    const destination = data.destination ?? existing?.destination;
    if (destination !== undefined) updated.destination = destination;
    const vesselType = data.vesselType ?? existing?.vesselType;
    if (vesselType !== undefined) updated.vesselType = vesselType;
    const length = data.length ?? existing?.length;
    if (length !== undefined) updated.length = length;
    const beam = data.beam ?? existing?.beam;
    if (beam !== undefined) updated.beam = beam;
    const cpa = existing?.cpa;
    if (cpa !== undefined) updated.cpa = cpa;
    const tcpa = existing?.tcpa;
    if (tcpa !== undefined) updated.tcpa = tcpa;
    const isDangerous = existing?.isDangerous;
    if (isDangerous !== undefined) updated.isDangerous = isDangerous;

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

  private calculateRisk(target: AisTarget): AisTarget {
    const currentPos = this.datapointStore.get<{latitude: number; longitude: number}>(PATHS.navigation.position)?.value;
    const currentSog = this.datapointStore.get<number>(PATHS.navigation.speedOverGround)?.value;
    const currentCog = this.datapointStore.get<number>(PATHS.navigation.courseOverGroundTrue)?.value;

    if (!currentPos || typeof currentSog !== 'number' || typeof currentCog !== 'number' || 
        !target.latitude || !target.longitude || 
        typeof target.sog !== 'number' || typeof target.cog !== 'number') {
      return target;
    }

    // Ignore stationary targets for CPA alarm to reduce noise (unless we are moving towards them, which cpa calc handles)
    // But if they are stationary, target.sog is ~0.
    
    const res = calculateCpa(
      currentPos.latitude, currentPos.longitude, currentSog, currentCog,
      target.latitude, target.longitude, target.sog, target.cog
    );

    const isDangerous = 
      res.tCpa > 0 && 
      res.tCpa < TCPA_WARNING_SECONDS && 
      res.dCpa < CPA_WARNING_METERS;

    return {
      ...target,
      cpa: res.dCpa,
      tcpa: res.tCpa,
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
  updateRisks(_ownShip: { lat: number, lon: number, sog: number, cog: number }): void {
     // Optional implementation for bulk updates
  }
}
