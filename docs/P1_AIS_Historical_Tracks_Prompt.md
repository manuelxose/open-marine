# PROMPT P1: AIS Historical Tracks per Vessel
## Open Marine Instrumentation — Sistema de Adquisición de Datos AIS Mejorado

**Versión:** 1.0 | **Fecha:** 2026-02-23 | **Estimación:** 4-6 horas  
**Prerequisito completado:** P0 (OpenSeaMap overlay) — toggle de 3 modos ya implementado  
**Prioridad:** P1 — Mejora significativa de información AIS sin breaking changes

---

## 🎯 OBJETIVO

Añadir **tracks históricos por barco AIS**: cada vessel recibido por AIS deja un rastro
de su trayectoria reciente en el mapa, igual que lo hacen sistemas profesionales como
MarineTraffic, VesselFinder o los chartplotters Garmin/Raymarine.

Adicionalmente, en la **vista de detalle** de cada barco AIS se mostrará una **predicción
lineal** de su trayectoria a 6 minutos, mejorando la evaluación visual de situaciones
de tráfico.

**Estado final esperado:**
- Cada AIS target en el mapa muestra una estela de su recorrido reciente (hasta 30 min)
- La estela se desvanece en intensidad hacia el pasado (más antiguo = más transparente)
- El panel de detalles del target muestra la predicción a 6 min como línea de puntos ámbar
- Todo funciona sobre los 3 modos de mapa (OSM, Satellite, Nautical) implementados en P0

---

## 📁 ARCHIVOS INVOLUCRADOS

```
marine-instrumentation-ui/src/app/
├── core/models/
│   └── ais.model.ts                        ← MODIFICAR: añadir AisTrackPoint interface
├── state/ais/
│   └── ais-store.service.ts                ← MODIFICAR: añadir track buffer por MMSI
├── features/chart/
│   ├── services/
│   │   ├── chart-facade.service.ts         ← MODIFICAR: exponer tracks GeoJSON observable
│   │   └── maplibre-engine.service.ts      ← MODIFICAR: 2 nuevos layers (tracks + prediction)
│   ├── components/
│   │   └── map-controls/
│   │       └── map-controls.component.html ← MODIFICAR: toggle de tracks AIS
│   └── chart.page.ts                       ← MODIFICAR: conectar toggle + signals
├── features/ais/components/
│   └── ais-target-details/
│       └── ais-target-details.component.ts ← MODIFICAR: mostrar track history + prediction
└── core/i18n/
    ├── en.ts                               ← MODIFICAR: nueva clave 'ais_tracks'
    └── es.ts                               ← MODIFICAR: nueva clave 'ais_tracks'
```

---

## 🔍 ESTADO ACTUAL DEL CÓDIGO (contexto crítico para el agente)

### `ais-store.service.ts` — estructura actual completa
```typescript
// EXISTE — AisStoreService tiene:
// - signal _targets: Map<string, AisTarget>   (por MMSI)
// - computed dangerousTargets
// - TIMEOUT_MS = 10 * 60 * 1000              (10 min hasta purgar target)
// - CLEANUP_INTERVAL_MS = 60 * 1000
// - updateTarget(mmsi, data, timestamp)       ← aquí hay que enganchar el track
// - calculateRisk(target)                     (CPA/TCPA)
// - cleanupStaleTargets()                     ← aquí hay que limpiar tracks también
//
// NO EXISTE — ningún almacenamiento de posiciones históricas por target
```

### `ais.model.ts` — interfaz AisTarget actual
```typescript
// EXISTE — campos relevantes para este trabajo:
export interface AisTarget {
  mmsi: string;
  latitude: number;     // posición actual
  longitude: number;    // posición actual
  sog?: number;         // m/s (Signal K SI units)
  cog?: number;         // radians
  heading?: number;     // radians
  lastUpdated: number;  // timestamp ms
  isDangerous?: boolean;
  cpa?: number;
  tcpa?: number;
  // ... resto de campos estáticos (name, callsign, etc.)
}
// NO EXISTE — ningún campo de track histórico en AisTarget
```

### `maplibre-engine.service.ts` — constantes y layers AIS existentes
```typescript
// EXISTE:
const AIS_SOURCE_ID = 'chart-ais-source';
const AIS_LAYER_ID = 'chart-ais-layer';
const AIS_ICON_ID = 'chart-ais-icon';
const AIS_ICON_DANGEROUS_ID = 'chart-ais-icon-dangerous';
const CPA_LINE_SOURCE_ID = 'chart-cpa-line-source';
const CPA_LINE_LAYER_ID = 'chart-cpa-line-layer';

// NO EXISTE — ningún source/layer para tracks históricos ni predicción
// NO EXISTE — lastAisTracks ni lastAisPredictions en las propiedades privadas
```

