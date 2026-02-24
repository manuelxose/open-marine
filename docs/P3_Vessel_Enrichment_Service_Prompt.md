# PROMPT P3: Servicio de Enriquecimiento de Vessels AIS
## Open Marine Instrumentation — Información Extendida de Tráfico Marítimo

**Versión:** 1.0 | **Fecha:** 2026-02-23 | **Estimación:** 6-8 horas  
**Prerequisitos completados:**
- ✅ P0: Toggle de mapas OSM → Satellite → Nautical → ENC
- ✅ P1: Tracks históricos + predicción por barco AIS
- ✅ P2: Carta vectorial ENC con estilos S-52

**Prioridad:** P3 — Enriquecimiento informacional; no afecta datos de seguridad (CPA/alarmas)

---

## 🎯 OBJETIVO

Cuando el usuario hace click en un barco AIS y abre el panel de detalles, el sistema
consulta en segundo plano una API externa y complementa la información disponible:
foto del barco, bandera de país, tipo exacto de buque, historial de puertos recientes,
IMO number, año de construcción, y eslora/manga precisas.

**El enriquecimiento es siempre aditivo, nunca sobreescribe datos de AIS en tiempo real.**
Los datos de posición, SOG, COG y alertas CPA siguen viniendo exclusivamente del
receptor AIS via Signal K — son los únicos datos de seguridad fiables.

**Estado final esperado:**
- Panel `ais-target-details` muestra nueva sección "Extended Info" cuando hay datos enriquecidos
- Foto del barco en cabecera del panel (si disponible)
- Badge de bandera de país junto al nombre
- Tipo de buque descriptivo (ej. "Bulk Carrier" en lugar de código numérico "70")
- Last known ports (hasta 3 puertos recientes con fecha)
- IMO number y año de construcción
- Estado del enriquecimiento visible: loading / loaded / unavailable
- Caché de 24h por MMSI en `localStorage` para no relanzar peticiones
- Settings toggle para activar/desactivar las consultas externas
- Graceful degradation: si la API falla, el panel sigue funcionando con datos AIS

---

## 📁 ARCHIVOS INVOLUCRADOS

```
marine-instrumentation-ui/src/app/
├── data-access/vessel-enrichment/         ← CREAR CARPETA NUEVA
│   ├── vessel-enrichment.service.ts       ← CREAR: HTTP + cache + rate limit
│   ├── vessel-enrichment.models.ts        ← CREAR: tipos VesselInfo, EnrichmentState
│   └── vessel-enrichment.providers.ts     ← CREAR: config API keys opcional
├── core/models/
│   └── ais.model.ts                       ← MODIFICAR: añadir enrichedInfo? opcional
├── features/ais/
│   ├── services/
│   │   └── ais-facade.service.ts          ← CREAR (si no existe) o MODIFICAR
│   └── components/
│       └── ais-target-details/
│           └── ais-target-details.component.ts  ← MODIFICAR: nueva sección UI
├── state/alarms/
│   └── alarm-settings.service.ts          ← NO TOCAR
├── pages/settings/
│   └── settings.page.ts                   ← MODIFICAR: toggle vessel enrichment
└── core/i18n/
    ├── en.ts                               ← MODIFICAR
    └── es.ts                               ← MODIFICAR
```

---

## 🔍 ESTADO ACTUAL DEL CÓDIGO (contexto crítico)

### `AisTarget` interface actual (post-P1)
```typescript
// core/models/ais.model.ts — EXISTE:
export interface AisTarget {
  mmsi: string;
  name?: string;
  callsign?: string;
  class?: AisClass;
  state?: AisNavStatus;
  latitude: number;
  longitude: number;
  sog?: number;       // m/s
  cog?: number;       // radians
  heading?: number;   // radians
  rot?: number;
  destination?: string;
  vesselType?: string;   // string libre del AIS
  length?: number;
  beam?: number;
  draft?: number;
  lastUpdated: number;
  cpa?: number;
  tcpa?: number;
  isDangerous?: boolean;
  // P1:
  // trackBuffer vive en AisStoreService, no en AisTarget
}
// NO EXISTE — ningún campo de datos enriquecidos en AisTarget
```

### `ais-target-details.component.ts` — secciones actuales
```
EXISTE actualmente:
├── header: nombre, MMSI, botón cerrar
├── alert-box: COLLISION WARNING si isDangerous
├── section "Voyage": estado, destino
├── section "Navigation": SOG, COG, heading, ROT, posición
├── section "Vessel Details": callsign, type (texto crudo AIS), dimensiones
└── footer: "Last seen: X ago"

NO EXISTE:
├── foto del barco
├── bandera de país
├── tipo descriptivo (decode del código numérico)
├── puertos recientes
├── IMO, año construcción
└── indicador de estado del enriquecimiento (loading/loaded/unavailable)
```

### `ChartSettings` actual (post-P2)
```typescript
// EXISTE — patrón BehaviorSubject + localStorage:
export interface ChartSettings {
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  showTrueWind: boolean;
  showRangeRings: boolean;
  rangeRingIntervals: number[];
  showAisTracks: boolean;   // P1
  safetyDepth: number;      // P2
  encLayers: EncLayerConfig; // P2
}
// NO EXISTE — enableVesselEnrichment: boolean
```

### Patrón Angular HttpClient existente (para referenciar)
```typescript
// data-access/signalk/resources/signalk-resources.service.ts — patrón existente:
@Injectable({ providedIn: 'root' })
export class SignalKResourcesService {
  constructor(
    private http: HttpClient,
    @Inject(APP_ENVIRONMENT) private env: AppEnvironment
  ) {}
  // Usa this.http.get<T>(url).pipe(catchError(...), map(...))
}
// → El mismo patrón aplica para VesselEnrichmentService
```

---

## 🌐 FUENTES DE DATOS EXTERNAS

### Opción A: VesselFinder API (Recomendada para P3)
- **URL:** `https://api.vesselfinder.com/api/pub/v1/vessel?mmsi={mmsi}&userkey={key}`
- **Free tier:** 100 requests/día, sin foto
- **Paid:** Foto, puertos, historial detallado
- **Documentación:** https://api.vesselfindercom

### Opción B: MarineTraffic API
- **URL:** `https://services.marinetraffic.com/api/exportvessel/v:8/{key}/mmsi:{mmsi}/protocol:jsono`
- **Free tier:** Muy limitado (requiere credenciales)

### Opción C: VesselFinder sin key (scraping-free public endpoint)
- No disponible de forma oficial

### ✅ Opción D: AIS HUB / OpenData (Implementada en P3)

**Fuente elegida para P3:** Combinar dos APIs públicas sin autenticación:

**1. aisstream.io WebSocket (para cobertura global)**
- No necesario para P3 — esto es P4

