# DOCUMENTO MAESTRO 3: REESTRUCTURACIÓN COMPLETA DE LA APLICACIÓN — PRODUCTO COMERCIAL FINAL
## Open Marine Instrumentation (OMI) — Roadmap hacia Producto Comercial

**Versión:** 1.0  
**Tipo:** Product Engineering Blueprint  
**Alcance:** Aplicación completa desde arquitectura hasta deployment comercial  
**Stack:** Angular 21.1 + MapLibre GL JS + RxJS + Signal K + PWA  
**Duración estimada:** 20–28 sesiones de trabajo (incluyendo Doc 1 y Doc 2)  
**Prerequisito:** Documentos 1 y 2 completados  

---

## ⚠️ PROTOCOLO OBLIGATORIO DE INICIALIZACIÓN

1. **Leer este documento completo** antes de iniciar cualquier trabajo
2. **Verificar que Doc 1 y Doc 2 están completados** (o en progreso avanzado)
3. **Crear el tracking document** en `docs/COMMERCIAL_PRODUCT_STATUS.md`
4. **Auditar el estado completo** de la aplicación con el inventario de la Sección 1
5. **Implementar por fases**, confirmación obligatoria entre fases
6. **Nunca sacrificar estabilidad por velocidad** — cada merge debe ser deployable

---

## 0. VISIÓN DE PRODUCTO COMERCIAL

### 0.1 Propuesta de Valor

OMI es una **aplicación de navegación marítima profesional de código abierto** que compite con:

| Competidor | Precio | Gap que OMI Cierra |
|------------|--------|---------------------|
| Navionics+ | €35/año | Libre, sin mapas de pago, Signal K nativo |
| iSailor | €20 | Open source, hardware agnóstico |
| Freeboard-SK | Gratis | UI professional grade, Glass Bridge |
| OpenCPN | Gratis | Web-based, no requiere instalación, moderno |

**Target Users:**
- Navegantes offshore y costeros con Signal K / OpenPlotter
- Armadores que quieren prescindir de MFDs caros
- Embarcaciones de vela de regata (datos de performance)
- Usuarios DIY con Raspberry Pi a bordo

### 0.2 Criterios de "Producto Comercial"

```
✅ Funcional: Las features prometidas funcionan sin bugs críticos
✅ Estable: No crashes, no pérdida de datos, recovery de errores
✅ Rápido: < 3s TTI, 60fps en mapa, < 100ms respuesta a interacciones
✅ Profesional: UI Glass Bridge consistente, sin inconsistencias visuales
✅ Seguro: Sin vulnerabilidades XSS, datos del usuario protegidos
✅ Accesible: WCAG AA, touch-friendly (44px targets), funcional offline
✅ Mantenible: Tests > 70%, documentación completa, CI/CD operativo
✅ Documentado: Manual de usuario, installation guide, API docs
```

---

## 1. INVENTARIO COMPLETO DEL ESTADO ACTUAL

### 1.1 Páginas / Features

| Feature | Ruta | Estado | Prioridad Comercial |
|---------|------|--------|---------------------|
| Dashboard | `/dashboard` | ✅ Funcional | P0 — MEJORAR |
| Chart | `/chart` | ✅ Parcial | P0 — VER DOC 2 |
| Instruments | `/instruments` | ✅ Básico | P1 — EXPANDIR |
| Resources | `/resources` | ✅ Básico | P1 — EXPANDIR |
| Alarms | `/alarms` | ✅ Funcional | P0 — MEJORAR |
| Diagnostics | `/diagnostics` | ✅ Funcional | P1 — OK |
| Settings | `/settings` | ✅ Funcional | P0 — EXPANDIR |
| Widgets | `/widgets` | ✅ Funcional | P1 — OK |
| Styleguide | `/styleguide` | ✅ Dev only | P3 — MANTENER |
| Autopilot | N/A | ❌ No existe | P2 — CREAR |
| Performance | N/A | ❌ No existe | P2 — CREAR |
| Help/Docs | N/A | ❌ No existe | P1 — CREAR |
| Onboarding | N/A | ❌ No existe | P0 — CREAR |

### 1.2 Infraestructura y DevOps

| Aspecto | Estado Actual | Target Comercial |
|---------|---------------|-----------------|
| Build | Angular CLI | Angular CLI + optimizaciones |
| Tests | ~15% cobertura | > 70% cobertura |
| CI/CD | No existe | GitHub Actions |
| Lint | ESLint + Prettier | + Husky pre-commit |
| Bundle Size | No medido | < 500KB inicial |
| PWA | Parcial (SW básico) | Full PWA con offline |
| Performance | No medido | Lighthouse > 90 |
| Error tracking | console.error | Sentry o similar |
| Analytics | No | Plausible (privacy-first) |

### 1.3 Deuda Técnica Pendiente

```
ALTA PRIORIDAD:
- [ ] Tests unitarios para lógica crítica (rotation, XTE, CPA)
- [ ] Error boundaries en componentes críticos
- [ ] WebSocket reconnection con exponential backoff
- [ ] Memory leaks: subscriptions sin unsubscribe

MEDIA PRIORIDAD:
- [ ] Lazy loading de todos los módulos pesados
- [ ] Bundle analysis y tree-shaking
- [ ] Memoización de cálculos costosos (XTE, CPA, True Wind)
- [ ] Virtual scrolling en listas grandes (AIS, tracks)

BAJA PRIORIDAD:
- [ ] Sourcemaps para producción
- [ ] Internacionalización completa (ES/EN/DE/FR)
- [ ] Modo kiosk (pantalla completa sin chrome del navegador)
```

---

## 2. ARQUITECTURA FINAL DE LA APLICACIÓN

### 2.1 Estructura de Navegación

