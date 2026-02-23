# PROMPT P0: OpenSeaMap Nautical Overlay
## Open Marine Instrumentation — Conversión a Carta Náutica Real

**Versión:** 1.0 | **Fecha:** 2026-02-23 | **Estimación:** 2-4 horas  
**Prioridad:** P0 — Mayor impacto visual, mínimo riesgo, zero breaking changes

---

## 🎯 OBJETIVO

Transformar el mapa base actual (OpenStreetMap puro) en una carta náutica funcional añadiendo:

1. **OpenSeaMap overlay** — marcas náuticas: boyas, faros, fondeos, obstáculos, cables, TSS
2. **Modo náutico** como tercera opción de capa (OSM → Satellite → **Nautical**)
3. **Tile caching** para funcionamiento offline de la capa náutica
4. **Toggle de opacidad** del overlay para ajustar legibilidad

El resultado debe ser indistinguible visualmente de una carta náutica de referencia, usando únicamente recursos gratuitos y open-source.

---

## 📁 ARCHIVOS INVOLUCRADOS

```
marine-instrumentation-ui/src/app/
├── data-access/chart/
│   └── chart-sources.ts                   ← MODIFICAR: añadir fuente náutica
├── features/chart/
│   ├── services/
│   │   ├── chart-facade.service.ts        ← MODIFICAR: ciclo de toggle 3 estados
│   │   └── maplibre-engine.service.ts     ← MODIFICAR: soporte overlay dinámico
│   ├── components/
│   │   └── map-controls/
│   │       ├── map-controls.component.ts  ← MODIFICAR: icono/estado nuevo modo
│   │       └── map-controls.component.html ← MODIFICAR: tooltip/aria actualizado
│   └── types/
│       └── chart-vm.ts                    ← MODIFICAR: nuevo tipo ChartLayerMode
├── core/i18n/
│   ├── en.ts                              ← MODIFICAR: añadir clave 'nautical'
│   └── es.ts                              ← MODIFICAR: añadir clave 'náutico'
└── ngsw-config.json                       ← MODIFICAR: cachear tiles OpenSeaMap
```

---

## 🔍 ESTADO ACTUAL DEL CÓDIGO (contexto crítico)

### `chart-sources.ts` — estado actual
```typescript
// EXISTE:
export const CHART_SOURCES: ChartSourceDefinition[] = [
  { id: 'osm-raster',      available: true,  ... },
  { id: 'nautical-raster', available: false, ... },  // ← PLACEHOLDER sin usar
  { id: 'nautical-vector', available: false, ... },  // ← PLACEHOLDER sin usar
];
```

### `chart-facade.service.ts` — toggle actual
```typescript
// EXISTE - lógica binaria OSM ↔ Satellite:
toggleLayer(): void {
  const current = this._baseSource$.value;
  if (current.id === 'osm-raster') {
    this._baseSource$.next(SATELLITE_SOURCE);
  } else {
    this._baseSource$.next(DEFAULT_BASE_SOURCE);
  }
}
```

### `maplibre-engine.service.ts` — estilo base actual
```typescript
// EXISTE - DEFAULT_STYLE solo tiene OSM:
const DEFAULT_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 },
  },
  layers: [{ id: 'osm-raster', type: 'raster', source: 'osm-raster' }],
};

// setBaseSource() reconstruye el mapa completo al cambiar source
// Todos los layers de datos (vessel, AIS, track, etc.) se re-añaden en onStyleReady()
```

---

## 📐 ESPECIFICACIÓN TÉCNICA DETALLADA

### TAREA 1: Definir el nuevo ChartSourceConfig náutico

**Archivo:** `src/app/data-access/chart/chart-sources.ts`

**Qué hacer:** Reemplazar los placeholders `nautical-raster` y `nautical-vector` (ambos `available: false`) por una entrada real funcional con el estilo MapLibre completo.

**Implementación exacta:**

