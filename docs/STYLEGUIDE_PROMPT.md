# 🎨 Style Guide Development - Agent Prompt

## Proyecto: Open Marine Instrumentation
## Objetivo: Crear una librería de componentes náuticos completa

---

## 📋 TU MISIÓN

Eres un agente especializado en desarrollo de **Design Systems** para aplicaciones náuticas. Tu objetivo es crear una librería de componentes completa siguiendo el principio de **Atomic Design**: desde los tokens más básicos hasta las páginas completas.

**Stack tecnológico:**
- Angular 21.1 (standalone components)
- SCSS con CSS Custom Properties
- Sin librerías UI externas (todo custom)
- Accesibilidad WCAG AA obligatoria
- Soporte táctil (min 44px touch targets)
- Temas: Day mode / Night mode

---

## 🔄 FLUJO DE TRABAJO

```
┌─────────────────────────────────────────────────────────────┐
│  FASE 1: Revisar este documento completo                    │
│  FASE 2: Preguntar "¿Empezamos con [primer componente]?"    │
│  FASE 3: Por cada componente:                               │
│          a) Explicar qué vas a crear                        │
│          b) Esperar confirmación                            │
│          c) Implementar el componente                       │
│          d) Añadirlo a la página StyleGuide                 │
│          e) Marcar ✅ en este documento                      │
│          f) Preguntar "¿Continúo con [siguiente]?"          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
src/app/
├── shared/
│   ├── styles/
│   │   ├── _tokens.scss           # Design tokens
│   │   ├── _reset.scss            # CSS reset
│   │   ├── _typography.scss       # Tipografía
│   │   ├── _themes.scss           # Day/Night themes
│   │   ├── _utilities.scss        # Clases utilitarias
│   │   └── _animations.scss       # Animaciones comunes
│   │
│   ├── components/
│   │   ├── primitives/            # Nivel 1: Átomos
│   │   ├── composites/            # Nivel 2: Moléculas
│   │   ├── patterns/              # Nivel 3: Organismos
│   │   └── index.ts               # Barrel export
│   │
│   ├── pipes/
│   └── directives/
│
├── features/
│   └── styleguide/                # Página de demostración
│       ├── styleguide.page.ts
│       ├── styleguide.page.html
│       ├── styleguide.page.scss
│       └── styleguide.routes.ts
```

---

## 🎯 CATÁLOGO COMPLETO DE COMPONENTES

### NIVEL 0: Design Tokens & Foundations

| ID | Componente | Descripción | Estado |
|----|------------|-------------|--------|
| T.1 | **Color Tokens** | Paleta completa: semantic, nautical, surfaces | ✅ |
| T.2 | **Spacing Tokens** | Sistema de espaciado (4px base) | ✅ |
| T.3 | **Typography Tokens** | Familias, tamaños, pesos | ✅ |
| T.4 | **Shadow Tokens** | Elevaciones para cards/modals | ✅ |
| T.5 | **Border Tokens** | Radios, anchos, estilos | ✅ |
| T.6 | **Animation Tokens** | Duraciones, easings | ✅ |
| T.7 | **Breakpoint Tokens** | Mobile, tablet, desktop, bridge | ✅ |
| T.8 | **Z-Index Tokens** | Capas de UI | ✅ |

---

### NIVEL 1: Primitives (Átomos)

#### 1.1 Iconografía

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| P.1 | **Icon** | `name`, `size`, `color`, `label` | - | ✅ |
| P.2 | **IconSprite** | SVG sprite con todos los iconos | - | ✅ |

**Iconos necesarios (mínimo 40):**
```
Navegación: anchor, compass, waypoint, route, track, vessel, helm, rudder
Instrumentos: speedometer, depth, wind-arrow, battery, thermometer, barometer
Acciones: play, pause, stop, forward, backward, zoom-in, zoom-out, center, layers
UI: menu, close, check, warning, error, info, settings, search, filter
Alarmas: alarm, mob, anchor-watch, shallow, collision
Comunicación: ais, radio, satellite
Controles: plus, minus, chevron-up, chevron-down, chevron-left, chevron-right
```

