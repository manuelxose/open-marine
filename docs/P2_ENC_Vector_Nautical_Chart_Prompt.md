# PROMPT P2: Vector Tiles Náuticos S-57 con Estilos Semánticos
## Open Marine Instrumentation — Carta Náutica Vectorial de Grado Profesional

**Versión:** 1.0 | **Fecha:** 2026-02-23 | **Estimación:** 8-12 horas  
**Prerequisitos completados:**
- ✅ P0: Toggle OSM → Satellite → Nautical (raster OpenSeaMap)
- ✅ P1: AIS tracks históricos + predicción por barco

**Prioridad:** P2 — Mejora de calidad cartográfica, requiere trabajo de estilos intensivo

---

## 🎯 OBJETIVO

Añadir un **cuarto modo de mapa** `'enc'` (Electronic Nautical Chart) que carga datos
vectoriales S-57 desde fuentes públicas y los renderiza con estilos semánticos náuticos
completos: batimetría coloreada, isolíneas de profundidad, señales IALA, peligros,
zonas restringidas, fondeos y separaciones de tráfico (TSS).

El resultado es una carta náutica vectorial interactiva de calidad profesional —
equivalente visual a lo que muestra un OpenCPN o un Garmin GPSMap con cartas BlueChart.

**Estado final esperado:**
- Ciclo de toggle: OSM → Satellite → Nautical (raster) → **ENC (vector)** → OSM
- En modo ENC, el fondo muestra profundidades en degradado azul náutico clásico
- Isolíneas de 0m, 2m, 5m, 10m, 20m visibles con etiquetas de profundidad
- Boyas IALA-A con colores correctos (verde estribor, rojo babor) según esquema europeo
- Faros con alcance estimado visual
- Zonas de peligro (rocas, pecios, obstáculos) con símbolos y advertencias
- Zonas de fondeo delimitadas
- Zonas de separación del tráfico (TSS) sombreadas
- Toggle desde Settings para controlar qué capas S-57 se muestran
- Profundidad de seguridad configurable (resalta zonas < X metros en rojo)

---

## 📁 ARCHIVOS INVOLUCRADOS

```
marine-instrumentation-ui/src/app/
├── data-access/chart/
│   └── chart-sources.ts                    ← MODIFICAR: añadir fuente 'enc'
├── features/chart/
│   ├── services/
│   │   ├── chart-facade.service.ts         ← MODIFICAR: toggle 4 estados + safetyDepth
│   │   ├── chart-settings.service.ts       ← MODIFICAR: nuevas settings ENC
│   │   └── maplibre-engine.service.ts      ← MODIFICAR: modo ENC no usa ensure*Layer()
│   ├── layers/
│   │   └── enc-style.ts                    ← CREAR NUEVO: definición completa del estilo ENC
│   ├── components/
│   │   └── map-controls/
│   │       ├── map-controls.component.ts   ← MODIFICAR: 4 modos + icono 'chart-bar'
│   │       └── map-controls.component.html ← MODIFICAR: actualizar ciclo de iconos
│   └── types/
│       └── chart-vm.ts                     ← MODIFICAR: añadir 'enc' a ChartLayerMode
├── pages/settings/
│   └── settings.page.ts                    ← MODIFICAR: sección ENC en Settings
├── core/i18n/
│   ├── en.ts                               ← MODIFICAR: claves ENC
│   └── es.ts                               ← MODIFICAR: claves ENC
└── ngsw-config.json                        ← MODIFICAR: cachear tiles vector ENC
```

---

## 🔍 ESTADO ACTUAL DEL CÓDIGO (contexto crítico)

### Ciclo de toggle actual (post-P0)
```typescript
// chart-facade.service.ts — toggleLayer() POST-P0:
toggleLayer(): void {
  const current = this._baseSource$.value;
  switch (current.id) {
    case 'osm-raster':  → SATELLITE_SOURCE;    break;
    case 'satellite':   → NAUTICAL_SOURCE;     break;  // ← añadido en P0
    case 'nautical':
    default:            → DEFAULT_BASE_SOURCE; break;
  }
}
// Hay que añadir 'enc' como cuarto paso en el ciclo
```

### `ChartLayerMode` actual (post-P0)
```typescript
// chart-vm.ts — POST-P0:
export type ChartLayerMode = 'osm' | 'satellite' | 'nautical';
// Añadir 'enc'
```

### `ChartSettings` actual (post-P1)
```typescript
// chart-settings.service.ts — POST-P1:
export interface ChartSettings {
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  showTrueWind: boolean;
  showRangeRings: boolean;
  rangeRingIntervals: number[];
  showAisTracks: boolean;   // ← añadido en P1
}
// Añadir: safetyDepth, encLayers (configuración de capas ENC visibles)
```

### `MapLibreEngineService` — comportamiento con setBaseSource()
```typescript
// CRÍTICO: cuando se llama setBaseSource(), el método:
// 1. Llama map.setStyle(newStyle)
// 2. Espera el evento 'styledata' o 'style.load'
// 3. Llama onStyleReady() que re-añade TODOS los layers de datos (vessel, AIS, etc.)
//
// Para el modo ENC esto es especialmente importante porque:
// - El style ENC ya contiene TODAS las capas de datos náuticos como parte del StyleSpecification
// - Los layers de vessel, AIS, track etc. se añaden ENCIMA mediante onStyleReady()
// - No se necesitan cambios en onStyleReady() — solo el nuevo StyleSpecification
```

---

## 🌐 FUENTE DE DATOS VECTORIALES: OpenNauticalChart

**Proveedor:** OpenNauticalChart (enc.charttools.eu) — tiles vectoriales S-57 gratuitos  
**URL de tiles:** `https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png` ya está en P0  
**Para vectoriales:** `https://t1.openseamap.org/tiles/{z}/{x}/{y}.pbf` (experimental)