```typescript
// ELIMINAR las dos entradas placeholder existentes (nautical-raster y nautical-vector)
// AÑADIR esta nueva entrada que combina OSM base + OpenSeaMap overlay:

const NAUTICAL_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    // Capa base: OpenStreetMap (misma que el modo OSM)
    'osm-base': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      // Tile size correcto para OSM
    },
    // Overlay náutico: OpenSeaMap seamark tiles
    'openseamap-overlay': {
      type: 'raster',
      tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="http://www.openseamap.org">OpenSeaMap</a> contributors',
      // minzoom: 8 — los tiles náuticos no tienen detalle por debajo de z8
      minzoom: 8,
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: 'osm-base-layer',
      type: 'raster',
      source: 'osm-base',
      // Sin filtros adicionales — renderizar todo
    },
    {
      id: 'openseamap-overlay-layer',
      type: 'raster',
      source: 'openseamap-overlay',
      paint: {
        // Opacidad 0.9 — visible pero no aplasta el fondo OSM
        // El usuario podrá ajustar esto desde settings en el futuro
        'raster-opacity': 0.9,
        // Fade-in suave cuando los tiles cargan
        'raster-fade-duration': 200,
      },
      // CRITICAL: minzoom en el LAYER también (no solo en el source)
      // Evita renders vacíos con fondo negro en zooms bajos
      minzoom: 8,
    },
  ],
};

// Actualizar el array CHART_SOURCES:
export const CHART_SOURCES: ChartSourceDefinition[] = [
  {
    id: DEFAULT_CHART_SOURCE_ID, // 'osm-raster'
    label: 'Map',
    kind: 'raster',
    style: OSM_RASTER_STYLE,    // SIN CAMBIOS
    description: 'OpenStreetMap base map.',
    available: true,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    kind: 'raster',
    // NOTA: la definición de SATELLITE_SOURCE está en chart-facade.service.ts
    // NO moverla, solo asegurarse de que este id coincida
    description: 'ESRI World Imagery satellite tiles.',
    available: true,
  },
  {
    id: 'nautical',                         // ← ID NUEVO
    label: 'Nautical',
    kind: 'raster',
    style: NAUTICAL_RASTER_STYLE,           // ← Estilo nuevo definido arriba
    description: 'OpenStreetMap + OpenSeaMap nautical overlay with buoys, lights, hazards.',
    available: true,                        // ← Cambiar de false a true
  },
];
```

**Verificación Tarea 1:**
- [ ] `CHART_SOURCES` tiene exactamente 3 entradas, todas con `available: true`
- [ ] `resolveChartStyle('nautical')` retorna el `StyleSpecification` con 2 sources y 2 layers
- [ ] `tsc --noEmit` sin errores

---

### TAREA 2: Actualizar el tipo `ChartLayerMode` en chart-vm.ts

**Archivo:** `src/app/features/chart/types/chart-vm.ts`

**Qué hacer:** El sistema actual usa un booleano implícito (osm vs satellite). Necesitamos un tipo explícito de 3 valores.

```typescript
// AÑADIR al archivo (no eliminar nada existente):
export type ChartLayerMode = 'osm' | 'satellite' | 'nautical';

// Si existe algún tipo similar ya definido (ej: 'MapLayer'), reemplazarlo
// Si no existe nada similar, solo añadir la línea de arriba
```

**Verificación Tarea 2:**
- [ ] `ChartLayerMode` es exportado desde `chart-vm.ts`
- [ ] Ningún otro archivo importa un tipo anterior con mismo propósito

---

### TAREA 3: Actualizar `ChartFacadeService` para toggle de 3 estados

**Archivo:** `src/app/features/chart/services/chart-facade.service.ts`

**Qué hacer:** Cambiar la lógica binaria `toggleLayer()` por un ciclo de 3 estados: `osm → satellite → nautical → osm → ...`

**Implementación exacta:**

```typescript
// PASO 3.1: Añadir NAUTICAL_SOURCE al bloque de constantes privadas del archivo
// (junto a donde están definidas DEFAULT_BASE_SOURCE y SATELLITE_SOURCE)

import { resolveChartStyle } from '../../../data-access/chart/chart-sources';

const NAUTICAL_SOURCE: ChartSourceConfig = {
  id: 'nautical',
  style: resolveChartStyle('nautical') as maplibregl.StyleSpecification,
};
```