### `chart-facade.service.ts` — observables AIS existentes
```typescript
// EXISTE:
readonly aisTargetsGeoJson$   // FeatureCollection<Point> con posiciones actuales
readonly cpaLinesGeoJson$     // FeatureCollection<LineString> con líneas de colisión

// NO EXISTE:
// - aisTracksGeoJson$         ← hay que crear
// - aisPredictionsGeoJson$    ← hay que crear
// - showAisTracks (setting)   ← hay que crear
```

### `chart.page.ts` — effects AIS existentes
```typescript
// EXISTE:
effect(() => { this.engine.updateAisTargets(this.aisTargetsSignal()); });
effect(() => { this.engine.updateCpaLines(this.cpaLinesSignal()); });

// NO EXISTE:
// - aisTracksSignal
// - aisPredictionsSignal
// - handleToggleAisTracks()
```

### `ChartSettingsService` — settings existentes relevantes
```typescript
// EXISTE (para referencia de patrón):
// - showTrack: boolean         (track del barco propio)
// - showVector: boolean        (vector COG del barco propio)
// - showRangeRings: boolean

// HAY QUE AÑADIR:
// - showAisTracks: boolean     (tracks históricos de otros barcos)
```

---

## 📐 DISEÑO TÉCNICO COMPLETO

### Arquitectura de datos

```
Signal K WebSocket
       ↓
signalk-client.service.ts → processAisUpdate()
       ↓
AisStoreService.updateTarget(mmsi, data, timestamp)
       ↓ [NUEVO]
AisStoreService — trackBuffer: Map<string, AisTrackPoint[]>
       ↓
ChartFacadeService — aisTracksGeoJson$ (computed)
       ↓
MapLibreEngineService — AIS_TRACKS source + layer
       ↓
MapLibre GL JS — renderizado WebGL
```

### Formato GeoJSON para los tracks

Cada track es una `LineString` con propiedades `mmsi` y `age` (0=más reciente, 1=más antiguo).
MapLibre usará `age` para interpolar la opacidad (reciente=opaco, antiguo=transparente).

```
FeatureCollection<LineString> {
  features: [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[lon0,lat0], [lon1,lat1], ...] },
      properties: {
        mmsi: '123456789',
        isDangerous: false,
        age: 0.0   // fracción 0-1, calculado desde timestamp del último punto
      }
    },
    // ... un Feature por cada barco con track
  ]
}
```

### Formato GeoJSON para las predicciones

```
FeatureCollection<LineString> {
  features: [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[lonNow, latNow], [lonFuture, latFuture]] },
      properties: {
        mmsi: '123456789',
        isDangerous: false
      }
    }
  ]
}
```

---

## 📐 ESPECIFICACIÓN TÉCNICA DETALLADA POR TAREA

### TAREA 1: Añadir `AisTrackPoint` a `ais.model.ts`

**Archivo:** `src/app/core/models/ais.model.ts`

**Qué hacer:** Añadir la interfaz para los puntos del track histórico. NO modificar `AisTarget`.

```typescript
// AÑADIR al final del archivo (después de la interfaz AisState):

/**
 * A single recorded position point for an AIS target's historical track.
 * Stored separately from AisTarget to avoid bloating the main signal.
 */
export interface AisTrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;   // ms since epoch
  sog?: number;        // m/s — para futuro color-by-speed
  cog?: number;        // radians — para futuro análisis de maniobras
}
```

**Verificación Tarea 1:**
- [ ] Interface exportada desde `ais.model.ts`
- [ ] `tsc --noEmit` sin errores

---

### TAREA 2: Añadir track buffer a `AisStoreService`

**Archivo:** `src/app/state/ais/ais-store.service.ts`

**Qué hacer:** Añadir un `Map<string, AisTrackPoint[]>` privado que almacene el historial
de posiciones por MMSI. El buffer NO es un Signal porque no necesita reactividad granular
por sí solo — los observables del facade calcularán los tracks derivados.

**Implementación exacta:**

