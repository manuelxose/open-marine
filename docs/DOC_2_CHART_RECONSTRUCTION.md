# DOCUMENTO MAESTRO 2: REESTRUCTURACIÓN COMPLETA DE LA PÁGINA CHART
## Open Marine Instrumentation (OMI) — Feature Parity con OpenPlotter/Freeboard-SK

**Versión:** 1.0  
**Tipo:** Agent Execution Guide — Feature Engineering  
**Alcance:** Página `/chart` completa con todas las funcionalidades de un chartplotter profesional  
**Stack:** Angular 21.1 + MapLibre GL JS 5.16 + RxJS 7.8 + Signal K  
**Duración estimada:** 12–16 sesiones de trabajo  
**Prerequisito:** Documento 1 (Glass Bridge Styles) completado O en progreso paralelo  

---

## ⚠️ PROTOCOLO OBLIGATORIO DE INICIALIZACIÓN

1. **Leer este documento completo** antes de escribir código
2. **Leer el estado actual** del chart en `docs/chart-architecture-spec.md`
3. **Crear el tracking document** en `docs/CHART_RECONSTRUCTION_STATUS.md`
4. **Auditar el código existente** en `features/chart/` (listado en Sección 1)
5. **Implementar UN milestone a la vez**, con confirmación del usuario entre cada uno
6. **No romper funcionalidad existente** — cada commit debe ser un estado funcional

---

## 0. VISIÓN Y OBJETIVO

### 0.1 Qué es el Chart para OMI

La página Chart es el **corazón de la aplicación**. No es solo un mapa: es el Glass Bridge completo donde el navegante tiene acceso a toda la información y controles críticos desde una sola pantalla sin necesidad de navegar a otras páginas.

El objetivo es alcanzar paridad funcional con:
- **Freeboard-SK** (referencia principal)
- **OpenPlotter** (funcionalidad offline + Signal K nativo)
- **Simrad GO / Garmin GPSMap** (UX de chartplotter profesional)

### 0.2 Layout Target

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR: Vessel Data Strip (SOG, COG, HDG, Position, Time, Connection)    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   MAPA PRINCIPAL (MapLibre GL JS)                                    │  │
│  │   - Vessel marker con heading                                        │  │
│  │   - AIS targets                                                      │  │
│  │   - Waypoints / Routes / Tracks                                      │  │
│  │   - Range rings                                                      │  │
│  │   - Bearing lines                                                    │  │
│  │                                                                      │  │
│  │  ┌─────────────────┐         ┌──────────────────────────────────┐   │  │
│  │  │ FLOATING PANEL  │         │ INSTRUMENTS OVERLAY (right)      │   │  │
│  │  │ (left, colaps.) │         │ - Wind rose                      │   │  │
│  │  │ - Layers        │         │ - Depth gauge                    │   │  │
│  │  │ - AIS list      │         │ - Speed gauge                    │   │  │
│  │  │ - Waypoints     │         │ - VMG / XTE                      │   │  │
│  │  │ - Routes        │         │ - Wind speed/angle               │   │  │
│  │  └─────────────────┘         └──────────────────────────────────┘   │  │
│  │                                                                      │  │
│  │  [+] [-]  [N↑] [C↑]  [Anchor]  [MOB]  [⟳ Center]  [Layers ☰]     │  │
│  │                    MAP CONTROLS (bottom bar)                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  BOTTOM PANEL (colapsable): Route info / Active alarm / Playback bar      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. AUDITORÍA DEL ESTADO ACTUAL

### 1.1 Archivos Existentes a Auditar

```
features/chart/
├── chart.page.ts                         # Auditar: lógica de orquestación
├── chart-facade.service.ts               # Auditar: qué expone actualmente
├── services/
│   ├── maplibre-engine.service.ts        # Auditar: layers, métodos, estado
│   ├── chart-settings.service.ts         # Auditar: configuración persistente
│   └── [otros services]
├── components/
│   ├── map-container/                    # Auditar: cómo monta el mapa
│   ├── map-controls/                     # Auditar: controles actuales
│   ├── chart-hud/                        # Auditar: datos mostrados
│   ├── compass/                          # Ya existe — refactorizar a GB
│   └── [otros]
├── layers/
│   ├── vessel-marker.layer.ts            # Verificar estados: normal/stale/no-fix
│   ├── track.layer.ts                    # Verificar
│   ├── ais-targets.layer.ts              # Verificar CPA lines
│   └── route.layer.ts                    # Verificar
└── types/
    ├── chart-vm.ts                        # Auditar ViewModels
    └── chart-geojson.ts                  # Auditar GeoJSON types
```

### 1.2 Features Actuales vs. Target

| Feature | Estado Actual | Target | Gap |
|---------|---------------|--------|-----|
| Mapa base (OSM) | ✅ Funcional | ✅ | Sin gap |
| Vessel marker | ✅ Con estados | ✅ | Mejorar icono |
| Track recording | ✅ Básico | ✅ Full | Simplificación Douglas-Peucker |
| Waypoints CRUD | ✅ Básico | ✅ Full | Drag & drop, iconos |
| Rutas | ✅ Básico | ✅ Full | ETA, leg info, activar |
| AIS targets | ✅ Con CPA | ✅ | Target list panel |
| Alarmas visuales | ✅ Básico | ✅ Full | Audio, anchor watch |
| Autopilot | ❌ No existe | ⬜ P2 | Consola completa |
| History Playback | ❌ No existe | ⬜ P2 | Timeline + scrubber |
| Instruments overlay | ✅ Parcial | ✅ Full | Más widgets |
| Tile cache offline | ✅ Service Worker | ✅ | OK |
| North-Up / Course-Up | ✅ Existe | ✅ | OK |
| Range Rings | ✅ Existe | ✅ | Configurables |
| Bearing lines | ✅ Existe | ✅ | OK |
| True Wind vector | ✅ Existe | ✅ | OK |
| GPX Import/Export | ✅ Parcial | ✅ Full | Export tracks |
| Anchor Watch | ❌ No existe | ✅ P0 | IMPLEMENTAR |
| MOB Button | ❌ No existe | ✅ P0 | IMPLEMENTAR |
| S57 Charts | ❌ No existe | ⬜ P3 | Fuera de scope |
| GRIB Weather | ❌ No existe | ⬜ P3 | Fuera de scope |