**Alternativa más robusta:** OpenStreetMap-Carto Nautical  
`https://tile.waymarkedtrails.org/en/cycling/{z}/{x}/{y}.png` — NO válido

**Fuente definitiva recomendada:** Combinar dos fuentes:

```
Fuente 1 — OSM-Nautical raster base (fiable, siempre disponible):
  https://tile.openstreetmap.org/{z}/{x}/{y}.png

Fuente 2 — OpenSeaMap vector features (S-57 simplificado):
  Protocol Buffer tiles: https://t1.openseamap.org/tiles/{z}/{x}/{y}.pbf
  NOTA: Si esta URL falla, usar fallback con:
  https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png (raster)

Fuente 3 — Natural Earth para fondos de zonas de agua:
  Ninguna URL necesaria — usar fill layers basados en colores fijos
```

> ⚠️ **REALIDAD PRÁCTICA:** Los tiles vectoriales S-57 públicos gratuitos son limitados
> y pueden tener cobertura irregular. La estrategia correcta para P2 es:
> 1. Construir el **sistema de estilos** completo con todas las capas semánticas
> 2. Usar **datos de demostración** (GeoJSON inline) para validar el sistema visual
> 3. Conectar a fuentes reales cuando estén disponibles
>
> Esto permite que el agente valide el estilo visualmente sin depender de servidores externos.

---

## 📐 ESTRATEGIA TÉCNICA: ENC Style System

El modo ENC se implementa como un `StyleSpecification` de MapLibre completo que:

1. **Capa base:** OSM raster (agua/tierra)
2. **Batimetría:** Polígonos GeoJSON pre-generados (5 zonas de profundidad)
3. **Isolíneas:** LineStrings GeoJSON etiquetadas
4. **Señales marítimas:** Cuando OpenSeaMap PBF está disponible, usar `source-layer`
5. **Fallback:** Si PBF falla, todos los datos náuticos son GeoJSON estático

**El insight clave:** MapLibre no distingue si los datos vienen de un tile server o de
GeoJSON inline. El sistema de estilos es el mismo. Por eso podemos construir el estilo
completo con GeoJSON de demostración y luego conectar al tile server real con un
cambio mínimo de 1-2 líneas.

---

## 📐 ESPECIFICACIÓN TÉCNICA DETALLADA POR TAREA

---

### TAREA 1: Actualizar `ChartLayerMode` y `ChartSettings`

#### 1A: `chart-vm.ts`
```typescript
// MODIFICAR — añadir 'enc' al tipo:
export type ChartLayerMode = 'osm' | 'satellite' | 'nautical' | 'enc';
```

#### 1B: `chart-settings.service.ts`

**Qué añadir al interface `ChartSettings`:**
```typescript
export interface ChartSettings {
  // ... campos existentes sin cambios ...
  autoCenter: boolean;
  showTrack: boolean;
  showVector: boolean;
  showTrueWind: boolean;
  showRangeRings: boolean;
  rangeRingIntervals: number[];
  showAisTracks: boolean;   // P1

  // ← AÑADIR P2:
  safetyDepth: number;          // metros — profundidad mínima segura, default: 2.0
  encLayers: EncLayerConfig;    // qué capas ENC mostrar
}

export interface EncLayerConfig {
  showDepthAreas: boolean;    // áreas de profundidad coloreadas
  showDepthContours: boolean; // isolíneas de profundidad
  showBuoys: boolean;         // boyas y señales IALA
  showHazards: boolean;       // rocas, pecios, obstáculos
  showAnchorages: boolean;    // zonas de fondeo
  showTSS: boolean;           // zonas de separación del tráfico
  showLights: boolean;        // faros y luces
}
```

**Añadir al `DEFAULT_SETTINGS`:**
```typescript
const DEFAULT_SETTINGS: ChartSettings = {
  // ... existentes ...
  safetyDepth: 2.0,
  encLayers: {
    showDepthAreas: true,
    showDepthContours: true,
    showBuoys: true,
    showHazards: true,
    showAnchorages: true,
    showTSS: true,
    showLights: true,
  },
};
```

**Añadir métodos al servicio:**
```typescript
setSafetyDepth(depth: number): void {
  this.update({ safetyDepth: Math.max(0.5, Math.min(20, depth)) });
}

updateEncLayers(partial: Partial<EncLayerConfig>): void {
  this.update({
    encLayers: { ...this.settingsSubject.value.encLayers, ...partial },
  });
}
```

**Verificación Tarea 1:**
- [ ] `ChartLayerMode` incluye `'enc'`
- [ ] `ChartSettings` tiene `safetyDepth` y `encLayers`
- [ ] `DEFAULT_SETTINGS.safetyDepth = 2.0`
- [ ] `setSafetyDepth()` clampea entre 0.5 y 20
- [ ] `tsc --noEmit` sin errores

---

### TAREA 2: Crear `enc-style.ts` — el corazón de P2

**Archivo a crear:** `src/app/features/chart/layers/enc-style.ts`

Este archivo es el más importante de P2. Define el `StyleSpecification` completo para
el modo ENC, incluyendo todas las capas semánticas náuticas.