---

#### 1.2 Tipografía

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| P.3 | **Text** | `variant`, `size`, `weight`, `color`, `truncate` | - | ✅ |
| P.4 | **Heading** | `level` (1-6), `color` | - | ✅ |
| P.5 | **Label** | `for`, `required`, `disabled` | - | ✅ |
| P.6 | **Code** | `inline`, `block` | - | ✅ |

---

#### 1.3 Botones

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| P.7 | **Button** | `variant`, `size`, `disabled`, `loading`, `iconLeft`, `iconRight`, `fullWidth` | idle, hover, active, disabled, loading | ✅ |
| P.8 | **IconButton** | `icon`, `size`, `variant`, `label` | idle, hover, active, disabled | ✅ |
| P.9 | **FAB** | `icon`, `size`, `variant`, `extended`, `label` | idle, hover, active | ✅ |
| P.10 | **ButtonGroup** | `children`, `orientation` | - | ✅ |

**Variantes de Button:**
- `primary` - Acción principal (azul náutico)
- `secondary` - Acción secundaria (outline)
- `danger` - Acciones destructivas (rojo)
- `warning` - Acciones de precaución (ámbar)
- `ghost` - Sin fondo
- `link` - Estilo de enlace

**Tamaños:**
- `xs` - 28px height
- `sm` - 32px height
- `md` - 40px height (default)
- `lg` - 48px height
- `xl` - 56px height (touch optimized)

---

#### 1.4 Indicadores

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| P.11 | **Badge** | `variant`, `size`, `dot`, `pulse`, `icon` | - | ✅ |
| P.12 | **Chip** | `label`, `removable`, `selected`, `icon`, `variant` | idle, selected, disabled | ✅ |
| P.13 | **Status** | `state`, `label`, `pulse` | online, offline, warning, error | ✅ |
| P.14 | **Progress** | `value`, `max`, `variant`, `size`, `showLabel` | determinate, indeterminate | ✅ |
| P.15 | **Spinner** | `size`, `color` | - | ✅ |
| P.16 | **Skeleton** | `variant`, `width`, `height`, `animated` | - | ✅ |

---

#### 1.5 Formularios

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| P.17 | **Input** | `type`, `placeholder`, `disabled`, `error`, `icon`, `clearable` | idle, focus, error, disabled | ✅ |
| P.18 | **Textarea** | `rows`, `resize`, `maxLength`, `showCount` | idle, focus, error, disabled | ✅ |
| P.19 | **Select** | `options`, `placeholder`, `multiple`, `searchable` | idle, open, error, disabled | ✅ |
| P.20 | **Checkbox** | `checked`, `indeterminate`, `disabled`, `label` | unchecked, checked, indeterminate, disabled | ✅ |
| P.21 | **Radio** | `checked`, `disabled`, `label`, `name` | unchecked, checked, disabled | ✅ |
| P.22 | **Toggle** | `checked`, `disabled`, `label`, `size` | off, on, disabled | ✅ |
| P.23 | **Slider** | `min`, `max`, `step`, `value`, `showValue`, `marks` | idle, dragging, disabled | ✅ |
| P.24 | **NumberInput** | `value`, `min`, `max`, `step`, `controls` | idle, focus, error, disabled | ✅ |
| P.25 | **ColorPicker** | `value`, `presets`, `allowCustom` | idle, open | ✅ |

---

