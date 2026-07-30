export type VesselTypeFilter =
  | 'cargo'
  | 'tanker'
  | 'passenger'
  | 'fishing'
  | 'sailing'
  | 'pleasure'
  | 'tug'
  | 'military'
  | 'hsc'
  | 'other';

export type VesselTypeColors = Record<VesselTypeFilter, string>;
export type AisTargetIconKind = 'vessel' | 'navigation-aid' | 'shore-station' | 'sart';

export const VESSEL_TYPE_KEYS: VesselTypeFilter[] = [
  'cargo', 'tanker', 'passenger', 'fishing', 'sailing',
  'pleasure', 'tug', 'military', 'hsc', 'other',
];

export const VESSEL_TYPE_LABELS: Record<VesselTypeFilter, string> = {
  cargo: 'Cargo',
  tanker: 'Tanker',
  passenger: 'Passenger',
  fishing: 'Fishing',
  sailing: 'Sailing',
  pleasure: 'Pleasure Craft',
  tug: 'Tug & Pilot',
  military: 'Military',
  hsc: 'High-Speed Craft',
  other: 'Other',
};

export const DEFAULT_VESSEL_TYPE_COLORS: VesselTypeColors = {
  cargo: '#3b82f6',
  tanker: '#ef4444',
  passenger: '#f59e0b',
  fishing: '#10b981',
  sailing: '#8b5cf6',
  pleasure: '#06b6d4',
  tug: '#f97316',
  military: '#475569',
  hsc: '#e11d48',
  other: '#9ca3af',
};

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_COLOR_RE.test(value.trim());

export const normalizeHexColor = (value: unknown, fallback: string): string =>
  isHexColor(value) ? value.trim() : fallback;

export const getAisVesselIconId = (type: VesselTypeFilter, dangerous = false): string =>
  `chart-ais-icon-${type}${dangerous ? '-dangerous' : ''}`;

export const getAisTargetIconId = (
  kind: AisTargetIconKind,
  type: VesselTypeFilter,
  dangerous = false,
): string => {
  if (kind === 'vessel') {
    return getAisVesselIconId(type, dangerous);
  }

  return `chart-ais-icon-${kind}${dangerous ? '-dangerous' : ''}`;
};

export const mapAisVesselTypeToFilter = (rawType: string | undefined | null): VesselTypeFilter => {
  const normalized = normalizeTypeText(rawType);
  if (!normalized) return 'other';

  const numericCode = parseTypeCode(normalized);
  if (numericCode !== null) {
    return mapAisShipTypeCodeToFilter(numericCode);
  }

  if (containsAny(normalized, ['cargo', 'container', 'bulk', 'freighter', 'roro'])) return 'cargo';
  if (containsAny(normalized, ['tanker', 'chemical', 'oil', 'lng', 'lpg', 'gas'])) return 'tanker';
  if (containsAny(normalized, ['passenger', 'ferry', 'cruise'])) return 'passenger';
  if (containsAny(normalized, ['fishing', 'trawler'])) return 'fishing';
  if (containsAny(normalized, ['sailing', 'sailboat'])) return 'sailing';
  if (containsAny(normalized, ['pleasure', 'recreational', 'recreation', 'leisure', 'yacht'])) return 'pleasure';
  if (containsAny(normalized, ['tug', 'tow', 'towing', 'pilot', 'dredging'])) return 'tug';
  if (containsAny(normalized, ['military', 'navy', 'warship', 'patrol'])) return 'military';
  if (containsAny(normalized, ['highspeed', 'high speed', 'hsc', 'fast craft'])) return 'hsc';

  return 'other';
};

export const mapAisTargetToVesselTypeFilter = (
  rawType: string | undefined | null,
  navigationState?: number,
): VesselTypeFilter => {
  const mapped = mapAisVesselTypeToFilter(rawType);
  if (mapped !== 'other') return mapped;

  // Dynamic AIS messages arrive much more often than static ship data.
  // Use navigation status until type 36/30 is received so sailboats and
  // fishing vessels are not temporarily hidden by the "Other" filter.
  if (navigationState === 8) return 'sailing';
  if (navigationState === 7) return 'fishing';
  return mapped;
};

const normalizeTypeText = (value: string | undefined | null): string => {
  if (!value) return '';
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const parseTypeCode = (normalizedValue: string): number | null => {
  const direct = Number.parseInt(normalizedValue, 10);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const match = normalizedValue.match(/(?:type\s*)?(\d{1,3})/);
  if (!match?.[1]) return null;

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const containsAny = (haystack: string, needles: string[]): boolean =>
  needles.some((needle) => haystack.includes(needle));

const mapAisShipTypeCodeToFilter = (code: number): VesselTypeFilter => {
  if (!Number.isFinite(code) || code <= 0) return 'other';

  if (code >= 70 && code <= 79) return 'cargo';
  if (code >= 80 && code <= 89) return 'tanker';
  if (code >= 60 && code <= 69) return 'passenger';
  if (code >= 40 && code <= 49) return 'hsc';

  switch (code) {
    case 30:
      return 'fishing';
    case 31:
    case 32:
    case 50:
    case 52:
      return 'tug';
    case 35:
      return 'military';
    case 36:
      return 'sailing';
    case 37:
      return 'pleasure';
    default:
      return 'other';
  }
};