> ⚠️ **ADVERTENCIA:** `resolveChartStyle` puede retornar `string` (URL) o `StyleSpecification`.
> Para nautical siempre retornará el objeto completo, pero el cast es necesario para TypeScript.
> Alternativamente, importar directamente `NAUTICAL_RASTER_STYLE` desde `chart-sources.ts`
> si se exporta (preferible para type safety).

```typescript
// PASO 3.2: Reemplazar toggleLayer() completo:

// ELIMINAR esto:
toggleLayer(): void {
  const current = this._baseSource$.value;
  if (current.id === 'osm-raster') {
    this._baseSource$.next(SATELLITE_SOURCE);
  } else {
    this._baseSource$.next(DEFAULT_BASE_SOURCE);
  }
}

// AÑADIR esto:
toggleLayer(): void {
  const current = this._baseSource$.value;
  switch (current.id) {
    case 'osm-raster':
      this._baseSource$.next(SATELLITE_SOURCE);
      break;
    case 'satellite':
      this._baseSource$.next(NAUTICAL_SOURCE);
      break;
    case 'nautical':
    default:
      this._baseSource$.next(DEFAULT_BASE_SOURCE);
      break;
  }
}

// PASO 3.3: Añadir getter para el modo actual (para que el UI pueda mostrar estado)
get currentLayerMode(): ChartLayerMode {
  const id = this._baseSource$.value.id;
  if (id === 'satellite') return 'satellite';
  if (id === 'nautical') return 'nautical';
  return 'osm';
}
```

**Verificación Tarea 3:**
- [ ] Llamar `toggleLayer()` 3 veces cicla: osm → satellite → nautical → osm
- [ ] `currentLayerMode` retorna el valor correcto para cada estado
- [ ] No hay referencias a la lógica binaria antigua

---

### TAREA 4: Actualizar `MapControlsComponent` para mostrar el nuevo estado

**Archivos:**
- `src/app/features/chart/components/map-controls/map-controls.component.ts`
- `src/app/features/chart/components/map-controls/map-controls.component.html`

**Qué hacer:** El botón de layer toggle debe mostrar visualmente en qué modo está y cuál será el siguiente. Patrón: el icono/label muestra el MODO SIGUIENTE (lo que activará el click), como hace Google Maps.

**Implementación — component.ts:**

```typescript
// Localizar el @Input que recibe el estado de layer
// Actualmente puede ser algo como: @Input() isLayerSatellite: boolean

// REEMPLAZAR con:
import type { ChartLayerMode } from '../../types/chart-vm';

@Input() layerMode: ChartLayerMode = 'osm';

// AÑADIR getter para calcular qué mostrará el botón:
get layerButtonLabel(): string {
  // El botón muestra el SIGUIENTE modo (al que irá al hacer click)
  switch (this.layerMode) {
    case 'osm':       return 'Satellite';   // será reemplazado por i18n
    case 'satellite': return 'Nautical';
    case 'nautical':  return 'Map';
    default:          return 'Layer';
  }
}

get layerButtonIcon(): string {
  // Icono del MODO ACTUAL (lo que hay ahora)
  switch (this.layerMode) {
    case 'satellite': return 'satellite';   // usar icono existente
    case 'nautical':  return 'anchor';      // nuevo icono náutico
    case 'osm':
    default:          return 'map';
  }
}

// Si el componente usa i18n, actualizar para usar las nuevas claves
```

**Implementación — component.html:**

```html
<!-- LOCALIZAR el botón de toggle de layer (actualmente tiene label 'Satellite' o 'Map') -->
<!-- REEMPLAZAR su contenido para reflejar el modo actual -->

<button 
  class="map-control-btn"
  (click)="toggleLayers.emit()"
  [attr.aria-label]="'Switch to ' + layerButtonLabel + ' view'"
  [title]="layerButtonLabel"
  [class.map-control-btn--active]="layerMode === 'nautical'"
>
  <app-icon [name]="layerButtonIcon" />
  <!-- Badge pequeño indicando modo actual si hay espacio en la UI -->
  <span class="layer-mode-label" *ngIf="showLayerLabel">
    {{ layerMode | titlecase }}
  </span>
</button>
```