```typescript
// PASO 2.1: Importar la nueva interface
import { AisTarget, AisTrackPoint } from '../../core/models/ais.model';

// PASO 2.2: Añadir constantes de configuración del track
// (junto a CPA_WARNING_METERS y TCPA_WARNING_SECONDS)
private readonly TRACK_MAX_AGE_MS = 30 * 60 * 1000;    // 30 minutos de historia
private readonly TRACK_MIN_DISTANCE_M = 50;              // mínimo 50m entre puntos
private readonly TRACK_MAX_POINTS_PER_TARGET = 120;      // máx 120 puntos (~1 punto/15s × 30min)

// PASO 2.3: Añadir el buffer de tracks como propiedad privada
// (junto a _targets signal)
private readonly _trackBuffer = new Map<string, AisTrackPoint[]>();

// PASO 2.4: Añadir getter público para acceso read-only desde el facade
public getTrackPoints(mmsi: string): AisTrackPoint[] {
  return this._trackBuffer.get(mmsi) ?? [];
}

public getAllTracks(): Map<string, AisTrackPoint[]> {
  return this._trackBuffer;
}

// PASO 2.5: Modificar updateTarget() para registrar puntos de track
// LOCALIZAR el método updateTarget() existente
// AÑADIR la llamada a recordTrackPoint ANTES del final del método,
// justo después de que `updated` tenga su posición calculada:

updateTarget(mmsi: string, data: Partial<AisTarget>, timestamp: number = Date.now()): void {
  // ... código existente sin cambios hasta el final ...

  const nextMap = new Map(currentMap);
  nextMap.set(mmsi, updated);
  this._targets.set(nextMap);

  // ← AÑADIR AQUÍ (después de actualizar el signal):
  // Solo registrar punto si hay posición válida en los datos nuevos
  if (data.latitude !== undefined && data.longitude !== undefined) {
    this.recordTrackPoint(mmsi, {
      latitude: updated.latitude,
      longitude: updated.longitude,
      timestamp,
      sog: updated.sog,
      cog: updated.cog,
    });
  }
}

// PASO 2.6: Implementar recordTrackPoint()
// (método privado nuevo al final de la clase)
private recordTrackPoint(mmsi: string, point: AisTrackPoint): void {
  const existing = this._trackBuffer.get(mmsi) ?? [];

  // Throttle: no añadir punto si el anterior está muy cerca
  if (existing.length > 0) {
    const last = existing[existing.length - 1];
    const distanceM = this.haversineApproxMeters(
      last.latitude, last.longitude,
      point.latitude, point.longitude
    );
    if (distanceM < this.TRACK_MIN_DISTANCE_M) {
      return; // Demasiado cerca, ignorar
    }
  }

  const updated = [...existing, point];

  // Limitar por número máximo de puntos
  const trimmed = updated.length > this.TRACK_MAX_POINTS_PER_TARGET
    ? updated.slice(updated.length - this.TRACK_MAX_POINTS_PER_TARGET)
    : updated;

  this._trackBuffer.set(mmsi, trimmed);
}

// PASO 2.7: Helper de distancia aproximada (no necesita ser exacto, solo para throttle)
private haversineApproxMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// PASO 2.8: Extender cleanupStaleTargets() para limpiar tracks también
// LOCALIZAR cleanupStaleTargets() existente
// AÑADIR limpieza de tracks al final del método:

private cleanupStaleTargets(): void {
  const now = Date.now();
  let changed = false;
  const currentMap = this._targets();
  const nextMap = new Map(currentMap);

  for (const [mmsi, target] of currentMap) {
    if (now - target.lastUpdated > this.TIMEOUT_MS) {
      nextMap.delete(mmsi);
      this._trackBuffer.delete(mmsi);   // ← AÑADIR ESTA LÍNEA
      changed = true;
    }
  }

  // ← AÑADIR TAMBIÉN: purgar puntos de track demasiado antiguos de targets activos
  for (const [mmsi, points] of this._trackBuffer.entries()) {
    const fresh = points.filter(p => now - p.timestamp <= this.TRACK_MAX_AGE_MS);
    if (fresh.length !== points.length) {
      this._trackBuffer.set(mmsi, fresh);
    }
  }

  if (changed) {
    this._targets.set(nextMap);
  }
}
```

**Verificación Tarea 2:**
- [ ] `aisStore.getTrackPoints('123')` retorna `[]` para MMSI desconocido
- [ ] Tras 5 updates de posición distintos, `getTrackPoints()` retorna array de puntos
- [ ] Puntos con la misma posición (distancia < 50m) no se duplican
- [ ] El array nunca supera `TRACK_MAX_POINTS_PER_TARGET` elementos
- [ ] `tsc --noEmit` sin errores

---

### TAREA 3: Añadir `showAisTracks` setting a `ChartSettingsService`

**Archivo:** `src/app/features/chart/services/chart-settings.service.ts`

**Qué hacer:** Añadir el toggle de visibilidad de tracks AIS siguiendo exactamente el patrón
de `showTrack` (track del barco propio) que ya existe.

```typescript
// LOCALIZAR en ChartSettingsService el patrón de showTrack:
// Hay un BehaviorSubject o Signal para showTrack, y un método toggleTrack()
// REPLICAR el mismo patrón para showAisTracks:

// Si el servicio usa BehaviorSubjects:
private readonly _showAisTracks$ = new BehaviorSubject<boolean>(true); // true por defecto
readonly showAisTracks$ = this._showAisTracks$.asObservable();

toggleAisTracks(): void {
  this._showAisTracks$.next(!this._showAisTracks$.value);
}

// Si el servicio usa localStorage para persistencia, añadir:
// - Clave: 'omi-chart-show-ais-tracks'
// - Inicialización desde localStorage en constructor
// (seguir el patrón exacto que usan showTrack, showVector, etc.)
```