```
OMI Application
│
├── Onboarding (primera vez)
│   ├── /onboarding/welcome
│   ├── /onboarding/connection
│   └── /onboarding/vessel-setup
│
├── Main App (después de setup)
│   ├── /chart          ← DEFAULT HOME
│   ├── /dashboard
│   ├── /instruments
│   ├── /resources
│   │   ├── /resources/waypoints
│   │   ├── /resources/routes
│   │   ├── /resources/tracks
│   │   └── /resources/notes
│   ├── /alarms
│   ├── /performance     ← NUEVO
│   ├── /autopilot       ← NUEVO
│   └── /settings
│       ├── /settings/connection
│       ├── /settings/vessel
│       ├── /settings/display
│       ├── /settings/units
│       ├── /settings/alarms
│       └── /settings/experiments
│
└── Dev Tools (dev only)
    └── /styleguide
```

### 2.2 State Management Ampliado

```typescript
// La arquitectura de estado actual es buena. 
// EXPANDIR con los nuevos stores necesarios:

// EXISTENTES (mantener):
// - DatapointStoreService        (datos Signal K en tiempo real)
// - AlarmStoreService            (estado de alarmas)
// - PreferencesService           (configuración de usuario)
// - WaypointStoreService         (waypoints)
// - RouteStoreService            (rutas)
// - TrackStoreService            (tracks)
// - AisStoreService              (targets AIS)

// NUEVOS (añadir):

// state/vessel/vessel-profile.service.ts
// Perfil estático del barco
interface VesselProfile {
  name: string;
  mmsi?: string;
  callsign?: string;
  vesselType: string;
  length: number;          // metros
  beam: number;
  draft: number;
  safetyColor: string;     // color del marcador propio
  polars?: PolarDiagram;   // tabla de performance
}

// state/performance/performance.service.ts
// Performance sailing (VMG, polar, etc.)
interface PerformanceState {
  vmgUpwind: number | null;
  vmgDownwind: number | null;
  targetTwa: number | null;   // De la polar
  pollarRatio: number | null; // % de la polar alcanzado
  laylines: { port: number; starboard: number } | null;
}

// state/connectivity/connectivity.service.ts
// Estado detallado de la conexión
interface ConnectivityState {
  signalkUrl: string;
  wsState: 'connecting' | 'open' | 'closed' | 'error';
  reconnectAttempts: number;
  lastMessageAt: number | null;
  latencyMs: number | null;
  selfContext: string;       // "vessels.urn:mrn:imo:mmsi:123456789"
  availablePaths: string[];  // Paths disponibles en este SK server
}

// state/app/app-state.service.ts
// Estado global de la aplicación
interface AppState {
  isOnboarded: boolean;
  currentTheme: 'day' | 'night';
  isFullscreen: boolean;
  isOffline: boolean;
  activeAlertCount: number;
  lastError: AppError | null;
}
```

### 2.3 Diagrama de Flujo de Datos Final

```
SEÑALES EXTERNAS
      │
      ▼
┌─────────────────────────────────┐
│  DATA ACCESS LAYER               │
│                                  │
│  SignalKWebSocketClient          │
│  ├─ Delta parser                 │
│  ├─ Self-context resolver        │
│  └─ Quality assessor             │
│                                  │
│  SignalKRestClient               │
│  ├─ Resources API (CRUD)        │
│  └─ History API                  │
└──────────┬──────────────────────┘
           │ Normalized DataPoint<T>
           ▼
┌─────────────────────────────────┐
│  STATE LAYER                     │
│                                  │
│  DatapointStoreService (rt data) │
│  AlarmStoreService               │
│  AisStoreService                 │
│  WaypointStoreService            │
│  RouteStoreService               │
│  TrackStoreService               │
│  PerformanceService              │
│  ConnectivityService             │
│  VesselProfileService            │
│  PreferencesService              │
└──────────┬──────────────────────┘
           │ Observable<ViewModel>
           ▼
┌─────────────────────────────────┐
│  FEATURE FACADES                 │
│                                  │
│  ChartFacadeService              │
│  DashboardFacadeService          │
│  AlarmsFacadeService             │
│  InstrumentsFacadeService        │
│  ResourcesFacadeService          │
│  PerformanceFacadeService        │
│  AutopilotFacadeService          │
└──────────┬──────────────────────┘
           │ @Input() ViewModel
           ▼
┌─────────────────────────────────┐
│  PRESENTATION LAYER              │
│                                  │
│  Feature Pages + Components      │
│  (Dumb, @Input/@Output only)     │
│  Glass Bridge Design System      │
└─────────────────────────────────┘
```

---

## 3. ROADMAP DE FASES

### FASE A: Fundación de Producto (Pre-requisito)
*Prerequisito: Documentos 1 y 2 completados*

### FASE B: Mejoras al Dashboard (P0 — 4-6h)

#### B.1 Dashboard Grid Configurable

El dashboard debe ser configurable: el usuario puede elegir qué widgets mostrar y en qué orden.

```typescript
// features/dashboard/dashboard-layout.service.ts

export interface DashboardLayout {
  columns: number;  // 1, 2, o 3 columnas
  rows: DashboardRow[];
}

export interface DashboardRow {
  widgets: DashboardWidgetConfig[];
}

export interface DashboardWidgetConfig {
  id: string;
  type: DashboardWidgetType;
  span: number;   // Columnas que ocupa (1-3)
  visible: boolean;
}

export type DashboardWidgetType = 
  | 'navigation'    // SOG, COG, HDG, posición
  | 'wind'          // Viento aparente y verdadero
  | 'depth'         // Profundidad con tendencia
  | 'power'         // Batería, voltaje, amperaje
  | 'environment'   // Temperatura, presión, humedad
  | 'performance'   // VMG, SOG over polar, laylines
  | 'trip'          // Trip distance, tiempo, velocidad media
  | 'system';       // Estado de conexiones y diagnósticos

const DEFAULT_LAYOUT: DashboardLayout = {
  columns: 2,
  rows: [
    { widgets: [
      { id: 'nav', type: 'navigation', span: 2, visible: true }
    ]},
    { widgets: [
      { id: 'wind', type: 'wind', span: 1, visible: true },
      { id: 'depth', type: 'depth', span: 1, visible: true },
    ]},
    { widgets: [
      { id: 'power', type: 'power', span: 1, visible: true },
      { id: 'system', type: 'system', span: 1, visible: true },
    ]},
  ],
};
```

