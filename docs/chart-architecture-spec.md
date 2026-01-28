# Open Marine Instrumentation - Chart Feature Architecture Spec

**Versión:** 2.0  
**Fecha:** 2026-01-28  
**Autor:** Product Architect + Frontend Tech Lead  
**Referencia:** Freeboard-SK Feature Parity  
**Stack:** Angular 21.1 + MapLibre GL JS 5.16 + RxJS 7.8 + Signal K

---

## A) Scope & Suposiciones

### A.1 Qué ENTRA en Scope

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Chart & Vessel** | Chartplotter con MapLibre, north-up/course-up, vector de rumbo, bearing lines, range rings | P0 |
| **Resources** | CRUD de routes, waypoints, notes, regions, tracks; import GPX | P0 |
| **AIS & Targets** | Visualización de tráfico AIS, CPA/TCPA, target list, vessel details | P1 |
| **Alarms & Notifications** | Sistema de alarmas visuales/audio, anchor watch, MOB, collision warning | P0 |
| **Autopilot Console** | Engage/disengage, modos (standby/auto/wind/track), target heading, dodge | P2 |
| **History Playback** | Replay de time-series, timeline scrubber, velocidad variable | P2 |
| **Instruments Drawer** | Panel de instrumentos integrados, widgets configurables | P1 |
| **Settings** | Configuración de capas, profundidades S57, experiments | P1 |

### A.2 Qué NO ENTRA en Scope (Fase 1)

- Radar overlay (requiere hardware específico)
- Weather routing con GRIB files
- Polar diagrams y performance analysis
- Multi-vessel fleet tracking
- Social/community features
- Integración con servicios cloud externos

### A.3 Suposiciones Explícitas

| ID | Suposición | Estado | Impacto si es falsa |
|----|------------|--------|---------------------|
| S1 | Signal K server disponible en `ws://localhost:3000` | ✅ Confirmado | Sin datos en tiempo real |
| S2 | Plugins Signal K: `signalk-resources-provider`, `signalk-autopilot` instalados | ⚠️ Verificar | Sin autopilot ni resources REST |
| S3 | AIS data disponible vía Signal K path `vessels.*` | ⚠️ Verificar | Sin tráfico AIS |
| S4 | Tiles OpenStreetMap accesibles (online) | ✅ Confirmado | Solo tiles cacheados |
| S5 | Dispositivo con WebGL support | ✅ Confirmado | MapLibre no funciona |
| S6 | Pantallas táctiles ≥7" | Asumido | UI no óptima en <7" |

### A.4 Preguntas Abiertas (Pendiente Confirmar)

1. ¿Se requiere soporte para cartas náuticas S-57/S-63 propietarias?
2. ¿El autopilot está conectado vía NMEA2000 o requiere gateway?
3. ¿Qué formato de alarmas sonoras? (Web Audio API vs archivos .mp3)
4. ¿Límite de waypoints/rutas a soportar? (impacta performance)
5. ¿Multi-idioma más allá de EN/ES?

### A.5 Dependencias Externas

```
Signal K Server (v2.x)
├── signalk-resources-provider    → /resources/* REST API
├── signalk-autopilot            → /signalk/v1/api/vessels/self/steering/*
├── signalk-anchoralarm-plugin   → Anchor watch events
└── WebSocket delta stream       → Real-time updates

MapLibre GL JS (v5.16)
├── OpenStreetMap tiles (dev)
├── ArcGIS Satellite tiles
└── Future: MBTiles offline / MVT vector

Browser APIs
├── Geolocation API (fallback si no hay GPS)
├── Web Audio API (alarmas sonoras)
├── Vibration API (feedback táctil)
└── Service Worker (offline)
```

---

## B) Descomposición por Dominios

### B.1 Chart & Vessel

**Objetivo:** Visualizar la posición del barco en un mapa interactivo con información de navegación en tiempo real.

**Actores:**
- Navegante (usuario principal)
- Sistema (actualizaciones automáticas)

**Entradas:**
- Position (lat/lon) vía Signal K
- COG, SOG, Heading vía Signal K
- TWD/TWS (true wind) vía Signal K
- Configuración de usuario (auto-center, layers, orientation)

**Salidas:**
- Mapa renderizado con vessel marker
- Track histórico
- Vectores de predicción (COG/SOG projected)
- Wind indicator overlay
- HUD con datos de navegación

**Edge Cases:**
- Sin fix GPS → mostrar "NO FIX" badge, última posición conocida en gris
- Fix stale (>5s) → badge "STALE", vessel marker semi-transparente
- Zoom extremo → limitar a z=3 min, z=19 max
- Rotación del mapa → north-up por defecto, course-up opcional

**Permisos:** Lectura (todos), configuración de view (todos)

---

### B.2 Resources

**Objetivo:** Gestionar recursos de navegación (waypoints, rutas, notas, regiones, tracks).

**Sub-features:**

#### B.2.1 Waypoints
- CRUD completo
- Drag & drop en mapa
- Import/export GPX
- Atributos: name, lat, lon, description, icon, color

#### B.2.2 Routes
- Lista ordenada de waypoints
- Cálculo automático de legs (bearing, distance, ETA)
- Activar/desactivar ruta
- Navigate to waypoint
- Route reversal

#### B.2.3 Notes
- Anclar nota a posición
- Rich text (markdown básico)
- Categorización (POI, danger, anchorage, etc.)

#### B.2.4 Regions
- Polígonos/círculos definibles
- Anchor watch zone
- No-go areas
- Geofencing alerts

#### B.2.5 Tracks
- Recording automático
- Import GPX
- Simplificación (Douglas-Peucker)
- Export para backup

**Edge Cases:**
- Waypoint duplicado en misma posición → warning
- Route sin waypoints → disabled state
- Track con >10k points → simplificar para render

**Permisos:** CRUD completo para todos (single user)

---

### B.3 AIS & Targets

**Objetivo:** Mostrar tráfico marítimo cercano con información de seguridad.

**Actores:**
- Navegante (monitoreo)
- Sistema (alertas automáticas CPA)

**Entradas:**
- AIS messages vía Signal K (`vessels.*`)
- Posición propia para cálculos relativos

**Salidas:**
- Target markers en mapa (con heading indicator)
- Target list ordenable
- Target details panel
- CPA/TCPA warnings

**Datos por Target:**
- MMSI, Name, Call Sign
- Position, COG, SOG
- Ship type, dimensions
- Navigation status
- CPA, TCPA (calculados)

**Edge Cases:**
- Target sin nombre → mostrar MMSI
- Target estático (SOG=0) → icono diferente
- Target perdido (>5min sin update) → fade out, luego remove
- CPA < 0.5nm → alarm visual/audio

**Permisos:** Solo lectura

---

### B.4 Alarms & Notifications

**Objetivo:** Sistema de alertas para situaciones de seguridad.

**Tipos de Alarma:**

| Tipo | Trigger | Severidad | Acción |
|------|---------|-----------|--------|
| Anchor Watch | Posición fuera del círculo | CRITICAL | Audio + visual + vibración |
| Shallow Water | Depth < threshold | WARNING | Visual + audio |
| CPA Warning | CPA < threshold | WARNING | Visual + audio |
| MOB | Botón manual | EMERGENCY | Full screen alert |
| Battery Low | Voltage < threshold | WARNING | Visual |
| GPS Lost | No fix >30s | WARNING | Visual |

**Estados de Alarma:**
1. `inactive` - No triggered
2. `active` - Triggered, requiere atención
3. `acknowledged` - Usuario vio, pero no resuelta
4. `silenced` - Audio off, visual persiste
5. `cleared` - Condición resuelta

**Edge Cases:**
- Múltiples alarmas simultáneas → priorizar por severidad
- Audio bloqueado por browser → fallback visual intenso
- Alarma durante playback → no triggear

**Permisos:** Todos pueden acknowledge, solo sistema puede trigger/clear

---

### B.5 Autopilot

**Objetivo:** Interfaz para controlar autopilot conectado vía Signal K.

**Modos:**
- **Standby** - Piloto desenganchado
- **Auto** - Seguir heading fijo
- **Wind** - Mantener ángulo de viento aparente
- **Track** - Seguir ruta activa

**Controles:**
- Engage/Disengage toggle
- Target heading (±1°, ±10°)
- Mode selector
- Dodge (±10° temporales)

**Edge Cases:**
- Sin autopilot conectado → UI disabled con mensaje
- Cambio de modo durante maniobra → confirmation dialog
- Error de comunicación → warning + fallback manual

**Permisos:** Requiere confirmación explícita para engage

---

### B.6 Playback

**Objetivo:** Reproducir datos históricos de navegación.

**Funcionalidades:**
- Timeline scrubber
- Play/Pause/Stop
- Velocidad variable (0.5x, 1x, 2x, 5x, 10x)
- Jump to timestamp
- Loop region

**Edge Cases:**
- Sin datos históricos → empty state con mensaje
- Gaps en datos → interpolación o skip
- Playback activo → desactivar alarmas reales

**Permisos:** Solo lectura

---

### B.7 Instruments Drawer

**Objetivo:** Panel lateral/inferior con instrumentos personalizables.

**Widgets Disponibles:**
- Compass (heading)
- Speedometer (SOG)
- Depth gauge
- Wind indicator (rose + numbers)
- Battery status
- GPS status
- Clock (local + UTC)

**Configuración:**
- Drag & drop reorder
- Show/hide widgets
- Size: compact/normal/large

**Edge Cases:**
- Sin datos para widget → skeleton + "No Data"
- Espacio insuficiente → scroll horizontal

---

### B.8 Settings & Experiments

**Objetivo:** Configuración avanzada de la aplicación.

**Secciones:**
- **Display:** Theme (day/night/auto), density, language
- **Units:** Speed, depth, distance, temperature
- **Chart:** Default zoom, orientation, layers
- **Safety:** Alarm thresholds, CPA limits, anchor radius
- **Connections:** Signal K URL, reconnect settings
- **Experiments:** Features en beta

---

## C) User Journeys Críticos

### C.1 Fijar Destino (Navigate to Point)

```
TRIGGER: Usuario quiere navegar a un punto específico

PASOS:
1. Long-press en mapa (o tap + "Navigate here")
2. Modal aparece: "Navigate to this point?"
   - Muestra coordenadas
   - Input para nombre (opcional)
   - Botones: [Cancel] [Go]
3. Si confirma:
   - Waypoint temporal creado
   - Bearing line dibujada desde vessel
   - HUD actualiza con BRG/DST
   - Auto-center se activa

ESTADOS UI:
- Idle: Mapa normal
- Selecting: Crosshair en centro, "Tap to select"
- Confirming: Modal overlay
- Navigating: Bearing line visible, HUD activo
- Arriving: Toast "Arrived at destination" cuando DST < 0.1nm

ERRORES:
- Sin GPS fix: "Cannot navigate - no GPS fix"
- Punto en tierra (si hay datos): Warning pero permite

LOADING:
- Crear waypoint: 200ms spinner en botón

LATENCIA:
- Máximo 100ms desde tap hasta modal
- Máximo 300ms desde confirm hasta bearing line visible
```

### C.2 Activar Ruta y Elegir Punto