> ⚠️ **NOTA:** Revisar el archivo antes de implementar. El patrón exacto depende de si
> `ChartSettingsService` usa BehaviorSubjects, Signals, o localStorage. Replicar el patrón
> existente, no inventar uno nuevo.

**Verificación Tarea 3:**
- [ ] `showAisTracks$` emite `true` por defecto
- [ ] `toggleAisTracks()` cambia el valor
- [ ] El estado persiste (si el servicio usa localStorage)

---

### TAREA 4: Añadir observables de tracks y predicciones a `ChartFacadeService`

**Archivo:** `src/app/features/chart/services/chart-facade.service.ts`

**Qué hacer:** Crear dos observables derivados que produzcan GeoJSON para los tracks históricos
y las predicciones lineales.

**Implementación exacta:**

```typescript
// PASO 4.1: Importar AisTrackPoint
import type { AisTrackPoint } from '../../../core/models/ais.model';

// PASO 4.2: Añadir método delegado al facade para el toggle
toggleAisTracks(): void {
  this.settingsService.toggleAisTracks();
}

// PASO 4.3: Crear observable de tracks GeoJSON
// (añadir junto a aisTargetsGeoJson$ y cpaLinesGeoJson$)

readonly aisTracksGeoJson$ = combineLatest([
  toObservable(this.aisStore.targets),   // trigger en cada actualización de targets
  this.settingsService.showAisTracks$,
]).pipe(
  map(([targetsMap, showTracks]) => {
    if (!showTracks) {
      return { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>;
    }

    const features: GeoJSON.Feature<LineString>[] = [];
    const now = Date.now();

    for (const mmsi of targetsMap.keys()) {
      const points = this.aisStore.getTrackPoints(mmsi);
      if (points.length < 2) continue; // Necesitamos al menos 2 puntos para una línea

      const coordinates: [number, number][] = points.map(p => [p.longitude, p.latitude]);

      // Calcular "age" como fracción 0-1 basada en el punto MÁS RECIENTE del track
      // (0 = acabado de llegar, 1 = casi en el límite de 30 min)
      const newestTimestamp = points[points.length - 1].timestamp;
      const ageMs = now - newestTimestamp;
      const ageFraction = Math.min(1, ageMs / (30 * 60 * 1000));

      const target = targetsMap.get(mmsi);

      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: {
          mmsi,
          isDangerous: target?.isDangerous ?? false,
          age: ageFraction,
        },
      });
    }

    return { type: 'FeatureCollection', features } as FeatureCollection<LineString>;
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
);

// PASO 4.4: Crear observable de predicciones GeoJSON
readonly aisPredictionsGeoJson$ = combineLatest([
  toObservable(this.aisStore.targets),
  this.settingsService.showAisTracks$,
]).pipe(
  map(([targetsMap, showTracks]) => {
    if (!showTracks) {
      return { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>;
    }

    const PREDICTION_SECONDS = 6 * 60; // 6 minutos
    const features: GeoJSON.Feature<LineString>[] = [];

    for (const [mmsi, target] of targetsMap) {
      // Solo predecir si tiene posición, SOG y COG válidos
      if (!target.latitude || !target.longitude ||
          typeof target.sog !== 'number' || typeof target.cog !== 'number' ||
          target.sog < 0.5) { // Ignorar barcos casi parados (< ~1 knot)
        continue;
      }

      // Calcular posición futura: distance = SOG (m/s) × time (s)
      const distanceMeters = target.sog * PREDICTION_SECONDS;
      const cogDegrees = toDegrees(target.cog);

      const futurePos = projectDestination(
        { lat: target.latitude, lon: target.longitude },
        cogDegrees,
        distanceMeters,
      );

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [target.longitude, target.latitude],
            [futurePos.lon, futurePos.lat],
          ],
        },
        properties: {
          mmsi,
          isDangerous: target.isDangerous ?? false,
        },
      });
    }

    return { type: 'FeatureCollection', features } as FeatureCollection<LineString>;
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
);
```

> 📌 **IMPORTS necesarios a verificar:**  
> - `toDegrees` y `projectDestination` ya están importados (se usan en `cpaLinesGeoJson$`)
> - `LineString` de `geojson` ya debería estar importado
> - `GeoJSON` namespace puede necesitar: `import type * as GeoJSON from 'geojson';`

**Verificación Tarea 4:**
- [ ] `aisTracksGeoJson$` emite `FeatureCollection` con `features: []` cuando `showAisTracks = false`
- [ ] `aisPredictionsGeoJson$` no incluye barcos con `sog < 0.5`
- [ ] `tsc --noEmit` sin errores