#### B.2 Widget de Navegación Mejorado

```typescript
// El widget de navegación debe mostrar en tiempo real:
interface NavigationWidgetVM {
  sog: { value: number; trend: 'up' | 'down' | 'stable'; quality: DataQuality };
  cog: { value: number; formatted: string; quality: DataQuality };
  hdg: { true: number; magnetic: number; quality: DataQuality };
  position: {
    lat: string; lon: string;
    dop: number;     // Dilution of Precision (calidad GPS)
    satellites: number;
    quality: DataQuality;
  };
  set: number;      // Current set (dirección corriente)
  drift: number;    // Current drift (velocidad corriente) KTS
  leeway: number;   // Abatimiento estimado
  tripLog: {
    distance: number;  // NM desde inicio de viaje
    elapsed: string;   // "2h 34m"
    avgSog: number;
  };
}
```

---

### FASE C: Sistema de Instrumentos Completo (P1 — 8-10h)

#### C.1 Inventario de 54 Instrumentos

```typescript
// Organizados por categoría:

export const INSTRUMENT_CATEGORIES = {
  
  NAVIGATION: {
    sog: { label: 'Speed Over Ground', unit: 'kts', path: PATHS.navigation.speedOverGround },
    cog: { label: 'Course Over Ground', unit: '°', path: PATHS.navigation.courseOverGroundTrue },
    hdg_true: { label: 'Heading True', unit: '°T', path: PATHS.navigation.headingTrue },
    hdg_mag: { label: 'Heading Magnetic', unit: '°M', path: PATHS.navigation.headingMagnetic },
    sow: { label: 'Speed Over Water', unit: 'kts', path: PATHS.navigation.speedThroughWater },
    vmg: { label: 'Velocity Made Good', unit: 'kts', path: null }, // Calculado
    cmg: { label: 'Course Made Good', unit: '°', path: null },
    xte: { label: 'Cross Track Error', unit: 'NM', path: null },
    dtw: { label: 'Distance to Waypoint', unit: 'NM', path: null },
    btw: { label: 'Bearing to Waypoint', unit: '°', path: null },
  },
  
  WIND: {
    aws: { label: 'Apparent Wind Speed', unit: 'kts', path: PATHS.environment.wind.speedApparent },
    awa: { label: 'Apparent Wind Angle', unit: '°', path: PATHS.environment.wind.angleApparent },
    tws: { label: 'True Wind Speed', unit: 'kts', path: PATHS.environment.wind.speedTrue },
    twa: { label: 'True Wind Angle', unit: '°', path: PATHS.environment.wind.angleTrueWater },
    twd: { label: 'True Wind Direction', unit: '°', path: PATHS.environment.wind.directionTrue },
    gust: { label: 'Wind Gust', unit: 'kts', path: null },        // Max en ventana móvil
    gws: { label: 'Ground Wind Speed', unit: 'kts', path: null }, // Calculado
    gwd: { label: 'Ground Wind Dir', unit: '°', path: null },
  },
  
  DEPTH: {
    depth_keel: { label: 'Depth Under Keel', unit: 'm', path: null }, // Calculado
    depth_transducer: { label: 'Depth Transducer', unit: 'm', path: PATHS.environment.depth.belowTransducer },
    depth_surface: { label: 'Depth Surface', unit: 'm', path: PATHS.environment.depth.belowSurface },
    depth_trend: { label: 'Depth Trend', unit: 'm/min', path: null }, // Calculado
  },
  
  ENVIRONMENT: {
    water_temp: { label: 'Water Temperature', unit: '°C', path: PATHS.environment.water.temperature },
    air_temp: { label: 'Air Temperature', unit: '°C', path: null },
    pressure: { label: 'Atmospheric Pressure', unit: 'hPa', path: null },
    pressure_trend: { label: 'Pressure Trend', unit: 'hPa/h', path: null },
    humidity: { label: 'Humidity', unit: '%', path: null },
    dew_point: { label: 'Dew Point', unit: '°C', path: null },
  },
  
  ELECTRICAL: {
    battery_v: { label: 'Battery Voltage', unit: 'V', path: PATHS.electrical.batteries.voltage },
    battery_a: { label: 'Battery Current', unit: 'A', path: PATHS.electrical.batteries.current },
    battery_soc: { label: 'State of Charge', unit: '%', path: null },
    solar_v: { label: 'Solar Voltage', unit: 'V', path: null },
    solar_a: { label: 'Solar Current', unit: 'A', path: null },
    alternator: { label: 'Alternator', unit: 'A', path: null },
    consumption: { label: 'Consumption', unit: 'A', path: null },
  },
  
  ENGINE: {
    rpm: { label: 'Engine RPM', unit: 'RPM', path: null },
    coolant_temp: { label: 'Coolant Temp', unit: '°C', path: null },
    oil_pressure: { label: 'Oil Pressure', unit: 'bar', path: null },
    fuel_level: { label: 'Fuel Level', unit: '%', path: null },
    fuel_flow: { label: 'Fuel Flow', unit: 'l/h', path: null },
    engine_hours: { label: 'Engine Hours', unit: 'h', path: null },
    transmission: { label: 'Transmission', unit: '', path: null },
  },
  
  PERFORMANCE: {
    pollar_speed: { label: 'Polar Speed', unit: 'kts', path: null },
    pollar_ratio: { label: 'Polar Ratio', unit: '%', path: null },
    target_twa: { label: 'Target TWA', unit: '°', path: null },
    layline_port: { label: 'Layline Port', unit: '°', path: null },
    layline_stbd: { label: 'Layline Starboard', unit: '°', path: null },
    heel: { label: 'Heel Angle', unit: '°', path: null },
    pitch: { label: 'Pitch Angle', unit: '°', path: null },
    leeway: { label: 'Leeway', unit: '°', path: null },
  },
};

// Total: 54 instrumentos definidos
```