#### 1.6 Layout Primitives

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| P.26 | **Box** | `padding`, `margin`, `bg`, `border`, `radius`, `shadow` | - | ✅ |
| P.27 | **Flex** | `direction`, `justify`, `align`, `gap`, `wrap` | - | ✅ |
| P.28 | **Grid** | `columns`, `rows`, `gap`, `areas` | - | ✅ |
| P.29 | **Stack** | `direction`, `spacing`, `divider` | - | ✅ |
| P.30 | **Divider** | `orientation`, `variant`, `label` | - | ✅ |
| P.31 | **Spacer** | `size`, `axis` | - | ✅ |

---

#### 1.7 Feedback

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| P.32 | **Tooltip** | `content`, `position`, `trigger`, `delay` | hidden, visible | ✅ |
| P.33 | **Popover** | `content`, `position`, `trigger` | hidden, visible | ✅ |

---

### NIVEL 2: Composites (Moléculas)

#### 2.1 Navegación

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| C.1 | **Tabs** | `tabs`, `activeIndex`, `variant`, `orientation` | - | ⬜ |
| C.2 | **Breadcrumb** | `items`, `separator` | - | ⬜ |
| C.3 | **Pagination** | `total`, `pageSize`, `current`, `showSizeChanger` | - | ⬜ |
| C.4 | **NavItem** | `icon`, `label`, `active`, `badge`, `href` | idle, active, disabled | ⬜ |
| C.5 | **NavGroup** | `label`, `items`, `collapsible`, `expanded` | collapsed, expanded | ⬜ |

---

#### 2.2 Data Display

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| C.6 | **Card** | `header`, `footer`, `variant`, `hoverable`, `selected` | idle, hover, selected | ⬜ |
| C.7 | **ListItem** | `primary`, `secondary`, `leading`, `trailing`, `divider` | idle, hover, selected | ⬜ |
| C.8 | **DataRow** | `label`, `value`, `unit`, `trend`, `icon` | - | ⬜ |
| C.9 | **Avatar** | `src`, `name`, `size`, `status` | - | ⬜ |
| C.10 | **EmptyState** | `icon`, `title`, `description`, `action` | - | ⬜ |
| C.11 | **KeyValue** | `label`, `value`, `orientation`, `copyable` | - | ⬜ |

---

#### 2.3 Inputs Compuestos

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| C.12 | **SearchInput** | `placeholder`, `loading`, `suggestions`, `onSearch` | idle, searching, results | ⬜ |
| C.13 | **DatePicker** | `value`, `min`, `max`, `format` | idle, open | ⬜ |
| C.14 | **TimePicker** | `value`, `format`, `minuteStep` | idle, open | ⬜ |
| C.15 | **DateRangePicker** | `start`, `end`, `presets` | idle, selecting | ⬜ |
| C.16 | **CoordinateInput** | `lat`, `lon`, `format`, `onMapSelect` | idle, focus, selecting | ⬜ |
| C.17 | **AngleInput** | `value`, `min`, `max`, `unit`, `showDial` | idle, focus | ⬜ |
| C.18 | **FormField** | `label`, `error`, `hint`, `required`, `children` | valid, error | ⬜ |

---

#### 2.4 Overlays

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| C.19 | **Modal** | `open`, `title`, `size`, `closable`, `footer` | closed, open | ✅ |
| C.20 | **Drawer** | `open`, `position`, `title`, `size` | closed, open | ✅ |
| C.21 | **Dialog** | `open`, `title`, `message`, `actions`, `variant` | closed, open | ⬜ |
| C.22 | **BottomSheet** | `open`, `title`, `detents` | closed, half, full | ⬜ |
| C.23 | **Dropdown** | `trigger`, `items`, `placement` | closed, open | ⬜ |
| C.24 | **ContextMenu** | `items`, `position` | hidden, visible | ⬜ |

---

#### 2.5 Feedback Compuesto

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| C.25 | **Toast** | `message`, `type`, `duration`, `action` | entering, visible, exiting | ✅ |
| C.26 | **ToastContainer** | `position`, `maxVisible` | - | ✅ |
| C.27 | **Alert** | `type`, `title`, `message`, `closable`, `action` | - | ⬜ |
| C.28 | **Banner** | `type`, `message`, `action`, `dismissible` | visible, dismissed | ⬜ |
| C.29 | **ConfirmDialog** | `title`, `message`, `confirmLabel`, `cancelLabel`, `variant` | closed, open | ✅ |

