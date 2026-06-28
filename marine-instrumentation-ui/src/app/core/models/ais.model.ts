import type { VesselInfo } from '../../data-access/vessel-enrichment/vessel-enrichment.models';

export enum AisNavStatus {
  UnderWayUsingEngine = 0,
  AtAnchor = 1,
  NotUnderCommand = 2,
  RestrictedManeuverability = 3,
  ConstrainedByDraft = 4,
  Moored = 5,
  Aground = 6,
  EngagedInFishing = 7,
  UnderWaySailing = 8,
  Reserved9 = 9,
  Reserved10 = 10,
  Reserved11 = 11,
  Reserved12 = 12,
  Reserved13 = 13,
  AISSART = 14,
  NotDefined = 15
}

export enum AisClass {
  A = 'A',
  B = 'B',
  BaseStation = 'Base',
  AtoN = 'AtoN', // Aid to Navigation
  SART = 'SART'
}

export type AisTargetKind = 'vessel' | 'navigation-aid' | 'shore-station' | 'sart';

export interface AisTarget {
  mmsi: string;
  name?: string;
  callsign?: string;
  class?: AisClass;
  state?: AisNavStatus;
  
  // Position & Vector
  latitude: number;
  longitude: number;
  sog?: number; // Speed Over Ground (knots or m/s? Contract usually uses SI, so m/s)
  cog?: number; // Course Over Ground (radians)
  heading?: number; // True Heading (radians)
  rot?: number; // Rate of Turn (rad/min?)

  // Static Data
  destination?: string;
  imo?: string;
  vesselType?: string;
  length?: number;
  beam?: number;
  draft?: number;
  enrichedInfo?: VesselInfo;

  // Meta
  lastUpdated: number; // Timestamp ms
  
  // Computed Risk Metrics
  cpa?: number; // Closest Point of Approach (meters)
  tcpa?: number; // Time to CPA (seconds)
  isDangerous?: boolean; // If CPA < threshold && TCPA < threshold
  riskEligible?: boolean; // Risk computation is valid for own-ship collision logic
}

export function inferAisClassFromMmsi(mmsi: string | undefined | null): AisClass | undefined {
  const normalized = normalizeMmsi(mmsi);
  if (!normalized) return undefined;

  if (normalized.startsWith('00')) return AisClass.BaseStation;
  if (normalized.startsWith('99')) return AisClass.AtoN;
  if (normalized.startsWith('970')) return AisClass.SART;

  return undefined;
}

export function getAisTargetKind(target: Pick<AisTarget, 'mmsi' | 'class'>): AisTargetKind {
  const aisClass = target.class ?? inferAisClassFromMmsi(target.mmsi);

  switch (aisClass) {
    case AisClass.AtoN:
      return 'navigation-aid';
    case AisClass.BaseStation:
      return 'shore-station';
    case AisClass.SART:
      return 'sart';
    default:
      return 'vessel';
  }
}

export function isAisVessel(target: Pick<AisTarget, 'mmsi' | 'class'>): boolean {
  return getAisTargetKind(target) === 'vessel';
}

function normalizeMmsi(mmsi: string | undefined | null): string {
  return typeof mmsi === 'string' && /^\d{9}$/.test(mmsi.trim()) ? mmsi.trim() : '';
}

export interface AisState {
  targets: Map<string, AisTarget>; // Keyed by MMSI
  closestTargetId?: string;
  dangerousTargetIds: string[];
}

/**
 * A single recorded position point for an AIS target historical trail.
 * Stored separately from AisTarget to keep target signal payload compact.
 */
export interface AisTrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number; // ms since epoch
  sog?: number; // m/s
  cog?: number; // radians
}