---

## 2. ARQUITECTURA OBJETIVO DETALLADA

### 2.1 Estructura de Archivos Target

```
features/chart/
├── chart.page.ts                        # Entry component (orquestador)
├── chart.page.html                      # Layout principal
├── chart.page.scss                      # Estilos del layout
├── chart.routes.ts                      # Lazy loading config
│
├── services/
│   ├── chart-facade.service.ts          # Fachada principal (EXPANDIR)
│   ├── maplibre-engine.service.ts       # Motor de mapa (EXPANDIR)
│   ├── chart-settings.service.ts        # Configuración persistente
│   ├── anchor-watch.service.ts          # NUEVO: Vigilancia de ancla
│   ├── mob-alert.service.ts             # NUEVO: Man Overboard
│   └── chart-playback.service.ts        # NUEVO: History playback
│
├── layers/
│   ├── vessel-marker.layer.ts           # MEJORAR: 4 estados visuales
│   ├── track.layer.ts                   # MEJORAR: simplificación
│   ├── ais-targets.layer.ts             # OK: verificar
│   ├── route.layer.ts                   # MEJORAR: leg labels
│   ├── anchor-watch.layer.ts            # NUEVO: círculo de ancla
│   └── mob.layer.ts                     # NUEVO: marcador MOB
│
├── components/
│   ├── map-container/                   # REFACTORIZAR layout
│   │   ├── map-container.component.ts
│   │   ├── map-container.component.html
│   │   └── map-container.component.scss
│   │
│   ├── chart-top-bar/                   # NUEVO: barra de datos superior
│   │   ├── chart-top-bar.component.ts
│   │   ├── chart-top-bar.component.html
│   │   └── chart-top-bar.component.scss
│   │
│   ├── map-controls/                    # EXPANDIR: más controles
│   │   └── [existente + nuevos]
│   │
│   ├── instruments-overlay/             # EXPANDIR: más widgets
│   │   ├── instruments-overlay.component.ts
│   │   └── panels/
│   │       ├── wind-rose-panel/
│   │       ├── depth-gauge-panel/
│   │       ├── speed-gauge-panel/
│   │       ├── vmg-xte-panel/
│   │       └── compass-panel/
│   │
│   ├── left-panel/                      # NUEVO: Panel flotante izquierdo
│   │   ├── left-panel.component.ts
│   │   └── tabs/
│   │       ├── layers-tab/              # Control de capas del mapa
│   │       ├── ais-list-tab/            # Lista de targets AIS
│   │       ├── waypoints-tab/           # Lista y gestión de waypoints
│   │       └── routes-tab/             # Lista y gestión de rutas
│   │
│   ├── bottom-panel/                    # NUEVO: Panel inferior colapsable
│   │   ├── bottom-panel.component.ts
│   │   └── views/
│   │       ├── route-info-view/         # Info de ruta activa
│   │       ├── alarm-banner-view/       # Alarmas activas
│   │       └── playback-bar-view/       # Playback timeline
│   │
│   ├── anchor-watch-dialog/             # NUEVO: Configuración de ancla
│   ├── mob-alert-overlay/              # NUEVO: Alerta MOB pantalla completa
│   ├── waypoint-context-menu/          # NUEVO: Click derecho en waypoint
│   ├── ais-target-tooltip/             # MEJORAR: Info en hover
│   └── chart-hud/                      # MANTENER + MEJORAR
│
├── types/
│   ├── chart-vm.ts                     # ViewModels (EXPANDIR)
│   ├── chart-geojson.ts                # GeoJSON types
│   └── chart-state.ts                  # NUEVO: State interfaces
│
└── index.ts                            # Barrel export
```

### 2.2 State Machine del Chart

```typescript
// types/chart-state.ts

export type ChartMode = 
  | 'normal'          // Navegación normal
  | 'placing-waypoint' // Usuario haciendo click para poner waypoint
  | 'placing-anchor'   // Usuario seleccionando punto de ancla
  | 'mob-active'       // Man Overboard activo
  | 'route-active'     // Navegando una ruta
  | 'playback'         // Reproducción histórica
  | 'autopilot';       // Control de autopiloto activo

export interface ChartState {
  mode: ChartMode;
  orientation: MapOrientation;
  layers: LayerVisibility;
  activeWaypointId: string | null;
  activeRouteId: string | null;
  anchorPosition: [number, number] | null;
  anchorRadius: number;          // metros
  anchorWatchActive: boolean;
  mobPosition: [number, number] | null;
  mobTimestamp: number | null;
  leftPanelOpen: boolean;
  leftPanelTab: 'layers' | 'ais' | 'waypoints' | 'routes';
  bottomPanelOpen: boolean;
  bottomPanelView: 'route' | 'alarm' | 'playback' | null;
}

export interface LayerVisibility {
  vessel: boolean;
  track: boolean;
  waypoints: boolean;
  routes: boolean;
  ais: boolean;
  aisNames: boolean;
  trueWind: boolean;
  rangeRings: boolean;
  bearingLine: boolean;
  cpaLines: boolean;
  anchorCircle: boolean;
}
```

---

## 3. MILESTONES DE IMPLEMENTACIÓN

### M1: Top Bar de Datos del Barco (P0 — 3-4h)

#### M1.1 Objetivo
Barra superior siempre visible con los datos más críticos del barco, visible en todo momento durante la navegación.

#### M1.2 Datos a Mostrar