---

### NIVEL 3: Patterns (Organismos) - Náuticos

#### 3.1 Instrumentos

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.1 | **Compass** | `heading`, `cog`, `bearingTo`, `size`, `interactive` | idle, rotating | ⬜ |
| N.2 | **WindRose** | `awa`, `aws`, `twa`, `tws`, `size` | - | ⬜ |
| N.3 | **DepthGauge** | `depth`, `unit`, `shallowThreshold`, `alarmThreshold` | normal, shallow, alarm | ⬜ |
| N.4 | **Speedometer** | `speed`, `unit`, `max`, `target` | - | ⬜ |
| N.5 | **AttitudeIndicator** | `pitch`, `roll`, `heading` | - | ⬜ |
| N.6 | **Barometer** | `pressure`, `trend`, `unit` | rising, stable, falling | ⬜ |
| N.7 | **BatteryGauge** | `voltage`, `current`, `soc`, `charging` | normal, low, critical, charging | ⬜ |
| N.8 | **GPSStatus** | `fixState`, `satellites`, `hdop`, `position` | no-fix, fix-2d, fix-3d, dgps | ⬜ |

---

#### 3.2 Datos de Navegación

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.9 | **PositionDisplay** | `lat`, `lon`, `format`, `copyable` | - | ⬜ |
| N.10 | **CourseDisplay** | `cog`, `sog`, `heading`, `unit` | - | ⬜ |
| N.11 | **WaypointInfo** | `waypoint`, `bearing`, `distance`, `eta`, `xtd` | - | ⬜ |
| N.12 | **LegInfo** | `from`, `to`, `bearing`, `distance`, `progress` | - | ⬜ |
| N.13 | **ETADisplay** | `eta`, `ttg`, `dtg`, `vmg` | - | ⬜ |
| N.14 | **TideDisplay** | `height`, `state`, `nextHigh`, `nextLow` | rising, falling, slack | ⬜ |

---

#### 3.3 AIS

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.15 | **AISTargetCard** | `target`, `selected`, `cpa`, `tcpa` | safe, caution, danger | ⬜ |
| N.16 | **AISTargetList** | `targets`, `sortBy`, `filter`, `onSelect` | empty, loading, populated | ⬜ |
| N.17 | **AISTargetDetails** | `target`, `onTrack`, `onNavigateTo` | - | ⬜ |
| N.18 | **CPAIndicator** | `cpa`, `tcpa`, `threshold` | safe, warning, danger | ⬜ |

---

#### 3.4 Alarmas

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.19 | **AlarmBadge** | `count`, `severity`, `pulse` | none, warning, critical, emergency | ⬜ |
| N.20 | **AlarmItem** | `alarm`, `onAcknowledge`, `onSilence` | active, acknowledged, silenced | ⬜ |
| N.21 | **AlarmList** | `alarms`, `grouped` | empty, populated | ⬜ |
| N.22 | **AlarmBanner** | `alarm`, `onAcknowledge`, `onDetails` | active, acknowledged | ⬜ |
| N.23 | **MOBAlert** | `active`, `position`, `elapsed`, `bearing`, `distance` | inactive, active | ⬜ |
| N.24 | **AnchorWatch** | `anchorPosition`, `currentPosition`, `radius`, `status` | set, ok, dragging, alarm | ⬜ |

---