---

### TAREA 5: Añadir layers de tracks y predicciones a `MapLibreEngineService`

**Archivo:** `src/app/features/chart/services/maplibre-engine.service.ts`

Esta es la tarea más extensa. Añadir 2 nuevos pares source/layer, siguiendo exactamente
el patrón de los layers existentes (`CPA_LINE_SOURCE_ID`, etc.).

**Implementación exacta:**

```typescript
// PASO 5.1: Añadir constantes de IDs (junto al bloque de constantes existente)
const AIS_TRACKS_SOURCE_ID    = 'chart-ais-tracks-source';
const AIS_TRACKS_LAYER_ID     = 'chart-ais-tracks-layer';
const AIS_PREDICT_SOURCE_ID   = 'chart-ais-predict-source';
const AIS_PREDICT_LAYER_ID    = 'chart-ais-predict-layer';

// PASO 5.2: Añadir propiedades privadas de estado (junto a lastAisTargets, lastCpaLines)
private lastAisTracks: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
private lastAisPredictions: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };

// PASO 5.3: Añadir métodos públicos de actualización (junto a updateAisTargets, updateCpaLines)
updateAisTracks(geojson: FeatureCollection<LineString>): void {
  this.lastAisTracks = geojson;
  if (this.mapReady) {
    this.applyAisTracks();
  }
}

updateAisPredictions(geojson: FeatureCollection<LineString>): void {
  this.lastAisPredictions = geojson;
  if (this.mapReady) {
    this.applyAisPredictions();
  }
}

// PASO 5.4: Llamar a los nuevos ensure* y apply* desde onStyleReady()
// LOCALIZAR onStyleReady() — AÑADIR las llamadas en el orden correcto:
// Los tracks deben renderizarse DEBAJO de los iconos AIS (layers ordenados por inserción)
// Orden correcto: tracks → prediction → AIS icons → CPA lines

private onStyleReady(): void {
  // ... layers existentes ...
  this.ensureAisTracksLayer();        // ← AÑADIR (antes de ensureAisLayer)
  this.ensureAisPredictionsLayer();   // ← AÑADIR (antes de ensureAisLayer)
  this.ensureAisLayer();              // existente
  this.ensureCpaLinesLayer();         // existente

  // ... applies existentes ...
  this.applyAisTracks();              // ← AÑADIR
  this.applyAisPredictions();         // ← AÑADIR
  this.applyAisTargets();             // existente
  this.applyCpaLines();               // existente
  // ...
}

// PASO 5.5: Implementar ensureAisTracksLayer()
private ensureAisTracksLayer(): void {
  if (!this.map) return;

  if (!this.map.getSource(AIS_TRACKS_SOURCE_ID)) {
    this.map.addSource(AIS_TRACKS_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!this.map.getLayer(AIS_TRACKS_LAYER_ID)) {
    this.map.addLayer({
      id: AIS_TRACKS_LAYER_ID,
      type: 'line',
      source: AIS_TRACKS_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        // Color: gris para barcos normales, rojo para peligrosos
        'line-color': [
          'case',
          ['boolean', ['get', 'isDangerous'], false],
          '#ef4444',   // red-500 para peligrosos
          '#9ca3af',   // gray-400 para normales
        ],
        'line-width': 1.5,
        // Opacidad inversamente proporcional a la antigüedad
        // age=0 (reciente) → opacity=0.75
        // age=1 (antiguo)  → opacity=0.05
        'line-opacity': [
          'interpolate', ['linear'], ['get', 'age'],
          0, 0.75,
          1, 0.05,
        ],
      },
    });
  }
}

// PASO 5.6: Implementar ensureAisPredictionsLayer()
private ensureAisPredictionsLayer(): void {
  if (!this.map) return;

  if (!this.map.getSource(AIS_PREDICT_SOURCE_ID)) {
    this.map.addSource(AIS_PREDICT_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!this.map.getLayer(AIS_PREDICT_LAYER_ID)) {
    this.map.addLayer({
      id: AIS_PREDICT_LAYER_ID,
      type: 'line',
      source: AIS_PREDICT_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        // Mismo color que track, pero con dasharray para distinguirlo
        'line-color': [
          'case',
          ['boolean', ['get', 'isDangerous'], false],
          '#ef4444',
          '#f59e0b',   // amber-500 — diferente del track para que sea distinguible
        ],
        'line-width': 1.5,
        'line-opacity': 0.6,
        'line-dasharray': [2, 3],   // línea de puntos más abierta que la línea CPA
      },
    });
  }
}

// PASO 5.7: Implementar los métodos apply*
private applyAisTracks(): void {
  if (!this.map) return;
  const source = this.map.getSource(AIS_TRACKS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  source?.setData(this.lastAisTracks);
}

private applyAisPredictions(): void {
  if (!this.map) return;
  const source = this.map.getSource(AIS_PREDICT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  source?.setData(this.lastAisPredictions);
}
```

