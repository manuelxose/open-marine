# 🧭 PROMPT: Unificar Instruments + Widgets en una sola página con doble vista

## 📋 CONTEXTO

### Qué es OMI
Open Marine Instrumentation — app de navegación marítima open-source. Monorepo Node.js/TypeScript, UI en Angular 21.1 standalone components, datos vía Signal K WebSocket.

### Problema actual
Hay **dos páginas separadas** que deberían ser una sola:

1. **`/instruments`** (`features/instruments/instruments.page.ts`) — Muestra 3 instrumentos numéricos (SOG, Heading, Depth) + lista AIS. Página simple, sin configuración.

2. **`/widgets`** (`pages/widgets/widgets.page.ts`) — Página de configuración/gestión de widgets con drag&drop, toggle visibilidad, cambio de tamaño. Muestra previews de los instrumentos visuales (compass, depth gauge, wind rose, power card). También gestiona los widgets del dashboard.

**Resultado**: El usuario tiene que ir a dos sitios diferentes para ver instrumentos, y hay duplicidad de componentes (por ejemplo `SogInstrumentComponent` es numérico, `CompassWidgetComponent` es visual, pero no están juntos).

### Objetivo
**UNA sola página `/instruments`** donde cada instrumento tenga:
- **Vista numérica**: Número grande, unidad, calidad del dato (lo que ya hacen `SogInstrumentComponent`, `HeadingInstrumentComponent`, `DepthInstrumentComponent`)
- **Vista visual**: Representación gráfica (lo que ya hacen `CompassWidgetComponent`, `DepthGaugeWidgetComponent`, `WindWidgetComponent`, `PowerCardComponent`)
- **Toggle** para cambiar entre numérica ↔ visual por instrumento (o mostrar ambas)

La gestión de widgets del dashboard (la segunda sección de la página widgets) se mueve a Settings.

---

## 🔍 ESTADO ACTUAL — INVENTARIO COMPLETO

### Rutas (app.routes.ts)
```typescript
{ path: 'instruments', loadComponent: () => import('./features/instruments/instruments.page') }
{ path: 'widgets', loadComponent: () => import('./pages/widgets/widgets.page') }
```

### Navegación (app-shell.component.html)
Ambas rutas tienen entrada en el sidenav:
- `/instruments` con icono compass
- `/widgets` con icono grid (4 cuadrados)

### Componentes de instrumento existentes

#### A) Instrumentos NUMÉRICOS (solo número grande)
Ubicación: `ui/instruments/`

| Componente | Selector | Path Signal K | Qué muestra |
|-----------|----------|--------------|-------------|
| `SogInstrumentComponent` | `app-sog-instrument` | `navigation.speedOverGround` | Velocidad con unidad configurable (kn/m/s/mph) |
| `HeadingInstrumentComponent` | `app-heading-instrument` | `navigation.headingMagnetic` | Heading en grados |
| `DepthInstrumentComponent` | `app-depth-instrument` | `environment.depth.belowTransducer` | Profundidad con unidad configurable (m/ft) |

Todos usan `InstrumentCardComponent` internamente → muestra título, valor, unidad, calidad, edad del dato, fuente.

#### B) Instrumentos VISUALES (gráfico + número)
Ubicación: `ui/instruments/`

| Componente | Selector | Path Signal K | Qué muestra |
|-----------|----------|--------------|-------------|
| `CompassWidgetComponent` | `app-compass-widget` | `navigation.headingMagnetic` ó `headingTrue` | Rosa de los vientos con aguja + readout numérico |
| `DepthGaugeWidgetComponent` | `app-depth-gauge-widget` | `environment.depth.belowTransducer` | Barra vertical de gauge + número + umbral shallow |
| `WindWidgetComponent` | `app-wind-widget` | `environment.wind.*` | Rosa de vientos con agujas AWA/TWA + números AWS/TWS |
| `PowerCardComponent` | `app-power-card` | `electrical.batteries.house.*` | Voltaje + corriente + sparkline |

#### C) Componentes compuestos (dashboard)
Ubicación: `features/dashboard/components/panels/`