```
TRIGGER: Usuario quiere seguir una ruta guardada

PASOS:
1. Abrir Resources drawer
2. Tab "Routes"
3. Tap en ruta deseada
4. Vista previa en mapa (zoom to fit)
5. Botón "Start Navigation"
6. Selector de waypoint inicial
7. Confirmar
8. Ruta activa, navegando al primer waypoint

ESTADOS UI:
- List: Lista de rutas con preview thumbnails
- Preview: Ruta dibujada, botón Start visible
- Selecting WP: Waypoints resaltados, tap para elegir
- Active: Leg actual destacado, next WP en HUD

ERRORES:
- Ruta vacía: "Route has no waypoints"
- Ruta con 1 WP: Warning "Route has only one waypoint"

EDGE CASES:
- Waypoint ya passed: Skip automático o manual?
- Ruta muy larga (>50 WP): Paginación en lista
```

### C.3 Importar GPX

```
TRIGGER: Usuario tiene archivo GPX externo

PASOS:
1. Resources → Import button
2. File picker (o drag & drop zone)
3. Parsing con progress
4. Preview de contenido:
   - Tracks encontrados
   - Waypoints encontrados
   - Routes encontradas
5. Checkboxes para seleccionar qué importar
6. Botón "Import Selected"
7. Confirmación con count

ESTADOS UI:
- Idle: Dropzone visible
- Dropping: Highlight zone
- Parsing: Progress bar
- Preview: Lista con checkboxes
- Importing: Progress
- Done: Success toast

ERRORES:
- Archivo inválido: "Invalid GPX file"
- Archivo muy grande (>10MB): "File too large"
- Duplicados detectados: "X items already exist - overwrite?"
```

### C.4 Reconocer Alarma CPA

```
TRIGGER: Target AIS con CPA < threshold

PASOS:
1. Sistema detecta CPA < 0.5nm
2. Alarma visual:
   - Banner rojo en top
   - Target resaltado en mapa
   - Línea CPA dibujada
3. Alarma audio (si permitido)
4. Usuario tap en banner o target
5. Panel de detalles del target
6. Botón "Acknowledge"
7. Audio silenciado, visual persiste
8. CPA se resuelve (target pasa) → alarma cleared

ESTADOS UI:
- Normal: Sin indicadores
- Warning: Banner + highlight
- Acknowledged: Banner amarillo, sin audio
- Cleared: Animación de fade out

ERRORES:
- Audio bloqueado: Visual más intenso (pulso)

LATENCIA:
- Detección a visual: <500ms
- Acknowledge a silence: <100ms
```

### C.5 MOB (Man Overboard)

```
TRIGGER: Emergencia de persona al agua

PASOS:
1. Botón MOB (siempre visible o en FAB)
2. Tap requiere HOLD 2 segundos (prevent accidental)
3. Confirmación: "CONFIRM MOB?"
4. Si confirma:
   - Posición actual guardada como MOB waypoint
   - Full screen alert rojo
   - Audio alarm continuo
   - Bearing line a MOB position
   - Countdown de tiempo transcurrido
5. Botones: [Cancel False Alarm] [Navigate to MOB]
6. Si "Navigate to MOB": auto-zoom, bearing activo
7. Llegando a MOB position: prompt "Person recovered?"
8. Si recovered: clear alarm, log event

ESTADOS UI:
- Normal: MOB button en corner
- Holding: Progress ring around button
- Confirming: Modal de confirmación
- Active: Full screen red overlay
- Navigating: Overlay reducido, HUD con MOB data
- Recovered: Success animation, log entry

ERRORES:
- Sin GPS: MOB con última posición conocida + warning
```

### C.6 Engage Autopilot + Cambio de Modo

```
TRIGGER: Usuario quiere activar piloto automático

PASOS:
1. Abrir Autopilot console
2. Status actual: STANDBY
3. Set target heading (current + adjust)
4. Tap "ENGAGE"
5. Confirmation: "Engage autopilot at 275°?"
6. Si confirma:
   - Command enviado a Signal K
   - Status cambia a AUTO
   - Heading indicator activo
7. Para cambiar modo:
   - Tap mode selector
   - Options: AUTO / WIND / TRACK
   - Seleccionar nuevo modo
   - Autopilot ajusta

ESTADOS UI:
- Standby: Console gris, botón ENGAGE verde
- Engaging: Spinner en botón
- Auto: Console azul, heading editable
- Wind: Console verde, AWA target editable
- Track: Console amarillo, route progress visible
- Error: Console rojo, mensaje de error

ERRORES:
- Sin conexión autopilot: "Autopilot not connected"
- Command timeout: "Command failed - check connection"
- Mode not available: "Track mode requires active route"
```

### C.7 Playback de Travesía

```
TRIGGER: Usuario quiere revisar navegación pasada

PASOS:
1. Abrir Playback panel
2. Seleccionar rango de fechas
3. Cargar datos (progress)
4. Timeline aparece con eventos marcados
5. Botón Play
6. Mapa reproduce posiciones
7. HUD muestra datos históricos
8. Scrubber permite saltar

ESTADOS UI:
- Idle: Date pickers + Load button
- Loading: Progress bar
- Ready: Timeline visible, Play button
- Playing: Timeline moving, vessel animated
- Paused: Timeline stopped, resume button

ERRORES:
- Sin datos en rango: "No data for selected period"
- Datos corruptos: "Some data could not be loaded"

EDGE CASES:
- Gaps >1 hora: Indicador visual en timeline
```

---

## D) Sistema de Componentes

### D.1 Design Tokens

```typescript
// tokens/colors.ts
export const COLORS = {
  // Semantic
  primary: { light: '#0284c7', dark: '#38bdf8' },
  danger: { light: '#dc2626', dark: '#f87171' },
  warning: { light: '#d97706', dark: '#fbbf24' },
  success: { light: '#16a34a', dark: '#4ade80' },
  
  // Nautical specific
  water: { light: '#e0f2fe', dark: '#0c4a6e' },
  land: { light: '#fef3c7', dark: '#78350f' },
  vessel: { light: '#1e40af', dark: '#60a5fa' },
  ais: { light: '#059669', dark: '#34d399' },
  route: { light: '#7c3aed', dark: '#a78bfa' },
  
  // UI surfaces
  background: { light: '#ffffff', dark: '#0f172a' },
  surface: { light: '#f8fafc', dark: '#1e293b' },
  border: { light: '#e2e8f0', dark: '#334155' },
} as const;

// tokens/spacing.ts
export const SPACING = {
  touch: 44, // Minimum touch target (px)
  gap: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
} as const;

// tokens/typography.ts
export const TYPOGRAPHY = {
  fontFamily: {
    display: 'Space Grotesk, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
    '4xl': '3rem',   // 48px - instruments
    '5xl': '4rem',   // 64px - primary data
  },
} as const;
```

---

### D.2 Primitives

#### D.2.1 NauticButton

```typescript
// shared/components/nautic-button/nautic-button.component.ts

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'touch';

@Component({
  selector: 'app-nautic-button',
  standalone: true,
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="computedClass"
      [attr.aria-busy]="loading"
      [attr.aria-disabled]="disabled"
    >
      <span class="icon-left" *ngIf="iconLeft && !loading">
        <app-icon [name]="iconLeft" [size]="iconSize" />
      </span>
      <span class="spinner" *ngIf="loading">
        <app-spinner [size]="iconSize" />
      </span>
      <span class="label"><ng-content /></span>
      <span class="icon-right" *ngIf="iconRight">
        <app-icon [name]="iconRight" [size]="iconSize" />
      </span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NauticButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() iconLeft?: string;
  @Input() iconRight?: string;
  @Input() fullWidth = false;
}

/*
ESTADOS:
- idle: Interactivo normal
- hover: Highlight (desktop)
- active: Pressed state
- disabled: Gris, no interactivo
- loading: Spinner, no interactivo

VARIANTES:
- primary: Acción principal (azul)
- secondary: Acción secundaria (outline)
- danger: Acciones destructivas (rojo)
- ghost: Sin background

TAMAÑOS:
- sm: 32px height, padding 8px 12px
- md: 40px height, padding 10px 16px
- lg: 48px height, padding 12px 24px
- touch: 56px height, padding 16px 32px (táctil)

ACCESIBILIDAD:
- Focus visible ring
- aria-busy durante loading
- aria-disabled cuando disabled
- Min width 44px (touch target)

TESTS:
- Unit: Render con cada variante/tamaño
- Unit: Click handler no dispara cuando disabled/loading
- E2E: Focus navigation
*/
```

#### D.2.2 NauticIcon

```typescript
// shared/components/nautic-icon/nautic-icon.component.ts

export type IconName = 
  | 'anchor' | 'compass' | 'waypoint' | 'route' | 'track'
  | 'vessel' | 'ais' | 'wind' | 'depth' | 'battery'
  | 'alarm' | 'mob' | 'autopilot' | 'settings'
  | 'play' | 'pause' | 'stop' | 'forward' | 'backward'
  | 'zoom-in' | 'zoom-out' | 'center' | 'layers'
  | 'plus' | 'minus' | 'close' | 'menu' | 'check'
  | 'warning' | 'error' | 'info' | 'success';

export type IconSize = 16 | 20 | 24 | 32 | 48;

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      [attr.aria-label]="label"
      [attr.aria-hidden]="!label"
      role="img"
    >
      <use [attr.href]="'#icon-' + name" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NauticIconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size: IconSize = 24;
  @Input() label?: string;
}

/*
IMPLEMENTACIÓN:
- SVG sprite en assets/icons/sprite.svg
- Cada icono como <symbol id="icon-{name}">
- Color heredado via currentColor

ACCESIBILIDAD:
- aria-label para iconos significativos
- aria-hidden para decorativos
*/
```

#### D.2.3 NauticBadge

```typescript
// shared/components/nautic-badge/nautic-badge.component.ts

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span [class]="computedClass" [attr.aria-label]="ariaLabel">
      <app-icon *ngIf="icon" [name]="icon" [size]="iconSize" />
      <ng-content />
      <span *ngIf="pulse" class="pulse-dot"></span>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NauticBadgeComponent {
  @Input() variant: BadgeVariant = 'neutral';
  @Input() size: BadgeSize = 'md';
  @Input() icon?: IconName;
  @Input() pulse = false;
  @Input() ariaLabel?: string;
}

/*
USO:
- Status indicators (GPS FIX, STALE, NO FIX)
- Counts (3 alarms)
- Labels (AIS CLASS A)

ESTADOS:
- pulse: Animación de pulso para alertas
*/
```

#### D.2.4 NauticModal

```typescript
// shared/components/nautic-modal/nautic-modal.component.ts

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div 
      class="modal-backdrop" 
      *ngIf="isOpen"
      (click)="onBackdropClick($event)"
      [@fadeIn]
    >
      <div 
        class="modal-content"
        [class.modal--sm]="size === 'sm'"
        [class.modal--md]="size === 'md'"
        [class.modal--lg]="size === 'lg'"
        [class.modal--fullscreen]="size === 'fullscreen'"
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-labelledby]="titleId"
        [@slideUp]
      >
        <header class="modal-header" *ngIf="showHeader">
          <h2 [id]="titleId">{{ title }}</h2>
          <button 
            class="close-btn" 
            (click)="close.emit()"
            aria-label="Close dialog"
          >
            <app-icon name="close" />
          </button>
        </header>
        
        <div class="modal-body">
          <ng-content />
        </div>
        
        <footer class="modal-footer" *ngIf="showFooter">
          <ng-content select="[modal-footer]" />
        </footer>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NauticModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'fullscreen' = 'md';
  @Input() showHeader = true;
  @Input() showFooter = true;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  
  @Output() close = new EventEmitter<void>();
}

/*
TAMAÑOS:
- sm: 320px max-width
- md: 480px max-width
- lg: 640px max-width
- fullscreen: 100vw/100vh (mobile)

ACCESIBILIDAD:
- Focus trap dentro del modal
- Escape para cerrar
- aria-modal="true"
- Focus inicial en primer elemento interactivo
*/
```