> 📌 **NOTA:** Si el componente tiene un `@Input() isLayerSatellite: boolean`, hay que buscar
> TODOS los lugares que lo pasan (principalmente `chart.page.ts`) y actualizar para pasar
> `layerMode: ChartLayerMode` en su lugar.

**Actualizar `chart.page.ts`:**

```typescript
// LOCALIZAR el binding del componente map-controls
// BUSCAR algo como: [isLayerSatellite]="..."
// REEMPLAZAR con: [layerMode]="facade.currentLayerMode"

// Si currentLayerMode es un getter (no Signal), convertirlo a Signal para
// compatibilidad con change detection OnPush:
// readonly layerModeSignal = computed(() => this.facade.currentLayerMode);
// Y en el template: [layerMode]="layerModeSignal()"
```

**Verificación Tarea 4:**
- [ ] El botón muestra icono `map` cuando está en modo OSM
- [ ] El botón muestra icono `satellite` cuando está en modo satellite  
- [ ] El botón muestra icono `anchor` cuando está en modo nautical (con clase `--active`)
- [ ] `aria-label` cambia correctamente en cada modo
- [ ] No hay errores de TypeScript por el cambio de tipo boolean → ChartLayerMode

---

### TAREA 5: Añadir icono `anchor` al sprite SVG

**Archivo:** `src/assets/icons/sprite.svg` (o donde esté el sprite de iconos)

**Qué hacer:** El sistema usa un sprite SVG para iconos (NauticIconComponent). Necesita el icono `anchor`.

**SVG del icono anchor (náutico, 24×24):**
```xml
<!-- Añadir dentro del <defs> o como <symbol> en el sprite: -->
<symbol id="icon-anchor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- Aro superior -->
  <circle cx="12" cy="5" r="2"/>
  <!-- Línea vertical -->
  <line x1="12" y1="7" x2="12" y2="19"/>
  <!-- Barra horizontal -->
  <line x1="6" y1="10" x2="18" y2="10"/>
  <!-- Curvas inferiores -->
  <path d="M6 19c0-2 2-3 6-3s6 1 6 3"/>
  <!-- Extremos curvados -->
  <path d="M6 19c-1.5 0-3-1-3-3"/>
  <path d="M18 19c1.5 0 3-1 3-3"/>
</symbol>
```

> ⚠️ Si el proyecto usa Lucide icons directamente (no sprite), verificar que `anchor` existe
> en la versión instalada. Lucide tiene `Anchor` desde v0.1. Si es así, no hace falta este paso.

**Verificación Tarea 5:**
- [ ] `<app-icon name="anchor" />` renderiza sin error y muestra el icono

---

### TAREA 6: Actualizar strings i18n

**Archivos:** `src/app/core/i18n/en.ts` y `src/app/core/i18n/es.ts`

**Qué hacer:** Añadir la clave para el nuevo modo náutico en la sección `chart.controls`.

**en.ts:**
```typescript
// LOCALIZAR la sección chart.controls (actualmente tiene 'satellite' y 'map')
// AÑADIR:
chart: {
  controls: {
    // ... claves existentes sin cambios ...
    satellite: 'Satellite',  // existente
    map: 'Map',              // existente
    nautical: 'Nautical',    // ← NUEVO
    layer: 'Layer',          // existente - puede mantenerse como fallback
  }
}
```

**es.ts:**
```typescript
chart: {
  controls: {
    // ...
    nautical: 'Náutico',   // ← NUEVO
  }
}
```

**Verificación Tarea 6:**
- [ ] Las claves están en ambos idiomas
- [ ] El TranslatePipe resuelve `'chart.controls.nautical'` sin retornar la clave cruda

---

### TAREA 7: Configurar Service Worker para cachear tiles OpenSeaMap

**Archivo:** `src/ngsw-config.json`

**Qué hacer:** El tile caching ya existe para OSM tiles. Añadir una entrada similar para OpenSeaMap.

**Estado actual del ngsw-config.json (verificar que existe algo así):**
```json
{
  "dataGroups": [
    {
      "name": "osm-tiles",
      "urls": ["https://tile.openstreetmap.org/**"],
      "cacheConfig": {
        "maxSize": 10000,
        "maxAge": "7d",
        "strategy": "performance"
      }
    }
  ]
}
```