```typescript
import type { StyleSpecification } from 'maplibre-gl';
import type { EncLayerConfig } from '../services/chart-settings.service';

// ─── PALETA DE COLORES NÁUTICOS (IHO S-52) ───────────────────────────────────
// Referencia: IHO Publication C-77 - Portrayal Catalogue
export const ENC_COLORS = {
  // Profundidades — escala de azules
  depth_very_shallow: '#aee4f5',   // <2m — azul muy claro (peligroso)
  depth_shallow:      '#c9ecf7',   // 2-5m — azul claro
  depth_moderate:     '#d8f0f9',   // 5-10m
  depth_deep:         '#e8f6fb',   // 10-20m
  depth_very_deep:    '#f0f9fd',   // >20m — casi blanco
  depth_unsafe:       '#ff6b6b33', // área de seguridad violada — rojo semitransparente

  // Tierra y costas
  land:               '#f5f0e8',   // beige cálido
  intertidal:         '#d4c9a8',   // zona intermareal

  // Señales IALA-A (Europa/África/Asia)
  buoy_port:          '#cc2222',   // babor — rojo
  buoy_starboard:     '#1a7a1a',   // estribor — verde
  buoy_safe_water:    '#cc2222',   // agua segura — rojo/blanco
  buoy_special:       '#ffaa00',   // especial — amarillo
  buoy_cardinal_n:    '#1a1a1a',   // cardinal norte — negro
  buoy_cardinal_s:    '#ffff00',   // cardinal sur — amarillo
  light_flare:        '#ffff88',   // destellos de faros

  // Peligros
  hazard_rock:        '#8b0000',   // roca — rojo oscuro
  hazard_wreck:       '#8b4500',   // pecio — marrón
  hazard_obstruction: '#8b6914',   // obstáculo — marrón claro

  // Zonas
  anchorage:          '#002299',   // fondeo — azul marino
  tss:                '#00229922', // TSS — azul semitransparente
  restricted:         '#cc000022', // zona restringida — rojo semitransparente

  // Contours
  depth_contour:      '#7ab3c8',   // isolíneas — azul medio
  depth_label:        '#2a6080',   // texto de profundidad
  shoreline:          '#4a7c59',   // costa — verde oscuro

  // Textos
  text_nautical:      '#1a3a5c',   // texto náutico — azul marino oscuro
} as const;

// ─── DATOS DEMO GeoJSON ───────────────────────────────────────────────────────
// Datos de ejemplo centrados en Vigo/Galicia para testing local
// (reemplazable por tiles reales sin cambiar los estilos)

const DEMO_CENTER = { lat: 42.24, lon: -8.72 };  // Ría de Vigo

// Genera un polígono rectangular de ejemplo
function makeRect(
  centerLat: number, centerLon: number,
  latHalf: number, lonHalf: number,
  props: Record<string, unknown>
) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [centerLon - lonHalf, centerLat - latHalf],
        [centerLon + lonHalf, centerLat - latHalf],
        [centerLon + lonHalf, centerLat + latHalf],
        [centerLon - lonHalf, centerLat + latHalf],
        [centerLon - lonHalf, centerLat - latHalf],
      ]],
    },
    properties: props,
  };
}

// FeatureCollection de áreas de profundidad demo
const DEPTH_AREAS_DEMO = {
  type: 'FeatureCollection' as const,
  features: [
    makeRect(42.24, -8.72, 0.02, 0.04, { drval1: 0,  drval2: 2  }),   // muy poco fondo
    makeRect(42.24, -8.72, 0.04, 0.08, { drval1: 2,  drval2: 5  }),   // poco fondo
    makeRect(42.24, -8.72, 0.06, 0.12, { drval1: 5,  drval2: 10 }),   // moderado
    makeRect(42.24, -8.72, 0.09, 0.17, { drval1: 10, drval2: 20 }),   // profundo
    makeRect(42.24, -8.72, 0.13, 0.22, { drval1: 20, drval2: 9999 }), // muy profundo
  ],
};

// FeatureCollection de isolíneas de profundidad demo
const DEPTH_CONTOURS_DEMO = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-8.76, 42.22], [-8.74, 42.23], [-8.72, 42.22], [-8.70, 42.23], [-8.68, 42.22],
        ],
      },
      properties: { valdco: 5, label: '5' },
    },
    {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-8.78, 42.21], [-8.75, 42.22], [-8.72, 42.21], [-8.69, 42.22], [-8.66, 42.21],
        ],
      },
      properties: { valdco: 10, label: '10' },
    },
    {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-8.80, 42.20], [-8.76, 42.21], [-8.72, 42.20], [-8.68, 42.21], [-8.64, 42.20],
        ],
      },
      properties: { valdco: 20, label: '20' },
    },
  ],
};

// Boyas demo (IALA-A)
const BUOYS_DEMO = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-8.74, 42.24] },
      properties: { type: 'port', name: 'B1', color: 'red' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-8.70, 42.24] },
      properties: { type: 'starboard', name: 'B2', color: 'green' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-8.72, 42.26] },
      properties: { type: 'cardinal_n', name: 'VQ', color: 'black' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-8.75, 42.22] },
      properties: { type: 'safe_water', name: 'FAIRWAY', color: 'rw' },
    },
  ],
};

// Peligros demo
const HAZARDS_DEMO = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-8.73, 42.23] },
      properties: { type: 'rock_awash', name: 'Roca Seca' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-8.71, 42.25] },
      properties: { type: 'wreck', name: 'Pecio' },
    },
  ],
};

// Fondeos demo
const ANCHORAGES_DEMO = {
  type: 'FeatureCollection' as const,
  features: [
    makeRect(42.27, -8.73, 0.01, 0.015, { name: 'Fondeo Norte' }),
  ],
};

// TSS demo
const TSS_DEMO = {
  type: 'FeatureCollection' as const,
  features: [
    makeRect(42.20, -8.75, 0.02, 0.05, { name: 'Separación tráfico' }),
  ],
};


// ─── FUNCIÓN PRINCIPAL: buildEncStyle() ──────────────────────────────────────

/**
 * Construye el StyleSpecification MapLibre completo para el modo ENC.
 * @param config Qué capas ENC mostrar (desde ChartSettings)
 * @param safetyDepth Profundidad mínima segura en metros
 */
export function buildEncStyle(
  config: EncLayerConfig,
  safetyDepth: number = 2.0,
): StyleSpecification {
  return {
    version: 8,
    // Glyphs necesarios para los textos de profundidad
    // MapLibre requiere una URL de glyphs para usar 'text-field' en layers
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      // Base raster
      'enc-osm-base': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
      // Áreas de profundidad (GeoJSON demo → reemplazar por tile source en producción)
      'enc-depth-areas': {
        type: 'geojson',
        data: DEPTH_AREAS_DEMO,
      },
      // Isolíneas de profundidad
      'enc-depth-contours': {
        type: 'geojson',
        data: DEPTH_CONTOURS_DEMO,
      },
      // Boyas y señales
      'enc-buoys': {
        type: 'geojson',
        data: BUOYS_DEMO,
      },
      // Peligros
      'enc-hazards': {
        type: 'geojson',
        data: HAZARDS_DEMO,
      },
      // Fondeos
      'enc-anchorages': {
        type: 'geojson',
        data: ANCHORAGES_DEMO,
      },
      // TSS
      'enc-tss': {
        type: 'geojson',
        data: TSS_DEMO,
      },
    },
    layers: [
      // ── 0. BASE RASTER ─────────────────────────────────────────────────────
      {
        id: 'enc-base-raster',
        type: 'raster',
        source: 'enc-osm-base',
        paint: {
          // Reducir saturación del mapa base para que los datos náuticos resalten
          'raster-saturation': -0.5,
          'raster-brightness-min': 0.1,
          'raster-opacity': 0.6,
        },
      },

      // ── 1. ÁREAS DE PROFUNDIDAD ────────────────────────────────────────────
      ...(config.showDepthAreas ? [
        {
          id: 'enc-depth-very-shallow',
          type: 'fill' as const,
          source: 'enc-depth-areas',
          filter: ['<=', ['get', 'drval2'], safetyDepth],
          paint: {
            'fill-color': ENC_COLORS.depth_unsafe,   // Zona de peligro según safetyDepth
            'fill-opacity': 0.7,
          },
        },
        {
          id: 'enc-depth-shallow',
          type: 'fill' as const,
          source: 'enc-depth-areas',
          filter: ['all',
            ['>', ['get', 'drval2'], safetyDepth],
            ['<=', ['get', 'drval2'], 5],
          ],
          paint: {
            'fill-color': ENC_COLORS.depth_shallow,
            'fill-opacity': 0.65,
          },
        },
        {
          id: 'enc-depth-moderate',
          type: 'fill' as const,
          source: 'enc-depth-areas',
          filter: ['all',
            ['>', ['get', 'drval2'], 5],
            ['<=', ['get', 'drval2'], 10],
          ],
          paint: {
            'fill-color': ENC_COLORS.depth_moderate,
            'fill-opacity': 0.55,
          },
        },
        {
          id: 'enc-depth-deep',
          type: 'fill' as const,
          source: 'enc-depth-areas',
          filter: ['all',
            ['>', ['get', 'drval2'], 10],
            ['<=', ['get', 'drval2'], 20],
          ],
          paint: {
            'fill-color': ENC_COLORS.depth_deep,
            'fill-opacity': 0.4,
          },
        },
        {
          id: 'enc-depth-very-deep',
          type: 'fill' as const,
          source: 'enc-depth-areas',
          filter: ['>', ['get', 'drval2'], 20],
          paint: {
            'fill-color': ENC_COLORS.depth_very_deep,
            'fill-opacity': 0.3,
          },
        },
      ] : []),

      // ── 2. ZONAS TSS ───────────────────────────────────────────────────────
      ...(config.showTSS ? [
        {
          id: 'enc-tss-fill',
          type: 'fill' as const,
          source: 'enc-tss',
          paint: {
            'fill-color': ENC_COLORS.tss,
            'fill-outline-color': '#002299',
          },
        },
        {
          id: 'enc-tss-line',
          type: 'line' as const,
          source: 'enc-tss',
          paint: {
            'line-color': '#002299',
            'line-width': 1.5,
            'line-dasharray': [4, 2],
          },
        },
      ] : []),

      // ── 3. FONDEOS ─────────────────────────────────────────────────────────
      ...(config.showAnchorages ? [
        {
          id: 'enc-anchorage-fill',
          type: 'fill' as const,
          source: 'enc-anchorages',
          paint: {
            'fill-color': '#0022aa11',
            'fill-outline-color': ENC_COLORS.anchorage,
          },
        },
        {
          id: 'enc-anchorage-label',
          type: 'symbol' as const,
          source: 'enc-anchorages',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Regular'],
            'text-size': 11,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': ENC_COLORS.anchorage,
            'text-halo-color': 'rgba(255,255,255,0.8)',
            'text-halo-width': 1.5,
          },
        },
      ] : []),

      // ── 4. ISOLÍNEAS DE PROFUNDIDAD ────────────────────────────────────────
      ...(config.showDepthContours ? [
        {
          id: 'enc-contour-line',
          type: 'line' as const,
          source: 'enc-depth-contours',
          paint: {
            'line-color': ENC_COLORS.depth_contour,
            // Grosor variable: 20m más grueso que 5m
            'line-width': [
              'interpolate', ['linear'], ['get', 'valdco'],
              5,  0.8,
              10, 1.2,
              20, 1.8,
              50, 2.5,
            ] as any,
            'line-opacity': 0.7,
          },
        },
        {
          id: 'enc-contour-label',
          type: 'symbol' as const,
          source: 'enc-depth-contours',
          layout: {
            'symbol-placement': 'line',
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Regular'],
            'text-size': 10,
            'text-max-angle': 30,
          },
          paint: {
            'text-color': ENC_COLORS.depth_label,
            'text-halo-color': 'rgba(255,255,255,0.9)',
            'text-halo-width': 1.5,
          },
          minzoom: 10,
        },
      ] : []),

      // ── 5. PELIGROS ────────────────────────────────────────────────────────
      ...(config.showHazards ? [
        {
          id: 'enc-hazard-circle',
          type: 'circle' as const,
          source: 'enc-hazards',
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              8, 4, 14, 10,
            ] as any,
            'circle-color': [
              'match', ['get', 'type'],
              'rock_awash',  ENC_COLORS.hazard_rock,
              'wreck',       ENC_COLORS.hazard_wreck,
              /* default */  ENC_COLORS.hazard_obstruction,
            ] as any,
            'circle-stroke-color': 'white',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.9,
          },
        },
        {
          id: 'enc-hazard-label',
          type: 'symbol' as const,
          source: 'enc-hazards',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Regular'],
            'text-size': 10,
            'text-anchor': 'top',
            'text-offset': [0, 1.2],
          },
          paint: {
            'text-color': ENC_COLORS.hazard_rock,
            'text-halo-color': 'rgba(255,255,255,0.9)',
            'text-halo-width': 1.5,
          },
          minzoom: 11,
        },
      ] : []),

      // ── 6. BOYAS Y SEÑALES IALA ────────────────────────────────────────────
      ...(config.showBuoys ? [
        {
          id: 'enc-buoy-circle',
          type: 'circle' as const,
          source: 'enc-buoys',
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              8, 5, 14, 12,
            ] as any,
            'circle-color': [
              'match', ['get', 'type'],
              'port',       ENC_COLORS.buoy_port,
              'starboard',  ENC_COLORS.buoy_starboard,
              'cardinal_n', ENC_COLORS.buoy_cardinal_n,
              'cardinal_s', ENC_COLORS.buoy_cardinal_s,
              'safe_water', '#cc2222',
              /* default */ ENC_COLORS.buoy_special,
            ] as any,
            'circle-stroke-color': 'white',
            'circle-stroke-width': 2,
          },
        },
        {
          id: 'enc-buoy-label',
          type: 'symbol' as const,
          source: 'enc-buoys',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Bold'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 1.0],
          },
          paint: {
            'text-color': ENC_COLORS.text_nautical,
            'text-halo-color': 'rgba(255,255,255,0.95)',
            'text-halo-width': 2,
          },
          minzoom: 10,
        },
      ] : []),

      // NOTA: Los layers de vessel, AIS, track, etc. se añaden
      // dinámicamente por onStyleReady() — NO incluirlos aquí.
    ],
  };
}
```