#### C.2 Widget de Instrumento Genérico

```typescript
// shared/components/instrument-widget/instrument-widget.component.ts

export interface InstrumentConfig {
  id: string;
  label: string;
  unit: string;
  path: string | null;
  formatter?: (value: number) => string;
  minValue?: number;
  maxValue?: number;
  dangerLow?: number;
  dangerHigh?: number;
  warnLow?: number;
  warnHigh?: number;
  displayType: 'digital' | 'analog-circular' | 'analog-linear' | 'wind-rose';
}

@Component({
  selector: 'omi-instrument-widget',
  standalone: true,
  template: `
    <omi-gb-bezel
      [label]="config.label"
      [quality]="quality"
      [compact]="compact"
    >
      <!-- Display tipo digital -->
      <ng-container *ngIf="config.displayType === 'digital'">
        <div class="instrument-digital">
          <span class="gb-display-value" [class.gb-display-value--xl]="!compact">
            {{ displayValue }}
          </span>
          <span class="gb-display-unit">{{ config.unit }}</span>
        </div>
      </ng-container>
      
      <!-- Display tipo analógico circular -->
      <ng-container *ngIf="config.displayType === 'analog-circular'">
        <omi-gb-compass
          *ngIf="isCompassType"
          [value]="rawValue"
          [timestamp]="timestamp"
          [size]="compact ? 100 : 140"
        />
        <omi-speed-gauge
          *ngIf="isSpeedType"
          [value]="rawValue"
          [maxSpeed]="config.maxValue ?? 20"
          [timestamp]="timestamp"
          [size]="compact ? 100 : 140"
        />
      </ng-container>
    </omi-gb-bezel>
  `,
})
export class InstrumentWidgetComponent implements OnInit {
  @Input() config!: InstrumentConfig;
  @Input() compact = false;
  
  rawValue: number = 0;
  timestamp: number = 0;
  quality: DataQuality = 'missing';
  
  get displayValue(): string {
    if (this.quality === 'stale' || this.quality === 'missing') return '---';
    if (this.config.formatter) return this.config.formatter(this.rawValue);
    return this.rawValue.toFixed(1);
  }
}
```

---

### FASE D: Onboarding de Primera Ejecución (P0 — 4-5h)

#### D.1 Flujo de Onboarding

```
Primera visita a la app:
│
├── /onboarding/welcome
│   - Logo OMI
│   - "Professional Marine Instrumentation"
│   - Breve descripción de qué hace la app
│   - [Comenzar] → /onboarding/connection
│
├── /onboarding/connection
│   - Título: "Connect to Signal K Server"
│   - Input: URL del servidor (default: ws://localhost:3000)
│   - [Test Connection] → spinner + resultado
│   - Si OK → [Continue]
│   - Si falla → opciones:
│     a) "Use Demo Mode" (simulador incluido)
│     b) "Enter different URL"
│     c) "Skip for now" (acceso limitado)
│
└── /onboarding/vessel
    - Nombre del barco (para el header)
    - MMSI (opcional, para AIS)
    - Unidades preferidas (KTS vs KMH, metros vs pies)
    - Tema inicial (Day / Night)
    - [Finish Setup] → /chart (home principal)
```

#### D.2 Detección de Primera Visita

```typescript
// core/onboarding/onboarding.guard.ts

@Injectable({ providedIn: 'root' })
export class OnboardingGuard implements CanActivate {
  
  private readonly prefs = inject(PreferencesService);
  private readonly router = inject(Router);
  
  canActivate(): boolean | UrlTree {
    if (!this.prefs.isOnboarded()) {
      return this.router.createUrlTree(['/onboarding/welcome']);
    }
    return true;
  }
}

// En app.routes.ts:
export const routes: Routes = [
  {
    path: '',
    redirectTo: '/chart',
    pathMatch: 'full',
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./features/onboarding/onboarding.routes'),
    // Sin el guard OnboardingGuard (accesible siempre)
  },
  {
    path: '',
    canActivate: [OnboardingGuard],
    children: [
      { path: 'chart', ... },
      { path: 'dashboard', ... },
      // ... resto de rutas
    ],
  },
];
```

---

### FASE E: Sistema de Alarmas Avanzado (P0 — 5-6h)

#### E.1 Categorías de Alarmas

```typescript
// Expandir el sistema de alarmas actual:

export type AlarmCategory = 
  | 'navigation'   // Shallow water, off-route
  | 'collision'    // CPA warning
  | 'anchor'       // Anchor dragging
  | 'mob'          // Man overboard
  | 'electrical'   // Low battery, high voltage
  | 'engine'       // Overheating, low oil
  | 'environment'  // Storm warning, lightning
  | 'system';      // GPS lost, connection lost

export type AlarmSeverity = 
  | 'emergency'   // MOB, collision imminent, abandon ship
  | 'critical'    // Shallow water, anchor dragging
  | 'warning'     // Low battery, approaching waypoint
  | 'info';       // Speed record, waypoint reached

export type AlarmState = 
  | 'active'        // Condición activa, requiere atención
  | 'acknowledged'  // Usuario vio, condición persiste
  | 'silenced'      // Audio off, visual continúa
  | 'resolved'      // Condición resuelta (auto o manual)
  | 'inhibited';    // Deliberadamente desactivado por usuario
```

#### E.2 Alarm Banner (Siempre Visible)

