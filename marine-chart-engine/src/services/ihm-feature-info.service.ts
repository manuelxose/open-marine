const IHM_WMS_URL = 'https://ideihm.covam.es/encwms/wms';
const CACHE_TTL_MS = 5 * 60_000;

interface CachedInfo {
  expiresAt: number;
  value: IhmFeatureInfoResult;
}

export interface IhmFeatureInfoAttribute {
  label: string;
  acronym: string | null;
  value: string;
}

export interface IhmFeatureInfoFeature {
  title: string;
  objectClass: string | null;
  cell: string | null;
  kind: 'feature' | 'context';
  attributes: IhmFeatureInfoAttribute[];
  details: string;
}

export interface IhmFeatureInfoResult {
  source: string;
  position: { longitude: number; latitude: number };
  features: IhmFeatureInfoFeature[];
  advisoryOnly: true;
  disclaimer: string;
}

export class IhmFeatureInfoService {
  private readonly cache = new Map<string, CachedInfo>();

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async query(longitude: number, latitude: number, zoom: number): Promise<IhmFeatureInfoResult> {
    if (!Number.isFinite(longitude) || Math.abs(longitude) > 180
      || !Number.isFinite(latitude) || Math.abs(latitude) > 90
      || !Number.isFinite(zoom) || zoom < 0 || zoom > 24) {
      throw new Error('lng, lat and zoom must be valid');
    }
    const key = `${longitude.toFixed(5)}:${latitude.toFixed(5)}:${Math.round(zoom)}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now()) return cached.value;

    const [x, y] = webMercator(longitude, latitude);
    const resolution = 156543.03392804097 / 2 ** zoom;
    const half = resolution * 50;
    const url = new URL(IHM_WMS_URL);
    for (const [name, value] of Object.entries({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      LAYERS: 'ENC',
      QUERY_LAYERS: 'ENC',
      STYLES: '',
      CRS: 'EPSG:3857',
      BBOX: `${x - half},${y - half},${x + half},${y + half}`,
      WIDTH: '101',
      HEIGHT: '101',
      I: '50',
      J: '50',
      INFO_FORMAT: 'text/html',
      FEATURE_COUNT: '20',
    })) url.searchParams.set(name, value);

    const response = await this.fetcher(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`IHM GetFeatureInfo returned ${response.status}`);
    const raw = await response.text();
    const value: IhmFeatureInfoResult = {
      source: 'IHM public ENC WMS',
      position: { longitude, latitude },
      features: parseFeatureReport(raw),
      advisoryOnly: true,
      disclaimer: 'Servicio público no válido para navegación. No alimenta alarmas de seguridad.',
    };
    this.cache.set(key, { expiresAt: this.now() + CACHE_TTL_MS, value });
    return value;
  }
}

const FEATURE_PRIORITY: Record<string, number> = {
  SOUNDG: 0,
  WRECKS: 1,
  OBSTRN: 2,
  UWTROC: 3,
  DEPCNT: 4,
  DEPARE: 5,
  BOYLAT: 6,
  BOYSPP: 7,
  LIGHTS: 8,
  LITFLT: 9,
  MARCUL: 10,
  SBDARE: 11,
  SLCONS: 12,
  PONTON: 13,
};

const FEATURE_LABELS: Record<string, string> = {
  SOUNDG: 'Sonda',
  WRECKS: 'Naufragio',
  OBSTRN: 'Obstrucción',
  UWTROC: 'Roca sumergida',
  DEPCNT: 'Veril',
  DEPARE: 'Área de profundidad',
  BOYLAT: 'Boya lateral',
  BOYSPP: 'Boya especial',
  LIGHTS: 'Luz',
  LITFLT: 'Luz flotante',
  MARCUL: 'Instalación de acuicultura',
  SBDARE: 'Tipo de fondo',
  SLCONS: 'Construcción costera',
  PONTON: 'Pontón',
  M_QUAL: 'Calidad de los datos',
  M_NSYS: 'Sistema de balizamiento',
  M_COVR: 'Cobertura de la carta',
  MAGVAR: 'Variación magnética',
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  VALSOU: 'Profundidad sondada',
  QUASOU: 'Calidad de la sonda',
  DRVAL1: 'Profundidad mínima',
  DRVAL2: 'Profundidad máxima',
  VALDCO: 'Profundidad del veril',
  SCAMIN: 'Escala mínima',
  NATSUR: 'Naturaleza del fondo',
  CATZOC: 'Categoría de confianza',
  INFORM: 'Información',
  SORDAT: 'Fecha de la fuente',
  SORIND: 'Procedencia',
  SURSTA: 'Inicio del levantamiento',
  SUREND: 'Fin del levantamiento',
  MARSYS: 'Sistema de balizamiento',
  CATCOV: 'Tipo de cobertura',
  RYRMGV: 'Año de referencia',
  VALACM: 'Variación anual',
  VALMAG: 'Variación magnética',
  CATMFA: 'Tipo de acuicultura',
  WATLEV: 'Relación con el nivel del agua',
};

export const parseFeatureReport = (raw: string): IhmFeatureInfoFeature[] => {
  const sanitized = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const features: IhmFeatureInfoFeature[] = [];
  const featurePattern =
    /<b[^>]*>([\s\S]*?)<\/b>([\s\S]*?)(?=(?:<br\s*\/?>\s*){2}<b[^>]*>|<\/body>|$)/gi;

  for (const match of sanitized.matchAll(featurePattern)) {
    const heading = normalizeHtmlText(match[1] ?? '');
    if (!heading) continue;
    const headingMatch = heading.match(/^(.+?)\s+\(([A-Z0-9_]+)\),\s*(.+)$/);
    const upstreamTitle = headingMatch?.[1]?.trim() || heading;
    const objectClass = headingMatch?.[2]?.trim() || null;
    const title = objectClass ? (FEATURE_LABELS[objectClass] ?? upstreamTitle) : upstreamTitle;
    const cell = headingMatch?.[3]?.trim() || null;
    const attributeLines = (match[2] ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .map(normalizeHtmlText)
      .filter(Boolean);
    const attributes = attributeLines.map((line): IhmFeatureInfoAttribute => {
      const attributeMatch = line.match(/^(.+?)\s+\(([A-Z0-9_]+)\):\s*(.*)$/);
      if (!attributeMatch) {
        return { label: 'Información', acronym: null, value: line };
      }
      return {
        label: ATTRIBUTE_LABELS[attributeMatch[2]!.trim()] ?? attributeMatch[1]!.trim(),
        acronym: attributeMatch[2]!.trim(),
        value: attributeMatch[3]!.trim(),
      };
    });
    const kind = objectClass && (objectClass.startsWith('M_') || objectClass === 'MAGVAR')
      ? 'context'
      : 'feature';
    features.push({
      title,
      objectClass,
      cell,
      kind,
      attributes,
      details: [
        objectClass ? `${title} (${objectClass})${cell ? `, ${cell}` : ''}` : title,
        ...attributes.map((attribute) =>
          `${attribute.label}${attribute.acronym ? ` (${attribute.acronym})` : ''}: ${attribute.value}`),
      ].join(' · ').slice(0, 4_000),
    });
  }

  const uniqueFeatures = features.filter((feature, index, all) =>
    all.findIndex((candidate) =>
      candidate.objectClass === feature.objectClass
      && candidate.cell === feature.cell
      && candidate.details === feature.details) === index);

  return uniqueFeatures
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === 'feature' ? -1 : 1;
      return featurePriority(left.objectClass) - featurePriority(right.objectClass);
    })
    .slice(0, 20);
};

const featurePriority = (objectClass: string | null): number =>
  objectClass ? (FEATURE_PRIORITY[objectClass] ?? 100) : 200;

const webMercator = (longitude: number, latitude: number): [number, number] => {
  const radius = 6_378_137;
  const safeLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  return [
    radius * longitude * Math.PI / 180,
    radius * Math.log(Math.tan(Math.PI / 4 + safeLatitude * Math.PI / 360)),
  ];
};

const normalizeHtmlText = (value: string): string =>
  decodeHtml(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const decodeHtml = (value: string): string => value
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
    String.fromCodePoint(Number.parseInt(code, 16)));