**Añadir entrada para OpenSeaMap:**
```json
{
  "dataGroups": [
    {
      "name": "osm-tiles",
      "urls": ["https://tile.openstreetmap.org/**"],
      "cacheConfig": {
        "maxSize": 10000,
        "maxAge": "7d",
        "timeout": "5s",
        "strategy": "performance"
      }
    },
    {
      "name": "openseamap-tiles",
      "urls": ["https://tiles.openseamap.org/**"],
      "cacheConfig": {
        "maxSize": 5000,
        "maxAge": "14d",
        "timeout": "5s",
        "strategy": "performance"
      }
    }
  ]
}
```

> 📌 Los tiles náuticos cambian con menos frecuencia que OSM, por eso `maxAge: 14d`.
> `maxSize: 5000` es menor porque las marcas náuticas tienen menos tiles únicos que el mapa base.

**Verificación Tarea 7:**
- [ ] El archivo `ngsw-config.json` es JSON válido después de la edición
- [ ] `ng build` no produce errores de configuración del service worker

---

## 🧪 PLAN DE VERIFICACIÓN COMPLETO

### Test 1: Funcionalidad básica del toggle

```
1. Abrir http://localhost:4200/chart
2. El mapa carga en modo OSM (igual que antes)
3. Hacer click en el botón de layer toggle
4. ESPERADO: El mapa cambia a satellite view (igual que antes)
5. Hacer click de nuevo
6. ESPERADO: El mapa cambia a modo náutico
   - El fondo sigue siendo OSM (calles, tierra, agua)
   - Encima aparecen símbolos náuticos de OpenSeaMap
   - Boyas IALA (rojas/verdes), faros, áreas de fondeo, líneas de separación de tráfico
7. Hacer click de nuevo
8. ESPERADO: Vuelve a modo OSM
```

### Test 2: Persistencia de datos sobre el mapa náutico

```
1. En modo náutico, verificar que todos los layers de datos siguen funcionando:
   - Vessel marker visible y rotando correctamente
   - Track histórico visible
   - Range rings (si activados) visibles
   - AIS targets visibles con iconos y líneas CPA
   - Waypoints y rutas visibles
   
   CRÍTICO: El cambio de source reconstruye el mapa, pero onStyleReady() re-añade
   todos los layers. Verificar que esto funciona con el nuevo style náutico.
```

### Test 3: Comportamiento en zoom bajo

```
1. En modo náutico, hacer zoom out a nivel 5-6
2. ESPERADO: Solo se ve el fondo OSM (el overlay náutico no aparece en zooms bajos)
   - NO debe aparecer pantalla negra donde irían los tiles náuticos
   - El minzoom: 8 del layer debe prevenir esto
3. Hacer zoom in a nivel 10+
4. ESPERADO: Los símbolos náuticos aparecen progresivamente
```

### Test 4: Estado visual del botón

```
1. Modo OSM → botón muestra icono 'map' (o el icono del modo ACTUAL)
2. Modo Satellite → botón muestra icono 'satellite' 
3. Modo Nautical → botón muestra icono 'anchor' con clase --active
4. aria-label cambia en cada modo
```

### Test 5: Rendimiento

```
1. En modo náutico, navegar por el mapa (pan/zoom)
2. ESPERADO: No hay jank ni lag perceptible
3. Abrir DevTools → Network
4. ESPERADO: Los tiles de openseamap.org se cargan con status 200
5. Navegar de vuelta a la misma zona
6. ESPERADO: Los tiles se sirven desde caché (status 304 o desde SW caché)
```

---

## ⚠️ POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: CORS en tiles de OpenSeaMap
**Síntoma:** Los tiles náuticos no cargan, error CORS en consola.  
**Causa:** `tiles.openseamap.org` a veces tiene headers CORS restrictivos.  
**Solución alternativa:**  
```typescript
// Si hay CORS, usar proxy alternativo o tiles espejo:
tiles: [
  'https://t1.openseamap.org/seamark/{z}/{x}/{y}.png',
  'https://t2.openseamap.org/seamark/{z}/{x}/{y}.png',
],
```
Si persiste, documentar y planificar servidor proxy local en Fase 2.