```typescript
interface TopBarViewModel {
  // Datos de movimiento
  sog: { value: number; unit: 'kts'; quality: DataQuality };
  cog: { value: number; formatted: string; quality: DataQuality };  // "145°"
  hdg: { value: number; formatted: string; quality: DataQuality };  // "142° T"
  
  // Posición
  position: {
    lat: string;  // "41°23.456'N"
    lon: string;  // "002°11.234'E"
    quality: DataQuality;
  };
  
  // Temporal
  utcTime: string;    // "14:32:07 UTC"
  localTime: string;  // "16:32:07"
  
  // Conexión
  signalKConnected: boolean;
  signalKQuality: 'online' | 'degraded' | 'offline';
  
  // Ruta activa (si existe)
  activeRoute: {
    name: string;
    nextWaypointName: string;
    dtw: number;    // Distance to waypoint (NM)
    btw: number;    // Bearing to waypoint (°)
    xte: number;    // Cross Track Error (NM, + starboard)
    eta: string;    // ETA al waypoint
    ttg: string;    // Time to Go
  } | null;
}
```

#### M1.3 Implementación

```html
<!-- chart-top-bar.component.html -->
<nav class="chart-top-bar" role="navigation" aria-label="Navigation data">
  
  <!-- Grupo 1: Movimiento -->
  <div class="top-bar__group top-bar__group--motion">
    <div class="top-bar__datum">
      <span class="top-bar__label">SOG</span>
      <span class="top-bar__value gb-display-value--md" 
            [class.top-bar__value--stale]="vm.sog.quality === 'stale'">
        {{ vm.sog.quality === 'stale' ? '---' : (vm.sog.value | number:'1.1-1') }}
      </span>
      <span class="top-bar__unit">KTS</span>
    </div>
    
    <div class="top-bar__datum">
      <span class="top-bar__label">COG</span>
      <span class="top-bar__value gb-display-value--md"
            [class.top-bar__value--stale]="vm.cog.quality === 'stale'">
        {{ vm.cog.quality === 'stale' ? '---' : vm.cog.formatted }}
      </span>
    </div>
    
    <div class="top-bar__datum">
      <span class="top-bar__label">HDG</span>
      <span class="top-bar__value gb-display-value--md"
            [class.top-bar__value--stale]="vm.hdg.quality === 'stale'">
        {{ vm.hdg.quality === 'stale' ? '---' : vm.hdg.formatted }}
      </span>
    </div>
  </div>
  
  <!-- Separador vertical -->
  <div class="top-bar__divider" aria-hidden="true"></div>
  
  <!-- Grupo 2: Posición GPS -->
  <div class="top-bar__group top-bar__group--position">
    <span class="top-bar__label">POS</span>
    <div class="top-bar__coords"
         [class.top-bar__coords--stale]="vm.position.quality === 'stale'">
      <span class="gb-display-value--sm">{{ vm.position.lat }}</span>
      <span class="gb-display-value--sm">{{ vm.position.lon }}</span>
    </div>
  </div>
  
  <!-- Separador -->
  <div class="top-bar__divider" aria-hidden="true"></div>
  
  <!-- Grupo 3: Ruta Activa (si existe) -->
  <div class="top-bar__group top-bar__group--route" *ngIf="vm.activeRoute">
    <span class="top-bar__label">{{ vm.activeRoute.nextWaypointName }}</span>
    <div class="top-bar__route-data">
      <span class="top-bar__datum">
        <span class="top-bar__label">DTW</span>
        <span class="gb-display-value--sm">{{ vm.activeRoute.dtw | number:'1.1-2' }}</span>
        <span class="top-bar__unit">NM</span>
      </span>
      <span class="top-bar__datum">
        <span class="top-bar__label">XTE</span>
        <span class="gb-display-value--sm"
              [class.top-bar__xte--port]="vm.activeRoute.xte < 0"
              [class.top-bar__xte--starboard]="vm.activeRoute.xte > 0">
          {{ vm.activeRoute.xte | number:'1.2-2' }}
        </span>
        <span class="top-bar__unit">NM</span>
      </span>
      <span class="top-bar__datum">
        <span class="top-bar__label">ETA</span>
        <span class="gb-display-value--sm">{{ vm.activeRoute.eta }}</span>
      </span>
    </div>
  </div>
  
  <!-- Spacer flexible -->
  <div class="top-bar__spacer"></div>
  
  <!-- Grupo 4: Hora y Estado de Conexión -->
  <div class="top-bar__group top-bar__group--status">
    <span class="top-bar__time gb-display-value--sm">{{ vm.utcTime }}</span>
    <div class="top-bar__connection"
         [title]="vm.signalKConnected ? 'Signal K Connected' : 'Signal K Offline'"
         [attr.aria-label]="vm.signalKConnected ? 'Connected' : 'Offline'">
      <span class="connection-indicator" 
            [class.connection-indicator--online]="vm.signalKConnected"
            [class.connection-indicator--offline]="!vm.signalKConnected">
      </span>
      <span class="top-bar__label">SK</span>
    </div>
  </div>
  
</nav>
```

```scss
// chart-top-bar.component.scss
.chart-top-bar {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 var(--space-3);
  background: var(--gb-bg-bezel);
  border-bottom: 1px solid var(--gb-border-panel);
  gap: var(--space-2);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  
  // Prevent text selection during navigation
  user-select: none;
  
  // Hardware acceleration
  will-change: contents;
}

.top-bar__group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.top-bar__datum {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.top-bar__label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gb-text-muted);
}

.top-bar__value {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--gb-text-value);
  
  &--stale {
    color: var(--gb-data-stale);
    opacity: 0.7;
  }
}

.top-bar__unit {
  @extend .top-bar__label;
  font-size: 0.55rem;
}

.top-bar__divider {
  width: 1px;
  height: 24px;
  background: var(--gb-border-panel);
  flex-shrink: 0;
}

.top-bar__spacer {
  flex: 1;
  min-width: 0;
}

.top-bar__xte--port      { color: var(--gb-data-warn); }
.top-bar__xte--starboard { color: var(--gb-data-good); }

.connection-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  
  &--online  { 
    background: var(--gb-data-good);
    box-shadow: 0 0 4px rgba(var(--gb-data-good-rgb), 0.6);
  }
  &--offline { 
    background: var(--gb-data-stale);
    animation: gb-pulse-stale 1.5s ease-in-out infinite;
  }
}
```