**Verificación Tarea 5:**
- [ ] `onStyleReady()` llama a los 4 nuevos métodos en el orden correcto
- [ ] Las constantes de ID están definidas sin duplicar ninguna existente
- [ ] Las propiedades privadas `lastAisTracks` y `lastAisPredictions` están inicializadas
- [ ] `tsc --noEmit` sin errores

---

### TAREA 6: Conectar los nuevos observables en `chart.page.ts`

**Archivo:** `src/app/features/chart/chart.page.ts`

**Qué hacer:** Crear los signals derivados y los effects para alimentar el engine MapLibre,
siguiendo el patrón exacto de los AIS targets existentes.

```typescript
// PASO 6.1: Localizar los signals existentes de AIS en el componente
// Habrá algo como:
// private readonly aisTargetsSignal = toSignal(this.facade.aisTargetsGeoJson$, {...});
// private readonly cpaLinesSignal   = toSignal(this.facade.cpaLinesGeoJson$,   {...});

// PASO 6.2: Añadir los nuevos signals (junto a los existentes)
private readonly aisTracksSignal = toSignal(
  this.facade.aisTracksGeoJson$,
  { initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString> }
);
private readonly aisPredictionsSignal = toSignal(
  this.facade.aisPredictionsGeoJson$,
  { initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString> }
);

// PASO 6.3: Añadir los effects en el constructor / ngOnInit
// (junto a los effects de updateAisTargets y updateCpaLines)
effect(() => {
  this.engine.updateAisTracks(this.aisTracksSignal());
});
effect(() => {
  this.engine.updateAisPredictions(this.aisPredictionsSignal());
});

// PASO 6.4: Añadir el handler del toggle
handleToggleAisTracks(): void {
  this.facade.toggleAisTracks();
}
```

**Verificación Tarea 6:**
- [ ] El componente compila sin errores
- [ ] Los effects están registrados
- [ ] `handleToggleAisTracks()` existe y puede ser llamado desde el template

---

### TAREA 7: Añadir el toggle al UI de controles del mapa

**Archivos:**
- `src/app/features/chart/components/map-controls/map-controls.component.ts`
- `src/app/features/chart/components/map-controls/map-controls.component.html`

**Qué hacer:** Añadir un botón de toggle para "AIS Tracks" en la barra de controles del mapa,
siguiendo el patrón visual del botón de "Track" (track del barco propio).

**En `map-controls.component.ts`:**
```typescript
// AÑADIR @Input y @Output (junto a los existentes de showTrack, showVector, etc.):
@Input() showAisTracks: boolean = true;
@Output() toggleAisTracks = new EventEmitter<void>();
```

**En `map-controls.component.html`:**
```html
<!-- LOCALIZAR el botón de track del barco propio para ver el patrón -->
<!-- AÑADIR botón similar para AIS tracks, en la misma sección de toggles: -->

<button
  class="map-control-btn"
  [class.map-control-btn--active]="showAisTracks"
  (click)="toggleAisTracks.emit()"
  [attr.aria-label]="showAisTracks ? 'Hide AIS tracks' : 'Show AIS tracks'"
  [title]="'chart.controls.ais_tracks' | translate"
>
  <app-icon name="route" />
  <!-- Si hay labels visibles en los otros botones, añadir: -->
  <!-- <span>{{ 'chart.controls.ais_tracks' | translate }}</span> -->
</button>
```

> 📌 Usar el icono `route` (ya existe en el sprite según el patrón del proyecto).
> Si no existe, usar `navigation` o `path` como fallback.

**Actualizar `chart.page.html`:**
```html
<!-- LOCALIZAR el binding de app-map-controls o similar -->
<!-- AÑADIR los nuevos bindings: -->
[showAisTracks]="showAisTracksSignal()"
(toggleAisTracks)="handleToggleAisTracks()"
```

**Añadir signal en `chart.page.ts`:**
```typescript
readonly showAisTracksSignal = toSignal(
  this.settingsService.showAisTracks$,
  { initialValue: true }
);
```

**Verificación Tarea 7:**
- [ ] El botón aparece en la UI de controles del mapa
- [ ] Al hacer click, los tracks AIS desaparecen/aparecen en el mapa
- [ ] El botón tiene estado visual activo/inactivo correcto

---

### TAREA 8: Actualizar i18n

**Archivos:** `src/app/core/i18n/en.ts` y `src/app/core/i18n/es.ts`