| Componente | Qué muestra |
|-----------|-------------|
| `NavigationPanelComponent` | SOG + COG + HDG + posición + sparkline |
| `WindPanelComponent` | AWS + AWA + TWS + TWA |
| `DepthPanelComponent` | Profundidad + sparkline + alarma shallow |
| `PowerPanelComponent` | Voltaje + corriente + sparkline |
| `SystemPanelComponent` | Estado conexión + diagnostics |

Estos son los paneles del dashboard — **NO tocar**, el dashboard mantiene su propia estructura.

#### D) Instrumentos genéricos (cards)
- `AppInstrumentCardComponent` (`shared/components/app-instrument-card/`) — Card genérica con label, value, unit, icon, sparkline, status
- `InstrumentCardComponent` (`ui/components/instrument-card/`) — Wrapper con title, value, quality, age, source

### Servicios

| Servicio | Responsabilidad |
|---------|----------------|
| `InstrumentsFacadeService` | Gestiona lista de widgets (tipo, tamaño, visibilidad, orden). Persiste en localStorage |
| `LayoutService` | Gestiona layout del dashboard (widgets visibles, orden) |
| `DatapointStoreService` | Store central de datos Signal K — todos los instrumentos leen de aquí |
| `PreferencesService` | Preferencias de usuario (unidades, tema, etc.) |

### i18n keys relevantes (en.ts)
```typescript
nav: {
  instruments: 'Instruments',
  widgets: 'Widgets',        // ← ELIMINAR
},
instruments: {
  page: { title: '...', subtitle: '...' }
},
widgets: {
  title: 'Widgets',          // ← ELIMINAR
  subtitle: '...',           // ← ELIMINAR
  sections: { instruments: '...', dashboard: '...' },
  // ...
}
```

---

## 🎯 DISEÑO DE LA NUEVA PÁGINA

### Concepto
Una página de instrumentos tipo "panel de instrumentos de barco" donde cada instrumento ocupa una celda del grid y el usuario puede elegir cómo ver cada uno.

### Modos de vista por instrumento

Cada instrumento tiene un toggle (icono pequeño en la esquina) con 3 estados:
1. **`numeric`** — Solo el número grande (como los actuales `*-instrument` components)
2. **`visual`** — Solo la representación gráfica (como los actuales `*-widget` components)
3. **`both`** — Número arriba/abajo + visual

El modo se persiste por instrumento en localStorage.

### Lista de instrumentos en la nueva página

| ID | Nombre | Numérico | Visual | Path(s) |
|----|--------|----------|--------|---------|
| `compass` | Compass / Heading | Heading en ° + fuente (mag/true) | Rosa de los vientos con aguja | `headingMagnetic`, `headingTrue` |
| `speed` | Speed (SOG) | Velocidad + unidad | Speedometer gauge (nuevo, o reutilizar numérico con arc) | `speedOverGround` |
| `depth` | Depth | Profundidad + unidad | Barra gauge vertical con threshold | `depth.belowTransducer` |
| `wind` | Wind | AWA + AWS + TWA + TWS | Rosa de vientos con agujas | `wind.angleApparent`, `wind.speedApparent`, `wind.angleTrueWater`, `wind.speedTrue` |
| `battery` | Power | Voltaje + Corriente | Sparkline + números | `batteries.house.voltage`, `batteries.house.current` |
| `gps` | GPS Status | Fix type + satélites + HDOP | Icono satélite + estado | `sensors.gps.*`, `navigation.position` |
| `cog` | Course (COG) | COG en ° | Reutilizar compass-like o flecha | `courseOverGroundTrue` |
| `position` | Position | Lat/Lon en formato náutico | Coordenadas formateadas | `navigation.position` |

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Instruments                              [⚙️ config] │
│  Real-time marine data from connected sensors         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Compass  │  │  SOG    │  │  Depth  │  │  Wind   │ │
│  │ [🔢|📊] │  │ [🔢|📊] │  │ [🔢|📊] │  │ [🔢|📊] │ │
│  │          │  │         │  │         │  │         │ │
│  │  (vista  │  │ (vista  │  │ (vista  │  │ (vista  │ │
│  │  actual) │  │ actual) │  │ actual) │  │ actual) │ │
│  │          │  │         │  │         │  │         │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
│                                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Battery │  │  GPS    │  │  COG    │  │Position │ │
│  │ [🔢|📊] │  │ [🔢|📊] │  │ [🔢|📊] │  │ [🔢|📊] │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ AIS Targets                                      │ │
│  │ (lista de targets, ya existente)                 │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