---

### M2: Panel Izquierdo Flotante con Tabs (P0 — 4-6h)

#### M2.1 Objetivo
Panel lateral colapsable con acceso a capas, AIS, waypoints y rutas sin abandonar el mapa.

#### M2.2 Especificación del Tab de Capas

```typescript
interface LayerConfig {
  id: keyof LayerVisibility;
  label: string;
  icon: string;
  description?: string;
  hasOptions?: boolean;  // Si tiene sub-configuración
}

const LAYER_CONFIGS: LayerConfig[] = [
  { id: 'track', label: 'Track', icon: 'track', description: 'Vessel track line' },
  { id: 'waypoints', label: 'Waypoints', icon: 'waypoint' },
  { id: 'routes', label: 'Routes', icon: 'route' },
  { id: 'ais', label: 'AIS', icon: 'vessel' },
  { id: 'aisNames', label: 'AIS Labels', icon: 'label' },
  { id: 'trueWind', label: 'True Wind', icon: 'wind-arrow' },
  { id: 'rangeRings', label: 'Range Rings', icon: 'circle', hasOptions: true },
  { id: 'bearingLine', label: 'Bearing Line', icon: 'compass' },
  { id: 'cpaLines', label: 'CPA Lines', icon: 'warning' },
];
```

#### M2.3 Especificación del Tab de AIS

```typescript
interface AISTargetListItem {
  mmsi: string;
  name: string;
  sog: number;
  cog: number;
  bearing: number;     // Rumbo hacia el target desde nuestra posición
  distance: number;    // Distancia en NM
  cpa: number;         // Closest Point of Approach (NM)
  tcpa: number;        // Time to CPA (minutos)
  status: 'normal' | 'dangerous' | 'lost';
  shipType: string;
  lastUpdate: number;  // timestamp
}

// Ordenar por: peligrosos primero, luego por distancia
// Filtrar: máximo 50 targets (los más cercanos)
// Actualización: cada 5 segundos (no necesita ser reactivo a 10Hz)
```

#### M2.4 Especificación del Tab de Waypoints

```typescript
interface WaypointListItem {
  id: string;
  name: string;
  description?: string;
  position: { lat: number; lon: number };
  bearing: number;      // Desde nuestra posición
  distance: number;     // NM desde nuestra posición
  isRouteWaypoint: boolean;  // Forma parte de una ruta
  icon?: string;
  color?: string;
}

// Acciones por waypoint:
// - Navegar hacia él (activa bearing line)
// - Editar (abre form inline)
// - Eliminar (confirmación)
// - Centrar mapa en él
// - Añadir a ruta activa
```

#### M2.5 Especificación del Tab de Rutas

```typescript
interface RouteListItem {
  id: string;
  name: string;
  waypointCount: number;
  totalDistance: number;  // NM
  isActive: boolean;
  estimatedDuration?: string;  // basado en SOG actual
}

interface RouteDetail extends RouteListItem {
  legs: {
    from: string;  // waypoint name
    to: string;
    bearing: number;
    distance: number;
    eta?: string;
  }[];
}
```

---

### M3: Map Controls Expandidos (P0 — 2-3h)

#### M3.1 Controles Actuales vs. Nuevos

```typescript
interface MapControlButton {
  id: string;
  icon: string;
  label: string;
  action: () => void;
  isActive?: boolean;
  isDestructive?: boolean;  // Estilo rojo para acciones críticas
  shortcut?: string;
  group: 'orientation' | 'tools' | 'emergency' | 'view';
}

// Controles a implementar:

// Grupo: Orientación
const orientationControls = [
  { id: 'north-up', label: 'North Up', icon: 'compass-n', group: 'orientation' },
  { id: 'course-up', label: 'Course Up', icon: 'vessel', group: 'orientation' },
];

// Grupo: Herramientas
const toolControls = [
  { id: 'center', label: 'Center Vessel', icon: 'center', group: 'tools' },
  { id: 'auto-center', label: 'Auto Center', icon: 'lock-center', group: 'tools' },
  { id: 'add-waypoint', label: 'Add Waypoint', icon: 'waypoint-add', group: 'tools' },
  { id: 'anchor-watch', label: 'Anchor Watch', icon: 'anchor', group: 'tools' },
  { id: 'measure', label: 'Measure Distance', icon: 'ruler', group: 'tools' },
];

// Grupo: Emergencia
const emergencyControls = [
  { id: 'mob', label: 'MOB', icon: 'mob', group: 'emergency', isDestructive: true },
];

// Controles de zoom (estándar MapLibre)
// + / - (ya existen)
```

---

### M4: Anchor Watch (P0 — 4-5h)

#### M4.1 Descripción Funcional

El Anchor Watch es una de las funciones de seguridad más críticas. Cuando el barco está anclado, define un círculo de seguridad. Si el barco sale del círculo (por arrastre del ancla), activa una alarma de emergencia.

#### M4.2 Flujo de Usuario

```
1. Usuario pulsa botón "Anchor" en Map Controls
2. Diálogo de configuración aparece:
   - Posición del ancla: [Usar posición actual] o [Click en mapa]
   - Radio de seguridad: [slider] NM / metros
   - [Activar Anchor Watch]
3. El círculo de ancla aparece en el mapa (capa semitransparente)
4. Indicador visual en el bezel del mapa: "⚓ Watching"
5. Si barco sale del círculo:
   - Alarma EMERGENCY: sonido + overlay rojo pulsante
   - Notificación del sistema (si soportado)
   - Distancia al ancla mostrada prominentemente
6. [Desactivar] cuando el usuario lo desee
```