```typescript
// en.ts — AÑADIR en la sección chart.controls:
ais_tracks: 'AIS Tracks',

// es.ts — AÑADIR en la sección chart.controls:
ais_tracks: 'Estelas AIS',
```

**Verificación Tarea 8:**
- [ ] Las claves existen en ambos idiomas
- [ ] El translate pipe resuelve `'chart.controls.ais_tracks'` correctamente

---

## 🧪 PLAN DE VERIFICACIÓN COMPLETO

### Test 1: Generación de track básico

```
Prerrequisito: Tener el simulador corriendo (npm run dev en marine-data-simulator)
Escenario recomendado: harbor-traffic (tiene barcos en movimiento)

1. Abrir http://localhost:4200/chart
2. Esperar 2-3 minutos con el simulador activo
3. ESPERADO: En el mapa, los barcos AIS dejan una estela grisácea
4. La estela debe:
   - Seguir la trayectoria real del barco
   - Ser más opaca cerca del barco actual
   - Desvanecerse hacia el pasado
5. Los barcos peligrosos (isDangerous=true) tienen estela ROJA
```

### Test 2: Predicción de trayectoria

```
1. Con el simulador activo, hacer click en un barco AIS en el mapa
2. ESPERADO: Se abre el panel de detalles del target
3. En el mapa, desde la posición actual del barco debe salir una línea de puntos ámbar
   proyectada en la dirección de su COG
4. La línea representa ~6 minutos de navegación a su SOG actual
5. Un barco parado (SOG < 0.5 m/s) NO debe tener línea de predicción
```

### Test 3: Toggle de visibilidad

```
1. Con tracks AIS visibles, hacer click en el botón "AIS Tracks"
2. ESPERADO: Todos los tracks y predicciones desaparecen instantáneamente
3. Los iconos de los barcos siguen visibles (solo se ocultan tracks y predicciones)
4. Hacer click de nuevo
5. ESPERADO: Los tracks reaparecen (con la historia acumulada mientras estaban ocultos)
```

### Test 4: Rendimiento con múltiples barcos

```
Escenario: busy-shipping-lane (25 targets)
1. Esperar 5+ minutos
2. ESPERADO: El mapa sigue siendo fluido (no jank)
3. Verificar en DevTools → Performance:
   - El frame time no supera 16ms durante pan/zoom
4. Verificar que el buffer de tracks no crece indefinidamente:
   - En DevTools → Memory → Heap snapshot
   - El uso de memoria se estabiliza (no hay memory leak)
```

### Test 5: Limpieza de targets expirados

```
1. Parar el simulador
2. Esperar 11 minutos (TIMEOUT_MS = 10 min + margen)
3. ESPERADO: Los targets AIS desaparecen del mapa
4. ESPERADO: Los tracks de esos targets también desaparecen
5. Reiniciar el simulador
6. ESPERADO: Los targets reaparecen, los tracks empiezan desde cero
```

### Test 6: Compatibilidad con los 3 modos de mapa (P0)

```
1. Con tracks AIS visibles, cambiar al modo Nautical
2. ESPERADO: Los tracks siguen visibles sobre el overlay de OpenSeaMap
3. Cambiar a Satellite
4. ESPERADO: Los tracks siguen visibles sobre el mapa satellite
5. En ningún modo deben desaparecer los tracks
```

---

## ⚠️ POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: `toObservable(this.aisStore.targets)` no re-emite cuando cambia el track buffer

**Síntoma:** Los tracks no se actualizan en el mapa aunque sí se guardan en el buffer.  
**Causa:** `aisTracksGeoJson$` usa `toObservable(this.aisStore.targets)` como trigger,
pero el track buffer es un Map normal (no Signal). El observable solo re-calcula cuando
`_targets` Signal cambia, y `_targets` solo cambia cuando llega un mensaje AIS completo.  
**Solución correcta:** El trigger actual es suficiente porque `recordTrackPoint()` se llama
**dentro de** `updateTarget()`, y `updateTarget()` siempre actualiza `_targets` al final.
Por lo tanto, el trigger del observable es correcto y los tracks estarán frescos.
**Verificar:** Que `this._targets.set(nextMap)` ocurre ANTES de `recordTrackPoint()`.
Si no, invertir el orden.

### Problema 2: Performance — demasiadas re-renderizaciones

**Síntoma:** El mapa hace jank cada vez que llega un mensaje AIS (puede ser 1/seg por barco).  
**Causa:** `aisTracksGeoJson$` recalcula TODOS los tracks cada vez que se actualiza UN target.  
**Solución:** Añadir `auditTime(500)` al pipeline del observable para limitar a 2 updates/seg:
```typescript
readonly aisTracksGeoJson$ = combineLatest([...]).pipe(
  auditTime(500),           // ← AÑADIR: no más de 2 renders por segundo
  map(([targetsMap, showTracks]) => { ... }),
  shareReplay(...)
);
```
> `auditTime` ya está importado en el facade (se usa en otros observables).