El botón ⚙️ config abre un drawer/panel (reutilizar la lógica de la antigua widgets page) para:
- Reordenar instrumentos (drag & drop)
- Toggle visibilidad por instrumento
- Cambiar tamaño (sm/md/lg)

---

## 🔄 FLUJO DE TRABAJO — 7 FASES

```
FASE 1: Crear componentes wrapper dual-view          ← Nuevo componente que wrappea numérico + visual
FASE 2: Reconstruir la página de instrumentos        ← Nueva instruments.page.ts unificada
FASE 3: Mover config del dashboard a Settings        ← La sección de dashboard widgets de /widgets → /settings
FASE 4: Eliminar la página widgets                   ← Borrar /pages/widgets/, quitar ruta, quitar del sidenav
FASE 5: Actualizar facade e i18n                     ← Limpiar InstrumentsFacadeService, actualizar traducciones
FASE 6: Crear instrumentos faltantes                 ← COG, Position, GPS como instrumentos dual-view
FASE 7: Verificar y pulir                            ← Build, lint, test visual
```

**REGLA**: Confirmar con el usuario que cada fase funciona antes de pasar a la siguiente. Build limpio al final de cada fase.

---

## FASE 1: Crear componente wrapper dual-view

### 1.1 Crear `InstrumentContainerComponent`

Ubicación: `ui/instruments/instrument-container/instrument-container.component.ts`

Este es un componente genérico que envuelve cualquier instrumento y le da la capacidad de cambiar entre vista numérica y visual.