#### M4.3 Implementación del Servicio

```typescript
// anchor-watch.service.ts

export interface AnchorWatchConfig {
  anchorPosition: [number, number];  // [lon, lat]
  radiusMeters: number;
  activatedAt: number;               // timestamp
}

export interface AnchorWatchState {
  active: boolean;
  config: AnchorWatchConfig | null;
  currentDistanceMeters: number | null;
  isOutsideRadius: boolean;
  alarmActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnchorWatchService {
  
  private readonly state$ = new BehaviorSubject<AnchorWatchState>({
    active: false,
    config: null,
    currentDistanceMeters: null,
    isOutsideRadius: false,
    alarmActive: false,
  });
  
  readonly anchorWatchState$ = this.state$.asObservable();
  
  activate(config: AnchorWatchConfig): void {
    this.state$.next({
      active: true,
      config,
      currentDistanceMeters: 0,
      isOutsideRadius: false,
      alarmActive: false,
    });
    // Persistir en localStorage para sobrevivir recargas
    localStorage.setItem('anchor-watch', JSON.stringify(config));
  }
  
  deactivate(): void {
    this.state$.next({
      active: false,
      config: null,
      currentDistanceMeters: null,
      isOutsideRadius: false,
      alarmActive: false,
    });
    localStorage.removeItem('anchor-watch');
  }
  
  updateVesselPosition(position: [number, number]): void {
    const state = this.state$.value;
    if (!state.active || !state.config) return;
    
    const distance = this._calculateDistanceMeters(
      state.config.anchorPosition,
      position
    );
    
    const isOutside = distance > state.config.radiusMeters;
    const wasOutside = state.isOutsideRadius;
    
    this.state$.next({
      ...state,
      currentDistanceMeters: distance,
      isOutsideRadius: isOutside,
      alarmActive: isOutside,
    });
    
    // Disparar alarma sonora solo cuando se cruza el límite (rising edge)
    if (isOutside && !wasOutside) {
      this._triggerAudioAlarm();
    }
  }
  
  private _calculateDistanceMeters(
    from: [number, number], 
    to: [number, number]
  ): number {
    // Haversine formula
    const R = 6371000; // radio tierra en metros
    const dLat = (to[1] - from[1]) * Math.PI / 180;
    const dLon = (to[0] - from[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from[1] * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  
  private _triggerAudioAlarm(): void {
    // Web Audio API para tono de alarma
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  }
}
```

#### M4.4 Capa MapLibre del Anchor Watch

```typescript
// anchor-watch.layer.ts — Añadir a MapLibreEngineService

private readonly ANCHOR_SOURCE_ID = 'chart-anchor-source';
private readonly ANCHOR_CIRCLE_LAYER_ID = 'chart-anchor-circle';
private readonly ANCHOR_CENTER_LAYER_ID = 'chart-anchor-center';

updateAnchorWatch(
  position: [number, number] | null, 
  radiusMeters: number,
  isAlarming: boolean
): void {
  if (!this.map || !this.mapReady) return;
  
  if (!position) {
    this._clearAnchorLayers();
    return;
  }
  
  // Generar círculo como GeoJSON
  const circle = this._generateCircleGeoJSON(position, radiusMeters);
  const color = isAlarming ? '#ff1744' : '#4a90d9';
  const opacity = isAlarming ? 0.25 : 0.15;
  
  // Actualizar source
  const source = this.map.getSource(this.ANCHOR_SOURCE_ID) as maplibregl.GeoJSONSource;
  if (source) {
    source.setData(circle);
  } else {
    this.map.addSource(this.ANCHOR_SOURCE_ID, { type: 'geojson', data: circle });
  }
  
  // Actualizar estilo de la capa
  if (this.map.getLayer(this.ANCHOR_CIRCLE_LAYER_ID)) {
    this.map.setPaintProperty(this.ANCHOR_CIRCLE_LAYER_ID, 'fill-color', color);
    this.map.setPaintProperty(this.ANCHOR_CIRCLE_LAYER_ID, 'fill-opacity', opacity);
  } else {
    this._addAnchorCircleLayer(color, opacity);
  }
}

private _generateCircleGeoJSON(
  center: [number, number], 
  radiusMeters: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const coords: [number, number][] = [];
  
  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const rad = angle * Math.PI / 180;
    
    // Convertir metros a grados (aproximación válida para radios pequeños)
    const latR = radiusMeters / 111320;
    const lonR = radiusMeters / (111320 * Math.cos(center[1] * Math.PI / 180));
    
    coords.push([
      center[0] + lonR * Math.cos(rad),
      center[1] + latR * Math.sin(rad),
    ]);
  }
  coords.push(coords[0]); // Cerrar el polígono
  
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}
```

---

### M5: MOB (Man Overboard) (P0 — 2-3h)

#### M5.1 Descripción

El MOB es la alerta de seguridad más crítica de la aplicación. Debe ser accesible con un solo toque y nunca debe fallar.

#### M5.2 Flujo

```
1. Usuario pulsa botón MOB (botón rojo prominente, difícil de pulsar accidentalmente)
2. INMEDIATAMENTE:
   - Registra posición GPS actual como posición MOB
   - Activa overlay de pantalla completa (rojo pulsante)
   - Inicia contador de tiempo desde el evento
   - Activa sonido de alarma continuo
   - Añade waypoint MOB en el mapa (marcador rojo especial)
   - Activa bearing line hacia el MOB
3. Overlay muestra:
   - "MAN OVERBOARD" en texto grande
   - Posición del MOB
   - Tiempo transcurrido
   - Distancia al MOB
   - Rumbo hacia el MOB
   - [Cancelar / Falsa Alarma]
4. El waypoint MOB persiste hasta cancelación manual
```

#### M5.3 Implementación