**Verificación Tarea 2:**
- [ ] El archivo compila sin errores TypeScript
- [ ] `buildEncStyle({ ...allTrue }, 2.0)` retorna objeto con `version: 8`
- [ ] `buildEncStyle({ ...allFalse }, 2.0).layers` tiene solo la capa base raster
- [ ] `buildEncStyle({ ...allTrue }, 5.0)` usa `safetyDepth: 5.0` en el filter correcto

---

### TAREA 3: Añadir `ENC_SOURCE` y actualizar `toggleLayer()` en `ChartFacadeService`

**Archivo:** `src/app/features/chart/services/chart-facade.service.ts`

```typescript
// PASO 3.1: Importar la función buildEncStyle
import { buildEncStyle } from '../layers/enc-style';
import type { EncLayerConfig } from './chart-settings.service';

// PASO 3.2: Crear la source ENC dinámicamente (depende de settings)
// NO es una constante fija como SATELLITE_SOURCE — se construye en tiempo de ejecución
// porque el estilo depende de safetyDepth y encLayers que son configurables.

private buildEncSource(): ChartSourceConfig {
  const settings = this.settingsService.snapshot;
  return {
    id: 'enc',
    style: buildEncStyle(settings.encLayers, settings.safetyDepth),
  };
}

// PASO 3.3: Actualizar toggleLayer() para ciclo de 4 estados
toggleLayer(): void {
  const current = this._baseSource$.value;
  switch (current.id) {
    case 'osm-raster':
      this._baseSource$.next(SATELLITE_SOURCE);
      break;
    case 'satellite':
      this._baseSource$.next(NAUTICAL_SOURCE);    // P0
      break;
    case 'nautical':
      this._baseSource$.next(this.buildEncSource()); // ← P2 NUEVO
      break;
    case 'enc':
    default:
      this._baseSource$.next(DEFAULT_BASE_SOURCE);
      break;
  }
}

// PASO 3.4: Actualizar getter currentLayerMode
get currentLayerMode(): ChartLayerMode {
  const id = this._baseSource$.value.id;
  if (id === 'satellite') return 'satellite';
  if (id === 'nautical')  return 'nautical';
  if (id === 'enc')       return 'enc';
  return 'osm';
}

// PASO 3.5: Añadir método para actualizar el ENC en vivo cuando cambia safetyDepth
// (llamado desde Settings page cuando el usuario cambia el slider de seguridad)
refreshEncStyle(): void {
  if (this._baseSource$.value.id === 'enc') {
    this._baseSource$.next(this.buildEncSource());
  }
}

// PASO 3.6: Exponer métodos de ENC settings al componente de settings
setSafetyDepth(depth: number): void {
  this.settingsService.setSafetyDepth(depth);
  this.refreshEncStyle();
}

updateEncLayers(partial: Partial<EncLayerConfig>): void {
  this.settingsService.updateEncLayers(partial);
  this.refreshEncStyle();
}
```