```html
<!-- alarm-banner.component.html -->
<!-- Se muestra ENCIMA del contenido, siempre visible -->

<div class="alarm-banner" 
     *ngIf="activeAlarms$ | async as alarms"
     [attr.data-severity]="highestSeverity$ | async"
     role="alert"
     aria-live="assertive">
  
  <!-- Si hay múltiples alarmas: mostrar la más grave + contador -->
  <div class="alarm-banner__content" *ngIf="alarms.length > 0">
    
    <!-- Icono y badge de severidad -->
    <span class="alarm-banner__icon" aria-hidden="true">
      {{ severityIcon$ | async }}
    </span>
    
    <!-- Mensaje principal -->
    <span class="alarm-banner__message">
      {{ (primaryAlarm$ | async)?.message }}
    </span>
    
    <!-- Badge de alarmas adicionales -->
    <span class="alarm-banner__count" *ngIf="alarms.length > 1">
      +{{ alarms.length - 1 }} more
    </span>
    
    <!-- Acciones rápidas -->
    <div class="alarm-banner__actions">
      <button class="alarm-banner__btn alarm-banner__btn--ack"
              (click)="acknowledgeAll()"
              aria-label="Acknowledge all alarms">
        ACK
      </button>
      <button class="alarm-banner__btn alarm-banner__btn--silence"
              (click)="silenceAll()"
              aria-label="Silence alarm audio">
        🔕
      </button>
      <a class="alarm-banner__btn alarm-banner__btn--view"
         routerLink="/alarms"
         aria-label="View all alarms">
        VIEW ALL
      </a>
    </div>
  </div>
</div>
```

#### E.3 Alarma de Bajo Fondo con Hysteresis

```typescript
// Expandir la alarma de profundidad con tendencia y hysteresis profesional

interface DepthAlarmConfig {
  shallowThresholdM: number;      // Alerta cuando depth < threshold
  criticalThresholdM: number;     // Alarma crítica cuando depth < critical
  hysteresisM: number;            // 0.5m por defecto (evita flapping)
  useKeel: boolean;               // Medir desde quilla (añadir draft)
  draftM: number;                 // Calado del barco
  rateAlarmEnabled: boolean;      // Alarmar también por tasa de cambio
  rateThresholdMPerMin: number;   // Rápido acercamiento al fondo
}
```

---

### FASE F: Performance Sailing (P2 — 6-8h)

#### F.1 Descripción

La página de Performance es específica para navegantes de vela que quieren optimizar su velocidad usando datos polares.

#### F.2 Features

```typescript
interface PerformancePage {
  // Polar Diagram interactivo
  polarDiagram: {
    data: PolarDiagram;
    currentPoint: { twa: number; sow: number };
    targetPoint: { twa: number; targetSow: number };
    achievedPercent: number;
  };
  
  // Laylines
  laylines: {
    portLayline: number;      // Grados true hacia la marca por babor
    starboardLayline: number; // Grados true hacia la marca por estribor
    windwardMark: Waypoint | null;
  };
  
  // VMG optimization
  vmgOptimizer: {
    currentVmg: number;
    maxVmgUpwind: { twa: number; speed: number };
    maxVmgDownwind: { twa: number; speed: number };
    recommendation: string;  // "Bear away 5°" / "Head up 3°"
  };
  
  // Performance history (gráficas de velocidad en el tiempo)
  speedHistory: TimeSeriesData[];
  vmgHistory: TimeSeriesData[];
}
```

#### F.3 Import de Polar Diagrams

```typescript
// performance/utils/polar-parser.ts

// Soportar formatos estándar:
// - .pol (Expedition, B&G)
// - .csv (OpenCPN format)
// - YAML/JSON simple

export interface PolarDiagram {
  vesselName: string;
  twaValues: number[];    // [0, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]
  twsValues: number[];    // [6, 8, 10, 12, 14, 16, 20]
  data: number[][];       // [tws_index][twa_index] = sow en kts
  twaBeats: number[];     // TWA óptimo upwind por TWS
  twaGybes: number[];     // TWA óptimo downwind por TWS
}

export function parsePolarCSV(content: string): PolarDiagram {
  // CSV format:
  // twa,6,8,10,12,14,16,20
  // 30,2.1,3.2,4.1,4.8,5.2,5.5,5.8
  // ...
}

export function interpolatePolar(
  polar: PolarDiagram,
  tws: number,
  twa: number
): number {
  // Bilinear interpolation entre los puntos de la tabla
  // Para obtener SOW objetivo a cualquier TWS/TWA
}
```

---

### FASE G: Autopilot Console (P2 — 5-6h)

#### G.1 Descripción

Control del autopiloto desde la interfaz cuando el barco tiene un autopiloto compatible con Signal K (`signalk-autopilot` plugin).

#### G.2 Modos del Autopiloto

```typescript
export type AutopilotMode = 
  | 'standby'   // Desenganchado (timón manual)
  | 'auto'      // Mantiene heading fijo
  | 'wind'      // Mantiene ángulo al viento (vela)
  | 'track'     // Sigue una ruta (XTE control)
  | 'gps';      // GPS heading lock

export interface AutopilotState {
  engaged: boolean;
  mode: AutopilotMode;
  targetHeading: number | null;     // Para modo 'auto'
  targetTwa: number | null;         // Para modo 'wind'
  activeRouteId: string | null;     // Para modo 'track'
  rudderAngle: number;              // Ángulo de timón actual
  rudderLimit: number;              // Límite configurado
  offCourse: boolean;               // Alerta desvío
  offCourseThreshold: number;       // Grados (default: 10)
}

// API de Signal K autopilot:
// PUT /signalk/v2/vessels/self/steering/autopilot/engaged (true/false)
// PUT /signalk/v2/vessels/self/steering/autopilot/mode ("auto", "wind", etc.)
// PUT /signalk/v2/vessels/self/steering/autopilot/target/headingTrue (degrees)
// PUT /signalk/v2/vessels/self/steering/autopilot/target/windAngleApparent
```

#### G.3 UI del Autopilot Console