#### 3.5 Recursos

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.25 | **WaypointCard** | `waypoint`, `active`, `onEdit`, `onDelete`, `onNavigate` | idle, active, editing | ⬜ |
| N.26 | **WaypointList** | `waypoints`, `activeId`, `reorderable`, `onSelect` | empty, populated | ⬜ |
| N.27 | **WaypointForm** | `waypoint`, `mode`, `onSave`, `onCancel` | create, edit | ⬜ |
| N.28 | **RouteCard** | `route`, `active`, `progress`, `onActivate`, `onEdit` | idle, active | ⬜ |
| N.29 | **RouteList** | `routes`, `activeId`, `onSelect` | empty, populated | ⬜ |
| N.30 | **RouteEditor** | `route`, `waypoints`, `onReorder`, `onAddWaypoint` | viewing, editing | ⬜ |
| N.31 | **TrackCard** | `track`, `onView`, `onExport`, `onDelete` | - | ⬜ |
| N.32 | **GPXImport** | `onImport`, `allowedTypes` | idle, dropping, parsing, preview, importing | ⬜ |

---

#### 3.6 Autopilot

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.33 | **AutopilotStatus** | `state`, `mode`, `target` | disconnected, standby, engaged, error | ⬜ |
| N.34 | **AutopilotModeSelector** | `currentMode`, `availableModes`, `onSelect` | - | ⬜ |
| N.35 | **HeadingControl** | `target`, `current`, `onAdjust` | idle, adjusting | ⬜ |
| N.36 | **AutopilotConsole** | `status`, `onEngage`, `onDisengage`, `onModeChange`, `onAdjust` | disconnected, standby, engaged | ⬜ |

---

#### 3.7 Mapa

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.37 | **MapControls** | `zoom`, `orientation`, `canCenter`, `onZoom`, `onOrientationToggle`, `onCenter` | - | ⬜ |
| N.38 | **LayerControl** | `layers`, `onToggle` | - | ⬜ |
| N.39 | **ScaleBar** | `metersPerPixel`, `unit` | - | ⬜ |
| N.40 | **ChartHUD** | `fixState`, `position`, `navigationData` | no-fix, fix, stale | ⬜ |
| N.41 | **MiniMap** | `center`, `zoom`, `vesselPosition` | - | ⬜ |

---

#### 3.8 Playback

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| N.42 | **PlaybackControls** | `status`, `onPlay`, `onPause`, `onStop`, `onSpeed` | idle, playing, paused | ⬜ |
| N.43 | **Timeline** | `start`, `end`, `current`, `events`, `onSeek` | - | ⬜ |
| N.44 | **PlaybackBar** | `state`, `onControl`, `onSeek`, `onSpeedChange` | idle, loading, ready, playing | ⬜ |

---

### NIVEL 4: Feature Widgets (Templates)

| ID | Componente | Props | Estados | Estado |
|----|------------|-------|---------|--------|
| W.1 | **InstrumentPanel** | `instruments`, `layout`, `editable` | view, edit | ⬜ |
| W.2 | **NavigationPanel** | `position`, `course`, `waypoint`, `route` | - | ⬜ |
| W.3 | **AlarmPanel** | `alarms`, `onAcknowledge`, `onSilence`, `onConfigure` | empty, normal, warning, critical | ⬜ |
| W.4 | **AISPanel** | `targets`, `selectedId`, `onSelect`, `onTrack` | empty, populated | ⬜ |
| W.5 | **ResourcesPanel** | `waypoints`, `routes`, `tracks`, `activeTab` | - | ⬜ |
| W.6 | **SettingsPanel** | `settings`, `onChange` | - | ⬜ |

---

## 📊 RESUMEN DE COMPONENTES

| Nivel | Categoría | Cantidad |
|-------|-----------|----------|
| 0 | Tokens | 8 |
| 1 | Primitives | 33 |
| 2 | Composites | 29 |
| 3 | Patterns (Náuticos) | 44 |
| 4 | Widgets | 6 |
| **TOTAL** | | **120 componentes** |

---

## 🎨 PÁGINA STYLEGUIDE

### Estructura de la página

