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
  vesselType?: string;
  length?: number;
  beam?: number;
  draft?: number;

  // Meta
  lastUpdated: number; // Timestamp ms
  
  // Computed Risk Metrics
  cpa?: number; // Closest Point of Approach (meters)
  tcpa?: number; // Time to CPA (seconds)
  isDangerous?: boolean; // If CPA < threshold && TCPA < threshold
}

export interface AisState {
  targets: Map<string, AisTarget>; // Keyed by MMSI
  closestTargetId?: string;
  dangerousTargetIds: string[];
}