#### D.2.5 NauticDrawer

```typescript
// shared/components/nautic-drawer/nautic-drawer.component.ts

export type DrawerPosition = 'left' | 'right' | 'bottom';

@Component({
  selector: 'app-drawer',
  standalone: true,
  template: `
    <div 
      class="drawer-backdrop" 
      *ngIf="isOpen"
      (click)="close.emit()"
    ></div>
    <aside
      class="drawer"
      [class.drawer--left]="position === 'left'"
      [class.drawer--right]="position === 'right'"
      [class.drawer--bottom]="position === 'bottom'"
      [class.drawer--open]="isOpen"
      [attr.aria-hidden]="!isOpen"
    >
      <header class="drawer-header" *ngIf="title">
        <h2>{{ title }}</h2>
        <button (click)="close.emit()" aria-label="Close">
          <app-icon name="close" />
        </button>
      </header>
      <div class="drawer-content">
        <ng-content />
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NauticDrawerComponent {
  @Input() isOpen = false;
  @Input() position: DrawerPosition = 'right';
  @Input() title?: string;
  @Input() width = '320px'; // For left/right
  @Input() height = '40vh'; // For bottom
  
  @Output() close = new EventEmitter<void>();
}

/*
POSICIONES:
- left: Para menú de navegación
- right: Para resources, instruments
- bottom: Para playback timeline, mobile actions

COMPORTAMIENTO:
- Swipe to close (touch)
- Click backdrop to close
- Escape to close
*/
```

#### D.2.6 NauticToast

```typescript
// shared/components/nautic-toast/nautic-toast.service.ts