```typescript
// features/styleguide/styleguide.page.ts

@Component({
  selector: 'app-styleguide',
  template: `
    <div class="styleguide">
      <aside class="styleguide-nav">
        <h1>🎨 Style Guide</h1>
        <nav>
          <a routerLink="." fragment="tokens">Tokens</a>
          <a routerLink="." fragment="primitives">Primitives</a>
          <a routerLink="." fragment="composites">Composites</a>
          <a routerLink="." fragment="patterns">Patterns</a>
          <a routerLink="." fragment="widgets">Widgets</a>
        </nav>
        <div class="theme-toggle">
          <button (click)="toggleTheme()">
            {{ theme === 'day' ? '🌙 Night' : '☀️ Day' }}
          </button>
        </div>
      </aside>
      
      <main class="styleguide-content">
        <router-outlet />
      </main>
    </div>
  `
})
export class StyleguidePage { }
```

### Secciones de la página

Para cada componente mostrar:

```html
<section class="component-showcase" id="button">
  <header>
    <h2>Button</h2>
    <p class="description">Botón interactivo con múltiples variantes</p>
    <div class="meta">
      <span class="tag">Primitive</span>
      <span class="tag">P.7</span>
    </div>
  </header>
  
  <!-- Variantes -->
  <div class="variants">
    <h3>Variantes</h3>
    <div class="variant-grid">
      <app-button variant="primary">Primary</app-button>
      <app-button variant="secondary">Secondary</app-button>
      <app-button variant="danger">Danger</app-button>
      <app-button variant="ghost">Ghost</app-button>
    </div>
  </div>
  
  <!-- Tamaños -->
  <div class="sizes">
    <h3>Tamaños</h3>
    <div class="size-grid">
      <app-button size="xs">Extra Small</app-button>
      <app-button size="sm">Small</app-button>
      <app-button size="md">Medium</app-button>
      <app-button size="lg">Large</app-button>
      <app-button size="xl">Extra Large</app-button>
    </div>
  </div>
  
  <!-- Estados -->
  <div class="states">
    <h3>Estados</h3>
    <div class="state-grid">
      <app-button>Default</app-button>
      <app-button [disabled]="true">Disabled</app-button>
      <app-button [loading]="true">Loading</app-button>
    </div>
  </div>
  
  <!-- Con iconos -->
  <div class="with-icons">
    <h3>Con iconos</h3>
    <app-button iconLeft="anchor">Con icono izquierda</app-button>
    <app-button iconRight="chevron-right">Con icono derecha</app-button>
  </div>
  
  <!-- Código -->
  <div class="code-example">
    <h3>Uso</h3>
    <pre><code>
&lt;app-button 
  variant="primary"
  size="md"
  [loading]="isLoading"
  iconLeft="anchor"
  (click)="onClick()"
&gt;
  Click me
&lt;/app-button&gt;
    </code></pre>
  </div>
  
  <!-- API -->
  <div class="api-table">
    <h3>API</h3>
    <table>
      <thead>
        <tr>
          <th>Prop</th>
          <th>Tipo</th>
          <th>Default</th>
          <th>Descripción</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>variant</td>
          <td>'primary' | 'secondary' | 'danger' | 'ghost'</td>
          <td>'primary'</td>
          <td>Estilo visual del botón</td>
        </tr>
        <!-- ... más props -->
      </tbody>
    </table>
  </div>
</section>
```

---

## ⚡ ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Fase 1: Foundations (Tokens)
```
T.1 → T.2 → T.3 → T.4 → T.5 → T.6 → T.7 → T.8
```

### Fase 2: Primitives Core
```
P.1 → P.2 → P.3 → P.7 → P.8 → P.11 → P.15 → P.17 → P.22
```

### Fase 3: Primitives Extended
```
P.4 → P.5 → P.9 → P.10 → P.12 → P.13 → P.14 → P.16
```