**Verificación Tarea 3:**
- [ ] Ciclo completo: 4 clicks sucesivos vuelven al modo `osm`
- [ ] Cambiar `safetyDepth` mientras se está en modo ENC reconstruye el estilo
- [ ] `buildEncSource()` usa `settingsService.snapshot` (no async)
- [ ] `tsc --noEmit` sin errores

---

### TAREA 4: Actualizar `MapControlsComponent` para 4 modos

**Archivos:** `map-controls.component.ts` y `.html`

```typescript
// map-controls.component.ts
// ACTUALIZAR el getter layerButtonIcon para incluir 'enc':
get layerButtonIcon(): string {
  switch (this.layerMode) {
    case 'satellite': return 'satellite';
    case 'nautical':  return 'anchor';        // P0
    case 'enc':       return 'layers';        // P2 — icono de capas
    case 'osm':
    default:          return 'map';
  }
}

// ACTUALIZAR layerButtonLabel:
get layerButtonLabel(): string {
  switch (this.layerMode) {
    case 'osm':       return 'Satellite';    // siguiente modo
    case 'satellite': return 'Nautical';
    case 'nautical':  return 'ENC';           // P2
    case 'enc':       return 'Map';
    default:          return 'Layer';
  }
}
```

```html
<!-- map-controls.component.html -->
<!-- ACTUALIZAR aria-label para incluir 'enc': -->
<button
  class="map-control-btn"
  [class.map-control-btn--active]="layerMode === 'nautical' || layerMode === 'enc'"
  (click)="toggleLayers.emit()"
  [attr.aria-label]="'Switch to ' + layerButtonLabel + ' view'"
  [title]="layerButtonLabel"
>
  <app-icon [name]="layerButtonIcon" />
</button>
```