```html
<!-- autopilot-console.component.html -->

<div class="autopilot-console" [attr.data-engaged]="state.engaged">
  
  <!-- Estado principal -->
  <div class="autopilot-console__status">
    <span class="autopilot-console__mode-badge"
          [attr.data-mode]="state.mode">
      {{ state.mode | uppercase }}
    </span>
    <button class="autopilot-console__engage-btn"
            [class.autopilot-console__engage-btn--engaged]="state.engaged"
            (click)="toggleEngage()"
            [attr.aria-label]="state.engaged ? 'Disengage autopilot' : 'Engage autopilot'">
      {{ state.engaged ? 'DISENGAGE' : 'ENGAGE' }}
    </button>
  </div>
  
  <!-- Target heading display -->
  <div class="autopilot-console__target">
    <span class="autopilot-console__label">TARGET</span>
    <span class="gb-display-value--xl">{{ targetDisplay }}</span>
    <span class="gb-display-unit">{{ targetUnit }}</span>
  </div>
  
  <!-- Dodge buttons (±1° y ±10°) -->
  <div class="autopilot-console__dodge">
    <button class="dodge-btn dodge-btn--port-big"   (click)="dodge(-10)" aria-label="-10°">◀◀ 10°</button>
    <button class="dodge-btn dodge-btn--port-small"  (click)="dodge(-1)"  aria-label="-1°">◀ 1°</button>
    <button class="dodge-btn dodge-btn--stbd-small" (click)="dodge(+1)"  aria-label="+1°">1° ▶</button>
    <button class="dodge-btn dodge-btn--stbd-big"   (click)="dodge(+10)" aria-label="+10°">10° ▶▶</button>
  </div>
  
  <!-- Modo selector -->
  <div class="autopilot-console__modes" role="tablist">
    <button *ngFor="let mode of availableModes"
            role="tab"
            [attr.aria-selected]="state.mode === mode"
            (click)="setMode(mode)"
            class="autopilot-console__mode-btn">
      {{ mode | titlecase }}
    </button>
  </div>
  
  <!-- Timón y off-course -->
  <div class="autopilot-console__rudder">
    <div class="rudder-indicator"
         [style.transform]="'rotate(' + state.rudderAngle + 'deg)'">
    </div>
    <span class="gb-display-value--sm">{{ state.rudderAngle | number:'1.0-1' }}°</span>
  </div>
  
  <!-- Warning off-course -->
  <div class="autopilot-console__warning" *ngIf="state.offCourse">
    ⚠️ OFF COURSE
  </div>
  
</div>
```

---

### FASE H: Settings Avanzado (P0 — 4-5h)

#### H.1 Secciones de Settings

```typescript
// features/settings/settings-routing.ts

const SETTINGS_SECTIONS = [
  {
    id: 'connection',
    title: 'Connection',
    icon: 'network',
    component: ConnectionSettingsComponent,
    // Signal K URL, reconexión, test de conexión
  },
  {
    id: 'vessel',
    title: 'Vessel',
    icon: 'vessel',
    component: VesselSettingsComponent,
    // Nombre, MMSI, eslora, manga, calado, polar
  },
  {
    id: 'display',
    title: 'Display',
    icon: 'theme',
    component: DisplaySettingsComponent,
    // Tema, brillo auto, modo kiosk, densidad
  },
  {
    id: 'units',
    title: 'Units',
    icon: 'ruler',
    component: UnitsSettingsComponent,
    // Velocidad (KTS/KMH/MPH), distancia (NM/KM/MI), 
    // profundidad (m/ft), temperatura (°C/°F), presión (hPa/mbar/inHg)
  },
  {
    id: 'alarms',
    title: 'Alarms & Safety',
    icon: 'alarm',
    component: AlarmSettingsComponent,
    // Umbral de profundidad, XTE, audio, vibración
  },
  {
    id: 'chart',
    title: 'Chart',
    icon: 'map',
    component: ChartSettingsComponent,
    // Fuente de tiles, cache offline, range rings config
  },
  {
    id: 'data',
    title: 'Data & Privacy',
    icon: 'database',
    component: DataSettingsComponent,
    // Export datos, borrar cache, datos diagnosticos
  },
  {
    id: 'experiments',
    title: 'Experiments',
    icon: 'lab',
    component: ExperimentsSettingsComponent,
    // Feature flags para features en beta
  },
];
```

#### H.2 Configuración de Conexión Signal K

```html
<!-- connection-settings.component.html -->

<div class="settings-section">
  <h2 class="settings-section__title">Signal K Connection</h2>
  
  <form [formGroup]="connectionForm" (ngSubmit)="saveConnection()">
    
    <!-- URL del servidor -->
    <div class="settings-field">
      <label class="settings-field__label" for="sk-url">
        Server URL
      </label>
      <div class="settings-field__input-group">
        <input
          id="sk-url"
          type="url"
          formControlName="url"
          placeholder="ws://localhost:3000"
          class="settings-field__input"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" 
                class="settings-field__action-btn"
                (click)="testConnection()"
                [disabled]="testing$ | async">
          {{ (testing$ | async) ? 'Testing...' : 'Test' }}
        </button>
      </div>
      <p class="settings-field__hint">
        WebSocket URL of your Signal K server.
        Typically <code>ws://[hostname]:3000</code>
      </p>
    </div>
    
    <!-- Estado de la conexión en tiempo real -->
    <div class="settings-connection-status" 
         [attr.data-status]="(connectionState$ | async)?.wsState">
      <span class="connection-status__indicator"></span>
      <span class="connection-status__text">
        {{ connectionStatusText$ | async }}
      </span>
      <span class="connection-status__latency" *ngIf="(connectionState$ | async)?.latencyMs">
        {{ (connectionState$ | async)?.latencyMs }}ms
      </span>
    </div>
    
    <!-- Reconexión automática -->
    <div class="settings-field settings-field--toggle">
      <label class="settings-field__label">Auto Reconnect</label>
      <omi-toggle formControlName="autoReconnect"></omi-toggle>
      <p class="settings-field__hint">Automatically reconnect if connection drops</p>
    </div>
    
    <!-- Demo Mode -->
    <div class="settings-divider"></div>
    <div class="settings-field">
      <label class="settings-field__label">Demo Mode</label>
      <p class="settings-field__hint">
        Use built-in simulator for testing and demonstration.
        Real Signal K connection will be disabled.
      </p>
      <button type="button" 
              class="settings-field__action-btn settings-field__action-btn--secondary"
              (click)="enableDemoMode()">
        Enable Demo Mode
      </button>
    </div>
    
  </form>
</div>
```