### Problema 3: El layer de tracks aparece ENCIMA de los iconos AIS

**Síntoma:** Los tracks de otros barcos tapan los iconos.  
**Causa:** El orden de `addLayer()` determina el z-order. Layers añadidos después van encima.  
**Solución:** Asegurarse de que en `onStyleReady()` el orden es:
```
ensureAisTracksLayer()      // primero → queda debajo
ensureAisPredictionsLayer() // segundo → queda encima del track pero debajo del icono
ensureAisLayer()            // tercero → iconos encima de todo
ensureCpaLinesLayer()       // cuarto → líneas CPA siempre visibles
```

### Problema 4: TypeScript error con `GeoJSON.Feature<LineString>`

**Síntoma:** Error de tipo al crear features en el facade.  
**Causa:** El namespace `GeoJSON` puede no estar importado correctamente.  
**Solución:**
```typescript
// En chart-facade.service.ts, asegurarse de tener:
import type { FeatureCollection, LineString, Feature } from 'geojson';

// Usar `Feature<LineString>` directamente en lugar de `GeoJSON.Feature<LineString>`
```

### Problema 5: Los tracks no se ven en zoom bajo

**Síntoma:** Los tracks solo son visibles cuando se hace zoom in cerca de los barcos.  
**Causa:** Las líneas son muy cortas en metros pero el zoom bajo comprime todo.  
**Solución:** Esto es comportamiento correcto y esperado. Los tracks de barcos en movimiento
solo tienen sentido a zoom 10+. No es un bug, no requiere fix.

---

## ✅ DEFINITION OF DONE

- [ ] **T1:** `AisTrackPoint` interface exportada desde `ais.model.ts`
- [ ] **T2:** `AisStoreService` acumula tracks por MMSI, purga puntos viejos y duplicados
- [ ] **T3:** `showAisTracks` setting añadido a `ChartSettingsService`
- [ ] **T4:** `aisTracksGeoJson$` y `aisPredictionsGeoJson$` en `ChartFacadeService`
- [ ] **T5:** 4 nuevos métodos en `MapLibreEngineService` (2 ensure + 2 apply + 2 update)
- [ ] **T6:** 2 nuevos effects y handler en `chart.page.ts`
- [ ] **T7:** Botón toggle en `MapControlsComponent` con estado activo/inactivo
- [ ] **T8:** i18n actualizado EN/ES
- [ ] **Visual:** Estelas visibles tras 2+ min de simulador corriendo
- [ ] **Visual:** Estelas rojas para barcos peligrosos, grises para normales
- [ ] **Visual:** Línea de puntos ámbar proyectada desde cada barco en movimiento
- [ ] **Performance:** Sin jank con 25 targets activos (busy-shipping-lane scenario)
- [ ] **Build:** `ng build --configuration=production` sin errores

**Commit message sugerido:**
```
feat(ais): add historical track trails and trajectory prediction per vessel

- Add AisTrackPoint model with lat/lon/timestamp/sog/cog
- AisStoreService: track buffer per MMSI (30min, 120 pts max, 50m throttle)
- Auto-cleanup stale track points alongside stale targets
- ChartFacadeService: aisTracksGeoJson$ + aisPredictionsGeoJson$ observables
- auditTime(500) to limit GeoJSON recomputation to 2x/sec
- MapLibreEngineService: ais-tracks + ais-predictions sources and layers
- Track opacity fades with age (0.75→0.05), dangerous targets in red
- Prediction as dashed amber line (6 min horizon at current SOG)
- Layer order: tracks → predictions → AIS icons → CPA lines
- Toggle button in MapControlsComponent with active state
- i18n: 'AIS Tracks' / 'Estelas AIS'
```

---

## 🚀 EXTENSIONES FUTURAS (NO implementar ahora, documentadas para referencia)

- **Color por velocidad:** Interpolar el color de la estela de azul (lento) a rojo (rápido)
  usando las propiedades `sog` de los puntos del track con `line-gradient` de MapLibre.
- **Tracks segmentados:** Si hay un gap de tiempo > 5 min entre puntos, dividir en
  múltiples `LineString` en lugar de conectar el salto.
- **Radio de giro en predicción:** Para barcos con `rot` (Rate of Turn) disponible,
  calcular una curva en lugar de línea recta usando el modelo cinético circular.
- **Enriquecimiento con APIs externas:** VesselFinder/MarineTraffic API para obtener
  nombre, tipo, foto, historial de puertos del barco seleccionado.
- **Export de tracks AIS:** Guardar tracks en el `HistoryService` (IndexedDB) para
  análisis posterior o export GPX del tráfico observado.