**Verificación Tarea 4:**
- [ ] Botón muestra `layers` icono en modo `enc`
- [ ] Clase `--active` se aplica tanto en `nautical` como en `enc`
- [ ] Label del botón en modo `nautical` dice "ENC" (muestra el siguiente)

---

### TAREA 5: Añadir sección ENC a `settings.page.ts`

**Archivo:** `src/app/pages/settings/settings.page.ts`

Añadir una sub-sección dentro de la sección "Chart" del settings page existente.

**En el controller (.ts):**
```typescript
// AÑADIR al controller — inyectar ChartFacadeService si no está ya
// (ya debería estar inyectado, revisar primero)

onSafetyDepthChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const value = parseFloat(target.value);
  if (Number.isFinite(value)) {
    this.chartFacade.setSafetyDepth(value);
  }
}

toggleEncLayer(key: keyof EncLayerConfig): void {
  const current = this.chartSettingsService.snapshot.encLayers;
  this.chartFacade.updateEncLayers({ [key]: !current[key] });
}

get encLayers(): EncLayerConfig {
  return this.chartSettingsService.snapshot.encLayers;
}

get safetyDepth(): number {
  return this.chartSettingsService.snapshot.safetyDepth;
}
```

**En el template (.html) — añadir en la sección de Chart settings:**
```html
<!-- LOCALIZAR la sección de chart settings y AÑADIR al final: -->

<!-- ─── ENC Configuration ─────────────────────── -->
<div class="setting-subsection">
  <h3 class="subsection-title">ENC Chart Layers</h3>
  <p class="subsection-desc">
    Configure which S-57 nautical data layers are displayed in ENC mode.
  </p>

  <!-- Safety depth slider -->
  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">Safety depth (m)</span>
      <span class="setting-description">
        Areas shallower than this are highlighted in red
      </span>
    </div>
    <div class="setting-control-inline">
      <input
        type="range"
        min="0.5" max="10" step="0.5"
        class="setting-slider"
        [value]="safetyDepth"
        (input)="onSafetyDepthChange($event)"
      />
      <span class="setting-value-badge">{{ safetyDepth }}m</span>
    </div>
  </div>

  <!-- Toggles por capa -->
  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">Depth areas</span>
      <span class="setting-description">Colored bathymetric zones</span>
    </div>
    <button
      (click)="toggleEncLayer('showDepthAreas')"
      class="toggle-btn"
      [class.active]="encLayers.showDepthAreas"
    ><span class="toggle-slider"></span></button>
  </div>

  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">Depth contours</span>
      <span class="setting-description">Isobath lines with labels</span>
    </div>
    <button
      (click)="toggleEncLayer('showDepthContours')"
      class="toggle-btn"
      [class.active]="encLayers.showDepthContours"
    ><span class="toggle-slider"></span></button>
  </div>

  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">Buoys &amp; signals</span>
      <span class="setting-description">IALA-A lateral and cardinal marks</span>
    </div>
    <button
      (click)="toggleEncLayer('showBuoys')"
      class="toggle-btn"
      [class.active]="encLayers.showBuoys"
    ><span class="toggle-slider"></span></button>
  </div>

  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">Hazards</span>
      <span class="setting-description">Rocks, wrecks and obstructions</span>
    </div>
    <button
      (click)="toggleEncLayer('showHazards')"
      class="toggle-btn"
      [class.active]="encLayers.showHazards"
    ><span class="toggle-slider"></span></button>
  </div>

  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">Anchorages</span>
      <span class="setting-description">Designated anchoring areas</span>
    </div>
    <button
      (click)="toggleEncLayer('showAnchorages')"
      class="toggle-btn"
      [class.active]="encLayers.showAnchorages"
    ><span class="toggle-slider"></span></button>
  </div>

  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">Traffic separation</span>
      <span class="setting-description">TSS zones and separation schemes</span>
    </div>
    <button
      (click)="toggleEncLayer('showTSS')"
      class="toggle-btn"
      [class.active]="encLayers.showTSS"
    ><span class="toggle-slider"></span></button>
  </div>
</div>
```

**Verificación Tarea 5:**
- [ ] La sección aparece dentro de la sección "Chart" de settings
- [ ] El slider de seguridad actualiza el mapa en tiempo real cuando se está en modo ENC
- [ ] Cada toggle de capa reconstruye el estilo ENC inmediatamente si está en modo ENC
- [ ] Los toggles muestran estado activo/inactivo correcto

---

### TAREA 6: Actualizar i18n

**Archivos:** `en.ts` y `es.ts`