---

### FASE I: PWA y Modo Offline (P1 — 4-5h)

#### I.1 Service Worker Avanzado

```typescript
// ngsw-config.json — Configuración del SW de Angular

{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "map-tiles-osm",
      "urls": ["https://tile.openstreetmap.org/**"],
      "cacheConfig": {
        "maxSize": 500,
        "maxAge": "7d",
        "timeout": "5s",
        "strategy": "freshness"
      }
    },
    {
      "name": "map-tiles-openseamap",
      "urls": ["https://tiles.openseamap.org/**"],
      "cacheConfig": {
        "maxSize": 200,
        "maxAge": "30d",
        "strategy": "performance"
      }
    }
  ]
}
```

#### I.2 IndexedDB para Datos Históricos

```typescript
// core/storage/idb-store.service.ts

@Injectable({ providedIn: 'root' })
export class IdbStoreService {
  
  private db?: IDBDatabase;
  
  async init(): Promise<void> {
    this.db = await this._openDatabase();
  }
  
  private _openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('omi-database', 2);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store para positions (track histórico)
        if (!db.objectStoreNames.contains('positions')) {
          const posStore = db.createObjectStore('positions', { keyPath: 'timestamp' });
          posStore.createIndex('date', 'date', { unique: false });
        }
        
        // Store para datapoints (todos los paths para playback)
        if (!db.objectStoreNames.contains('datapoints')) {
          const dpStore = db.createObjectStore('datapoints', { 
            keyPath: ['path', 'timestamp'] 
          });
          dpStore.createIndex('path', 'path', { unique: false });
          dpStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Store para alarmas históricas
        if (!db.objectStoreNames.contains('alarm-history')) {
          db.createObjectStore('alarm-history', { keyPath: 'id', autoIncrement: true });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async savePosition(position: { lat: number; lon: number; sog: number; cog: number; timestamp: number }): Promise<void> {
    // Guardar posición en IDB para track histórico
    // Throttle: guardar máximo cada 10 segundos
    // Rotación: eliminar datos de más de 30 días
  }
  
  async getPositionHistory(from: Date, to: Date): Promise<any[]> {
    // Recuperar track histórico por rango de fechas
  }
  
  async pruneOldData(daysToKeep: number = 30): Promise<void> {
    // Eliminar datos más antiguos que N días
  }
}
```

#### I.3 Manifest para PWA

```json
// public/manifest.webmanifest
{
  "name": "Open Marine Instrumentation",
  "short_name": "OMI",
  "description": "Professional marine navigation instrumentation",
  "start_url": "/chart",
  "display": "fullscreen",
  "display_override": ["window-controls-overlay", "fullscreen", "standalone"],
  "orientation": "landscape",
  "theme_color": "#0b1116",
  "background_color": "#030507",
  "categories": ["navigation", "utilities"],
  "icons": [
    { "src": "icons/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "icons/icon-96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    {
      "src": "screenshots/chart-night.png",
      "sizes": "1280x800",
      "type": "image/png",
      "label": "Chart view - Night mode"
    }
  ]
}
```

---

### FASE J: Testing y CI/CD (P0 — 4-5h)

#### J.1 Tests Críticos a Implementar

```typescript
// OBLIGATORIO: Tests para lógica crítica de seguridad

// 1. Needle rotation engine (ya especificado en Doc 1)
// 2. XTE calculation
// 3. CPA calculation
// 4. Anchor watch distance
// 5. Data stale detection
// 6. True wind calculation

// xte.utils.spec.ts
describe('XTE Calculation', () => {
  it('should return 0 XTE when on the track line', () => {
    // Vessel exactamente en el leg → XTE = 0
  });
  
  it('should return positive XTE when to starboard', () => {
    // Vessel a babor del leg → XTE negativo
  });
  
  it('should return negative XTE when to port', () => {
    // Vessel a estribor → XTE positivo
  });
  
  it('should handle crossing the dateline', () => {
    // Leg que cruza 180° de longitud
  });
});

// cpa.utils.spec.ts
describe('CPA Calculation', () => {
  it('should detect dangerous CPA when vessels converging', () => {});
  it('should return safe when vessels diverging', () => {});
  it('should handle zero-velocity target', () => {});
});
```

#### J.2 GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml

name: OMI CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --prefix marine-instrumentation-ui
      - run: npm test --prefix marine-instrumentation-ui -- --coverage --run
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --prefix marine-instrumentation-ui
      - run: npm run lint --prefix marine-instrumentation-ui
      - run: npm run format:check --prefix marine-instrumentation-ui
  
  build:
    name: Production Build
    needs: [test, lint]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci --prefix marine-instrumentation-ui
      - run: npm run build --prefix marine-instrumentation-ui
      - name: Analyze bundle size
        run: |
          ls -lh marine-instrumentation-ui/dist/*/browser/*.js | \
          awk '{print $5, $9}' | sort -h
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: omi-dist
          path: marine-instrumentation-ui/dist/
  
  lighthouse:
    name: Lighthouse Performance
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: omi-dist
          path: dist/
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

---

### FASE K: Documentación de Usuario (P1 — 4-6h)

#### K.1 Estructura de la Documentación

```
docs-user/
├── README.md                    # Guía de inicio rápido
├── installation.md              # Instalación en Raspberry Pi / OpenPlotter
├── configuration.md             # Configuración inicial
├── features/
│   ├── chart.md                 # Guía del chartplotter
│   ├── instruments.md           # Instrumentos y widgets
│   ├── alarms.md                # Sistema de alarmas
│   ├── resources.md             # Waypoints, rutas, tracks
│   ├── autopilot.md             # Control de autopiloto
│   └── settings.md              # Configuración completa
├── troubleshooting.md           # Problemas comunes
└── changelog.md                 # Historial de versiones
```

#### K.2 In-App Help System

```typescript
// features/help/help-overlay.component.ts
// Overlay de ayuda contextual (activado con ?)

@Component({
  selector: 'omi-help-overlay',
  standalone: true,
})
export class HelpOverlayComponent {
  
  @Input() context: string = '';  // ID de la feature actual
  
  // Buscar ayuda contextual según la página activa
  // Mostrar tooltip con descripción y link a docs completos
}
```

---

## 4. PERFORMANCE TARGETS (NO NEGOCIABLES)

```
Metric                        Target        Herramienta
─────────────────────────────────────────────────────
Time to Interactive (TTI)     < 3s          Lighthouse
First Contentful Paint        < 1.5s        Lighthouse  
Largest Contentful Paint      < 2.5s        Lighthouse
Cumulative Layout Shift       < 0.1         Lighthouse
Total Blocking Time           < 200ms       Lighthouse
Bundle size (initial)         < 500KB       webpack-bundle-analyzer
FPS en chart (10Hz data)      55+ fps       Chrome DevTools
Layout reflows por update     0             Chrome DevTools
Memory leak check             Stable 5min   Chrome DevTools
Offline functionality         Core features SW + IDB
Touch response time           < 100ms       Manual test
```

---

## 5. TRACKING DOCUMENT

```markdown
# Commercial Product Migration Status

**Proyecto:** Open Marine Instrumentation  
**Target:** Producto Comercial v1.0  
**Inicio:** [FECHA]  

## Estado de Fases
| Fase | Nombre | Estado | Prioridad | Est. | Real |
|------|--------|--------|-----------|------|------|
| Doc 1 | Glass Bridge Styles | PENDIENTE | P0 | 12h | - |
| Doc 2 | Chart Reconstruction | PENDIENTE | P0 | 20h | - |
| A | Prerequisitos | PENDIENTE | P0 | - | - |
| B | Dashboard Mejorado | PENDIENTE | P0 | 6h | - |
| C | Instrumentos Completos | PENDIENTE | P1 | 10h | - |
| D | Onboarding | PENDIENTE | P0 | 5h | - |
| E | Alarmas Avanzado | PENDIENTE | P0 | 6h | - |
| F | Performance Sailing | PENDIENTE | P2 | 8h | - |
| G | Autopilot Console | PENDIENTE | P2 | 6h | - |
| H | Settings Avanzado | PENDIENTE | P0 | 5h | - |
| I | PWA + Offline | PENDIENTE | P1 | 5h | - |
| J | Testing + CI/CD | PENDIENTE | P0 | 5h | - |
| K | Documentación | PENDIENTE | P1 | 6h | - |

## Lighthouse Score History
| Fecha | Performance | Accessibility | Best Practices | SEO |
|-------|-------------|---------------|----------------|-----|
| Baseline | ? | ? | ? | ? |

## Bundle Size History
| Fecha | Initial Bundle | Total | Lazy Chunks |
|-------|----------------|-------|-------------|
| Baseline | ? | ? | ? |

## Test Coverage History
| Fecha | Statements | Branches | Functions | Lines |
|-------|------------|----------|-----------|-------|
| Baseline | ~15% | ~10% | ~10% | ~15% |

## Criterios de Release v1.0
- [ ] Lighthouse Performance > 90
- [ ] Test coverage > 70%
- [ ] Todas las Fases P0 completadas
- [ ] Zero bugs críticos conocidos
- [ ] CI/CD operativo
- [ ] Documentación de usuario publicada
- [ ] Glass Bridge UI consistente en todas las páginas
- [ ] Funciona en: Chrome, Firefox, Safari (iOS), Edge
- [ ] Funciona en pantallas ≥ 768px
- [ ] Anchor Watch funcional
- [ ] MOB funcional
- [ ] PWA installable

## Próximo Paso Exacto
[El agente escribe aquí el siguiente paso atómico]
```

---

## 6. CRITERIOS GLOBALES DE ACEPTACIÓN v1.0

La aplicación es **producto comercial** cuando cumple todo:

**Funcionalidad:**
- Chart con Anchor Watch, MOB, XTE, AIS list, Layer panel
- Dashboard configurable con 8+ widgets
- 30+ instrumentos en el drawer
- Sistema de alarmas con audio y persistencia
- Settings completo con configuración de conexión
- Onboarding funcional para nuevos usuarios
- GPX import/export completo

**Technical Quality:**
- Lighthouse Performance > 90 en producción
- 0 layout reflows durante actualizaciones de datos
- 60fps sostenido en mapa durante navegación
- Bundle inicial < 500KB
- Test coverage > 70% para lógica de negocio crítica

**UX/UI:**
- Glass Bridge consistente en TODAS las páginas
- Day/Night Mode funcional en toda la app
- Touch-friendly en tablet 7"+ (44px touch targets)
- WCAG AA en contraste de colores
- Sin jitter en displays numéricos a 10Hz

**Infraestructura:**
- CI/CD con GitHub Actions
- PWA installable con offline core features
- IDB para persistencia de track histórico
- WebSocket con reconnection automática

---

*Documento generado para Open Marine Instrumentation — Commercial Product v1.0*  
*Este documento es la fuente de verdad para la hoja de ruta del producto.*