**2. api.vessel.observer (gratuito, sin clave)**
```
GET https://api.vessel.observer/api/v1/vessel/{mmsi}
```
Retorna: nombre, bandera, tipo IMO, dimensiones, año construcción.  
Limitación: No retorna puertos ni foto.

**3. MarineVesselTraffic (backup)**
```
GET https://www.marinetraffic.com/en/ais/details/ships/mmsi:{mmsi}
```
Solo como URL de "ver más" en la UI, no como API.

**Estrategia final para P3 — sin dependencia de API key:**

```typescript
// Fuente 1: api.vessel.observer (gratuita, sin clave)
const VESSEL_OBSERVER_URL = 'https://api.vessel.observer/api/v1/vessel';

// Fuente 2: Si falla, intentar con datos mínimos del MMSI
// (decode del MID — Maritime Identification Digits → país de bandera)
// El primer dígito 2-3 del MMSI identifica el país
```

> ⚠️ **REALIDAD PRÁCTICA sobre las APIs públicas:**  
> Las APIs de AIS gratuitas tienen CORS habilitado selectivamente, pueden estar caídas,
> y los datos son de calidad variable. La arquitectura debe estar diseñada para que
> **todo falle gracefully** y el panel siga siendo útil solo con datos AIS locales.
>
> El valor principal de P3 es la **arquitectura del servicio de caché** y la **UI enriquecida**,
> no la fuente de datos específica. Cuando el usuario conecte su propia API key de
> VesselFinder o MarineTraffic en Settings, el servicio simplemente cambia la URL.

---

## 📐 DISEÑO TÉCNICO COMPLETO

### Flujo de datos

```
Usuario hace click en barco AIS
         ↓
chart.page.ts → selectAisTarget(mmsi)
         ↓
AIS facade pasa AisTarget al panel de detalles
         ↓ [NUEVO en P3]
ais-target-details.component.ts → ngOnChanges(target)
         ↓
VesselEnrichmentService.getEnrichedInfo(mmsi)
         ↓
  ¿En caché localStorage? → Retornar inmediatamente
  ¿No en caché? →
    ¿enableVesselEnrichment = true? →
      HTTP GET api.vessel.observer
      → En éxito: cachear 24h, emitir VesselInfo
      → En fallo: emitir EnrichmentState.unavailable
    ¿enableVesselEnrichment = false? →
      Retornar null (no llamar API)
```

### Modelo de datos

```typescript
// NUEVO: EnrichmentStatus
type EnrichmentStatus = 'idle' | 'loading' | 'loaded' | 'unavailable';

// NUEVO: VesselInfo (datos enriquecidos, separados de AisTarget)
interface VesselInfo {
  mmsi: string;
  imoNumber?: string;
  flagCountry?: string;         // ISO 3166-1 alpha-2 (ej. 'ES', 'NO')
  flagEmoji?: string;           // 🇪🇸 calculado desde flagCountry
  vesselTypeDescription?: string; // 'Bulk Carrier', 'Tanker', etc.
  yearBuilt?: number;
  grossTonnage?: number;
  length?: number;              // más preciso que el AIS
  beam?: number;
  photoUrl?: string;            // URL de foto si disponible
  lastPorts?: VesselPort[];     // hasta 3 puertos recientes
  fetchedAt: number;            // timestamp ms para invalidar caché
}

interface VesselPort {
  portName: string;
  country?: string;
  arrivedAt?: string;   // ISO date string
}

// NUEVO: EnrichmentResult observable item
interface EnrichmentResult {
  status: EnrichmentStatus;
  info: VesselInfo | null;
}
```

### Caché architecture

- **Storage:** `localStorage` clave `omi-vessel-{mmsi}`
- **TTL:** 24 horas desde `fetchedAt`
- **Max entries:** 200 (si se supera, purgar los más antiguos)
- **Formato:** JSON serializado de `VesselInfo`
- **Rate limiting:** Máximo 1 request/segundo, máximo 50 requests/hora (evitar bloqueos de IP)

---

## 📐 ESPECIFICACIÓN TÉCNICA DETALLADA POR TAREA

---

### TAREA 1: Crear modelos en `vessel-enrichment.models.ts`

**Archivo a crear:** `src/app/data-access/vessel-enrichment/vessel-enrichment.models.ts`

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Vessel Enrichment Models
// Datos adicionales de vessels obtenidos de APIs externas.
// CRÍTICO: Estos datos son informativos, NUNCA de seguridad.
// Los datos de seguridad (posición, SOG, CPA) vienen EXCLUSIVAMENTE del AIS.
// ─────────────────────────────────────────────────────────────────────────────

export type EnrichmentStatus = 'idle' | 'loading' | 'loaded' | 'unavailable';

export interface VesselPort {
  portName: string;
  country?: string;
  arrivedAt?: string;   // ISO 8601 date string
  departedAt?: string;
}

export interface VesselInfo {
  mmsi: string;
  imoNumber?: string;
  flagCountry?: string;             // ISO 3166-1 alpha-2 (ej. 'ES', 'NO', 'PA')
  flagEmoji?: string;               // Calculado desde flagCountry
  vesselTypeDescription?: string;   // Descripción legible del tipo
  yearBuilt?: number;
  grossTonnage?: number;
  length?: number;                  // Eslora en metros
  beam?: number;                    // Manga en metros
  photoUrl?: string;                // URL de foto del barco si disponible
  externalUrl?: string;             // Link a MarineTraffic/VesselFinder para "ver más"
  lastPorts?: VesselPort[];         // Hasta 3 puertos recientes (más reciente primero)
  fetchedAt: number;                // timestamp ms — para TTL del caché
  source: 'vessel-observer' | 'mmsi-decode' | 'manual';
}

export interface EnrichmentResult {
  status: EnrichmentStatus;
  info: VesselInfo | null;
  errorMessage?: string;
}

// ─── MMSI Country Decode ──────────────────────────────────────────────────────
// Los primeros 3 dígitos del MMSI son el MID (Maritime Identification Digits)
// Mapeamos los MIDs más comunes a códigos de país ISO 3166-1 alpha-2