```typescript
// en.ts — AÑADIR en chart.controls:
enc: 'ENC Chart',

// en.ts — AÑADIR nueva sección settings.enc:
settings: {
  // ... existente ...
  enc: {
    title: 'ENC Chart Layers',
    safety_depth: 'Safety depth',
    depth_areas: 'Depth areas',
    depth_contours: 'Depth contours',
    buoys: 'Buoys & signals',
    hazards: 'Hazards',
    anchorages: 'Anchorages',
    tss: 'Traffic separation',
  }
}

// es.ts — AÑADIR equivalentes:
enc: 'Carta ENC',
settings: {
  enc: {
    title: 'Capas Carta ENC',
    safety_depth: 'Calado de seguridad',
    depth_areas: 'Áreas de profundidad',
    depth_contours: 'Isolíneas de profundidad',
    buoys: 'Boyas y señales',
    hazards: 'Peligros',
    anchorages: 'Fondeos',
    tss: 'Separación de tráfico',
  }
}
```

**Verificación Tarea 6:**
- [ ] Claves en ambos idiomas
- [ ] No hay claves rotas en el template

---

### TAREA 7: Actualizar `ngsw-config.json`

```json
{
  "dataGroups": [
    // ... entradas existentes OSM y OpenSeaMap de P0 ...
    {
      "name": "maplibre-glyphs",
      "urls": ["https://demotiles.maplibre.org/font/**"],
      "cacheConfig": {
        "maxSize": 200,
        "maxAge": "30d",
        "strategy": "performance"
      }
    }
  ]
}
```

> ⚠️ Los glyphs de MapLibre (`demotiles.maplibre.org/font`) son necesarios para
> renderizar las etiquetas de profundidad en los contours. Sin caché, cada cambio
> de tile requiere descargarlos de nuevo.

---

## 🧪 PLAN DE VERIFICACIÓN COMPLETO

### Test 1: Ciclo de toggle completo (4 modos)

```
1. Abrir http://localhost:4200/chart
2. Estado inicial: modo OSM
3. Click en toggle → ESPERADO: Satellite
4. Click en toggle → ESPERADO: Nautical (overlay OpenSeaMap P0)
5. Click en toggle → ESPERADO: ENC (carta vectorial)
   - Fondo OSM desaturado visible
   - Área demo de batimetría visible en escala de azules
   - Isolíneas visibles con etiquetas de profundidad
   - Boyas de colores IALA visibles
6. Click en toggle → ESPERADO: vuelve a OSM
7. Los datos de navegación (vessel, AIS, track) siguen visibles en todos los modos
```

### Test 2: Safety depth reactivo

```
1. Entrar en modo ENC
2. Ir a Settings → Chart → ENC Chart Layers
3. Mover el slider de "Safety depth" de 2.0m a 5.0m
4. ESPERADO: Las áreas de 2-5m cambian de color claro a rojo (peligroso)
5. El cambio debe ser inmediato (< 500ms)
6. Volver al mapa — el estilo ya está actualizado
```

### Test 3: Toggle de capas individuales

```
1. En modo ENC, ir a Settings
2. Desactivar "Depth areas"
3. ESPERADO: Las áreas coloreadas desaparecen, solo queda el fondo OSM
4. Las isolíneas siguen visibles (si están activas)
5. Desactivar "Buoys & signals"
6. ESPERADO: Los círculos de boyas desaparecen
7. Reactivar todo → vuelve al estado completo
```

### Test 4: Persistencia en localStorage

```
1. Configurar safety depth a 3.0m en Settings
2. Activar modo ENC
3. Recargar la página
4. ESPERADO: El slider de safety depth muestra 3.0m
5. ESPERADO: El modo de mapa NO persiste (vuelve a OSM por defecto — correcto)
6. ESPERADO: Las configuraciones de capas ENC sí persisten
```

### Test 5: Performance con el estilo ENC activo

```
1. En modo ENC, pan/zoom por el mapa
2. ESPERADO: Sin jank — el estilo GeoJSON es estático
3. DevTools → Network: sin requests adicionales al mover el mapa
   (solo los tiles raster de OSM base)
4. DevTools → Console: sin errores relacionados con glyphs
   (pueden aparecer warnings si los glyphs no están en caché — ignorar)
```

### Test 6: Compatibilidad con P0 y P1

```
1. En modo ENC con barco simulado activo:
   - Vessel marker visible ✓
   - Track del barco visible ✓
   - AIS targets visibles ✓
   - AIS tracks (P1) visibles ✓
   - CPA lines visibles ✓
2. Todos los datos del barco se renderizan ENCIMA del ENC — no tapados por él
3. El ciclo de toggle OSM→Satellite→Nautical→ENC sigue funcionando
```

---

## ⚠️ POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: Glyphs no se cargan — texto de profundidad no aparece

**Síntoma:** Las etiquetas de las isolíneas no se muestran, errores en consola como:
`Error: Could not load glyphs from https://demotiles.maplibre.org/font/...`  
**Causa:** El servidor de glyphs puede estar bloqueado o la URL cambia.  
**Solución alternativa:**
```typescript
// En buildEncStyle(), cambiar la URL de glyphs a una más fiable:
glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
// O usar el servidor de MapTiler (más estable):
glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=YOUR_KEY',
// Si no funciona ninguna, eliminar las capas de símbolo (labels) del ENC
// Los datos siguen siendo visibles sin texto
```

### Problema 2: TypeScript error en los `paint` con arrays de expresiones MapLibre

**Síntoma:** `Type 'any[]' is not assignable to type 'DataDrivenPropertyValueSpecification<number>'`  
**Causa:** Las expresiones MapLibre como `['interpolate', ...]` son arrays que TypeScript
no puede inferir correctamente como tipos MapLibre.  
**Solución:** Los `as any` en el código ya manejan esto. Si hay errores adicionales:
```typescript
// Añadir cast explícito donde sea necesario:
'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 10] as unknown as number,
```

### Problema 3: `onStyleReady()` no se llama después de `setStyle()` con el ENC style

