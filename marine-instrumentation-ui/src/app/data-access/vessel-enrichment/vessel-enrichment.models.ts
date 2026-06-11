// Vessel Enrichment Models
// Data in this module is informational only and must never replace AIS safety data.

export type EnrichmentStatus = 'idle' | 'loading' | 'loaded' | 'unavailable';

export interface VesselPort {
  portName: string;
  country?: string;
  arrivedAt?: string; // ISO 8601 date string
  departedAt?: string;
}

export interface VesselInfo {
  mmsi: string;
  imoNumber?: string;
  flagCountry?: string; // ISO 3166-1 alpha-2
  flagEmoji?: string;
  vesselTypeDescription?: string;
  yearBuilt?: number;
  grossTonnage?: number;
  length?: number; // meters
  beam?: number; // meters
  photoUrl?: string;
  externalUrl?: string;
  lastPorts?: VesselPort[];
  fetchedAt: number; // timestamp ms
  source: 'vessel-observer' | 'mmsi-decode' | 'manual';
}

export interface EnrichmentResult {
  status: EnrichmentStatus;
  info: VesselInfo | null;
  errorMessage?: string;
}

// MMSI MID map (first 3 digits) -> ISO country code.
export const MID_TO_COUNTRY: Record<string, string> = {
  // Europe
  '211': 'DE', '218': 'DE',
  '224': 'ES', '225': 'ES',
  '227': 'FR', '228': 'FR',
  '229': 'MT',
  '230': 'FI',
  '232': 'GB', '233': 'GB', '234': 'GB', '235': 'GB',
  '237': 'GR',
  '238': 'HR',
  '244': 'NL', '245': 'NL',
  '247': 'IT', '248': 'IT',
  '253': 'PT',
  '257': 'NO', '258': 'NO',
  '265': 'SE', '266': 'SE',
  '271': 'TR',
  '276': 'EE',
  '277': 'LV',
  '278': 'LT',
  // Americas
  '316': 'CA',
  '338': 'US', '366': 'US', '367': 'US', '368': 'US', '369': 'US',
  '345': 'MX',
  '370': 'PA',
  '511': 'BS',
  '710': 'BR',
  '720': 'AR',
  // Asia / Pacific
  '412': 'CN', '413': 'CN',
  '431': 'JP', '432': 'JP',
  '440': 'KR', '441': 'KR',
  '477': 'HK',
  '525': 'ID',
  '533': 'MY',
  '563': 'SG',
  '574': 'VN',
  // Other major open registries
  '636': 'LR',
  '657': 'MH',
  '667': 'SL',
};

export function countryToFlagEmoji(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) {
    return '🏳️';
  }

  const codePoints = [...isoCode.toUpperCase()].map((char) => 0x1f1e0 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export function decodeFlagFromMmsi(mmsi: string): { country: string; emoji: string } | null {
  if (!mmsi || mmsi.length < 3) {
    return null;
  }

  const mid = mmsi.substring(0, 3);
  const country = MID_TO_COUNTRY[mid];
  if (!country) {
    return null;
  }

  return {
    country,
    emoji: countryToFlagEmoji(country),
  };
}

// Decode AIS ship type (ITU-R M.1371-5, table 48) to human-readable label.
export function decodeVesselType(typeCode: number | string | undefined): string {
  if (typeCode === undefined || typeCode === null) {
    return 'Unknown';
  }

  const code = Number(typeCode);
  if (Number.isNaN(code)) {
    return String(typeCode);
  }

  if (code >= 20 && code <= 28) {
    return 'Wing In Ground';
  }

  if (code >= 30 && code <= 38) {
    if (code === 30) return 'Fishing';
    if (code === 31 || code === 32) return 'Towing';
    if (code === 33) return 'Dredging';
    if (code === 34) return 'Diving Ops';
    if (code === 35) return 'Military';
    if (code === 36) return 'Sailing';
    if (code === 37) return 'Pleasure Craft';
    return 'Special Craft';
  }

  if (code >= 40 && code <= 49) {
    return 'High Speed Craft';
  }

  if (code === 50) return 'Pilot Vessel';
  if (code === 51) return 'Search & Rescue';
  if (code === 52) return 'Tug';
  if (code === 53) return 'Port Tender';
  if (code === 55) return 'Law Enforcement';
  if (code === 58) return 'Medical Transport';

  if (code >= 60 && code <= 69) {
    return 'Passenger';
  }

  if (code >= 70 && code <= 79) {
    if (code === 70) return 'Cargo';
    if (code === 71) return 'Cargo - Hazardous A';
    if (code === 72) return 'Cargo - Hazardous B';
    if (code === 73) return 'Cargo - Hazardous C';
    if (code === 74) return 'Cargo - Hazardous D';
    return 'Cargo';
  }

  if (code >= 80 && code <= 89) {
    if (code === 80) return 'Tanker';
    if (code === 81) return 'Tanker - Hazardous A';
    if (code === 82) return 'Tanker - Hazardous B';
    if (code === 83) return 'Tanker - Hazardous C';
    if (code === 84) return 'Tanker - Hazardous D';
    return 'Tanker';
  }

  if (code >= 90 && code <= 99) {
    return 'Other';
  }

  return `Type ${code}`;
}
