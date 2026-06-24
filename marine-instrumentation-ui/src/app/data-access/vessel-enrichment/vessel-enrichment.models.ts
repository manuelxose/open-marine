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

// ITU Maritime Identification Digits (MID) -> ISO 3166-1 alpha-2.
// Source: https://www.itu.int/gladapp/Allocation/MIDs
export const MID_TO_COUNTRY: Record<string, string> = {
  '201': 'AL', '202': 'AD', '203': 'AT', '204': 'PT', '205': 'BE', '206': 'BY', '207': 'BG', '208': 'VA',
  '209': 'CY', '210': 'CY', '211': 'DE', '212': 'CY', '213': 'GE', '214': 'MD', '215': 'MT', '216': 'AM',
  '218': 'DE', '219': 'DK', '220': 'DK', '224': 'ES', '225': 'ES', '226': 'FR', '227': 'FR', '228': 'FR',
  '229': 'MT', '230': 'FI', '231': 'FO', '232': 'GB', '233': 'GB', '234': 'GB', '235': 'GB', '236': 'GI',
  '237': 'GR', '238': 'HR', '239': 'GR', '240': 'GR', '241': 'GR', '242': 'MA', '243': 'HU', '244': 'NL',
  '245': 'NL', '246': 'NL', '247': 'IT', '248': 'MT', '249': 'MT', '250': 'IE', '251': 'IS', '252': 'LI',
  '253': 'LU', '254': 'MC', '255': 'PT', '256': 'MT', '257': 'NO', '258': 'NO', '259': 'NO', '261': 'PL',
  '262': 'ME', '263': 'PT', '264': 'RO', '265': 'SE', '266': 'SE', '267': 'SK', '268': 'SM', '269': 'CH',
  '270': 'CZ', '271': 'TR', '272': 'UA', '273': 'RU', '274': 'MK', '275': 'LV', '276': 'EE', '277': 'LT',
  '278': 'SI', '279': 'RS',
  '301': 'AI', '303': 'US', '304': 'AG', '305': 'AG', '306': 'BQ', '307': 'AW', '308': 'BS', '309': 'BS',
  '310': 'BM', '311': 'BS', '312': 'BZ', '314': 'BB', '316': 'CA', '319': 'KY', '321': 'CR', '323': 'CU',
  '325': 'DM', '327': 'DO', '329': 'GP', '330': 'GD', '331': 'GL', '332': 'GT', '334': 'HN', '336': 'HT',
  '338': 'US', '339': 'JM', '341': 'KN', '343': 'LC', '345': 'MX', '347': 'MQ', '348': 'MS', '350': 'NI',
  '351': 'PA', '352': 'PA', '353': 'PA', '354': 'PA', '355': 'PA', '356': 'PA', '357': 'PA', '358': 'US',
  '359': 'SV', '361': 'PM', '362': 'TT', '364': 'TC', '366': 'US', '367': 'US', '368': 'US', '369': 'US',
  '370': 'PA', '371': 'PA', '372': 'PA', '373': 'PA', '374': 'PA', '375': 'VC', '376': 'VC', '377': 'VC',
  '378': 'VG', '379': 'US',
  '401': 'AF', '403': 'SA', '405': 'BD', '408': 'BH', '410': 'BT', '412': 'CN', '413': 'CN', '414': 'CN',
  '416': 'CN', '417': 'LK', '419': 'IN', '422': 'IR', '423': 'AZ', '425': 'IQ', '428': 'IL', '431': 'JP',
  '432': 'JP', '434': 'TM', '436': 'KZ', '437': 'UZ', '438': 'JO', '440': 'KR', '441': 'KR', '443': 'PS',
  '445': 'KP', '447': 'KW', '450': 'LB', '451': 'KG', '453': 'MO', '455': 'MV', '457': 'MN', '459': 'NP',
  '461': 'OM', '463': 'PK', '466': 'QA', '468': 'SY', '470': 'AE', '471': 'AE', '472': 'TJ', '473': 'YE',
  '475': 'YE', '477': 'HK', '478': 'BA',
  '501': 'TF', '503': 'AU', '506': 'MM', '508': 'BN', '510': 'FM', '511': 'PW', '512': 'NZ', '514': 'KH',
  '515': 'KH', '516': 'AU', '518': 'NZ', '520': 'FJ', '523': 'AU', '525': 'ID', '529': 'KI', '531': 'LA',
  '533': 'MY', '536': 'US', '538': 'MH', '540': 'NC', '542': 'NZ', '544': 'NR', '546': 'PF', '548': 'PH',
  '550': 'TL', '553': 'PG', '555': 'PN', '557': 'SB', '559': 'US', '561': 'WS', '563': 'SG', '564': 'SG',
  '565': 'SG', '566': 'SG', '567': 'TH', '570': 'TO', '572': 'TV', '574': 'VN', '576': 'VU', '577': 'VU',
  '578': 'WF',
  '601': 'ZA', '603': 'AO', '605': 'DZ', '607': 'TF', '608': 'SH', '609': 'BI', '610': 'BJ', '611': 'BW',
  '612': 'CF', '613': 'CM', '615': 'CG', '616': 'KM', '617': 'CV', '618': 'TF', '619': 'CI', '620': 'KM',
  '621': 'DJ', '622': 'EG', '624': 'ET', '625': 'ER', '626': 'GA', '627': 'GH', '629': 'GM', '630': 'GW',
  '631': 'GQ', '632': 'GN', '633': 'BF', '634': 'KE', '635': 'TF', '636': 'LR', '637': 'LR', '638': 'SS',
  '642': 'LY', '644': 'LS', '645': 'MU', '647': 'MG', '649': 'ML', '650': 'MZ', '654': 'MR', '655': 'MW',
  '656': 'NE', '657': 'NG', '659': 'NA', '660': 'RE', '661': 'RW', '662': 'SD', '663': 'SN', '664': 'SC',
  '665': 'SH', '666': 'SO', '667': 'SL', '668': 'ST', '669': 'SZ', '670': 'TD', '671': 'TG', '672': 'TN',
  '674': 'TZ', '675': 'UG', '676': 'CD', '677': 'TZ', '678': 'ZM', '679': 'ZW',
  '701': 'AR', '710': 'BR', '720': 'BO', '725': 'CL', '730': 'CO', '735': 'EC', '740': 'FK', '745': 'GF',
  '750': 'GY', '755': 'PY', '760': 'PE', '765': 'SR', '770': 'UY', '775': 'VE',
};

export function countryToFlagEmoji(isoCode: string): string {
  const normalized = isoCode?.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return '🏳️';
  }

  const codePoints = [...normalized].map((char) => 0x1f1e0 + char.charCodeAt(0) - 65);
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