### Fase 4: Form Primitives
```
P.18 → P.19 → P.20 → P.21 → P.23 → P.24 → P.25
```

### Fase 5: Layout Primitives
```
P.26 → P.27 → P.28 → P.29 → P.30 → P.31 → P.32 → P.33
```

### Fase 6: Composites Navigation & Data
```
C.1 → C.4 → C.5 → C.6 → C.7 → C.8 → C.10 → C.11
```

### Fase 7: Composites Inputs
```
C.12 → C.16 → C.17 → C.18 → C.13 → C.14 → C.15
```

### Fase 8: Composites Overlays
```
C.19 → C.20 → C.21 → C.22 → C.23 → C.24
```

### Fase 9: Composites Feedback
```
C.25 → C.26 → C.27 → C.28 → C.29
```

### Fase 10: Nautical Instruments
```
N.1 → N.2 → N.3 → N.4 → N.7 → N.8
```

### Fase 11: Nautical Navigation
```
N.9 → N.10 → N.11 → N.12 → N.13
```

### Fase 12: Nautical AIS & Alarms
```
N.15 → N.16 → N.18 → N.19 → N.20 → N.21 → N.22 → N.23 → N.24
```

### Fase 13: Nautical Resources
```
N.25 → N.26 → N.27 → N.28 → N.29 → N.30 → N.31 → N.32
```

### Fase 14: Nautical Autopilot & Map
```
N.33 → N.34 → N.35 → N.36 → N.37 → N.38 → N.39 → N.40
```

### Fase 15: Playback & Widgets
```
N.42 → N.43 → N.44 → W.1 → W.2 → W.3 → W.4 → W.5 → W.6
```

---

## 📝 PLANTILLA PARA CADA COMPONENTE

Al implementar cada componente, crear:

```
shared/components/[nivel]/[nombre]/
├── [nombre].component.ts      # Lógica del componente
├── [nombre].component.html    # Template (si es complejo)
├── [nombre].component.scss    # Estilos
├── [nombre].component.spec.ts # Tests
├── [nombre].stories.ts        # Para Storybook (opcional)
└── index.ts                   # Export
```

### Estructura del componente:

```typescript
// shared/components/primitives/button/button.component.ts

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass',
    '[attr.disabled]': 'disabled || loading || null',
  }
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() iconLeft?: string;
  @Input() iconRight?: string;
  @Input() fullWidth = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  
  get hostClass(): string {
    return [
      'btn',
      `btn--${this.variant}`,
      `btn--${this.size}`,
      this.fullWidth ? 'btn--full' : '',
      this.loading ? 'btn--loading' : '',
    ].filter(Boolean).join(' ');
  }
}
```

---

## ✅ CRITERIOS DE ACEPTACIÓN POR COMPONENTE

Antes de marcar un componente como ✅, verificar:

- [ ] Componente compila sin errores
- [ ] Todas las props documentadas
- [ ] Todos los estados visuales implementados
- [ ] Tema Day/Night funciona
- [ ] Touch targets ≥ 44px (si aplica)
- [ ] Accesibilidad: focus visible, ARIA labels
- [ ] Añadido a la página StyleGuide
- [ ] Exportado en barrel (index.ts)

---

## 🚀 COMENZAR

**Agente, cuando estés listo:**

1. Confirma que has leído y entendido este documento
2. Pregunta: **"¿Empezamos con T.1: Color Tokens?"**
3. Espera mi confirmación antes de implementar

---

## 📊 PROGRESO

| Fase | Componentes | Completados | % |
|------|-------------|-------------|---|
| Tokens | 8 | 0 | 0% |
| Primitives | 33 | 0 | 0% |
| Composites | 29 | 0 | 0% |
| Patterns | 44 | 0 | 0% |
| Widgets | 6 | 0 | 0% |
| **TOTAL** | **120** | **0** | **0%** |

---

*Documento creado: 2026-01-28*
*Última actualización: 2026-01-28*