```typescript
// Concepto:
@Component({
  selector: 'app-instrument-container',
  standalone: true,
  template: `
    <div class="instrument-container" [class]="'size-' + size()">
      <div class="instrument-header">
        <span class="instrument-title">{{ title() }}</span>
        <div class="view-toggle">
          <button (click)="cycleView()" [title]="'Toggle view'">
            <!-- Icono que cambia según el modo -->
          </button>
        </div>
      </div>
      
      <div class="instrument-body">
        @if (viewMode() === 'numeric' || viewMode() === 'both') {
          <div class="numeric-view">
            <ng-content select="[numeric]"></ng-content>
          </div>
        }
        @if (viewMode() === 'visual' || viewMode() === 'both') {
          <div class="visual-view">
            <ng-content select="[visual]"></ng-content>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentContainerComponent {
  title = input.required<string>();
  instrumentId = input.required<string>();
  size = input<'sm' | 'md' | 'lg'>('md');
  
  viewMode = signal<'numeric' | 'visual' | 'both'>('both');
  
  // Restaurar modo desde localStorage
  // Persistir al cambiar
  
  cycleView() {
    const modes = ['numeric', 'visual', 'both'] as const;
    const current = modes.indexOf(this.viewMode());
    this.viewMode.set(modes[(current + 1) % modes.length]);
  }
}
```

**Uso:**
```html
<app-instrument-container title="Compass" instrumentId="compass">
  <app-heading-instrument numeric />
  <app-compass-widget visual />
</app-instrument-container>
```

### 1.2 Estilo del container

Siguiendo el design system existente (Nord palette, glass morphism, `var(--surface-1)`, `var(--border)`, etc.):

- Tarjeta con borde redondeado, fondo surface-1
- Header con título a la izquierda, botón toggle view a la derecha
- Body con contenido según modo
- En modo `both`: numérico arriba (compacto), visual abajo (protagonista)
- Responsive: en pantallas pequeñas los instrumentos se apilan
- Soporte para tamaños: sm (min-width 160px), md (min-width 220px), lg (min-width 300px)
- Transición suave al cambiar de modo (fade in/out)
- Respetar clases `.compact` del contexto padre

### 1.3 Persistencia del viewMode

```typescript
// Leer al inicializar
const stored = localStorage.getItem(`omi-instrument-view-${instrumentId}`);
if (stored) this.viewMode.set(stored as ViewMode);

// Persistir al cambiar
effect(() => {
  localStorage.setItem(`omi-instrument-view-${this.instrumentId()}`, this.viewMode());
});
```

**Confirmar con el usuario antes de continuar.**

---

## FASE 2: Reconstruir la página de instrumentos

### 2.1 Reescribir `features/instruments/instruments.page.ts`

La nueva página:

```typescript
@Component({
  selector: 'app-instruments-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    InstrumentContainerComponent,
    // Numéricos
    SogInstrumentComponent,
    HeadingInstrumentComponent,
    DepthInstrumentComponent,
    // Visuales
    CompassWidgetComponent,
    DepthGaugeWidgetComponent,
    WindWidgetComponent,
    PowerCardComponent,
    // Nuevos (Fase 6)
    // CogInstrumentComponent,
    // PositionInstrumentComponent,
    // GpsStatusInstrumentComponent,
    // AIS
    AisTargetListComponent,
  ],
  template: `
    <div class="instruments-page">
      <div class="page-header">
        <h1>{{ 'instruments.page.title' | translate }}</h1>
        <p class="subtitle">{{ 'instruments.page.subtitle' | translate }}</p>
      </div>

      <div class="instruments-grid">
        <!-- Cada instrumento en su container dual-view -->
        <app-instrument-container title="Compass" instrumentId="compass">
          <app-heading-instrument numeric />
          <app-compass-widget visual />
        </app-instrument-container>

        <app-instrument-container title="Speed" instrumentId="speed">
          <app-sog-instrument numeric />
          <!-- Visual: por ahora reutilizar numérico, Fase 6 puede añadir gauge -->
          <app-sog-instrument visual />
        </app-instrument-container>

        <app-instrument-container title="Depth" instrumentId="depth">
          <app-depth-instrument numeric />
          <app-depth-gauge-widget visual />
        </app-instrument-container>

        <app-instrument-container title="Wind" instrumentId="wind">
          <!-- Numérico: mostrar AWA + AWS como números -->
          <app-wind-widget numeric />  <!-- Revisar: puede necesitar versión solo numérica -->
          <app-wind-widget visual />
        </app-instrument-container>

        <app-instrument-container title="Power" instrumentId="battery">
          <app-power-card numeric />
          <app-power-card visual />
        </app-instrument-container>
      </div>

      <div class="ais-section">
        <app-ais-target-list ... />
      </div>
    </div>
  `
})
```

### 2.2 Grid responsive

```css
.instruments-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