```typescript
// mob-alert.service.ts

export interface MOBEvent {
  position: [number, number];
  timestamp: number;
  waypointId: string;
}

@Injectable({ providedIn: 'root' })
export class MOBAlertService {
  
  private readonly _mob$ = new BehaviorSubject<MOBEvent | null>(null);
  readonly mob$ = this._mob$.asObservable();
  readonly isActive$ = this._mob$.pipe(map(m => m !== null));
  
  private _audioInterval?: ReturnType<typeof setInterval>;
  
  trigger(position: [number, number]): void {
    const event: MOBEvent = {
      position,
      timestamp: Date.now(),
      waypointId: `mob-${Date.now()}`,
    };
    
    this._mob$.next(event);
    this._startAudioAlarm();
    
    // Persistir para sobrevivir recargas
    sessionStorage.setItem('mob-event', JSON.stringify(event));
    
    console.error(`🚨 MOB TRIGGERED at ${position} - ${new Date().toISOString()}`);
  }
  
  cancel(): void {
    this._mob$.next(null);
    this._stopAudioAlarm();
    sessionStorage.removeItem('mob-event');
  }
  
  restoreIfActive(): void {
    const saved = sessionStorage.getItem('mob-event');
    if (saved) {
      this._mob$.next(JSON.parse(saved));
      this._startAudioAlarm();
    }
  }
  
  private _startAudioAlarm(): void {
    // Reproducir beep cada 2 segundos
    this._audioInterval = setInterval(() => this._playBeep(1000, 200), 2000);
    this._playBeep(1000, 200);
  }
  
  private _stopAudioAlarm(): void {
    if (this._audioInterval) {
      clearInterval(this._audioInterval);
    }
  }
  
  private _playBeep(freq: number, duration: number): void {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration/1000);
    osc.start();
    osc.stop(ctx.currentTime + duration/1000);
  }
}
```

```html
<!-- mob-alert-overlay.component.html -->
<div class="mob-overlay" *ngIf="mobState$ | async as mob" role="alertdialog"
     aria-live="assertive" aria-label="Man Overboard Alert">
  
  <div class="mob-overlay__content">
    
    <!-- Título de emergencia -->
    <h1 class="mob-overlay__title">
      <span class="mob-overlay__icon">🚨</span>
      MAN OVERBOARD
    </h1>
    
    <!-- Contador de tiempo -->
    <div class="mob-overlay__timer">
      <span class="mob-overlay__timer-value">{{ elapsedTime$ | async }}</span>
      <span class="mob-overlay__timer-label">TIME SINCE MOB</span>
    </div>
    
    <!-- Datos de navegación hacia MOB -->
    <div class="mob-overlay__nav">
      <div class="mob-overlay__datum">
        <span class="mob-overlay__label">DISTANCE</span>
        <span class="mob-overlay__value">{{ distanceToMOB$ | async | number:'1.2-2' }} NM</span>
      </div>
      <div class="mob-overlay__datum">
        <span class="mob-overlay__label">BEARING</span>
        <span class="mob-overlay__value">{{ bearingToMOB$ | async }}°</span>
      </div>
    </div>
    
    <!-- Posición del MOB -->
    <div class="mob-overlay__position">
      <span class="mob-overlay__label">MOB POSITION</span>
      <span class="mob-overlay__coords">{{ mob.formattedLat }} / {{ mob.formattedLon }}</span>
    </div>
    
    <!-- Botón de cancelación (requiere confirmación) -->
    <button 
      class="mob-overlay__cancel-btn"
      (click)="confirmCancel()"
      aria-label="Cancel MOB alert - False alarm">
      CANCEL / FALSE ALARM
    </button>
    
  </div>
</div>
```

---

### M6: Instruments Overlay (Panel Derecho) (P1 — 4-5h)

#### M6.1 Widgets del Overlay

```typescript
// Orden de display en el panel (configurable)
const DEFAULT_INSTRUMENT_OVERLAY: InstrumentWidget[] = [
  { id: 'compass', label: 'HDG', path: PATHS.navigation.headingTrue },
  { id: 'wind-rose', label: 'TWA', path: PATHS.environment.wind.angleTrueWater },
  { id: 'sog', label: 'SOG', path: PATHS.navigation.speedOverGround },
  { id: 'depth', label: 'DEPTH', path: PATHS.environment.depth.belowTransducer },
  { id: 'wind-speed', label: 'TWS', path: PATHS.environment.wind.speedTrue },
  { id: 'vmg', label: 'VMG', path: null },    // Calculado
  { id: 'xte', label: 'XTE', path: null },    // Solo si ruta activa
];
```

#### M6.2 Gauge de Velocidad (Ejemplo de implementación)

```typescript
// speed-gauge.component.ts
// Instrumento de velocidad con aguja analógica + display digital
// Rango: 0-20 KTS (configurable)

@Component({
  selector: 'omi-speed-gauge',
  standalone: true,
})
export class SpeedGaugeComponent {
  @Input() value: number = 0;
  @Input() maxSpeed: number = 20;  // KTS
  @Input() timestamp: number = 0;
  @Input() size: number = 140;
  
  // El gauge de velocidad tiene el 0 en 7 o'clock y el max en 5 o'clock
  // Arco de 270° de recorrido total
  private readonly START_ANGLE = -225;  // grados desde 12 o'clock
  private readonly END_ANGLE   = 45;
  private readonly TOTAL_ARC   = 270;
  
  get needleAngle(): number {
    const clampedValue = Math.min(Math.max(this.value, 0), this.maxSpeed);
    const ratio = clampedValue / this.maxSpeed;
    return this.START_ANGLE + (ratio * this.TOTAL_ARC);
  }
  
  // Arcos de color para zonas de velocidad
  get arcPath_normal(): string {
    return this._describeArc(this.cx, this.cy, this.arcRadius, this.START_ANGLE, 
                              this.START_ANGLE + this.TOTAL_ARC * 0.6);
  }
  
  get arcPath_fast(): string {
    return this._describeArc(this.cx, this.cy, this.arcRadius,
                              this.START_ANGLE + this.TOTAL_ARC * 0.6,
                              this.START_ANGLE + this.TOTAL_ARC * 0.85);
  }
  
  get arcPath_max(): string {
    return this._describeArc(this.cx, this.cy, this.arcRadius,
                              this.START_ANGLE + this.TOTAL_ARC * 0.85,
                              this.END_ANGLE);
  }
  
  private _describeArc(cx, cy, r, startDeg, endDeg): string {
    const start = this._polarToCartesian(cx, cy, r, startDeg);
    const end = this._polarToCartesian(cx, cy, r, endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }
}
```