### Problema 2: `onStyleReady()` no se dispara con el nuevo style
**Síntoma:** Al cambiar a modo náutico, los layers de datos (vessel, AIS) desaparecen.  
**Causa:** `setBaseSource()` puede estar usando `setStyle()` de MapLibre que no siempre dispara `style.load`.  
**Solución:**
```typescript
// En maplibre-engine.service.ts, en setBaseSource():
this.map.once('styledata', () => {
  this.onStyleReady();
});
this.map.setStyle(newStyle);
```

### Problema 3: TypeScript error en `currentLayerMode` getter
**Síntoma:** `Property 'id' does not exist on type X`  
**Causa:** `_baseSource$` puede tener tipo incorrecto.  
**Solución:** Verificar que `ChartSourceConfig.id` es `string` y hacer el switch sobre ese string.

### Problema 4: El toggle pasa por `nautical` pero el ID no coincide
**Síntoma:** El switch en `toggleLayer()` nunca matchea `'nautical'`  
**Causa:** El `id` en `NAUTICAL_SOURCE` no coincide exactamente con lo que hay en `_baseSource$.value.id`  
**Solución:** Usar la constante:
```typescript
const NAUTICAL_SOURCE_ID = 'nautical';
// Usar NAUTICAL_SOURCE_ID en todas partes en lugar del string literal
```

---

## 🔗 RECURSOS DE REFERENCIA

- **OpenSeaMap tiles:** https://openseamap.org/index.php?id=karten (documentación oficial)
- **Tile URL format:** `https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png`
- **MapLibre GL JS - raster layers:** https://maplibre.org/maplibre-gl-js/docs/API/classes/RasterLayerSpecification/
- **Coverage:** Los tiles de OpenSeaMap tienen mejor cobertura en Europa y costas populares
- **Leyenda de símbolos IALA:** https://www.iho.int/mtg_docs/com_wg/ICSM/ICSM4/4_10.pdf

---

## ✅ DEFINITION OF DONE

- [ ] **T1:** `chart-sources.ts` tiene entrada `nautical` con `available: true` y style completo
- [ ] **T2:** `ChartLayerMode` type existe en `chart-vm.ts`
- [ ] **T3:** `toggleLayer()` cicla correctamente en 3 estados
- [ ] **T4:** `MapControlsComponent` refleja el modo actual con icono correcto
- [ ] **T5:** Icono `anchor` renderiza sin error
- [ ] **T6:** i18n actualizado en EN y ES
- [ ] **T7:** `ngsw-config.json` incluye caché para `openseamap.org`
- [ ] **Build:** `ng build --configuration=production` sin errores ni warnings nuevos
- [ ] **Visual:** En zoom 10+, el mapa en modo náutico muestra símbolos náuticos sobre el fondo OSM
- [ ] **Datos:** Vessel, AIS, track y waypoints siguen siendo visibles en modo náutico
- [ ] **Ciclo:** Toggle OSM → Satellite → Nautical → OSM funciona correctamente

**Commit message sugerido:**
```
feat(chart): add OpenSeaMap nautical overlay as third layer mode

- Add nautical raster source combining OSM base + OpenSeaMap seamark tiles
- Update layer toggle to cycle OSM → Satellite → Nautical → OSM
- Add ChartLayerMode type for explicit layer state typing
- Add anchor icon for nautical mode indicator
- Cache OpenSeaMap tiles in service worker (14d, 5000 items)
- Update i18n EN/ES with 'nautical' key
```

---

## 🚀 EXTENSIONES FUTURAS (NO implementar ahora)

Estas ideas quedan documentadas para fases posteriores:

- **Slider de opacidad** del overlay náutico (0-100%) en el panel de settings
- **Tiles vectoriales S-57** via OpenNauticalChart para profundidades, corrientes, tipos de fondo
- **NOAA tiles** para aguas norteamericanas (endpoint diferente, misma arquitectura)
- **Tile server local** con MBTiles para uso completamente offline en el barco
- **Depth color shading** calculado desde datos de batimetría GEBCO (gratuito)