/* Pantallas grandes: hasta 4 columnas */
@media (min-width: 1200px) {
  .instruments-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Tablet: 2-3 columnas */
@media (min-width: 768px) and (max-width: 1199px) {
  .instruments-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

/* Móvil: 1-2 columnas */
@media (max-width: 767px) {
  .instruments-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
```

### 2.3 Actualizar `InstrumentsFacadeService`

Ampliar para gestionar el modo de vista:

```typescript
export type InstrumentViewMode = 'numeric' | 'visual' | 'both';

export interface InstrumentConfig {
  id: string;
  type: InstrumentWidgetType;
  size: InstrumentWidgetSize;
  visible: boolean;
  viewMode: InstrumentViewMode;  // ← NUEVO
}
```

Alternativamente, el viewMode se puede gestionar por el propio `InstrumentContainerComponent` con localStorage directamente (más simple, menos acoplamiento).

**Confirmar con el usuario antes de continuar.**

---

## FASE 3: Mover configuración del dashboard a Settings

### 3.1 Extractar sección de dashboard widgets

La página `/widgets` tiene dos secciones:
1. **Instruments** (configuración de instrumentos del drawer) → se absorbe en la nueva `/instruments`
2. **Dashboard Widgets** (configuración de qué paneles muestra el dashboard) → mover a `/settings`

### 3.2 Crear componente `DashboardWidgetsSettingsComponent`

Ubicación: `pages/settings/components/dashboard-widgets-settings.component.ts`

Extraer la lógica de la sección "Dashboard Widgets" de la antigua widgets page:
- Lista de widgets del dashboard con toggles de visibilidad
- Drag & drop reordering
- Botón reset
- Usa `LayoutService` para persistir

### 3.3 Añadir a la Settings page

Incluir como nueva sección en la página de settings existente, debajo de las secciones actuales.

**Confirmar con el usuario antes de continuar.**

---

## FASE 4: Eliminar la página widgets

### 4.1 Borrar archivos
- `pages/widgets/widgets.page.ts` — borrar
- `pages/widgets/` — borrar directorio completo

### 4.2 Quitar ruta
En `app.routes.ts`, eliminar:
```typescript
{ path: 'widgets', loadComponent: () => import('./pages/widgets/widgets.page').then(m => m.WidgetsPage), title: 'Widgets' }
```

### 4.3 Quitar del sidenav
En `app-shell.component.html`, eliminar el `<a routerLink="/widgets" ...>` y su SVG.

### 4.4 Limpiar i18n
En `core/i18n/en.ts`:
- Eliminar `nav.widgets`
- Eliminar bloque `widgets: { ... }` (mover lo que sea necesario a `instruments` o `settings`)

**Confirmar con el usuario antes de continuar.**

---

## FASE 5: Actualizar facade e i18n

### 5.1 Actualizar `InstrumentsFacadeService`

- Añadir `viewMode` al modelo `InstrumentWidget`
- Asegurar que los defaults incluyen todos los instrumentos (compass, speed, depth, wind, battery, gps, cog, position)
- Mantener persistencia en localStorage

### 5.2 Actualizar i18n

```typescript
instruments: {
  page: {
    title: 'Instruments',
    subtitle: 'Real-time marine data from connected sensors',
  },
  view: {
    numeric: 'Numeric',
    visual: 'Visual',
    both: 'Both',
  },
  types: {
    compass: 'Compass',
    speed: 'Speed (SOG)',
    depth: 'Depth',
    wind: 'Wind',
    battery: 'Power',
    gps: 'GPS Status',
    cog: 'Course (COG)',
    position: 'Position',
  },
  config: {
    title: 'Configure Instruments',
    reorder: 'Drag to reorder',
    reset: 'Reset Defaults',
  },
},
```

### 5.3 Verificar build
```bash
cd marine-instrumentation-ui
npm run build
npm run lint
```

**Confirmar con el usuario antes de continuar.**

---

## FASE 6: Crear instrumentos faltantes

### 6.1 `CogInstrumentComponent` (numérico)

Ubicación: `ui/instruments/cog/cog-instrument.component.ts`

Igual que `HeadingInstrumentComponent` pero leyendo `PATHS.navigation.courseOverGroundTrue`.
Muestra COG en grados con `formatAngleDegrees`.

### 6.2 `PositionInstrumentComponent` (numérico)

Ubicación: `ui/instruments/position/position-instrument.component.ts`

Lee `PATHS.navigation.position` y muestra lat/lon en formato náutico:
- `41° 23.24' N`
- `002° 10.12' E`

Usar `InstrumentCardComponent` con valor principal = lat, secundario = lon.

### 6.3 `GpsStatusComponent` (numérico)

Ubicación: `ui/instruments/gps-status/gps-status-instrument.component.ts`

Lee `sensors.gps.fix`, `sensors.gps.satellitesInView`, `sensors.gps.horizontalDilution`.
Muestra: "3D Fix · 10 sats · HDOP 0.96" o "No Fix" con calidad correspondiente.

### 6.4 Versiones visuales opcionales

Para la Fase 6 inicial, los instrumentos que no tienen versión visual propia pueden simplemente mostrar el numérico en ambos modos. La versión visual se puede añadir iterativamente:

- **COG visual**: Flecha direccional rotada según COG (SVG simple)
- **Position visual**: Mini mapa con posición (futuro, post-MVP)
- **GPS visual**: Diagrama de satélites (futuro, post-MVP)
- **Speed visual**: Arc gauge semicircular tipo velocímetro (futuro)

**Confirmar con el usuario antes de continuar.**

---

## FASE 7: Verificar y pulir

### 7.1 Checklist funcional

- [ ] La página `/instruments` muestra todos los instrumentos
- [ ] Cada instrumento tiene toggle numérico / visual / ambos
- [ ] El modo de vista se persiste por instrumento (refrescar página y se mantiene)
- [ ] La sección AIS sigue funcionando al final de la página
- [ ] La ruta `/widgets` ya no existe (404 o redirect a /instruments)
- [ ] El sidenav solo tiene "Instruments" (no "Widgets")
- [ ] Los instrumentos del dashboard drawer siguen funcionando en la chart page (no hemos tocado el drawer)
- [ ] La sección de dashboard widgets está en Settings
- [ ] Build limpio: `npm run build && npm run lint`

### 7.2 Responsive check

- [ ] Desktop (>1200px): Grid de 4 columnas
- [ ] Tablet (768-1199px): Grid de 2-3 columnas
- [ ] Móvil (<768px): Grid de 1-2 columnas
- [ ] Touch targets ≥ 48px en el toggle de vista

### 7.3 Temas

- [ ] Day mode: legible, contrastes correctos
- [ ] Night mode: no deslumbra, bordes sutiles

---

## ⚠️ NOTAS IMPORTANTES

### No tocar
- **Dashboard page y sus paneles** — mantener intactos
- **Chart page y su instruments drawer** — mantener intacto (el drawer sigue usando `InstrumentsFacadeService`)
- **DatapointStoreService** — no modificar
- **Signal K client** — no modificar
- **marine-data-contract** — no necesita cambios para esta tarea

### Sobre los componentes existentes
- Los componentes numéricos (`SogInstrumentComponent`, etc.) y los visuales (`CompassWidgetComponent`, etc.) **NO se borran ni modifican**. Se reutilizan dentro del nuevo `InstrumentContainerComponent` via `<ng-content>`.
- Si un instrumento no tiene versión visual diferente a la numérica (ej: SOG por ahora), se puede usar el mismo componente en ambos slots.

### Sobre el `InstrumentsDrawer`
- El drawer de instrumentos en el chart (`InstrumentsDrawerComponent`) sigue existiendo y funciona con su propia lista de widgets via `InstrumentsFacadeService`. **No tocar el drawer**.
- La nueva página de instrumentos es independiente del drawer.

### Sobre persistencia
- La lista de instrumentos y su orden se gestiona en `InstrumentsFacadeService` (ya existente)
- El viewMode (numeric/visual/both) se gestiona por el `InstrumentContainerComponent` via localStorage clave `omi-instrument-view-{id}`
- Ambas persistencias coexisten sin conflicto

---

## 🚫 NO HACER

- **NO borrar componentes de instrumentos** — se reutilizan
- **NO tocar el dashboard** — sus paneles son independientes
- **NO tocar el chart drawer** — funciona con su propia lógica
- **NO modificar el contrato** — no hace falta para esta tarea
- **NO crear componentes desde cero** si ya existen — wrappear con `InstrumentContainerComponent`
- **NO romper el build** — verificar tras cada fase

---

## ✅ CRITERIO DE ÉXITO FINAL

1. ✅ Solo existe una ruta `/instruments` (no hay `/widgets`)
2. ✅ El sidenav tiene "Instruments" sin "Widgets"
3. ✅ Cada instrumento tiene toggle numérico / visual / ambos
4. ✅ El modo de vista se persiste en localStorage
5. ✅ Los instrumentos existentes (SOG, Heading, Depth, Wind, Power) funcionan en dual-view
6. ✅ Instrumentos nuevos (COG, Position, GPS Status) tienen al menos versión numérica
7. ✅ La sección AIS se muestra debajo del grid de instrumentos
8. ✅ La configuración de widgets del dashboard se ha movido a Settings
9. ✅ El dashboard y el chart drawer siguen funcionando sin cambios
10. ✅ Build limpio: `npm run build && npm run lint`
11. ✅ Responsive: funciona en desktop, tablet y móvil
12. ✅ Day/Night mode correctos