export interface ToastConfig {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms, 0 = persistent
  action?: { label: string; callback: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastConfig[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();
  
  show(config: ToastConfig): void { /* ... */ }
  dismiss(index: number): void { /* ... */ }
  dismissAll(): void { /* ... */ }
}

/*
USO:
- toastService.show({ message: 'Waypoint saved', type: 'success' })
- toastService.show({ message: 'Connection lost', type: 'error', duration: 0 })

POSICIÓN:
- Bottom center (mobile)
- Bottom right (desktop)

STACKING:
- Máximo 3 visibles
- Nuevos empujan antiguos
*/
```

#### D.2.7 NauticSlider

```typescript
// shared/components/nautic-slider/nautic-slider.component.ts

@Component({
  selector: 'app-slider',
  standalone: true,
  template: `
    <div class="slider-container">
      <label [for]="id" *ngIf="label">{{ label }}</label>
      <div class="slider-track">
        <input
          type="range"
          [id]="id"
          [min]="min"
          [max]="max"
          [step]="step"
          [value]="value"
          [disabled]="disabled"
          (input)="onInput($event)"
          (change)="onChange($event)"
        />
        <div class="slider-fill" [style.width.%]="fillPercent"></div>
      </div>
      <span class="slider-value" *ngIf="showValue">{{ displayValue }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NauticSliderComponent {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() value = 0;
  @Input() disabled = false;
  @Input() label?: string;
  @Input() showValue = true;
  @Input() valueFormatter?: (v: number) => string;
  
  @Output() valueChange = new EventEmitter<number>();
}

/*
USO:
- Zoom control
- Playback speed
- Autopilot heading adjust

ACCESIBILIDAD:
- Keyboard: arrows para adjust
- Touch: drag handle
- Large touch target (44px height)
*/
```

#### D.2.8 NauticToggle

```typescript
// shared/components/nautic-toggle/nautic-toggle.component.ts

@Component({
  selector: 'app-toggle',
  standalone: true,
  template: `
    <label class="toggle-container" [class.toggle--disabled]="disabled">
      <span class="toggle-label" *ngIf="label">{{ label }}</span>
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="checked"
        [attr.aria-label]="ariaLabel || label"
        [disabled]="disabled"
        (click)="toggle()"
        class="toggle-switch"
        [class.toggle-switch--on]="checked"
      >
        <span class="toggle-thumb"></span>
      </button>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NauticToggleComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() label?: string;
  @Input() ariaLabel?: string;
  
  @Output() checkedChange = new EventEmitter<boolean>();
}

/*
TAMAÑO:
- Switch: 48x28px (touch friendly)
- Thumb: 24px diameter

ESTADOS:
- off: Gris
- on: Primary color
- disabled: Opacity reducida
*/
```

---

### D.3 Map Primitives

#### D.3.1 MapContainer

```typescript
// features/chart/components/map-container/map-container.component.ts

@Component({
  selector: 'app-map-container',
  standalone: true,
  template: `
    <div 
      #mapContainer 
      class="map-container"
      [class.map--loading]="loading"
      [class.map--error]="error"
    >
      <div class="map-loading-overlay" *ngIf="loading">
        <app-spinner size="lg" />
        <span>Loading map...</span>
      </div>
      <div class="map-error-overlay" *ngIf="error">
        <app-icon name="warning" size="48" />
        <span>{{ error }}</span>
        <app-nautic-button (click)="retry.emit()">Retry</app-nautic-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapContainerComponent {
  @Input() loading = false;
  @Input() error?: string;
  
  @Output() mapReady = new EventEmitter<HTMLDivElement>();
  @Output() retry = new EventEmitter<void>();
  
  @ViewChild('mapContainer', { static: true }) 
  containerRef!: ElementRef<HTMLDivElement>;
}

/*
RESPONSABILIDADES:
- Contenedor HTML para MapLibre
- Estados de loading/error
- Resize handling

NO HACE:
- Control de capas (es del engine)
- Manejo de datos (es del facade)
*/
```

#### D.3.2 MapControls

```typescript
// features/chart/components/map-controls/map-controls.component.ts

@Component({
  selector: 'app-map-controls',
  standalone: true,
  template: `
    <div class="map-controls" [class.map-controls--vertical]="vertical">
      <!-- Zoom -->
      <div class="control-group">
        <button (click)="zoomIn.emit()" aria-label="Zoom in">
          <app-icon name="zoom-in" />
        </button>
        <button (click)="zoomOut.emit()" aria-label="Zoom out">
          <app-icon name="zoom-out" />
        </button>
      </div>
      
      <!-- Orientation -->
      <div class="control-group">
        <button 
          (click)="toggleOrientation.emit()"
          [attr.aria-pressed]="orientation === 'course-up'"
          aria-label="Toggle map orientation"
        >
          <app-icon [name]="orientation === 'north-up' ? 'compass' : 'vessel'" />
        </button>
      </div>
      
      <!-- Center -->
      <button 
        (click)="centerOnVessel.emit()"
        [disabled]="!canCenter"
        aria-label="Center on vessel"
      >
        <app-icon name="center" />
      </button>
      
      <!-- Layers -->
      <button 
        (click)="toggleLayers.emit()"
        aria-label="Toggle layers"
      >
        <app-icon name="layers" />
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapControlsComponent {
  @Input() orientation: 'north-up' | 'course-up' = 'north-up';
  @Input() canCenter = false;
  @Input() vertical = true;
  
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() centerOnVessel = new EventEmitter<void>();
  @Output() toggleOrientation = new EventEmitter<void>();
  @Output() toggleLayers = new EventEmitter<void>();
}
```

#### D.3.3 ScaleBar

```typescript
// features/chart/components/scale-bar/scale-bar.component.ts

@Component({
  selector: 'app-scale-bar',
  standalone: true,
  template: `
    <div class="scale-bar" [style.width.px]="widthPx">
      <div class="scale-bar-line"></div>
      <span class="scale-bar-label">{{ label }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScaleBarComponent {
  @Input() metersPerPixel = 1;
  @Input() unit: 'nm' | 'm' | 'km' = 'nm';
  
  get widthPx(): number { /* calcular ancho óptimo */ }
  get label(): string { /* calcular label */ }
}

/*
COMPORTAMIENTO:
- Se ajusta automáticamente al zoom
- Muestra valores "redondos" (0.5nm, 1nm, 2nm, 5nm, etc.)
- Máximo 150px, mínimo 50px de ancho
*/
```

#### D.3.4 Compass

```typescript
// features/chart/components/compass/compass.component.ts

@Component({
  selector: 'app-compass',
  standalone: true,
  template: `
    <div 
      class="compass" 
      [class.compass--interactive]="interactive"
      (click)="onClick()"
    >
      <svg viewBox="0 0 100 100">
        <!-- Outer ring -->
        <circle cx="50" cy="50" r="48" class="compass-ring" />
        
        <!-- Cardinal marks -->
        <text x="50" y="12" class="compass-label">N</text>
        <text x="88" y="54" class="compass-label">E</text>
        <text x="50" y="96" class="compass-label">S</text>
        <text x="12" y="54" class="compass-label">W</text>
        
        <!-- Needle (rotates with heading) -->
        <g [style.transform]="'rotate(' + heading + 'deg)'" class="compass-needle">
          <polygon points="50,10 45,50 55,50" class="needle-north" />
          <polygon points="50,90 45,50 55,50" class="needle-south" />
        </g>
        
        <!-- COG indicator (optional) -->
        <line 
          *ngIf="cog !== null"
          x1="50" y1="50" 
          [attr.x2]="cogX" [attr.y2]="cogY"
          class="cog-line"
        />
      </svg>
      
      <span class="compass-value">{{ heading | number:'1.0-0' }}°</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompassComponent {
  @Input() heading = 0; // degrees
  @Input() cog: number | null = null; // degrees
  @Input() interactive = false;
  
  @Output() compassClick = new EventEmitter<void>();
}
```

#### D.3.5 RangeRings

```typescript
// features/chart/components/range-rings/range-rings.component.ts

// Este es un GeoJSON layer, no un componente visual
// Se genera desde el facade y se pasa al engine

export interface RangeRingsConfig {
  center: [number, number]; // [lng, lat]
  rings: number[]; // distancias en nm
  color: string;
  opacity: number;
}

export function generateRangeRingsGeoJson(config: RangeRingsConfig): FeatureCollection {
  // Genera círculos GeoJSON para cada ring
  return {
    type: 'FeatureCollection',
    features: config.rings.map(radiusNm => ({
      type: 'Feature',
      geometry: createCircle(config.center, radiusNm),
      properties: { radius: radiusNm }
    }))
  };
}
```

#### D.3.6 LayerToggle

```typescript
// features/chart/components/layer-toggle/layer-toggle.component.ts

export interface LayerConfig {
  id: string;
  label: string;
  icon: IconName;
  visible: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-layer-toggle',
  standalone: true,
  template: `
    <div class="layer-toggle-panel">
      <h3>Layers</h3>
      <ul class="layer-list">
        <li *ngFor="let layer of layers; trackBy: trackById">
          <label class="layer-item" [class.layer-item--disabled]="layer.disabled">
            <app-icon [name]="layer.icon" size="20" />
            <span>{{ layer.label }}</span>
            <app-toggle
              [checked]="layer.visible"
              [disabled]="layer.disabled"
              (checkedChange)="toggleLayer.emit(layer.id)"
            />
          </label>
        </li>
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerToggleComponent {
  @Input() layers: LayerConfig[] = [];
  
  @Output() toggleLayer = new EventEmitter<string>();
}

/*
LAYERS TÍPICOS:
- Base: OSM / Satellite
- Overlays: Depth contours, Traffic, Weather
- Data: Track, Route, Waypoints
- Vessel: Vector, Range rings, True wind
*/
```

---

### D.4 Composites

#### D.4.1 VesselMarker (MapLibre Layer, no Angular component)

```typescript
// features/chart/layers/vessel-marker.layer.ts

export interface VesselMarkerState {
  position: [number, number] | null; // [lng, lat]
  heading: number | null; // degrees
  cog: number | null;
  sog: number | null;
  fixState: 'fix' | 'stale' | 'no-fix';
}

export class VesselMarkerLayer {
  private readonly sourceId = 'vessel-source';
  private readonly layerId = 'vessel-layer';
  
  constructor(private map: maplibregl.Map) {
    this.initSource();
    this.initLayer();
  }
  
  update(state: VesselMarkerState): void {
    // Actualiza GeoJSON source
  }
  
  private createVesselIcon(): ImageData {
    // SVG → Canvas → ImageData
    // Icono de barco con orientación
  }
}

/*
VISUAL:
- Triángulo/silueta de barco
- Rotación según heading
- Color según fixState:
  - fix: azul sólido
  - stale: azul semi-transparente
  - no-fix: gris
- Círculo de incertidumbre (opcional)
*/
```

#### D.4.2 AISTargetList

```typescript
// features/ais/components/ais-target-list/ais-target-list.component.ts

export interface AISTarget {
  mmsi: string;
  name: string | null;
  callSign: string | null;
  shipType: number;
  position: [number, number];
  cog: number | null;
  sog: number | null;
  heading: number | null;
  navStatus: number;
  cpa: number | null; // nm
  tcpa: number | null; // minutes
  lastUpdate: number; // timestamp
}

@Component({
  selector: 'app-ais-target-list',
  standalone: true,
  template: `
    <div class="ais-list">
      <header class="ais-list-header">
        <h3>AIS Targets ({{ targets.length }})</h3>
        <select (change)="sortChange.emit($event.target.value)">
          <option value="cpa">Sort by CPA</option>
          <option value="distance">Sort by Distance</option>
          <option value="name">Sort by Name</option>
        </select>
      </header>
      
      <div class="ais-list-scroll">
        <app-ais-target-item
          *ngFor="let target of targets; trackBy: trackByMmsi"
          [target]="target"
          [selected]="selectedMmsi === target.mmsi"
          (click)="selectTarget.emit(target.mmsi)"
        />
      </div>
      
      <div class="ais-empty" *ngIf="targets.length === 0">
        <app-icon name="ais" size="48" />
        <p>No AIS targets in range</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AISTargetListComponent {
  @Input() targets: AISTarget[] = [];
  @Input() selectedMmsi: string | null = null;
  
  @Output() selectTarget = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<string>();
}
```

#### D.4.3 AlarmPanel

```typescript
// features/alarms/components/alarm-panel/alarm-panel.component.ts

export interface Alarm {
  id: string;
  type: 'anchor' | 'shallow' | 'cpa' | 'mob' | 'battery' | 'gps';
  severity: 'warning' | 'critical' | 'emergency';
  message: string;
  timestamp: number;
  state: 'active' | 'acknowledged' | 'silenced';
  data?: Record<string, unknown>;
}

@Component({
  selector: 'app-alarm-panel',
  standalone: true,
  template: `
    <div 
      class="alarm-panel"
      [class.alarm-panel--empty]="alarms.length === 0"
      [class.alarm-panel--critical]="hasCritical"
      [class.alarm-panel--emergency]="hasEmergency"
    >
      <header class="alarm-header">
        <app-icon name="alarm" />
        <span>Alarms</span>
        <app-badge 
          *ngIf="activeCount > 0"
          [variant]="hasCritical ? 'danger' : 'warning'"
          [pulse]="hasUnacknowledged"
        >
          {{ activeCount }}
        </app-badge>
      </header>
      
      <ul class="alarm-list">
        <li 
          *ngFor="let alarm of alarms; trackBy: trackById"
          class="alarm-item"
          [class.alarm-item--active]="alarm.state === 'active'"
          [class.alarm-item--ack]="alarm.state === 'acknowledged'"
        >
          <div class="alarm-content">
            <app-icon [name]="getAlarmIcon(alarm.type)" />
            <div class="alarm-text">
              <span class="alarm-message">{{ alarm.message }}</span>
              <span class="alarm-time">{{ alarm.timestamp | relativeTime }}</span>
            </div>
          </div>
          <div class="alarm-actions">
            <button 
              (click)="acknowledge.emit(alarm.id)"
              [disabled]="alarm.state !== 'active'"
              aria-label="Acknowledge alarm"
            >
              ACK
            </button>
            <button 
              (click)="silence.emit(alarm.id)"
              [disabled]="alarm.state === 'silenced'"
              aria-label="Silence alarm"
            >
              <app-icon name="volume-off" size="16" />
            </button>
          </div>
        </li>
      </ul>
      
      <div class="alarm-empty" *ngIf="alarms.length === 0">
        <app-icon name="check" size="32" />
        <p>No active alarms</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlarmPanelComponent {
  @Input() alarms: Alarm[] = [];
  
  @Output() acknowledge = new EventEmitter<string>();
  @Output() silence = new EventEmitter<string>();
  @Output() viewDetails = new EventEmitter<string>();
}
```

#### D.4.4 WaypointForm

```typescript
// features/resources/components/waypoint-form/waypoint-form.component.ts

export interface WaypointFormValue {
  name: string;
  lat: number;
  lon: number;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-waypoint-form',
  standalone: true,
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="form-field">
        <label for="wp-name">Name</label>
        <input 
          id="wp-name"
          formControlName="name"
          placeholder="Waypoint name"
        />
      </div>
      
      <div class="form-row">
        <div class="form-field">
          <label for="wp-lat">Latitude</label>
          <input 
            id="wp-lat"
            type="number"
            step="0.0001"
            formControlName="lat"
          />
        </div>
        <div class="form-field">
          <label for="wp-lon">Longitude</label>
          <input 
            id="wp-lon"
            type="number"
            step="0.0001"
            formControlName="lon"
          />
        </div>
      </div>
      
      <div class="form-field">
        <label for="wp-desc">Description</label>
        <textarea 
          id="wp-desc"
          formControlName="description"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-field">
          <label>Icon</label>
          <app-icon-picker formControlName="icon" />
        </div>
        <div class="form-field">
          <label>Color</label>
          <app-color-picker formControlName="color" />
        </div>
      </div>
      
      <div class="form-actions">
        <app-nautic-button 
          variant="secondary" 
          (click)="cancel.emit()"
        >
          Cancel
        </app-nautic-button>
        <app-nautic-button 
          type="submit"
          [disabled]="form.invalid"
          [loading]="saving"
        >
          {{ editMode ? 'Update' : 'Create' }}
        </app-nautic-button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaypointFormComponent {
  @Input() initialValue?: Partial<WaypointFormValue>;
  @Input() editMode = false;
  @Input() saving = false;
  
  @Output() save = new EventEmitter<WaypointFormValue>();
  @Output() cancel = new EventEmitter<void>();
  
  form = new FormGroup({
    name: new FormControl('', Validators.required),
    lat: new FormControl(0, [Validators.required, Validators.min(-90), Validators.max(90)]),
    lon: new FormControl(0, [Validators.required, Validators.min(-180), Validators.max(180)]),
    description: new FormControl(''),
    icon: new FormControl('waypoint'),
    color: new FormControl('#22c55e'),
  });
}
```

#### D.4.5 RouteEditor

```typescript
// features/resources/components/route-editor/route-editor.component.ts

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  bearingToNext: number | null;
  distanceToNext: number | null;
}

@Component({
  selector: 'app-route-editor',
  standalone: true,
  template: `
    <div class="route-editor">
      <header class="route-header">
        <input 
          class="route-name-input"
          [value]="routeName"
          (change)="nameChange.emit($event.target.value)"
          placeholder="Route name"
        />
        <div class="route-stats">
          <span>{{ waypoints.length }} waypoints</span>
          <span>{{ totalDistance | number:'1.1-1' }} nm</span>
        </div>
      </header>
      
      <div 
        class="waypoint-list"
        cdkDropList
        (cdkDropListDropped)="onReorder($event)"
      >
        <div 
          *ngFor="let wp of waypoints; let i = index; trackBy: trackById"
          class="waypoint-item"
          cdkDrag
        >
          <span class="wp-handle" cdkDragHandle>⋮⋮</span>
          <span class="wp-index">{{ i + 1 }}</span>
          <div class="wp-info">
            <span class="wp-name">{{ wp.name }}</span>
            <span class="wp-leg" *ngIf="wp.bearingToNext !== null">
              {{ wp.bearingToNext | number:'1.0-0' }}° / 
              {{ wp.distanceToNext | number:'1.1-1' }} nm
            </span>
          </div>
          <button 
            class="wp-remove"
            (click)="removeWaypoint.emit(wp.id)"
            aria-label="Remove waypoint"
          >
            <app-icon name="close" size="16" />
          </button>
        </div>
      </div>
      
      <footer class="route-actions">
        <app-nautic-button 
          variant="secondary"
          iconLeft="plus"
          (click)="addWaypoint.emit()"
        >
          Add Waypoint
        </app-nautic-button>
        <app-nautic-button
          variant="secondary"
          (click)="reverseRoute.emit()"
        >
          Reverse
        </app-nautic-button>
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteEditorComponent {
  @Input() routeName = '';
  @Input() waypoints: RouteWaypoint[] = [];
  
  @Output() nameChange = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<{previousIndex: number; currentIndex: number}>();
  @Output() removeWaypoint = new EventEmitter<string>();
  @Output() addWaypoint = new EventEmitter<void>();
  @Output() reverseRoute = new EventEmitter<void>();
}
```

---

### D.5 Feature Widgets

#### D.5.1 AutopilotConsole

```typescript
// features/autopilot/components/autopilot-console/autopilot-console.component.ts

export type AutopilotMode = 'standby' | 'auto' | 'wind' | 'track';
export type AutopilotState = 'disconnected' | 'ready' | 'engaged' | 'error';

export interface AutopilotStatus {
  state: AutopilotState;
  mode: AutopilotMode;
  targetHeading: number | null;
  targetWindAngle: number | null;
  currentHeading: number;
  rudderAngle: number | null;
  error?: string;
}

@Component({
  selector: 'app-autopilot-console',
  standalone: true,
  template: `
    <div 
      class="autopilot-console"
      [class.ap--standby]="status.mode === 'standby'"
      [class.ap--engaged]="status.state === 'engaged'"
      [class.ap--error]="status.state === 'error'"
      [class.ap--disconnected]="status.state === 'disconnected'"
    >
      <!-- Status Header -->
      <header class="ap-header">
        <app-badge [variant]="getStatusVariant()">
          {{ status.state | uppercase }}
        </app-badge>
        <span class="ap-mode">{{ status.mode | uppercase }}</span>
      </header>
      
      <!-- Disconnected State -->
      <div class="ap-disconnected" *ngIf="status.state === 'disconnected'">
        <app-icon name="autopilot" size="48" />
        <p>Autopilot not connected</p>
        <p class="ap-hint">Check Signal K configuration</p>
      </div>
      
      <!-- Main Controls -->
      <div class="ap-controls" *ngIf="status.state !== 'disconnected'">
        <!-- Heading Display -->
        <div class="ap-heading-display">
          <span class="ap-label">TARGET</span>
          <span class="ap-value">
            {{ status.targetHeading ?? '--' }}°
          </span>
          <span class="ap-label">CURRENT</span>
          <span class="ap-value-secondary">
            {{ status.currentHeading | number:'1.0-0' }}°
          </span>
        </div>
        
        <!-- Heading Adjust -->
        <div class="ap-adjust" *ngIf="status.state === 'engaged' && status.mode === 'auto'">
          <button 
            class="ap-btn ap-btn--large"
            (click)="adjustHeading.emit(-10)"
          >
            -10°
          </button>
          <button 
            class="ap-btn"
            (click)="adjustHeading.emit(-1)"
          >
            -1°
          </button>
          <button 
            class="ap-btn"
            (click)="adjustHeading.emit(+1)"
          >
            +1°
          </button>
          <button 
            class="ap-btn ap-btn--large"
            (click)="adjustHeading.emit(+10)"
          >
            +10°
          </button>
        </div>
        
        <!-- Mode Selector -->
        <div class="ap-mode-select">
          <button 
            *ngFor="let mode of modes"
            [class.ap-mode--active]="status.mode === mode"
            [disabled]="!canSelectMode(mode)"
            (click)="selectMode.emit(mode)"
          >
            {{ mode | uppercase }}
          </button>
        </div>
        
        <!-- Engage/Disengage -->
        <div class="ap-main-action">
          <app-nautic-button
            *ngIf="status.state !== 'engaged'"
            variant="primary"
            size="touch"
            fullWidth
            [disabled]="status.state !== 'ready'"
            (click)="engage.emit()"
          >
            ENGAGE
          </app-nautic-button>
          <app-nautic-button
            *ngIf="status.state === 'engaged'"
            variant="danger"
            size="touch"
            fullWidth
            (click)="disengage.emit()"
          >
            DISENGAGE
          </app-nautic-button>
        </div>
      </div>
      
      <!-- Error Display -->
      <div class="ap-error" *ngIf="status.error">
        <app-icon name="warning" />
        <span>{{ status.error }}</span>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutopilotConsoleComponent {
  @Input() status!: AutopilotStatus;
  
  @Output() engage = new EventEmitter<void>();
  @Output() disengage = new EventEmitter<void>();
  @Output() selectMode = new EventEmitter<AutopilotMode>();
  @Output() adjustHeading = new EventEmitter<number>();
  
  readonly modes: AutopilotMode[] = ['auto', 'wind', 'track'];
}
```

#### D.5.2 PlaybackBar

```typescript
// features/playback/components/playback-bar/playback-bar.component.ts

export interface PlaybackState {
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused';
  currentTime: number; // timestamp
  startTime: number;
  endTime: number;
  speed: number; // multiplier
  events: PlaybackEvent[]; // markers on timeline
}

export interface PlaybackEvent {
  time: number;
  type: 'alarm' | 'waypoint' | 'note';
  label: string;
}

@Component({
  selector: 'app-playback-bar',
  standalone: true,
  template: `
    <div class="playback-bar" [class.playback--active]="state.status !== 'idle'">
      <!-- Timeline -->
      <div class="playback-timeline">
        <div 
          class="timeline-track"
          (click)="onTimelineClick($event)"
        >
          <div 
            class="timeline-progress"
            [style.width.%]="progressPercent"
          ></div>
          <div 
            *ngFor="let event of state.events"
            class="timeline-marker"
            [class]="'marker--' + event.type"
            [style.left.%]="getEventPosition(event)"
            [title]="event.label"
          ></div>
          <div 
            class="timeline-cursor"
            [style.left.%]="progressPercent"
          ></div>
        </div>
        
        <div class="timeline-labels">
          <span>{{ state.startTime | date:'HH:mm' }}</span>
          <span class="current-time">{{ state.currentTime | date:'HH:mm:ss' }}</span>
          <span>{{ state.endTime | date:'HH:mm' }}</span>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="playback-controls">
        <button (click)="skipBackward.emit()" aria-label="Skip backward">
          <app-icon name="backward" />
        </button>
        
        <button 
          class="play-btn"
          (click)="togglePlay.emit()"
          [attr.aria-label]="state.status === 'playing' ? 'Pause' : 'Play'"
        >
          <app-icon [name]="state.status === 'playing' ? 'pause' : 'play'" size="32" />
        </button>
        
        <button (click)="skipForward.emit()" aria-label="Skip forward">
          <app-icon name="forward" />
        </button>
        
        <select 
          class="speed-select"
          [value]="state.speed"
          (change)="speedChange.emit(+$event.target.value)"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
        
        <button (click)="stop.emit()" aria-label="Stop playback">
          <app-icon name="stop" />
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaybackBarComponent {
  @Input() state!: PlaybackState;
  
  @Output() togglePlay = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() seek = new EventEmitter<number>(); // timestamp
  @Output() speedChange = new EventEmitter<number>();
  @Output() skipForward = new EventEmitter<void>();
  @Output() skipBackward = new EventEmitter<void>();
}
```

#### D.5.3 InstrumentsDrawer

```typescript
// features/instruments/components/instruments-drawer/instruments-drawer.component.ts

export interface InstrumentWidget {
  id: string;
  type: 'compass' | 'speed' | 'depth' | 'wind' | 'battery' | 'gps' | 'clock';
  size: 'sm' | 'md' | 'lg';
  visible: boolean;
}

@Component({
  selector: 'app-instruments-drawer',
  standalone: true,
  template: `
    <app-drawer
      [isOpen]="isOpen"
      [position]="position"
      [title]="'Instruments'"
      (close)="close.emit()"
    >
      <div class="instruments-grid">
        <ng-container *ngFor="let widget of visibleWidgets; trackBy: trackById">
          <app-compass-widget 
            *ngIf="widget.type === 'compass'"
            [size]="widget.size"
            [heading]="data.heading"
          />
          <app-speed-widget 
            *ngIf="widget.type === 'speed'"
            [size]="widget.size"
            [sog]="data.sog"
            [unit]="speedUnit"
          />
          <app-depth-widget 
            *ngIf="widget.type === 'depth'"
            [size]="widget.size"
            [depth]="data.depth"
            [unit]="depthUnit"
            [shallowThreshold]="shallowThreshold"
          />
          <app-wind-widget 
            *ngIf="widget.type === 'wind'"
            [size]="widget.size"
            [awa]="data.awa"
            [aws]="data.aws"
            [twa]="data.twa"
            [tws]="data.tws"
          />
          <app-battery-widget 
            *ngIf="widget.type === 'battery'"
            [size]="widget.size"
            [voltage]="data.voltage"
            [current]="data.current"
          />
          <app-gps-widget 
            *ngIf="widget.type === 'gps'"
            [size]="widget.size"
            [fixState]="data.fixState"
            [position]="data.position"
          />
          <app-clock-widget 
            *ngIf="widget.type === 'clock'"
            [size]="widget.size"
            [showUtc]="true"
          />
        </ng-container>
      </div>
      
      <button class="configure-btn" (click)="configure.emit()">
        <app-icon name="settings" />
        Configure Instruments
      </button>
    </app-drawer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentsDrawerComponent {
  @Input() isOpen = false;
  @Input() position: 'left' | 'right' | 'bottom' = 'right';
  @Input() widgets: InstrumentWidget[] = [];
  @Input() data!: InstrumentData;
  @Input() speedUnit: 'kn' | 'm/s' | 'km/h' = 'kn';
  @Input() depthUnit: 'm' | 'ft' = 'm';
  @Input() shallowThreshold = 3;
  
  @Output() close = new EventEmitter<void>();
  @Output() configure = new EventEmitter<void>();
}
```

#### D.5.4 ChartHUD (Head-Up Display)

```typescript
// features/chart/components/chart-hud/chart-hud.component.ts

@Component({
  selector: 'app-chart-hud',
  standalone: true,
  template: `
    <div class="chart-hud" [class.hud--compact]="compact">
      <!-- Status Badge -->
      <div class="hud-status">
        <app-badge 
          [variant]="getFixVariant(vm.fixState)"
          [pulse]="vm.fixState === 'stale'"
        >
          {{ vm.statusLabelKey | translate }}
        </app-badge>
      </div>
      
      <!-- Position -->
      <div class="hud-position">
        <span class="hud-label">{{ 'chart.hud.lat' | translate }}</span>
        <span class="hud-value">{{ vm.latLabel }}</span>
        <span class="hud-label">{{ 'chart.hud.lon' | translate }}</span>
        <span class="hud-value">{{ vm.lonLabel }}</span>
      </div>
      
      <!-- Data Rows -->
      <div class="hud-data">
        <div 
          *ngFor="let row of vm.rows"
          class="hud-row"
          [class.hud-row--empty]="row.value === '--'"
        >
          <span class="hud-row-label">{{ row.labelKey | translate }}</span>
          <span class="hud-row-value">{{ row.value }}</span>
          <span class="hud-row-unit">{{ row.unit }}</span>
        </div>
      </div>
      
      <!-- Age indicator -->
      <div class="hud-age" *ngIf="vm.ageSeconds !== null">
        <span [class.hud-age--stale]="vm.ageSeconds > 5">
          {{ vm.ageSeconds | number:'1.0-0' }}s ago
        </span>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartHudComponent {
  @Input() vm!: ChartHudVm;
  @Input() compact = false;
}
```

#### D.5.5 MOBAlert

```typescript
// features/alarms/components/mob-alert/mob-alert.component.ts

@Component({
  selector: 'app-mob-alert',
  standalone: true,
  template: `
    <div 
      class="mob-alert" 
      *ngIf="active"
      [@fadeIn]
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mob-title"
    >
      <div class="mob-content">
        <div class="mob-icon pulse">
          <app-icon name="mob" size="64" />
        </div>
        
        <h1 id="mob-title" class="mob-title">MAN OVERBOARD</h1>
        
        <div class="mob-data">
          <div class="mob-field">
            <span class="mob-label">Position</span>
            <span class="mob-value">
              {{ position.lat | latFormat }} / {{ position.lon | lonFormat }}
            </span>
          </div>
          <div class="mob-field">
            <span class="mob-label">Time Elapsed</span>
            <span class="mob-value mob-timer">
              {{ elapsedSeconds | duration }}
            </span>
          </div>
          <div class="mob-field" *ngIf="bearing !== null">
            <span class="mob-label">Bearing / Distance</span>
            <span class="mob-value">
              {{ bearing | number:'1.0-0' }}° / {{ distance | number:'1.2-2' }} nm
            </span>
          </div>
        </div>
        
        <div class="mob-actions">
          <app-nautic-button
            variant="secondary"
            size="touch"
            (click)="cancelFalseAlarm.emit()"
          >
            CANCEL (False Alarm)
          </app-nautic-button>
          <app-nautic-button
            variant="primary"
            size="touch"
            (click)="navigateToMob.emit()"
          >
            NAVIGATE TO MOB
          </app-nautic-button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MOBAlertComponent {
  @Input() active = false;
  @Input() position!: { lat: number; lon: number };
  @Input() elapsedSeconds = 0;
  @Input() bearing: number | null = null;
  @Input() distance: number | null = null;
  
  @Output() cancelFalseAlarm = new EventEmitter<void>();
  @Output() navigateToMob = new EventEmitter<void>();
}
```

---

### D.6 Pages

#### D.6.1 ChartPage

```typescript
// features/chart/chart.page.ts

@Component({
  selector: 'app-chart-page',
  standalone: true,
  imports: [
    CommonModule,
    MapContainerComponent,
    MapControlsComponent,
    ChartHudComponent,
    LayerToggleComponent,
    AISTargetListComponent,
    AlarmPanelComponent,
    InstrumentsDrawerComponent,
    PlaybackBarComponent,
    MOBAlertComponent,
  ],
  template: `
    <div class="chart-page">
      <!-- Map (full screen) -->
      <app-map-container
        [loading]="mapLoading$ | async"
        [error]="mapError$ | async"
        (mapReady)="onMapReady($event)"
        (retry)="retryMapLoad()"
      />
      
      <!-- HUD (overlay top-left) -->
      <app-chart-hud 
        class="chart-overlay chart-overlay--hud"
        [vm]="hudVm$ | async"
        [compact]="(layout$ | async)?.compact"
      />
      
      <!-- Controls (overlay right) -->
      <app-map-controls
        class="chart-overlay chart-overlay--controls"
        [orientation]="(controlsVm$ | async)?.orientation"
        [canCenter]="(controlsVm$ | async)?.canCenter"
        (zoomIn)="facade.zoomIn()"
        (zoomOut)="facade.zoomOut()"
        (centerOnVessel)="facade.centerOnVessel()"
        (toggleOrientation)="facade.toggleOrientation()"
        (toggleLayers)="toggleLayersPanel()"
      />
      
      <!-- Alarm strip (overlay top) -->
      <app-alarm-panel
        class="chart-overlay chart-overlay--alarms"
        *ngIf="(activeAlarms$ | async)?.length"
        [alarms]="activeAlarms$ | async"
        (acknowledge)="alarmFacade.acknowledge($event)"
        (silence)="alarmFacade.silence($event)"
      />
      
      <!-- MOB Alert (full overlay) -->
      <app-mob-alert
        [active]="(mobState$ | async)?.active"
        [position]="(mobState$ | async)?.position"
        [elapsedSeconds]="(mobState$ | async)?.elapsed"
        [bearing]="(mobState$ | async)?.bearing"
        [distance]="(mobState$ | async)?.distance"
        (cancelFalseAlarm)="alarmFacade.cancelMob()"
        (navigateToMob)="facade.navigateToMob()"
      />
      
      <!-- Layers Panel (drawer) -->
      <app-drawer
        [isOpen]="layersPanelOpen"
        position="right"
        title="Layers"
        (close)="layersPanelOpen = false"
      >
        <app-layer-toggle
          [layers]="layers$ | async"
          (toggleLayer)="facade.toggleLayer($event)"
        />
      </app-drawer>
      
      <!-- Instruments Drawer -->
      <app-instruments-drawer
        [isOpen]="instrumentsOpen"
        [widgets]="instrumentWidgets$ | async"
        [data]="instrumentData$ | async"
        (close)="instrumentsOpen = false"
        (configure)="openInstrumentConfig()"
      />
      
      <!-- Playback Bar (bottom) -->
      <app-playback-bar
        class="chart-overlay chart-overlay--playback"
        *ngIf="playbackActive$ | async"
        [state]="playbackState$ | async"
        (togglePlay)="playbackFacade.togglePlay()"
        (stop)="playbackFacade.stop()"
        (seek)="playbackFacade.seek($event)"
        (speedChange)="playbackFacade.setSpeed($event)"
      />
      
      <!-- FAB Menu (bottom right) -->
      <div class="chart-fab-menu">
        <button 
          class="fab fab--mob"
          (mousedown)="startMobHold()"
          (mouseup)="cancelMobHold()"
          (mouseleave)="cancelMobHold()"
          aria-label="Man Overboard"
        >
          MOB
        </button>
        <button 
          class="fab"
          (click)="instrumentsOpen = true"
          aria-label="Open instruments"
        >
          <app-icon name="compass" />
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartPage implements AfterViewInit, OnDestroy {
  // ... implementation
}
```

---

## E) Estado, Datos y Contratos

### E.1 Arquitectura de Estado

```
┌─────────────────────────────────────────────────────────────────┐
│                     ESTADO GLOBAL (Services)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DatapointStoreService          Signal K data stream            │
│  ├── position$                  (todos los paths de navegación) │
│  ├── navigation$                                                │
│  ├── wind$                                                      │
│  ├── depth$                                                     │
│  ├── electrical$                                                │
│  └── track$                                                     │
│                                                                 │
│  AISStoreService                Vessels/targets                 │
│  ├── targets$                                                   │
│  ├── selectedTarget$                                            │
│  └── cpaAlerts$                                                 │
│                                                                 │
│  AlarmStoreService              Active alarms                   │
│  ├── alarms$                                                    │
│  ├── mobState$                                                  │
│  └── audioState$                                                │
│                                                                 │
│  ResourcesStoreService          Waypoints, routes, etc.         │
│  ├── waypoints$                                                 │
│  ├── routes$                                                    │
│  ├── activeRoute$                                               │
│  └── tracks$                                                    │
│                                                                 │
│  AutopilotStoreService          Pilot state                     │
│  ├── status$                                                    │
│  └── commands$ (write)                                          │
│                                                                 │
│  PreferencesService             User preferences                │
│  ├── theme$                                                     │
│  ├── units$                                                     │
│  └── chartSettings$                                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     ESTADO LOCAL (Componentes)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  UI State (per component)                                       │
│  ├── isDrawerOpen                                               │
│  ├── isLoading                                                  │
│  ├── formValues                                                 │
│  ├── selectedTab                                                │
│  └── expandedSections                                           │
│                                                                 │
│  Transient State                                                │
│  ├── hover states                                               │
│  ├── drag state                                                 │
│  └── animation state                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### E.2 Flujo de Datos Signal K

```typescript
// data-access/signalk/signalk.types.ts

export interface SignalKDelta {
  context: string; // e.g., "vessels.self"
  updates: SignalKUpdate[];
}

export interface SignalKUpdate {
  source: SignalKSource;
  timestamp: string;
  values: SignalKValue[];
}

export interface SignalKValue {
  path: string;
  value: unknown;
}

// data-access/signalk/signalk-client.service.ts

@Injectable({ providedIn: 'root' })
export class SignalKClientService {
  private readonly ws$ = webSocket<SignalKDelta>(WS_URL);
  
  readonly deltas$ = this.ws$.pipe(
    filter(isValidDelta),
    share(),
  );
  
  // Specific path subscriptions
  readonly position$ = this.selectPath<PositionValue>('navigation.position');
  readonly sog$ = this.selectPath<number>('navigation.speedOverGround');
  readonly cog$ = this.selectPath<number>('navigation.courseOverGroundTrue');
  // ... etc
  
  // AIS vessels (context !== "vessels.self")
  readonly aisVessels$ = this.deltas$.pipe(
    filter(d => d.context !== 'vessels.self'),
    // aggregate by MMSI
  );
  
  // REST API for resources
  async getWaypoints(): Promise<Waypoint[]> { /* GET /signalk/v1/api/resources/waypoints */ }
  async saveWaypoint(wp: Waypoint): Promise<void> { /* PUT */ }
  async deleteWaypoint(id: string): Promise<void> { /* DELETE */ }
}
```

### E.3 DTOs y Validación

```typescript
// domain/navigation/navigation.dto.ts

import { z } from 'zod'; // o equivalente

export const PositionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
});

export const NavigationDataSchema = z.object({
  position: PositionSchema.nullable(),
  sog: z.number().min(0).nullable(), // m/s
  cog: z.number().min(0).max(2 * Math.PI).nullable(), // radians
  heading: z.number().min(0).max(2 * Math.PI).nullable(),
  depth: z.number().min(0).nullable(),
});

export type PositionDTO = z.infer<typeof PositionSchema>;
export type NavigationDataDTO = z.infer<typeof NavigationDataSchema>;

// Validación en el store
function validateNavigation(raw: unknown): NavigationDataDTO | null {
  const result = NavigationDataSchema.safeParse(raw);
  if (!result.success) {
    console.warn('Invalid navigation data:', result.error);
    return null;
  }
  return result.data;
}
```

### E.4 Degraded Mode

```typescript
// core/services/connection.service.ts

export type ConnectionState = 'connected' | 'reconnecting' | 'offline' | 'error';

export interface DegradedModeConfig {
  // Qué features funcionan sin conexión
  offlineCapabilities: {
    cachedTiles: boolean;
    cachedWaypoints: boolean;
    localPlayback: boolean;
    alarmHistory: boolean;
  };
  // Qué features requieren conexión
  onlineRequired: {
    livePosition: true;
    ais: true;
    autopilot: true;
    resourceSync: true;
  };
}

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  readonly state$ = new BehaviorSubject<ConnectionState>('connected');
  
  readonly isOnline$ = this.state$.pipe(
    map(s => s === 'connected'),
    distinctUntilChanged(),
  );
  
  readonly degradedFeatures$ = combineLatest([
    this.state$,
    this.cachedDataAvailable$,
  ]).pipe(
    map(([state, cached]) => this.computeDegradedFeatures(state, cached)),
  );
}
```

---

## F) Arquitectura y Estructura de Carpetas

### F.1 Estructura Propuesta (Feature-Sliced)

```
marine-instrumentation-ui/
├── src/
│   ├── main.ts
│   ├── index.html
│   ├── styles/
│   │   ├── _tokens.scss          # Design tokens
│   │   ├── _reset.scss           # CSS reset
│   │   ├── _typography.scss      # Font styles
│   │   ├── _themes.scss          # Day/night themes
│   │   └── main.scss             # Entry point
│   │
│   └── app/
│       ├── app.ts                # Root component
│       ├── app.routes.ts         # Top-level routes
│       ├── app.config.ts         # DI providers
│       │
│       ├── core/                 # Singleton services, guards, interceptors
│       │   ├── services/
│       │   │   ├── preferences.service.ts
│       │   │   ├── theme.service.ts
│       │   │   ├── layout.service.ts
│       │   │   ├── audio.service.ts
│       │   │   └── connection.service.ts
│       │   ├── guards/
│       │   │   └── online.guard.ts
│       │   └── interceptors/
│       │       └── error.interceptor.ts
│       │
│       ├── data-access/          # External data sources
│       │   ├── signalk/
│       │   │   ├── signalk-client.service.ts
│       │   │   ├── signalk-mapper.ts
│       │   │   ├── signalk.types.ts
│       │   │   └── signalk-resources.service.ts
│       │   └── storage/
│       │       └── local-storage.service.ts
│       │
│       ├── state/                # Global state management
│       │   ├── datapoints/
│       │   │   ├── datapoint-store.service.ts
│       │   │   ├── datapoint.selectors.ts
│       │   │   └── datapoint.models.ts
│       │   ├── ais/
│       │   │   ├── ais-store.service.ts
│       │   │   └── ais.models.ts
│       │   ├── alarms/
│       │   │   ├── alarm-store.service.ts
│       │   │   └── alarm.models.ts
│       │   ├── resources/
│       │   │   ├── waypoint-store.service.ts
│       │   │   ├── route-store.service.ts
│       │   │   └── track-store.service.ts
│       │   ├── autopilot/
│       │   │   └── autopilot-store.service.ts
│       │   └── calculations/
│       │       ├── navigation.ts
│       │       ├── cpa.ts
│       │       └── wind.ts
│       │
│       ├── domain/               # Business logic, pure functions
│       │   ├── navigation/
│       │   │   ├── navigation.dto.ts
│       │   │   ├── navigation.validators.ts
│       │   │   └── navigation.utils.ts
│       │   ├── ais/
│       │   │   ├── ais.dto.ts
│       │   │   └── ais.utils.ts
│       │   └── resources/
│       │       ├── waypoint.dto.ts
│       │       ├── route.dto.ts
│       │       └── gpx-parser.ts
│       │
│       ├── shared/               # Reusable UI components (dumb)
│       │   ├── components/
│       │   │   ├── nautic-button/
│       │   │   ├── nautic-icon/
│       │   │   ├── nautic-badge/
│       │   │   ├── nautic-modal/
│       │   │   ├── nautic-drawer/
│       │   │   ├── nautic-toast/
│       │   │   ├── nautic-slider/
│       │   │   ├── nautic-toggle/
│       │   │   ├── spinner/
│       │   │   └── index.ts      # Barrel export
│       │   ├── pipes/
│       │   │   ├── translate.pipe.ts
│       │   │   ├── duration.pipe.ts
│       │   │   ├── lat-format.pipe.ts
│       │   │   └── lon-format.pipe.ts
│       │   └── directives/
│       │       ├── long-press.directive.ts
│       │       └── autofocus.directive.ts
│       │
│       ├── features/             # Feature modules (lazy loaded)
│       │   ├── chart/
│       │   │   ├── chart.page.ts
│       │   │   ├── chart.page.html
│       │   │   ├── chart.page.scss
│       │   │   ├── chart.routes.ts
│       │   │   ├── services/
│       │   │   │   ├── chart-facade.service.ts
│       │   │   │   ├── chart-settings.service.ts
│       │   │   │   └── maplibre-engine.service.ts
│       │   │   ├── components/
│       │   │   │   ├── map-container/
│       │   │   │   ├── map-controls/
│       │   │   │   ├── chart-hud/
│       │   │   │   ├── scale-bar/
│       │   │   │   ├── compass/
│       │   │   │   └── layer-toggle/
│       │   │   ├── layers/
│       │   │   │   ├── vessel-marker.layer.ts
│       │   │   │   ├── track.layer.ts
│       │   │   │   ├── ais-targets.layer.ts
│       │   │   │   └── route.layer.ts
│       │   │   └── types/
│       │   │       ├── chart-vm.ts
│       │   │       └── chart-geojson.ts
│       │   │
│       │   ├── resources/
│       │   │   ├── resources.page.ts
│       │   │   ├── resources.routes.ts
│       │   │   ├── services/
│       │   │   │   └── resources-facade.service.ts
│       │   │   └── components/
│       │   │       ├── waypoint-list/
│       │   │       ├── waypoint-form/
│       │   │       ├── route-list/
│       │   │       ├── route-editor/
│       │   │       ├── track-list/
│       │   │       └── gpx-import/
│       │   │
│       │   ├── ais/
│       │   │   ├── services/
│       │   │   │   └── ais-facade.service.ts
│       │   │   └── components/
│       │   │       ├── ais-target-list/
│       │   │       ├── ais-target-details/
│       │   │       └── cpa-warning/
│       │   │
│       │   ├── alarms/
│       │   │   ├── alarms.page.ts
│       │   │   ├── services/
│       │   │   │   └── alarms-facade.service.ts
│       │   │   └── components/
│       │   │       ├── alarm-panel/
│       │   │       ├── alarm-config/
│       │   │       ├── anchor-watch/
│       │   │       └── mob-alert/
│       │   │
│       │   ├── autopilot/
│       │   │   ├── services/
│       │   │   │   └── autopilot-facade.service.ts
│       │   │   └── components/
│       │   │       └── autopilot-console/
│       │   │
│       │   ├── playback/
│       │   │   ├── services/
│       │   │   │   └── playback-facade.service.ts
│       │   │   └── components/
│       │   │       ├── playback-bar/
│       │   │       └── date-range-picker/
│       │   │
│       │   ├── instruments/
│       │   │   ├── services/
│       │   │   │   └── instruments-facade.service.ts
│       │   │   └── components/
│       │   │       ├── instruments-drawer/
│       │   │       ├── compass-widget/
│       │   │       ├── speed-widget/
│       │   │       ├── depth-widget/
│       │   │       ├── wind-widget/
│       │   │       └── battery-widget/
│       │   │
│       │   └── settings/
│       │       ├── settings.page.ts
│       │       ├── settings.routes.ts
│       │       └── components/
│       │           ├── display-settings/
│       │           ├── unit-settings/
│       │           ├── safety-settings/
│       │           └── connection-settings/
│       │
│       └── layouts/              # Page layouts
│           ├── main-layout/
│           │   ├── main-layout.component.ts
│           │   └── main-layout.component.scss
│           └── fullscreen-layout/
│               └── fullscreen-layout.component.ts
│
├── assets/
│   ├── icons/
│   │   └── sprite.svg            # SVG icon sprite
│   ├── sounds/
│   │   ├── alarm-warning.mp3
│   │   ├── alarm-critical.mp3
│   │   └── alarm-mob.mp3
│   └── i18n/
│       ├── en.json
│       └── es.json
│
└── environments/
    ├── environment.ts
    └── environment.prod.ts
```

### F.2 Reglas de Importación

```typescript
// eslint import/no-restricted-paths rules

/*
REGLAS:
1. features/ → puede importar de: shared/, state/, data-access/, domain/, core/
2. features/ → NO puede importar de: otros features/
3. shared/ → puede importar de: shared/ (otros componentes), pipes/, directives/
4. shared/ → NO puede importar de: features/, state/, data-access/
5. state/ → puede importar de: domain/, data-access/
6. state/ → NO puede importar de: features/, shared/
7. data-access/ → puede importar de: domain/
8. data-access/ → NO puede importar de: features/, shared/, state/
9. domain/ → puede importar de: nada más (pure functions)
10. core/ → puede importar de: data-access/, domain/
*/

// Ejemplo de barrel exports para encapsulación
// shared/components/index.ts
export { NauticButtonComponent } from './nautic-button/nautic-button.component';
export { NauticIconComponent } from './nautic-icon/nautic-icon.component';
// ... etc

// Importar así:
import { NauticButtonComponent, NauticIconComponent } from '@app/shared/components';
```

---

## G) Roadmap por Milestones

### M1: Chart Core Hardening (2 semanas)

**Objetivo:** Estabilizar el chart existente y preparar la base para nuevas features.

**Alcance:**
- Refactorizar MapLibre engine para soportar orientation modes
- Implementar north-up / course-up toggle
- Añadir range rings configurables
- Mejorar vessel marker con estados visuales
- Implementar bearing line a waypoint activo

**Tareas Atómicas:**

| ID | Tarea | Input | Output | Verificable |
|----|-------|-------|--------|-------------|
| M1.1 | Crear enum `MapOrientation` | - | `types/chart-vm.ts` actualizado | Type existe |
| M1.2 | Añadir `orientation$` a ChartFacadeService | M1.1 | Observable emite `north-up`/`course-up` | Test unitario |
| M1.3 | Implementar rotación de mapa en MapLibreEngine | M1.2 | Método `setOrientation()` | Mapa rota visualmente |
| M1.4 | Crear MapControlsComponent | Spec D.3.2 | Componente funcional | Botones visibles |
| M1.5 | Conectar toggle orientation en UI | M1.3, M1.4 | Click cambia orientación | E2E test |
| M1.6 | Implementar range rings layer | - | `generateRangeRingsGeoJson()` | Círculos visibles |
| M1.7 | Añadir config de range rings | M1.6 | Settings persisten | LocalStorage |
| M1.8 | Mejorar vessel marker estados | - | Colores por fixState | Visual check |
| M1.9 | Implementar bearing line layer | - | Línea desde vessel a WP | Visual check |
| M1.10 | Conectar bearing line a activeWaypoint | M1.9 | Línea aparece al activar WP | E2E test |

**DoD:**
- [x] Mapa puede cambiar entre north-up y course-up
- [x] Range rings visibles y configurables
- [x] Vessel marker refleja estado de fix
- [x] Bearing line a waypoint activo funciona

**Criterios de Aceptación:**
- Toggle orientation responde en <100ms
- Range rings se dibujan sin jank
- Bearing line se actualiza con posición en tiempo real

---

### M2: Primitives Library (1.5 semanas)

**Objetivo:** Crear la librería de componentes base reutilizables.

**Alcance:**
- NauticButton con todas las variantes
- NauticIcon con sprite SVG
- NauticBadge
- NauticModal
- NauticDrawer
- NauticToast service
- NauticToggle
- NauticSlider

**Tareas Atómicas:**

| ID | Tarea | Input | Output |
|----|-------|-------|--------|
| M2.1 | Crear SVG sprite con iconos | Lista de iconos | `assets/icons/sprite.svg` |
| M2.2 | Implementar NauticIconComponent | M2.1, Spec D.2.2 | Componente funcional |
| M2.3 | Implementar NauticButtonComponent | Spec D.2.1 | Componente con 4 variantes |
| M2.4 | Implementar NauticBadgeComponent | Spec D.2.3 | Componente con pulse |
| M2.5 | Implementar NauticModalComponent | Spec D.2.4 | Componente con focus trap |
| M2.6 | Implementar NauticDrawerComponent | Spec D.2.5 | Componente con 3 posiciones |
| M2.7 | Implementar ToastService | Spec D.2.6 | Service + ToastContainer |
| M2.8 | Implementar NauticToggleComponent | Spec D.2.8 | Componente accesible |
| M2.9 | Implementar NauticSliderComponent | Spec D.2.7 | Componente con formatter |
| M2.10 | Crear Storybook/demo page | M2.1-M2.9 | Página de demostración |

**DoD:**
- [x] Todos los primitives documentados con props
- [x] Unit tests para cada componente
- [x] Accesibilidad verificada (keyboard nav, ARIA)

---

### M3: AIS Integration (2 semanas)

**Objetivo:** Mostrar tráfico AIS con alertas CPA.

**Alcance:**
- AIS store service
- AIS targets layer en mapa
- AIS target list component
- CPA/TCPA calculations
- CPA warning alarm

**Tareas Atómicas:**

| ID | Tarea | Input | Output |
|----|-------|-------|--------|
| M3.1 | Crear AIS types y DTOs | Signal K spec | `domain/ais/ais.dto.ts` |
| M3.2 | Implementar AISStoreService | M3.1 | Store con targets$ |
| M3.3 | Parsear AIS deltas de Signal K | M3.2 | Targets actualizados |
| M3.4 | Implementar CPA calculation | - | `calculations/cpa.ts` |
| M3.5 | Crear AIS targets layer | M3.2 | Markers en mapa |
| M3.6 | Implementar AISTargetListComponent | M3.2, Spec D.4.2 | Lista con sort |
| M3.7 | Implementar AISTargetDetailsComponent | M3.6 | Panel de detalles |
| M3.8 | Crear CPA warning alarm | M3.4 | Alarma en AlarmStore |
| M3.9 | Visualizar CPA line en mapa | M3.8 | Línea a target peligroso |
| M3.10 | E2E: Simular AIS target | M3.1-M3.9 | Test completo |

**DoD:**
- [x] AIS targets visibles en mapa
- [x] Lista de targets ordenable
- [x] CPA warning a <0.5nm funciona

---

### M4: Alarm System Refactor (1.5 semanas)

**Objetivo:** Sistema de alarmas robusto con audio y MOB.

**Alcance:**
- AlarmStoreService refactorizado
- Alarm types: anchor, shallow, cpa, battery, gps
- Audio service con fallbacks
- MOB alert flow completo
- Anchor watch configuration

**Tareas Atómicas:**

| ID | Tarea | Input | Output |
|----|-------|-------|--------|
| M4.1 | Definir Alarm types | Spec B.4 | `state/alarms/alarm.models.ts` |
| M4.2 | Refactorizar AlarmStoreService | M4.1 | Store con state machine |
| M4.3 | Implementar AudioService | - | Service con play/stop |
| M4.4 | Crear MOBAlertComponent | Spec D.5.5 | Full screen overlay |
| M4.5 | Implementar MOB flow | M4.4 | Hold → confirm → alert |
| M4.6 | Crear AnchorWatchComponent | - | Config de círculo |
| M4.7 | Implementar anchor watch alarm | M4.6 | Trigger cuando fuera |
| M4.8 | Crear AlarmPanelComponent | Spec D.4.3 | Lista con ack/silence |
| M4.9 | Integrar alarms en ChartPage | M4.8 | Overlay visible |
| M4.10 | E2E: Anchor watch trigger | - | Test completo |

**DoD:**
- [x] MOB flow completo funciona
- [x] Anchor watch configurable y funcional
- [x] Audio alarms suenan (si browser permite)

---

### M5: Resources CRUD (2 semanas)

**Objetivo:** Gestión completa de waypoints, routes, tracks.

**Alcance:**
- Signal K resources API integration
- Waypoint CRUD con form
- Route editor con reorder
- GPX import/export
- Track recording y display

**Tareas Atómicas:**

| ID | Tarea | Input | Output |
|----|-------|-------|--------|
| M5.1 | Crear SignalKResourcesService | SK API spec | Service con CRUD |
| M5.2 | Implementar WaypointStoreService | M5.1 | Store sincronizado |
| M5.3 | Crear WaypointFormComponent | Spec D.4.4 | Form funcional |
| M5.4 | Crear WaypointListComponent | - | Lista con acciones |
| M5.5 | Implementar RouteStoreService | M5.1 | Store con legs |
| M5.6 | Crear RouteEditorComponent | Spec D.4.5 | Drag & drop |
| M5.7 | Implementar GPX parser | - | `domain/resources/gpx-parser.ts` |
| M5.8 | Crear GPXImportComponent | M5.7 | Dropzone + preview |
| M5.9 | Implementar track recording | - | TrackStoreService |
| M5.10 | Crear ResourcesPage | M5.2-M5.9 | Página completa |

**DoD:**
- [x] Waypoints se sincronizan con Signal K
- [x] Routes editables con recálculo de legs
- [x] GPX import funciona

---

### M6: Autopilot Console (1.5 semanas)

**Objetivo:** Interfaz para control de autopilot.

**Alcance:**
- Signal K autopilot API integration
- AutopilotStoreService
- AutopilotConsoleComponent
- Mode switching
- Heading adjustment

**Tareas Atómicas:**

| ID | Tarea | Input | Output |
|----|-------|-------|--------|
| M6.1 | Investigar Signal K autopilot API | SK docs | Documentación interna |
| M6.2 | Crear AutopilotStoreService | M6.1 | Store con status$ |
| M6.3 | Implementar commands (engage, etc.) | M6.2 | Métodos de command |
| M6.4 | Crear AutopilotConsoleComponent | Spec D.5.1 | UI completa |
| M6.5 | Implementar heading adjustment | M6.4 | Botones ±1°, ±10° |
| M6.6 | Implementar mode selector | M6.4 | Tabs de modo |
| M6.7 | Crear confirmation dialogs | - | Modals de seguridad |
| M6.8 | Integrar en ChartPage | M6.4 | Drawer/panel |
| M6.9 | Handle disconnected state | M6.2 | UI disabled |
| M6.10 | E2E: Engage/disengage | - | Test completo |

**DoD:**
- [x] Console muestra estado real del autopilot
- [x] Commands llegan a Signal K
- [x] Estado disconnected manejado

---

### M7: Playback System (2 semanas)

**Objetivo:** Reproducción de datos históricos.

**Alcance:**
- History data storage/retrieval
- PlaybackStoreService
- PlaybackBar component
- Timeline with events
- Variable speed playback

**Tareas Atómicas:**

| ID | Tarea | Input | Output |
|----|-------|-------|--------|
| M7.1 | Diseñar storage de history | - | Esquema IndexedDB |
| M7.2 | Implementar HistoryService | M7.1 | Service de almacenamiento |
| M7.3 | Crear PlaybackStoreService | M7.2 | Store con timeline |
| M7.4 | Implementar PlaybackBarComponent | Spec D.5.2 | UI de controles |
| M7.5 | Implementar seek functionality | M7.3 | Jump a timestamp |
| M7.6 | Implementar variable speed | M7.3 | 0.5x - 10x |
| M7.7 | Crear event markers | M7.3 | Puntos en timeline |
| M7.8 | Integrar playback con mapa | M7.3 | Vessel se mueve |
| M7.9 | Pausar alarmas durante playback | M7.3 | Alarmas silenciadas |
| M7.10 | E2E: Reproducir travesía | - | Test completo |

**DoD:**
- [x] Datos históricos se guardan
- [x] Playback reproduce posición en mapa
- [x] Timeline navegable

---

### M8: Instruments & Polish (1.5 semanas)

**Objetivo:** Drawer de instrumentos y pulido general.

**Alcance:**
- InstrumentsDrawer con widgets configurables
- Compass widget mejorado
- Wind rose widget
- Depth gauge widget
- Settings page completa
- Responsive/mobile optimizations

**Tareas Atómicas:**

| ID | Tarea | Input | Output |
|----|-------|-------|--------|
| M8.1 | Crear InstrumentsFacadeService | - | Service de config |
| M8.2 | Implementar InstrumentsDrawerComponent | Spec D.5.3 | Drawer con grid |
| M8.3 | Crear CompassWidget | - | Compass mejorado |
| M8.4 | Crear WindWidget con rose | - | Rose + números |
| M8.5 | Crear DepthGaugeWidget | - | Gauge con threshold |
| M8.6 | Implementar widget reordering | M8.2 | Drag & drop |
| M8.7 | Completar SettingsPage | - | Todas las secciones |
| M8.8 | Optimizar para mobile | - | Touch targets, layouts |
| M8.9 | Implementar night mode | - | Theme automático |
| M8.10 | Performance audit | - | <60ms frame time |

**DoD:**
- [x] Instruments drawer funcional
- [x] Widgets configurables
- [x] Mobile usable

---

## H) Plan de Validación

### H.1 Checklist E2E por Journey

| Journey | Test Case | Criterio de Éxito |
|---------|-----------|-------------------|
| Navigate to Point | Long-press → confirm → bearing visible | Bearing line en <500ms |
| Activate Route | Select route → start → HUD shows leg | Leg data correcto |
| Import GPX | Drop file → preview → import | Waypoints en mapa |
| CPA Alarm | Simular target → alarm triggers | Audio + visual en <1s |
| MOB | Hold button → confirm → full alert | Alert visible, timer corre |
| Engage Autopilot | Select mode → engage → status engaged | Command enviado a SK |
| Playback | Load history → play → vessel moves | Posición interpolada |

### H.2 Métricas de Rendimiento

| Métrica | Target | Herramienta |
|---------|--------|-------------|
| Map FPS | >55fps durante pan/zoom | Chrome DevTools |
| Time to Interactive | <3s | Lighthouse |
| First Contentful Paint | <1.5s | Lighthouse |
| Bundle size | <500KB (gzipped) | webpack-bundle-analyzer |
| Memory (30min session) | <150MB | Chrome Task Manager |

### H.3 Métricas de Accesibilidad

| Check | Target | Herramienta |
|-------|--------|-------------|
| Lighthouse A11y Score | >90 | Lighthouse |
| Color Contrast | WCAG AA | axe |
| Keyboard Navigation | 100% features | Manual test |
| Screen Reader | Labels correctos | NVDA/VoiceOver |

### H.4 Observabilidad

```typescript
// core/services/analytics.service.ts

interface EventLog {
  event: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private logs: EventLog[] = [];
  
  log(event: string, data?: Record<string, unknown>): void {
    this.logs.push({ event, timestamp: Date.now(), data });
    
    // En producción, enviar a backend
    if (environment.production) {
      this.sendToBackend({ event, timestamp: Date.now(), data });
    }
  }
  
  // Eventos a trackear:
  // - alarm_triggered
  // - alarm_acknowledged
  // - waypoint_created
  // - route_activated
  // - autopilot_engaged
  // - mob_triggered
  // - connection_lost
  // - connection_restored
}
```

---

## Apéndice: Resumen Ejecutivo

### Stack Tecnológico Final

| Capa | Tecnología | Notas |
|------|------------|-------|
| Framework | Angular 21.1 | Standalone components |
| Maps | MapLibre GL JS 5.16 | WebGL rendering |
| State | RxJS + Services | No NgRx |
| Styling | SCSS + CSS Variables | Themes via variables |
| Data | Signal K WebSocket + REST | Real-time + persistence |
| Offline | Service Worker + IndexedDB | Tiles + history |
| Testing | Vitest + Playwright | Unit + E2E |

### Diferencias vs Freeboard-SK

| Feature | Freeboard | OMI (propuesto) |
|---------|-----------|-----------------|
| Maps | OpenLayers | MapLibre GL JS |
| Framework | Angular (older) | Angular 21 |
| Charts | S-57 support | OSM/Satellite (future S-57) |
| UI | Material-ish | Custom nautic theme |
| Offline | Limited | Full PWA + tile cache |

### Timeline Estimado

| Milestone | Duración | Acumulado |
|-----------|----------|-----------|
| M1: Chart Core | 2 sem | 2 sem |
| M2: Primitives | 1.5 sem | 3.5 sem |
| M3: AIS | 2 sem | 5.5 sem |
| M4: Alarms | 1.5 sem | 7 sem |
| M5: Resources | 2 sem | 9 sem |
| M6: Autopilot | 1.5 sem | 10.5 sem |
| M7: Playback | 2 sem | 12.5 sem |
| M8: Polish | 1.5 sem | **14 sem** |

**Total estimado: ~3.5 meses** para feature parity con Freeboard-SK básico.

---

*Documento generado para Open Marine Instrumentation - Chart Feature Upgrade*
*Fecha: 2026-01-28*