---

### M7: Route Navigation y XTE (P1 — 3-4h)

#### M7.1 Funcionalidades

```typescript
// Cuando una ruta está activa, el chart debe mostrar:

interface ActiveRouteViewModel {
  route: Route;
  currentLegIndex: number;
  
  // Datos del leg actual
  currentLeg: {
    fromWaypoint: Waypoint;
    toWaypoint: Waypoint;
    bearing: number;          // Rumbo del leg
    remainingDistance: number; // NM
    eta: Date;
    ttg: string;              // "2h 34m"
  };
  
  // XTE (Cross Track Error)
  xte: {
    value: number;          // NM
    side: 'port' | 'starboard';
    exceeded: boolean;      // Si supera el umbral configurado
    threshold: number;      // NM (configurable en settings)
  };
  
  // Llegada al waypoint
  approachingWaypoint: boolean;  // Dentro del círculo de llegada
  arrivalCircleRadius: number;   // NM
}

// El XTE se calcula con:
// 1. Proyectar nuestra posición en la línea del leg actual
// 2. Medir la distancia perpendicular
// Fórmula: xte = asin(sin(d_ac/R) * sin(theta_ac - theta_ab)) * R
//   donde: d_ac = distancia al punto, theta_ac = rumbo al punto, 
//          theta_ab = rumbo del leg, R = radio tierra
```

---

### M8: History Playback (P2 — 6-8h)

#### M8.1 Descripción

Permite reproducir tracks históricos del barco con todos los datos instrumentales en el tiempo.

#### M8.2 Arquitectura del Playback

```typescript
// chart-playback.service.ts

export interface PlaybackConfig {
  startTime: Date;
  endTime: Date;
  playbackSpeed: 1 | 2 | 5 | 10 | 30 | 60;  // x real time
}

export interface PlaybackState {
  isActive: boolean;
  isPlaying: boolean;
  config: PlaybackConfig | null;
  currentTime: Date | null;
  progress: number;       // 0-1
  dataLoaded: boolean;
  loadingProgress?: number;
}

@Injectable({ providedIn: 'root' })
export class ChartPlaybackService {
  
  private readonly state$ = new BehaviorSubject<PlaybackState>({
    isActive: false,
    isPlaying: false,
    config: null,
    currentTime: null,
    progress: 0,
    dataLoaded: false,
  });
  
  async loadHistoricalData(config: PlaybackConfig): Promise<void> {
    // Cargar datos de Signal K history API:
    // GET /signalk/v1/history?from=ISO&to=ISO&paths=navigation.position,...
    // O desde IndexedDB si hay datos locales
  }
  
  play(): void { /* start animation loop */ }
  pause(): void { /* stop animation loop */ }
  seek(progress: number): void { /* jump to position in timeline */ }
  setSpeed(speed: PlaybackConfig['playbackSpeed']): void {}
  stop(): void { /* exit playback mode */ }
}
```

---

## 4. ESPECIFICACIÓN DEL LAYOUT PRINCIPAL

### 4.1 CSS Grid del Chart Page

```scss
// chart.page.scss

.chart-page {
  display: grid;
  grid-template-rows: 48px 1fr auto;    // top-bar, map, bottom-panel
  grid-template-columns: auto 1fr auto;  // left-panel, map, instruments
  height: 100dvh;                         // Dynamic viewport height (mobile)
  overflow: hidden;
  background: var(--gb-bg-canvas);
}

.chart-top-bar {
  grid-column: 1 / -1;
  grid-row: 1;
  z-index: var(--z-20);
}

.chart-left-panel {
  grid-column: 1;
  grid-row: 2;
  z-index: var(--z-10);
  
  // Colapsable
  width: 280px;
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
              width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &.is-collapsed {
    width: 0;
    transform: translateX(-100%);
  }
}

.chart-map-container {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  z-index: var(--z-0);
}

.chart-instruments-overlay {
  grid-column: 3;
  grid-row: 2;
  z-index: var(--z-10);
  pointer-events: none;   // No bloquear clicks en el mapa
  
  // Los widgets individuales tienen pointer-events: auto
}

.chart-bottom-panel {
  grid-column: 1 / -1;
  grid-row: 3;
  z-index: var(--z-20);
  
  max-height: 200px;
  transition: max-height 300ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &.is-collapsed {
    max-height: 0;
    overflow: hidden;
  }
}

// Responsivo: en móvil, el left panel se convierte en bottom sheet
@include media-down(md) {
  .chart-page {
    grid-template-columns: 1fr;
  }
  
  .chart-left-panel {
    grid-column: 1;
    grid-row: 2;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50vh;
    transform: translateY(100%);
    
    &.is-open {
      transform: translateY(0);
    }
  }
  
  .chart-instruments-overlay {
    grid-column: 1;
    // En móvil: overlay horizontal en la parte superior del mapa
    position: absolute;
    top: 0;
    right: 0;
  }
}
```

---

## 5. TILES Y FUENTES DE CARTAS NÁUTICAS

### 5.1 Fuentes de Tiles Soportadas