export const MID_TO_COUNTRY: Record<string, string> = {
  // Europa
  '211': 'DE', '218': 'DE',   // Alemania
  '224': 'ES', '225': 'ES',   // España
  '228': 'FR', '227': 'FR',   // Francia
  '232': 'GB', '233': 'GB', '234': 'GB', '235': 'GB',  // Reino Unido
  '244': 'NL', '245': 'NL',   // Países Bajos
  '247': 'IT', '248': 'IT',   // Italia
  '253': 'PT',                 // Portugal
  '257': 'NO', '258': 'NO',   // Noruega
  '265': 'SE', '266': 'SE',   // Suecia
  '230': 'FI',                 // Finlandia
  '219': 'DK',                 // Dinamarca
  '229': 'MT',                 // Malta
  '237': 'GR',                 // Grecia
  '271': 'TR',                 // Turquía
  '276': 'EE',                 // Estonia
  '277': 'LV',                 // Letonia
  '278': 'LT',                 // Lituania
  '238': 'HR',                 // Croacia
  // Américas
  '338': 'US', '366': 'US', '367': 'US', '368': 'US', '369': 'US',  // EE.UU.
  '316': 'CA',                 // Canadá
  '345': 'MX',                 // México
  '710': 'BR',                 // Brasil
  '720': 'AR',                 // Argentina
  // Asia/Pacífico
  '431': 'JP', '432': 'JP',   // Japón
  '412': 'CN', '413': 'CN',   // China
  '440': 'KR', '441': 'KR',   // Corea del Sur
  '477': 'HK',                 // Hong Kong
  '525': 'ID',                 // Indonesia
  '533': 'MY',                 // Malasia
  '563': 'SG',                 // Singapur
  '574': 'VN',                 // Vietnam
  // Otros importantes
  '370': 'PA',                 // Panamá (mayor flota mundial)
  '636': 'LR',                 // Liberia
  '667': 'SL',                 // Sierra Leone
  '657': 'MH',                 // Islas Marshall
  '511': 'BS',                 // Bahamas
};

// Convierte código ISO a emoji de bandera (Unicode flag sequence)
export function countryToFlagEmoji(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) return '🏳️';
  const codePoints = [...isoCode.toUpperCase()].map(
    char => 0x1F1E0 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

// Decodifica el país de bandera desde el MMSI sin llamar a ninguna API
export function decodeFlagFromMmsi(mmsi: string): { country: string; emoji: string } | null {
  if (!mmsi || mmsi.length < 3) return null;
  const mid = mmsi.substring(0, 3);
  const country = MID_TO_COUNTRY[mid];
  if (!country) return null;
  return { country, emoji: countryToFlagEmoji(country) };
}

// Decode del tipo de barco AIS (código numérico → descripción)
// ITU-R M.1371-5 Tabla 48
export function decodeVesselType(typeCode: number | string | undefined): string {
  if (typeCode === undefined || typeCode === null) return 'Unknown';
  const code = Number(typeCode);
  if (isNaN(code)) return String(typeCode); // Retorna el string si ya es descriptivo

  if (code >= 20 && code <= 28) return 'Wing In Ground';
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
  if (code === 40) return 'High Speed Craft';
  if (code >= 41 && code <= 49) return 'High Speed Craft';
  if (code === 50) return 'Pilot Vessel';
  if (code === 51) return 'Search & Rescue';
  if (code === 52) return 'Tug';
  if (code === 53) return 'Port Tender';
  if (code === 55) return 'Law Enforcement';
  if (code === 58) return 'Medical Transport';
  if (code >= 60 && code <= 69) return 'Passenger';
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
  if (code >= 90 && code <= 99) return 'Other';
  return `Type ${code}`;
}
```

**Verificación Tarea 1:**
- [ ] `decodeVesselType(70)` retorna `'Cargo'`
- [ ] `decodeVesselType('Tanker')` retorna `'Tanker'` (pass-through)
- [ ] `decodeFlagFromMmsi('224123456')` retorna `{ country: 'ES', emoji: '🇪🇸' }`
- [ ] `decodeFlagFromMmsi('000')` retorna `null`
- [ ] `countryToFlagEmoji('NO')` retorna `'🇳🇴'`
- [ ] `tsc --noEmit` sin errores

---

### TAREA 2: Crear `VesselEnrichmentService`

**Archivo a crear:** `src/app/data-access/vessel-enrichment/vessel-enrichment.service.ts`

```typescript
import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap, throttleTime } from 'rxjs/operators';
import {
  VesselInfo,
  EnrichmentResult,
  EnrichmentStatus,
  decodeFlagFromMmsi,
  decodeVesselType,
} from './vessel-enrichment.models';
import { ChartSettingsService } from '../../features/chart/services/chart-settings.service';

// ─── Constantes de configuración ──────────────────────────────────────────────
const CACHE_TTL_MS      = 24 * 60 * 60 * 1000;  // 24 horas
const CACHE_MAX_ENTRIES = 200;
const CACHE_KEY_PREFIX  = 'omi-vessel-';
const MIN_REQUEST_INTERVAL_MS = 1000;  // Max 1 request/segundo
const VESSEL_OBSERVER_BASE = 'https://api.vessel.observer/api/v1/vessel';

// ─── Tipos internos de respuesta de la API ────────────────────────────────────
interface VesselObserverResponse {
  mmsi?: string;
  imo?: string;
  flag?: string;        // ISO country code
  shipType?: number;
  yearBuild?: number;
  grossTonnage?: number;
  length?: number;
  beam?: number;
  photo?: string;       // URL de foto
  lastPorts?: Array<{
    port?: string;
    country?: string;
    arrived?: string;
    departed?: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class VesselEnrichmentService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(ChartSettingsService);

  // Mapa de subjects por MMSI para observabilidad granular
  private readonly subjects = new Map<string, BehaviorSubject<EnrichmentResult>>();

  // Rate limiter: timestamp del último request
  private lastRequestTime = 0;
  private pendingQueue: string[] = [];
  private processingQueue = false;

  // ─── API pública ─────────────────────────────────────────────────────────────

  /**
   * Obtiene el stream de EnrichmentResult para un MMSI.
   * Emite inmediatamente desde caché si disponible.
   * Lanza petición HTTP en background si no hay caché.
   * Nunca lanza errores — usa estado 'unavailable' para fallos.
   */
  getEnrichedInfo(mmsi: string): Observable<EnrichmentResult> {
    if (!mmsi) {
      return of({ status: 'unavailable' as EnrichmentStatus, info: null });
    }

    // Obtener o crear el subject para este MMSI
    if (!this.subjects.has(mmsi)) {
      this.subjects.set(mmsi, new BehaviorSubject<EnrichmentResult>({
        status: 'idle',
        info: null,
      }));
    }

    const subject = this.subjects.get(mmsi)!;

    // Si ya está cargado o cargando, simplemente retornar el observable
    if (subject.value.status === 'loaded' || subject.value.status === 'loading') {
      return subject.asObservable();
    }

    // Intentar cargar desde caché primero
    const cached = this.loadFromCache(mmsi);
    if (cached) {
      subject.next({ status: 'loaded', info: cached });
      return subject.asObservable();
    }

    // Si la feature está desactivada, retornar datos mínimos del MMSI decode
    if (!this.settings.snapshot.enableVesselEnrichment) {
      const minimal = this.buildMinimalFromMmsi(mmsi);
      subject.next({ status: 'loaded', info: minimal });
      return subject.asObservable();
    }

    // Enqueue para fetch HTTP con rate limiting
    this.enqueueFetch(mmsi);

    return subject.asObservable();
  }

  /**
   * Precarga datos para una lista de MMSIs (llamado cuando se abre AIS target list).
   * Solo precarga los que no están en caché y respeta el rate limit.
   */
  prefetchBatch(mmsiList: string[]): void {
    if (!this.settings.snapshot.enableVesselEnrichment) return;

    const uncached = mmsiList.filter(mmsi => {
      const cached = this.loadFromCache(mmsi);
      return !cached;
    });

    // Añadir los primeros 10 al queue (no sobrecargar)
    uncached.slice(0, 10).forEach(mmsi => this.enqueueFetch(mmsi));
  }

  /**
   * Invalida el caché para un MMSI específico y relanza la petición.
   */
  refresh(mmsi: string): void {
    this.clearCacheEntry(mmsi);
    const subject = this.subjects.get(mmsi);
    if (subject) {
      subject.next({ status: 'idle', info: null });
    }
    this.enqueueFetch(mmsi);
  }

  /**
   * Limpia entradas de caché expiradas (llamar desde app bootstrap o settings).
   */
  purgeExpiredCache(): void {
    if (!isPlatformBrowser(this.getPlatformId())) return;

    const now = Date.now();
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const info = JSON.parse(raw) as VesselInfo;
            if (now - info.fetchedAt > CACHE_TTL_MS) {
              keysToDelete.push(key);
            }
          }
        } catch { /* ignorar entradas corruptas */ }
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  // ─── Implementación interna ───────────────────────────────────────────────────