**Síntoma:** Al cambiar a modo ENC, el vessel y los AIS desaparecen permanentemente.  
**Causa:** `map.setStyle()` puede no disparar `style.load` en algunas versiones de MapLibre.  
**Diagnóstico:** Verificar en `maplibre-engine.service.ts` cómo se escucha el evento de estilo.  
**Solución:**
```typescript
// En setBaseSource(), buscar el evento de escucha del estilo
// Asegurarse de que usa 'styledata' y no solo 'style.load':
this.map.once('styledata', () => {
  if (this.map?.isStyleLoaded()) {
    this.onStyleReady();
  } else {
    this.map?.once('style.load', () => this.onStyleReady());
  }
});
this.map.setStyle(newStyle);
```

### Problema 4: Los datos demo (GeoJSON) son visibles en todas las ubicaciones del mundo

**Síntoma:** Las áreas de batimetría demo aparecen en Vigo aunque el barco esté en otro lugar.  
**Causa:** Los datos demo son GeoJSON estático centrado en Ría de Vigo.  
**Acción:** Esto es comportamiento esperado en P2. Los datos demo son SOLO para
validar el sistema de estilos. En producción se conectarán tile servers reales
que solo envían datos de la zona visible. No es un bug, es una limitación documentada.

### Problema 5: Impacto en performance por reconstrucción del StyleSpecification

**Síntoma:** Cambiar el safety depth slider produce jank visible.  
**Causa:** `buildEncStyle()` genera un objeto nuevo y `setStyle()` reinicializa
todos los layers del mapa.  
**Solución:**
```typescript
// Añadir debounce al slider de safety depth en settings:
// (en el template)
(input)="onSafetyDepthChange($event)"
// → cambiar a:
(change)="onSafetyDepthChange($event)"  // Solo actualizar al soltar el slider
```

---

## ✅ DEFINITION OF DONE

- [ ] **T1a:** `ChartLayerMode` incluye `'enc'`
- [ ] **T1b:** `ChartSettings` tiene `safetyDepth: number` y `encLayers: EncLayerConfig`
- [ ] **T1c:** `setSafetyDepth()` y `updateEncLayers()` en ChartSettingsService
- [ ] **T2:** `enc-style.ts` existe y exporta `buildEncStyle(config, safetyDepth)`
- [ ] **T2:** `buildEncStyle` genera layers condicionales según `EncLayerConfig`
- [ ] **T2:** `safetyDepth` se usa en el filter de `enc-depth-very-shallow`
- [ ] **T3:** Ciclo de toggle funciona en 4 pasos: osm → satellite → nautical → enc → osm
- [ ] **T3:** `refreshEncStyle()` reconstruye el estilo cuando está en modo ENC
- [ ] **T4:** `MapControlsComponent` muestra icono `layers` en modo `enc`
- [ ] **T5:** Sección ENC visible en Settings con slider y 6 toggles de capas
- [ ] **T5:** Cambiar safety depth actualiza el mapa en tiempo real (en modo ENC)
- [ ] **T6:** i18n actualizado en EN y ES
- [ ] **T7:** Glyphs cacheados en ngsw-config.json
- [ ] **Visual:** En modo ENC se ven zonas coloreadas, isolíneas, boyas y peligros
- [ ] **Visual:** Zona < safetyDepth aparece en rojo distintivo
- [ ] **Compatibilidad:** Vessel, AIS, tracks de P1 visibles en modo ENC
- [ ] **Persistencia:** `safetyDepth` y `encLayers` persisten en localStorage
- [ ] **Build:** `ng build --configuration=production` sin errores

**Commit message sugerido:**
```
feat(chart): add ENC vector nautical chart mode with semantic S-57 styling

- Add 'enc' as 4th layer mode in ChartLayerMode cycle
- Create enc-style.ts with buildEncStyle(config, safetyDepth) factory
- IHO S-52 color palette for depth areas (5 zones + safety depth highlight)
- Depth contours with labeled isobaths at 5/10/20/50m
- IALA-A buoy coloring: port=red, starboard=green, cardinal=black/yellow
- Hazard symbols: rocks (darkred), wrecks (brown), obstructions
- Anchorage zones with labels
- TSS zones with dashed borders
- All ENC layers configurable independently via EncLayerConfig
- Safety depth threshold configurable (0.5-20m), reactive ENC style rebuild
- Settings page ENC section with slider + 6 layer toggles
- refreshEncStyle() updates live chart when safety depth changes
- Cache MapLibre glyphs in service worker (30d)
- GeoJSON demo data centered on Ría de Vigo for visual validation
- i18n EN/ES for all new keys
```

---

## 🚀 EXTENSIONES FUTURAS (documentadas, NO implementar ahora)

- **Tile server real:** Conectar `enc-depth-areas`, `enc-buoys`, etc. a PBF tile servers
  reales como `https://t1.openseamap.org/tiles/{z}/{x}/{y}.pbf` cuando estén disponibles.
  Solo requiere cambiar el `type: 'geojson'` por `type: 'vector'` y añadir la URL de tiles.

- **GEBCO batimetría global:** Usar datos GEBCO (General Bathymetric Chart of the Oceans)
  en formato COG (Cloud Optimized GeoTIFF) para cobertura global de profundidades.

- **Cartas S-57 propietarias:** Integrar `signalk-charts` plugin del servidor Signal K
  que sirve MBTiles de cartas comerciales (Navionics, C-MAP) como tile server local.

- **Símbolos SVG S-52:** Reemplazar los círculos de boyas por símbolos SVG exactos del
  catálogo de presentación S-52 (IALA buoy shapes, light flare sectors, etc.)

- **Sectores de luz de faros:** Renderizar los sectores de visibilidad de faros
  como arcos de círculo con los colores correctos (rojo/verde/blanco).

- **Archivos de ruta S-57:** Exportar rutas planificadas en formato oficial S-57
  para compatibilidad con otros sistemas de navegación.