```typescript
// chart-tile-sources.ts

export interface TileSource {
  id: string;
  name: string;
  description: string;
  style: maplibregl.StyleSpecification | string;
  isOfflineCapable: boolean;
  attribution: string;
  maxZoom: number;
}

export const TILE_SOURCES: TileSource[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    description: 'Standard street map with coastal features',
    style: OSM_STYLE,
    isOfflineCapable: true,
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    description: 'Satellite imagery',
    style: SATELLITE_STYLE,
    isOfflineCapable: false,
    attribution: '© Various providers',
    maxZoom: 18,
  },
  {
    id: 'openseamap',
    name: 'OpenSeaMap',
    description: 'Nautical chart overlay (buoys, lights, depths)',
    style: OPENSEAMAP_STYLE,  // Overlay sobre OSM
    isOfflineCapable: false,
    attribution: '© OpenSeaMap contributors',
    maxZoom: 17,
  },
  {
    id: 'noaa-enc',
    name: 'NOAA ENC (US)',
    description: 'Official NOAA Electronic Nautical Charts',
    style: NOAA_ENC_STYLE,
    isOfflineCapable: false,
    attribution: '© NOAA',
    maxZoom: 16,
  },
];

// OpenSeaMap: tiles náuticos gratuitos
const OPENSEAMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 },
    'openseamap': { 
      type: 'raster', 
      tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm' },
    { id: 'openseamap-overlay', type: 'raster', source: 'openseamap', paint: { 'raster-opacity': 0.9 } },
  ],
};
```

---

## 6. EXPORT GPX

### 6.1 Funcionalidades de Export

```typescript
// gpx-export.utils.ts

export function exportWaypointsGPX(waypoints: Waypoint[]): string {
  const wpts = waypoints.map(wp => `
  <wpt lat="${wp.position.latitude}" lon="${wp.position.longitude}">
    <name>${escapeXML(wp.name)}</name>
    ${wp.description ? `<desc>${escapeXML(wp.description)}</desc>` : ''}
    <time>${new Date().toISOString()}</time>
  </wpt>`).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Open Marine Instrumentation"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>OMI Waypoints Export</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  ${wpts}
</gpx>`;
}

export function exportRouteGPX(route: Route, waypoints: Waypoint[]): string {
  const rteWpts = route.waypointIds.map(id => {
    const wp = waypoints.find(w => w.id === id);
    if (!wp) return '';
    return `
    <rtept lat="${wp.position.latitude}" lon="${wp.position.longitude}">
      <name>${escapeXML(wp.name)}</name>
    </rtept>`;
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Open Marine Instrumentation"
     xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>${escapeXML(route.name)}</name>
    ${rteWpts}
  </rte>
</gpx>`;
}

export function exportTrackGPX(track: Track): string {
  const trkpts = track.points.map(p => `
      <trkpt lat="${p.position.latitude}" lon="${p.position.longitude}">
        <time>${new Date(p.timestamp).toISOString()}</time>
        ${p.sog ? `<extensions><speed>${p.sog}</speed></extensions>` : ''}
      </trkpt>`).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Open Marine Instrumentation"
     xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXML(track.name || 'Track')}</name>
    <trkseg>
      ${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
```

---

## 7. TRACKING DOCUMENT

```markdown
# Chart Reconstruction Status

**Proyecto:** Open Marine Instrumentation  
**Feature:** Chart Page Full Reconstruction  
**Inicio:** [FECHA]  

## Estado de Milestones
| ID | Feature | Estado | Est. | Real | Notas |
|----|---------|--------|------|------|-------|
| M1 | Top Bar Datos | PENDIENTE | 3-4h | - | |
| M2 | Left Panel + Tabs | PENDIENTE | 4-6h | - | |
| M3 | Map Controls | PENDIENTE | 2-3h | - | |
| M4 | Anchor Watch | PENDIENTE | 4-5h | - | |
| M5 | MOB Alert | PENDIENTE | 2-3h | - | |
| M6 | Instruments Overlay | PENDIENTE | 4-5h | - | |
| M7 | Route Nav + XTE | PENDIENTE | 3-4h | - | |
| M8 | History Playback | PENDIENTE | 6-8h | - | |

## Feature Gaps vs OpenPlotter
| Feature | OpenPlotter | OMI Target | Estado |
|---------|-------------|-----------|--------|
| Anchor Watch | ✅ | ✅ | PENDIENTE |
| MOB Button | ✅ | ✅ | PENDIENTE |
| XTE Display | ✅ | ✅ | PENDIENTE |
| Instruments Overlay | ✅ | ✅ | PARCIAL |
| AIS List Panel | ✅ | ✅ | PARCIAL |
| GPX Export | ✅ | ✅ | PARCIAL |
| OpenSeaMap tiles | ✅ | ✅ | PENDIENTE |

## Próximo Paso Exacto
[El agente escribe aquí el siguiente paso atómico]
```

---

## 8. CRITERIOS GLOBALES DE ACEPTACIÓN

El chart está completo cuando:

1. **Top Bar:** Muestra SOG, COG, HDG, posición, hora UTC en tiempo real con indicador de calidad
2. **Anchor Watch:** Activa, muestra círculo en mapa, alarma cuando se cruza el límite
3. **MOB:** Botón accesible, overlay de pantalla completa, navegación al punto MOB
4. **Left Panel:** Tabs funcionales para layers, AIS, waypoints, rutas
5. **Route Navigation:** XTE calculado y mostrado, ETA al waypoint, bearing line activa
6. **AIS:** Lista de targets con distancia/CPA, tooltips al hacer hover, filtrado por distancia
7. **GPX Export:** Waypoints, rutas y tracks exportables a fichero GPX estándar
8. **Instruments:** Panel derecho con al menos 5 instrumentos configurables
9. **Tiles:** Selector entre OSM, OpenSeaMap y Satellite
10. **Responsive:** Funcional en pantallas desde 768px de ancho
11. **Glass Bridge:** Todo el UI sigue los tokens del Documento 1

---

*Documento generado para Open Marine Instrumentation — Chart Reconstruction Program*  
*Referencia: Freeboard-SK, OpenPlotter, Garmin GPSMap*