  private enqueueFetch(mmsi: string): void {
    if (!this.pendingQueue.includes(mmsi)) {
      this.pendingQueue.push(mmsi);
    }
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.pendingQueue.length === 0) return;
    this.processingQueue = true;

    while (this.pendingQueue.length > 0) {
      const mmsi = this.pendingQueue.shift()!;
      const subject = this.subjects.get(mmsi);
      if (!subject) continue;

      // Verificar si ya fue cargado mientras esperaba en la queue
      if (subject.value.status === 'loaded') continue;

      // Rate limiting: esperar si el último request fue hace menos de MIN_REQUEST_INTERVAL_MS
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await this.delay(MIN_REQUEST_INTERVAL_MS - elapsed);
      }

      subject.next({ status: 'loading', info: null });
      this.lastRequestTime = Date.now();

      try {
        const info = await this.fetchFromApi(mmsi);
        this.saveToCache(mmsi, info);
        subject.next({ status: 'loaded', info });
      } catch {
        // Fallback: al menos decodificar bandera del MMSI
        const minimal = this.buildMinimalFromMmsi(mmsi);
        subject.next({ status: 'loaded', info: minimal });
      }
    }

    this.processingQueue = false;
  }

  private async fetchFromApi(mmsi: string): Promise<VesselInfo> {
    const url = `${VESSEL_OBSERVER_BASE}/${mmsi}`;

    return new Promise((resolve, reject) => {
      this.http.get<VesselObserverResponse>(url).pipe(
        catchError(err => {
          reject(err);
          return of(null);
        })
      ).subscribe(response => {
        if (!response) return; // reject ya fue llamado
        resolve(this.mapApiResponse(mmsi, response));
      });
    });
  }

  private mapApiResponse(mmsi: string, response: VesselObserverResponse): VesselInfo {
    const flagInfo = response.flag
      ? { country: response.flag, emoji: this.countryToEmoji(response.flag) }
      : decodeFlagFromMmsi(mmsi);

    const info: VesselInfo = {
      mmsi,
      fetchedAt: Date.now(),
      source: 'vessel-observer',
    };

    if (response.imo) info.imoNumber = response.imo;
    if (flagInfo) {
      info.flagCountry = flagInfo.country;
      info.flagEmoji = flagInfo.emoji;
    }
    if (response.shipType !== undefined) {
      info.vesselTypeDescription = decodeVesselType(response.shipType);
    }
    if (response.yearBuild) info.yearBuilt = response.yearBuild;
    if (response.grossTonnage) info.grossTonnage = response.grossTonnage;
    if (response.length) info.length = response.length;
    if (response.beam) info.beam = response.beam;
    if (response.photo) info.photoUrl = response.photo;

    // External link a MarineTraffic para "ver más"
    info.externalUrl = `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${mmsi}`;

    if (response.lastPorts?.length) {
      info.lastPorts = response.lastPorts.slice(0, 3).map(p => ({
        portName: p.port ?? 'Unknown Port',
        country: p.country,
        arrivedAt: p.arrived,
        departedAt: p.departed,
      }));
    }

    return info;
  }

  /** Datos mínimos derivados solo del MMSI (sin red) */
  private buildMinimalFromMmsi(mmsi: string): VesselInfo {
    const flagInfo = decodeFlagFromMmsi(mmsi);
    return {
      mmsi,
      fetchedAt: Date.now(),
      source: 'mmsi-decode',
      flagCountry: flagInfo?.country,
      flagEmoji: flagInfo?.emoji,
      externalUrl: `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${mmsi}`,
    };
  }

  // ─── Gestión de caché ─────────────────────────────────────────────────────────

  private loadFromCache(mmsi: string): VesselInfo | null {
    if (!isPlatformBrowser(this.getPlatformId())) return null;
    try {
      const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${mmsi}`);
      if (!raw) return null;
      const info = JSON.parse(raw) as VesselInfo;
      if (Date.now() - info.fetchedAt > CACHE_TTL_MS) {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${mmsi}`);
        return null;
      }
      return info;
    } catch {
      return null;
    }
  }

  private saveToCache(mmsi: string, info: VesselInfo): void {
    if (!isPlatformBrowser(this.getPlatformId())) return;
    try {
      // Verificar límite de entradas
      const currentCount = [...Array(localStorage.length)]
        .map((_, i) => localStorage.key(i))
        .filter(k => k?.startsWith(CACHE_KEY_PREFIX)).length;

      if (currentCount >= CACHE_MAX_ENTRIES) {
        this.evictOldestCacheEntries(20); // Purgar 20 entradas más antiguas
      }

      localStorage.setItem(`${CACHE_KEY_PREFIX}${mmsi}`, JSON.stringify(info));
    } catch {
      // Ignorar errores de localStorage lleno (quota exceeded)
    }
  }

  private clearCacheEntry(mmsi: string): void {
    if (isPlatformBrowser(this.getPlatformId())) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${mmsi}`);
    }
  }

  private evictOldestCacheEntries(count: number): void {
    const entries: Array<{ key: string; fetchedAt: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const info = JSON.parse(raw) as VesselInfo;
            entries.push({ key, fetchedAt: info.fetchedAt });
          }
        } catch { /* ignorar */ }
      }
    }

    entries
      .sort((a, b) => a.fetchedAt - b.fetchedAt)
      .slice(0, count)
      .forEach(entry => localStorage.removeItem(entry.key));
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────────

  private countryToEmoji(isoCode: string): string {
    if (!isoCode || isoCode.length !== 2) return '🏳️';
    const codePoints = [...isoCode.toUpperCase()].map(
      char => 0x1F1E0 + char.charCodeAt(0) - 65
    );
    return String.fromCodePoint(...codePoints);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getPlatformId(): Object {
    // Workaround: inject platform id en constructor si se necesita en métodos no-constructor
    // Aquí se usa isPlatformBrowser con 'browser' literal como simplificación
    // En el constructor real, inyectar PLATFORM_ID y guardarlo como propiedad
    return 'browser';
  }
}
```

> ⚠️ **NOTA DE IMPLEMENTACIÓN — `getPlatformId()`:**
> La implementación anterior usa un workaround para `PLATFORM_ID`. Al implementar,
> inyectar `PLATFORM_ID` correctamente en el constructor:
> ```typescript
> constructor(
>   private http: HttpClient,
>   private settings: ChartSettingsService,
>   @Inject(PLATFORM_ID) private platformId: Object,
> ) {}
> // Y reemplazar getPlatformId() por: isPlatformBrowser(this.platformId)
> ```

**Verificación Tarea 2:**
- [ ] `getEnrichedInfo('999123456')` retorna Observable con `status: 'loading'` luego `'loaded'`
- [ ] Segunda llamada con mismo MMSI retorna caché inmediatamente sin HTTP request
- [ ] Si `enableVesselEnrichment = false`, retorna datos mínimos (solo bandera del MMSI)
- [ ] `purgeExpiredCache()` elimina entradas con `fetchedAt` de más de 24h
- [ ] Con la API caída, retorna `status: 'loaded'` con datos mínimos (no `'unavailable'`)
- [ ] `tsc --noEmit` sin errores

---

### TAREA 3: Añadir `enableVesselEnrichment` a `ChartSettingsService`

**Archivo:** `src/app/features/chart/services/chart-settings.service.ts`

```typescript
// PASO 3.1: Añadir al interface ChartSettings
export interface ChartSettings {
  // ... campos existentes ...
  enableVesselEnrichment: boolean;  // ← AÑADIR
}

// PASO 3.2: Añadir al DEFAULT_SETTINGS
const DEFAULT_SETTINGS: ChartSettings = {
  // ... existentes ...
  enableVesselEnrichment: true,   // Activado por defecto (solo hace requests cuando se
                                   // selecciona un target, no de forma masiva)
};

// PASO 3.3: Añadir método toggle
toggleVesselEnrichment(): void {
  this.update({ enableVesselEnrichment: !this.settingsSubject.value.enableVesselEnrichment });
}
```

**Verificación Tarea 3:**
- [ ] `enableVesselEnrichment` persiste en localStorage
- [ ] `toggleVesselEnrichment()` cambia el estado y se persiste

---

### TAREA 4: Actualizar `ais-target-details.component.ts`

**Archivo:** `src/app/features/ais/components/ais-target-details/ais-target-details.component.ts`

Esta es la tarea de UI principal. El componente existente ya tiene las secciones de
datos AIS — hay que añadir la sección de datos enriquecidos y gestionar el estado
de carga.

**PASO 4.1: Añadir imports e inyecciones**
```typescript
import { AsyncPipe, DatePipe } from '@angular/common';
import { VesselEnrichmentService } from '../../../../data-access/vessel-enrichment/vessel-enrichment.service';
import { decodeVesselType } from '../../../../data-access/vessel-enrichment/vessel-enrichment.models';
import type { EnrichmentResult } from '../../../../data-access/vessel-enrichment/vessel-enrichment.models';
import { Observable, of, switchMap } from 'rxjs';

// En imports del @Component:
imports: [
  // ... existentes ...
  AsyncPipe,
  DatePipe,
],
```

**PASO 4.2: Inyectar el servicio y crear el observable de enriquecimiento**
```typescript
// En la clase del componente:

private readonly enrichmentService = inject(VesselEnrichmentService);

// Observable de enriquecimiento reactivo al target actual
readonly enrichment$: Observable<EnrichmentResult> = this.targetChange$.pipe(
  switchMap(target => target
    ? this.enrichmentService.getEnrichedInfo(target.mmsi)
    : of({ status: 'idle' as const, info: null })
  ),
);
```

> ⚠️ **SOBRE `targetChange$`:** El componente usa `@Input() target!: AisTarget`.
> Para hacer el observable reactivo a cambios del input, usar una de estas opciones:
>
> **Opción A (Angular 17+ con Signal inputs):**
> ```typescript
> readonly target = input.required<AisTarget>();
> readonly enrichment$ = toObservable(this.target).pipe(
>   switchMap(t => this.enrichmentService.getEnrichedInfo(t.mmsi))
> );
> ```
>
> **Opción B (Compatible con el código existente `@Input`):**
> ```typescript
> private readonly targetSubject = new BehaviorSubject<AisTarget | null>(null);
> 
> @Input() set target(value: AisTarget) {
>   this._target = value;
>   this.targetSubject.next(value);
> }
> get target(): AisTarget { return this._target!; }
> private _target?: AisTarget;
> 
> readonly enrichment$ = this.targetSubject.asObservable().pipe(
>   filter(t => t !== null),
>   distinctUntilKeyChanged('mmsi'),
>   switchMap(t => this.enrichmentService.getEnrichedInfo(t!.mmsi))
> );
> ```
>
> Usar la **Opción B** para mantener compatibilidad con el código existente.
> `distinctUntilKeyChanged('mmsi')` es crítico: evita relanzar la consulta si
> llegan actualizaciones de posición del mismo barco (cambios en SOG/COG no deben
> relanzar la petición de enriquecimiento).

**PASO 4.3: Añadir método helper para el tipo de barco**
```typescript
// Retorna el tipo más descriptivo disponible:
// 1. Descripción enriquecida de la API (si disponible)
// 2. Decode del código numérico del AIS vesselType
// 3. El string raw del AIS
// 4. 'Unknown'
getVesselTypeDisplay(enrichment: EnrichmentResult | null): string {
  if (enrichment?.info?.vesselTypeDescription) {
    return enrichment.info.vesselTypeDescription;
  }
  if (this.target?.vesselType) {
    return decodeVesselType(this.target.vesselType);
  }
  return 'Unknown';
}
```

**PASO 4.4: Añadir template de la nueva sección**

Localizar el template existente y:
1. Añadir foto y bandera en el header
2. Añadir nueva sección "Extended Info" después de "Vessel Details"
3. Añadir enlace "View on MarineTraffic" en el footer

```html
<!-- MODIFICAR el header para incluir foto y bandera: -->
<header class="details-header" [class.dangerous]="target.isDangerous">
  <!-- Foto del barco (si disponible) -->
  <div class="vessel-photo" *ngIf="(enrichment$ | async)?.info?.photoUrl as photoUrl">
    <img [src]="photoUrl" [alt]="target.name || 'Vessel'" class="vessel-photo-img"
         (error)="onPhotoError($event)" />
  </div>

  <div class="header-main">
    <h2>
      <!-- Bandera emoji si disponible -->
      <span class="flag-emoji" *ngIf="(enrichment$ | async)?.info?.flagEmoji as flag">
        {{ flag }}
      </span>
      {{ target.name || 'Unknown Vessel' }}
    </h2>
    <span class="mmsi">MMSI: {{ target.mmsi }}</span>
    <!-- IMO si disponible -->
    <span class="imo" *ngIf="(enrichment$ | async)?.info?.imoNumber as imo">
      IMO: {{ imo }}
    </span>
  </div>
  <!-- ... botón cerrar existente ... -->
</header>

<!-- REEMPLAZAR la sección "Vessel Details" para usar el tipo enriquecido: -->
<section class="details-section">
    <h3>Vessel Details</h3>
    <div class="grid-2">
        <div class="field">
            <label>Callsign</label>
            <span class="value">{{ target.callsign || '--' }}</span>
        </div>
        <div class="field">
            <label>Type</label>
            <!-- USO del método helper — muestra tipo enriquecido si disponible -->
            <span class="value">{{ getVesselTypeDisplay(enrichment$ | async) }}</span>
        </div>
        <div class="field">
            <label>Dimensions</label>
            <span class="value">
                {{ target.length ? target.length + 'm' : '--' }} ×
                {{ target.beam ? target.beam + 'm' : '--' }}
            </span>
        </div>
        <div class="field" *ngIf="(enrichment$ | async)?.info?.yearBuilt as yearBuilt">
            <label>Built</label>
            <span class="value">{{ yearBuilt }}</span>
        </div>
    </div>
</section>

<!-- AÑADIR nueva sección Extended Info (después de Vessel Details): -->
<section class="details-section details-section--enriched"
         *ngIf="enrichment$ | async as enrichment">

  <!-- Loading state -->
  <div class="enrichment-loading" *ngIf="enrichment.status === 'loading'">
    <div class="loading-spinner"></div>
    <span>Loading vessel info...</span>
  </div>

  <!-- Loaded: puertos recientes -->
  <ng-container *ngIf="enrichment.status === 'loaded' && enrichment.info?.lastPorts?.length">
    <h3>Recent Ports</h3>
    <div class="port-list">
      <div class="port-item" *ngFor="let port of enrichment.info!.lastPorts">
        <span class="port-name">{{ port.portName }}</span>
        <span class="port-country" *ngIf="port.country">{{ port.country }}</span>
        <span class="port-date" *ngIf="port.arrivedAt">
          {{ port.arrivedAt | date:'dd MMM' }}
        </span>
      </div>
    </div>
  </ng-container>

  <!-- Gross tonnage -->
  <div class="field" *ngIf="enrichment.status === 'loaded' && enrichment.info?.grossTonnage">
    <label>Gross Tonnage</label>
    <span class="value">{{ enrichment.info!.grossTonnage | number:'1.0-0' }} GT</span>
  </div>
</section>

<!-- MODIFICAR el footer para añadir enlace externo: -->
<div class="details-footer">
    <span class="last-seen">Last seen: {{ target.lastUpdated | timeAgo }}</span>
    <a
      *ngIf="(enrichment$ | async)?.info?.externalUrl as extUrl"
      [href]="extUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="external-link"
    >
      View on MarineTraffic ↗
    </a>
</div>
```

**PASO 4.5: Añadir handler de error de foto**
```typescript
onPhotoError(event: Event): void {
  // Ocultar la imagen si no carga
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}
```

**PASO 4.6: Añadir estilos para los nuevos elementos**
```css
/* AÑADIR en el array styles[] del componente: */

.vessel-photo {
  width: 100%;
  max-height: 160px;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color);
}

.vessel-photo-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  object-position: center;
}

.flag-emoji {
  font-size: 1.1rem;
  margin-right: 0.25rem;
}

.imo {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  display: block;
  margin-top: 0.2rem;
}

.details-section--enriched {
  border-top: 1px dashed var(--border-color);
}

.enrichment-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-tertiary);
  font-size: 0.8rem;
  padding: 0.5rem 0;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.port-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.port-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.port-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
}

.port-country {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.port-date {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: var(--font-mono);
}

.external-link {
  font-size: 0.75rem;
  color: var(--primary);
  text-decoration: none;
  margin-top: 0.5rem;
  display: block;
}

.external-link:hover {
  text-decoration: underline;
}
```

**Verificación Tarea 4:**
- [ ] Al seleccionar un barco, el spinner "Loading vessel info..." aparece brevemente
- [ ] Tras la carga, la bandera emoji aparece junto al nombre del barco
- [ ] El tipo de barco muestra descripción legible (ej. "Tanker") en lugar de código
- [ ] El enlace "View on MarineTraffic" abre en pestaña nueva
- [ ] Si la foto falla al cargar, la sección de foto desaparece (no broken image)
- [ ] `tsc --noEmit` sin errores

---

### TAREA 5: Añadir toggle de enriquecimiento a Settings

**Archivo:** `src/app/pages/settings/settings.page.ts`

```typescript
// En el controller — AÑADIR método:
toggleVesselEnrichment(): void {
  this.chartSettingsService.toggleVesselEnrichment();
}
```

**En el template — AÑADIR en la sección AIS / Chart:**
```html
<!-- AÑADIR en la sección de Chart, cerca de los otros toggles AIS: -->
<div class="setting-item">
  <div class="setting-info">
    <span class="setting-label">Vessel enrichment</span>
    <span class="setting-description">
      Fetch additional vessel info from external APIs when viewing AIS target details
    </span>
  </div>
  <button
    (click)="toggleVesselEnrichment()"
    class="toggle-btn"
    [class.active]="chartSettings().enableVesselEnrichment"
  >
    <span class="toggle-slider"></span>
  </button>
</div>
```

**Verificación Tarea 5:**
- [ ] El toggle aparece en Settings bajo la sección Chart
- [ ] Al desactivar, el panel de detalles AIS no muestra spinner de carga ni hace HTTP requests
- [ ] Al reactivar, las próximas aperturas de panel AIS vuelven a enriquecer

---

### TAREA 6: Bootstrap — purgar caché expirado al inicio

**Archivo:** `src/app/app.ts` (root component)

```typescript
// AÑADIR en ngOnInit o en el constructor del root component:
private readonly enrichmentService = inject(VesselEnrichmentService);

ngOnInit(): void {
  // ... existente ...
  // Purgar caché de vessels expirado en background
  setTimeout(() => this.enrichmentService.purgeExpiredCache(), 5000);
}
```

**Verificación Tarea 6:**
- [ ] Al recargar la app, las entradas de localStorage expiradas (>24h) se limpian
- [ ] La limpieza no bloquea el startup (5 segundos de delay)

---

### TAREA 7: Actualizar i18n

**Archivos:** `en.ts` y `es.ts`

```typescript
// en.ts — AÑADIR:
settings: {
  vessel_enrichment: 'Vessel enrichment',
  vessel_enrichment_desc: 'Fetch extended vessel info from external APIs',
}
ais: {
  extended_info: 'Extended Info',
  loading_vessel: 'Loading vessel info...',
  recent_ports: 'Recent Ports',
  gross_tonnage: 'Gross Tonnage',
  year_built: 'Built',
  view_external: 'View on MarineTraffic',
}

// es.ts — AÑADIR:
settings: {
  vessel_enrichment: 'Enriquecimiento de buques',
  vessel_enrichment_desc: 'Consultar info extendida de buques desde APIs externas',
}
ais: {
  extended_info: 'Info Extendida',
  loading_vessel: 'Cargando información del buque...',
  recent_ports: 'Puertos Recientes',
  gross_tonnage: 'Arqueo Bruto',
  year_built: 'Construido',
  view_external: 'Ver en MarineTraffic',
}
```

---

## 🧪 PLAN DE VERIFICACIÓN COMPLETO

### Test 1: Flujo básico de enriquecimiento

```
Prerrequisito: Simulador activo con básicCruise (tiene BLACK PEARL como target AIS)

1. Abrir http://localhost:4200/chart
2. Hacer click en el target AIS visible en el mapa
3. Se abre el panel ais-target-details
4. ESPERADO (0-500ms): Spinner "Loading vessel info..." aparece brevemente
5. ESPERADO (1-3s o inmediato si caché):
   - Bandera emoji visible junto al nombre
   - Tipo de barco descriptivo (no código numérico)
   - Enlace "View on MarineTraffic" en el footer
6. Si la API falla: panel muestra bandera deducida del MMSI (si MID es conocido)
   y el spinner desaparece (no queda colgado)
```

### Test 2: Caché — segunda apertura del mismo barco

```
1. Hacer click en un barco AIS, esperar a que cargue el enriquecimiento
2. Cerrar el panel
3. Hacer click de nuevo en el mismo barco
4. ESPERADO: Panel muestra datos INMEDIATAMENTE, sin spinner
5. Verificar en DevTools → Network: NO hay nueva HTTP request para /api/v1/vessel
6. Verificar en DevTools → Application → localStorage:
   - Existe clave 'omi-vessel-{mmsi}' con JSON válido
   - Tiene campo 'fetchedAt' con timestamp reciente
```

### Test 3: Feature toggle Off

```
1. Ir a Settings → Chart → desactivar "Vessel enrichment"
2. Hacer click en un barco AIS
3. ESPERADO:
   - No hay spinner de carga
   - Panel muestra solo datos AIS (nombre, MMSI, SOG, COG, etc.)
   - Bandera emoji PUEDE aparecer (se deduce del MMSI sin llamar a la API)
   - No hay sección "Recent Ports" ni "Gross Tonnage"
   - NO hay HTTP requests a api.vessel.observer (verificar en Network tab)
4. Reactivar el toggle
5. ESPERADO: La próxima apertura de un panel AIS vuelve a consultar la API
```

### Test 4: Rate limiting

```
1. Con busy-shipping-lane (25 targets), abrir rápidamente múltiples paneles AIS
   (click en varios targets en sucesión rápida)
2. En DevTools → Network → filtrar por api.vessel.observer
3. ESPERADO:
   - Los requests aparecen con ~1 segundo de separación entre ellos
   - No hay rafaga de 25 requests simultáneos
   - El UI sigue siendo responsivo durante la carga
```

### Test 5: MMSI flag decode (sin red)

```
1. Desactivar la red en DevTools (Settings → Network → Offline)
2. Hacer click en un barco AIS
3. ESPERADO:
   - Spinner aparece brevemente
   - Panel muestra bandera emoji (deducida del MMSI, sin red)
   - El tipo de barco usa decode local si vesselType es código numérico
   - Enlace "View on MarineTraffic" aparece (no requiere red)
   - NO hay error visible ni crashes
4. Reactivar la red
```

### Test 6: Vessel type decode local

```
Para verificar el decode sin depender de la API:
1. Con el simulador activo (BLACK PEARL tiene vesselType por defecto)
2. Si el simulador publica vesselType como número (ej. 80 = Tanker):
   ESPERADO: Panel muestra "Tanker" no "80"
3. Si el simulador publica string descriptivo (ej. "Cargo"):
   ESPERADO: Panel muestra "Cargo" tal cual (pass-through)
```

### Test 7: Expiración de caché (simulado)

```
En DevTools → Application → localStorage:
1. Encontrar una clave 'omi-vessel-{mmsi}'
2. Editar el valor: cambiar 'fetchedAt' a un timestamp de hace 25 horas
   (Date.now() - 25 * 60 * 60 * 1000)
3. Recargar la página
4. Esperar 5 segundos (purgeExpiredCache delay)
5. ESPERADO: La clave 'omi-vessel-{mmsi}' ha sido eliminada
6. Hacer click en ese barco de nuevo
7. ESPERADO: Se vuelve a hacer el HTTP request (caché invalidado)
```

---

## ⚠️ POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: CORS error al llamar a api.vessel.observer

**Síntoma:** `Access to XMLHttpRequest blocked by CORS policy` en consola del browser  
**Causa:** La API no permite requests desde `localhost:4200`  
**Solución:**
```typescript
// Opción A: Crear un proxy de desarrollo en angular.json
// proxy.conf.json:
{
  "/vessel-api/*": {
    "target": "https://api.vessel.observer",
    "changeOrigin": true,
    "pathRewrite": { "^/vessel-api": "" }
  }
}
// Cambiar la URL en el servicio a /vessel-api/api/v1/vessel/{mmsi}

// Opción B: Si la API falla por CORS, el servicio cae al minimal (bandera del MMSI)
// Esto ya está implementado — es comportamiento correcto
```

### Problema 2: `BehaviorSubject` de `ChartSettingsService` no tiene `enableVesselEnrichment`

**Síntoma:** `settings.snapshot.enableVesselEnrichment` es `undefined` en runtime  
**Causa:** El merge de `DEFAULT_SETTINGS` con localStorage usa `{ ...DEFAULT_SETTINGS, ...parsed }`
lo que no añade campos nuevos si `parsed` viene del localStorage antiguo.  
**Solución:** El spread operator ya maneja esto correctamente:
```typescript
// Si localStorage tiene settings sin enableVesselEnrichment:
// { ...DEFAULT_SETTINGS, ...parsed } → toma enableVesselEnrichment de DEFAULT_SETTINGS
// Esto ya funciona correctamente por diseño del servicio existente
```

### Problema 3: `(enrichment$ | async)` llama a `getEnrichedInfo` múltiples veces

**Síntoma:** Múltiples HTTP requests para el mismo MMSI en la misma apertura del panel  
**Causa:** El template usa `enrichment$ | async` en múltiples lugares, creando múltiples subscripciones  
**Solución:** Usar `*ngLet` o almacenar en variable de template:
```html
<!-- En lugar de múltiples (enrichment$ | async): -->
<ng-container *ngIf="enrichment$ | async as enrichment">
  <!-- Usar 'enrichment' directamente dentro de este contenedor -->
  <span *ngIf="enrichment.info?.flagEmoji">{{ enrichment.info!.flagEmoji }}</span>
  <!-- ... etc ... -->
</ng-container>
```
Alternativamente, compartir el observable con `shareReplay(1)` en el componente:
```typescript
// En el componente, wrappear con shareReplay:
readonly enrichment$ = this.targetSubject.pipe(
  // ...
  shareReplay({ bufferSize: 1, refCount: true })  // ← AÑADIR
);
```

### Problema 4: `switchMap` reactiva a CADA update de posición del barco

**Síntoma:** Una nueva petición HTTP cada vez que el barco mueve 50 metros  
**Causa:** El `@Input() target` recibe updates frecuentes desde Signal K  
**Solución:** Ya cubierta con `distinctUntilKeyChanged('mmsi')` en la implementación.
Verificar que este operador está presente. Si el target cambia de posición pero mantiene
el mismo MMSI, el observable NO debe relanzar la petición.

### Problema 5: localStorage quota exceeded con muchos barcos

**Síntoma:** `QuotaExceededError: Failed to execute 'setItem' on 'Storage'`  
**Causa:** 200 entradas × ~1KB cada una = ~200KB (dentro del límite de 5MB),
pero si los datos son más grandes puede fallar.  
**Solución:** Ya cubierta con `evictOldestCacheEntries(20)` y el try/catch en `saveToCache`.
El catch silencia el error sin crash.

---

## ✅ DEFINITION OF DONE

- [ ] **T1:** `vessel-enrichment.models.ts` con todos los tipos, `decodeVesselType()`, `decodeFlagFromMmsi()`, `MID_TO_COUNTRY` para los 30+ países principales
- [ ] **T2:** `VesselEnrichmentService` con caché 24h en localStorage, rate limiting 1req/s, fallback a datos mínimos del MMSI
- [ ] **T3:** `enableVesselEnrichment: boolean` en `ChartSettings` con default `true`, persiste en localStorage
- [ ] **T4a:** `enrichment$` observable en el componente, reactivo a cambios de MMSI (no a cambios de posición)
- [ ] **T4b:** Foto del barco en header del panel (si disponible), oculta si no carga
- [ ] **T4c:** Bandera emoji junto al nombre (deducida de MMSI incluso sin red)
- [ ] **T4d:** Tipo de barco descriptivo usando `decodeVesselType()`
- [ ] **T4e:** Sección "Recent Ports" si la API retorna datos de puertos
- [ ] **T4f:** Enlace "View on MarineTraffic" en el footer
- [ ] **T4g:** Spinner durante la carga, desaparece tras éxito O fallo
- [ ] **T5:** Toggle "Vessel enrichment" en Settings, funcional
- [ ] **T6:** `purgeExpiredCache()` llamado al startup con 5s de delay
- [ ] **T7:** i18n actualizado EN/ES
- [ ] **Graceful degradation:** Con red caída, panel funciona con datos AIS + bandera del MMSI
- [ ] **No breaking changes:** CPA, alarmas, tracks de P1, estilos ENC de P2 — todo intacto
- [ ] **Build:** `ng build --configuration=production` sin errores

**Commit message sugerido:**
```
feat(ais): add vessel enrichment service with external API lookup and local cache

- Add VesselEnrichmentService with 24h localStorage cache per MMSI
- Rate limiting: 1 request/second, queue-based processing
- Graceful degradation: falls back to MMSI-decoded flag when API unavailable
- Add vessel-enrichment.models.ts with VesselInfo, EnrichmentResult types
- decodeVesselType(): ITU-R M.1371-5 numeric codes → descriptive labels
- decodeFlagFromMmsi(): MID decode for 30+ countries, no network required
- MID_TO_COUNTRY map: flag country from first 3 digits of MMSI
- countryToFlagEmoji(): Unicode regional indicator → flag emoji
- AIS target details panel enriched with: flag emoji, vessel type description,
  photo (if available), IMO number, year built, recent ports, gross tonnage
- External MarineTraffic link for full vessel details
- Settings toggle: enableVesselEnrichment (default: true)
- Loading spinner in panel while fetching, disappears on success or failure
- distinctUntilKeyChanged('mmsi') prevents re-fetch on position updates
- purgeExpiredCache() on app bootstrap (5s delay, non-blocking)
- i18n EN/ES for all new keys
```

---

## 🚀 EXTENSIONES FUTURAS (documentadas, NO implementar ahora)

- **P4: AIS Aggregation Internet** — AISHub WebSocket o AISStream.io para cobertura global
  más allá del alcance del receptor RTL-SDR (~40nm). El `VesselEnrichmentService` ya tiene
  la infraestructura de caché y models; solo hay que añadir la fuente de datos en tiempo real.

- **API key configurable en Settings** — Añadir campos en Settings para API keys de
  VesselFinder o MarineTraffic, almacenadas en localStorage, usadas en las peticiones.
  El servicio ya tiene la arquitectura para esto: solo cambiar la URL base.

- **Vessel photo preloading** — Precargar las fotos de los barcos más cercanos mientras
  aún no se han seleccionado, usando `prefetchBatch()` que ya está implementado.

- **Ship silhouette por tipo** — Para barcos sin foto, mostrar una silueta SVG del tipo
  correcto (portacontenedores, tanquero, velero, etc.) usando `vesselTypeDescription`.

- **Historical port visits expanded** — Mostrar los últimos 10 puertos en un modal
  separado con fechas completas y duración de escala.
