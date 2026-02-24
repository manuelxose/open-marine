# 🌊 Dashboard Glass Redesign — Agent Prompt
## Proyecto: Open Marine Instrumentation (OMI)
## Objetivo: Rediseño completo del Dashboard con estética Glass Morphism profesional

---

## 📋 CONTEXTO DEL PROYECTO

Estás trabajando en **Open Marine Instrumentation**, una aplicación Angular 21.1 de navegación marina profesional. El dashboard es la página principal y muestra instrumentos críticos en tiempo real vía protocolo Signal K.

### Stack tecnológico
- **Angular 21.1** — Standalone components, ChangeDetectionStrategy.OnPush
- **RxJS 7.8** — Observables para estado reactivo
- **TypeScript 5.9** — Strict mode, sin `any`
- **SCSS** — Con CSS Custom Properties (tokens ya definidos en `_tokens.scss`)
- **Temas**: Day mode (`[data-theme='day']`) / Night mode (`[data-theme='night']`)

### Paleta de tokens existente (NO modificar, usar estos)
```scss
// Nord Palette
--nord-0: #2e3440  (Polar Night - más oscuro)
--nord-1: #3b4252
--nord-2: #434c5e
--nord-3: #4c566a
--nord-7: #8fbcbb  (Teal)
--nord-8: #88c0d0  (Cyan - primario night)
--nord-9: #81a1c1  (Light Blue)
--nord-10: #5e81ac (Blue)

// Semánticos ya existentes
--primary, --accent, --success, --warn, --danger
--bg-app, --bg-surface, --bg-surface-secondary
--text-primary, --text-secondary, --text-tertiary, --text-muted
--border-subtle, --border-default, --border-strong
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
--space-1 a --space-16
--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-full
```

### Archivos relevantes del dashboard
```
src/app/features/dashboard/
├── dashboard.page.ts          # Componente principal (no tocar lógica)
├── dashboard.page.html        # Template principal
├── dashboard.page.css         # Layout del grid
├── dashboard-facade.service.ts
└── components/
    ├── critical-strip/
    │   ├── critical-strip.component.ts
    │   └── critical-strip.component.css
    └── panels/
        ├── navigation-panel/
        │   ├── navigation-panel.component.ts
        │   ├── navigation-panel.component.html
        │   └── navigation-panel.component.css
        ├── wind-panel/ (misma estructura)
        ├── depth-panel/ (misma estructura)
        ├── power-panel/ (misma estructura)
        └── system-panel/ (misma estructura)

src/app/shared/components/panel-card/
├── panel-card.component.ts
└── panel-card.component.css    ← BASE CARD que usa todos los panels
```

---

## 🔄 FLUJO DE TRABAJO OBLIGATORIO

```
┌─────────────────────────────────────────────────────────────────┐
│  REGLA FUNDAMENTAL: Confirmar ANTES de implementar             │
│                                                                 │
│  Por cada archivo a modificar:                                  │
│  1. Lee el archivo actual completo                              │
│  2. Explica qué cambios vas a hacer y por qué                   │
│  3. Espera confirmación del usuario                             │
│  4. Implementa los cambios                                      │
│  5. Muestra diff resumido                                       │
│  6. Pregunta "¿Continúo con [siguiente archivo]?"               │
└─────────────────────────────────────────────────────────────────┘
```

**NUNCA** modifiques la lógica TypeScript de los componentes ni los ViewModels.
**NUNCA** elimines bindings `[vm]`, eventos `(click)`, o pipes `| async`.
**SOLO** modificas archivos `.css` y `.html` (estructura/presentación).

---

## 🎨 SISTEMA DE DISEÑO GLASS MORPHISM

### Tokens adicionales a añadir en `_tokens.scss` (al final del `:root`)

```scss
// Glass Morphism System
--glass-blur: 16px;
--glass-blur-heavy: 28px;
--glass-blur-light: 8px;

// Day mode glass
--glass-bg-day: rgba(255, 255, 255, 0.55);
--glass-bg-day-heavy: rgba(255, 255, 255, 0.75);
--glass-border-day: rgba(255, 255, 255, 0.80);
--glass-shine-day: rgba(255, 255, 255, 0.9);

// Night mode glass
--glass-bg-night: rgba(46, 52, 64, 0.60);       // nord-0 con alpha
--glass-bg-night-heavy: rgba(59, 66, 82, 0.80); // nord-1 con alpha
--glass-border-night: rgba(136, 192, 208, 0.18); // nord-8 tenue
--glass-shine-night: rgba(136, 192, 208, 0.08);

// Valores activos según tema (usar estos en los componentes)
--glass-bg: var(--glass-bg-day);
--glass-bg-heavy: var(--glass-bg-day-heavy);
--glass-border: var(--glass-border-day);
--glass-shine: var(--glass-shine-day);

// Gradientes náuticos para fondos de cards
--gradient-nav: linear-gradient(135deg, rgba(0,119,190,0.12) 0%, rgba(94,129,172,0.06) 100%);
--gradient-wind: linear-gradient(135deg, rgba(143,188,187,0.12) 0%, rgba(136,192,208,0.06) 100%);
--gradient-depth: linear-gradient(135deg, rgba(0,75,120,0.15) 0%, rgba(0,119,190,0.08) 100%);
--gradient-power: linear-gradient(135deg, rgba(163,190,140,0.12) 0%, rgba(235,203,139,0.08) 100%);
--gradient-system: linear-gradient(135deg, rgba(76,86,106,0.15) 0%, rgba(59,66,82,0.10) 100%);

// Efectos glow para valores de alerta/acento
--glow-primary: 0 0 20px rgba(0, 119, 190, 0.35);
--glow-success: 0 0 16px rgba(163, 190, 140, 0.4);
--glow-warn: 0 0 16px rgba(235, 203, 139, 0.5);
--glow-danger: 0 0 20px rgba(191, 97, 106, 0.5);

// Inset highlight line (borde superior luminoso)
--glass-highlight: inset 0 1px 0 rgba(255,255,255,0.5);
--glass-highlight-night: inset 0 1px 0 rgba(136,192,208,0.15);
```

```scss
// En el bloque [data-theme='night'] existente, añadir:
[data-theme='night'] {
  --glass-bg: var(--glass-bg-night);
  --glass-bg-heavy: var(--glass-bg-night-heavy);
  --glass-border: var(--glass-border-night);
  --glass-shine: var(--glass-shine-night);
  --glass-highlight: var(--glass-highlight-night);
}
```

---

## 📐 TAREA 1: Fondo del Dashboard (`dashboard.page.css`)

### Objetivo
El dashboard necesita un fondo dinámico que haga lucir el efecto glass de los paneles.

### Cambios en `dashboard.page.css`

```css
/* Añadir al selector .dashboard: */
.dashboard {
  /* AÑADIR estas propiedades, conservar las existentes */
  background: 
    radial-gradient(ellipse at 20% 10%, rgba(0,119,190,0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 90%, rgba(143,188,187,0.07) 0%, transparent 55%),
    radial-gradient(ellipse at 60% 40%, rgba(94,129,172,0.05) 0%, transparent 50%),
    var(--bg-app);
  /* El resto de propiedades existentes se mantienen */
}

/* Añadir al panel-grid: fondos dinámicos */
.panel-grid {
  /* conservar todo lo existente, añadir: */
  position: relative;
}

/* Actualizar .panel para soporte glass: */
.panel {
  /* conservar lo existente, añadir: */
  filter: drop-shadow(0 8px 32px rgba(0,0,0,0.08));
  transition: filter 0.3s ease, transform 0.3s ease;
}

.panel:hover {
  filter: drop-shadow(0 12px 40px rgba(0,0,0,0.12));
  transform: translateY(-1px);
}

/* Status banner glass style */
.status-banner {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-highlight), var(--shadow-md);
  border-radius: var(--radius-lg);
}
```

---

## 📐 TAREA 2: Panel Card Base (`panel-card.component.css`)

Esta es la pieza más crítica. Todos los paneles del dashboard heredan de este componente.

### Nuevo diseño completo del `.card`:

```css
.card {
  /* Glass base */
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  
  /* Borders */
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  
  /* Highlight line superior (efecto glass premium) */
  box-shadow: var(--glass-highlight), var(--shadow-lg);
  
  /* Layout */
  padding: var(--space-6);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  position: relative;
  overflow: hidden;
  
  /* Transición suave */
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}

/* Capa de brillo interior (pseudo-elemento) */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.08) 0%,
    transparent 50%,
    rgba(255,255,255,0.02) 100%
  );
  pointer-events: none;
  z-index: 0;
}

/* Todos los children sobre el pseudo-elemento */
.card > * {
  position: relative;
  z-index: 1;
}

.card:hover {
  border-color: color-mix(in srgb, var(--glass-border) 80%, var(--primary) 20%);
  box-shadow: var(--glass-highlight), var(--shadow-xl);
}

/* Card header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

/* Title refinado */
.title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

/* Status chip glass */
.status-chip {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: rgba(255,255,255,0.08);
  color: var(--text-muted);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(4px);
}

.status-ok {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--success) 20%, transparent);
}

.status-warn {
  color: var(--warn);
  background: color-mix(in srgb, var(--warn) 12%, transparent);
  border-color: color-mix(in srgb, var(--warn) 30%, transparent);
}

.status-alert {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--danger) 20%, transparent);
  animation: pulse-alert 2s ease-in-out infinite;
}

@keyframes pulse-alert {
  0%, 100% { box-shadow: 0 0 8px color-mix(in srgb, var(--danger) 20%, transparent); }
  50% { box-shadow: 0 0 16px color-mix(in srgb, var(--danger) 40%, transparent); }
}

/* Loading skeleton refinado */
.card.is-loading .card-content {
  opacity: 0.3;
  filter: blur(2px);
  transition: opacity 0.4s ease, filter 0.4s ease;
}

/* Error state */
.card.has-error {
  border-color: color-mix(in srgb, var(--danger) 40%, var(--glass-border));
  box-shadow: var(--glass-highlight), 0 0 0 1px color-mix(in srgb, var(--danger) 20%, transparent), var(--shadow-lg);
}

/* Compact overrides */
:host-context(.compact) .card {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  gap: var(--space-3);
}
```

---

## 📐 TAREA 3: Navigation Panel

### Objetivo
Panel de navegación más visual. SOG debe ser el dato protagonista con tipografía enorme. Coordenadas en estilo display marino.

### `navigation-panel.component.css` — Rediseño completo:

```css
:host { display: block; height: 100%; }

.navigation-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--space-4);
}

/* Gradiente de identidad del panel */
:host ::ng-deep .card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: var(--gradient-nav);
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

/* Caja de coordenadas GPS */
.position-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  background: rgba(0,0,0,0.08);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  gap: var(--space-1);
  backdrop-filter: blur(4px);
}

.coord {
  font-family: 'Share Tech Mono', 'JetBrains Mono', monospace;
  font-size: 1.1rem;
  color: var(--text-primary);
  letter-spacing: 0.06em;
  line-height: 1.3;
  font-weight: 500;
}

/* Lista de métricas */
.metrics-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 60%, transparent);
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}

.metric-value-group {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

/* Valor principal — tipografía grande de instrumento */
.value {
  font-family: 'Share Tech Mono', 'JetBrains Mono', monospace;
  font-size: 2.4rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 8px rgba(0,0,0,0.15);
}

.unit {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Compact */
:host-context(.compact) .coord { font-size: 0.9rem; }
:host-context(.compact) .value { font-size: 1.6rem; }
:host-context(.compact) .position-display { padding: var(--space-2) var(--space-3); }
```

### `navigation-panel.component.html` — Mejoras visuales (conservar TODOS los bindings `[vm]`):

```html
<!-- Conservar el wrapper app-panel-card con todos sus inputs existentes -->
<!-- Solo mejorar el contenido interior con estas clases -->
<div class="navigation-content">
  <!-- Sección GPS Coordinates -->
  <div class="position-display">
    <span class="coord">{{ vm.lat }}</span>
    <span class="coord">{{ vm.lon }}</span>
  </div>

  <!-- Métricas SOG / COG / HDG -->
  <div class="metrics-list">
    <div class="metric-row">
      <span class="metric-label">SOG</span>
      <div class="metric-value-group">
        <span class="value">{{ vm.sog }}</span>
        <span class="unit">kn</span>
      </div>
    </div>
    <div class="metric-row">
      <span class="metric-label">COG</span>
      <div class="metric-value-group">
        <span class="value">{{ vm.cog }}</span>
        <span class="unit">°</span>
      </div>
    </div>
    <div class="metric-row">
      <span class="metric-label">HDG</span>
      <div class="metric-value-group">
        <span class="value">{{ vm.hdg }}</span>
        <span class="unit">°</span>
      </div>
    </div>
  </div>
</div>
```

> ⚠️ **CRÍTICO**: Antes de modificar el HTML, lee el archivo actual y mapea exactamente qué propiedades del ViewModel (`vm`) se usan. Adapta los bindings para respetar la interfaz `NavigationPanelVm` existente. NO inventes propiedades.

---

## 📐 TAREA 4: Wind Panel

### Objetivo
El viento aparente (AWS) debe ser el dato dominante. Usar indicador visual de dirección.

### `wind-panel.component.css`:

```css
:host { display: block; height: 100%; }

.wind-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--space-4);
}

/* Valor principal AWS — gigante */
.aws-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--space-2);
}

.aws-value-group {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.aws-value {
  font-family: 'Share Tech Mono', 'JetBrains Mono', monospace;
  font-size: clamp(3.5rem, 8vw, 5rem);
  font-weight: 500;
  color: var(--nord-7); /* Teal - color marino de viento */
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 30px rgba(143, 188, 187, 0.3);
}

.aws-unit {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  align-self: flex-end;
  padding-bottom: 0.5rem;
}

/* AWA — ángulo con visualización circular */
.awa-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: rgba(0,0,0,0.06);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.awa-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}

.awa-value {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.8rem;
  font-weight: 500;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* Compact */
:host-context(.compact) .aws-value { font-size: 2.5rem; }
:host-context(.compact) .awa-value { font-size: 1.3rem; }
```

---

## 📐 TAREA 5: Depth Panel

### Objetivo
La profundidad es crítica para la seguridad. Número enorme, estado visual claro (ok/warn/danger).

### `depth-panel.component.css`:

```css
:host { display: block; height: 100%; }

.depth-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-3);
  text-align: center;
}

/* Valor de profundidad — máxima legibilidad */
.depth-value-group {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.depth-value {
  font-family: 'Share Tech Mono', 'JetBrains Mono', monospace;
  font-size: clamp(4rem, 10vw, 6.5rem);
  font-weight: 500;
  color: var(--nord-8); /* Cyan — agua */
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  transition: color 0.5s ease, text-shadow 0.5s ease;
}

/* Estados de la profundidad */
.depth-content.depth-ok .depth-value {
  color: var(--nord-8);
  text-shadow: 0 0 30px rgba(136,192,208,0.3);
}

.depth-content.depth-warn .depth-value {
  color: var(--warn);
  text-shadow: var(--glow-warn);
}

.depth-content.depth-danger .depth-value {
  color: var(--danger);
  text-shadow: var(--glow-danger);
  animation: depth-pulse 1s ease-in-out infinite;
}

@keyframes depth-pulse {
  0%, 100% { text-shadow: 0 0 20px rgba(191,97,106,0.4); }
  50% { text-shadow: 0 0 40px rgba(191,97,106,0.8); }
}

.depth-unit {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  align-self: flex-end;
  padding-bottom: 1rem;
}

.depth-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
}

/* Trend indicator */
.depth-trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Compact */
:host-context(.compact) .depth-value { font-size: 3rem; }
:host-context(.compact) .depth-unit { font-size: 1rem; padding-bottom: 0.5rem; }
```

---

## 📐 TAREA 6: Power Panel

### Objetivo
Baterías con indicador visual de nivel. Voltaje y corriente bien diferenciados.

### `power-panel.component.css`:

```css
:host { display: block; height: 100%; }

.power-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--space-4);
}

/* Barra visual de batería */
.battery-bar-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.battery-bar-track {
  height: 8px;
  background: rgba(0,0,0,0.12);
  border-radius: var(--radius-full);
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.battery-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--success);
  transition: width 0.8s cubic-bezier(0.4,0,0.2,1), background-color 0.5s ease;
}

/* Color dinámico según nivel */
.battery-bar-fill.level-high { background: var(--success); box-shadow: 0 0 8px rgba(163,190,140,0.4); }
.battery-bar-fill.level-mid  { background: var(--warn); }
.battery-bar-fill.level-low  { background: var(--danger); box-shadow: 0 0 8px rgba(191,97,106,0.4); animation: low-battery-pulse 1.5s ease-in-out infinite; }

@keyframes low-battery-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(191,97,106,0.3); }
  50% { box-shadow: 0 0 16px rgba(191,97,106,0.6); }
}

/* Métricas eléctricas */
.power-metrics {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
}

.power-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: rgba(0,0,0,0.05);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.power-metric-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}

.power-metric-value {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.8rem;
  font-weight: 500;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.power-metric-unit {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-left: var(--space-1);
}

/* Compact */
:host-context(.compact) .power-metric { padding: var(--space-2) var(--space-3); }
:host-context(.compact) .power-metric-value { font-size: 1.3rem; }
```

---

## 📐 TAREA 7: System Panel

### Objetivo
Panel de diagnóstico con estética terminal/HUD. Muestra estado de conexión Signal K.

### `system-panel.component.css`:

```css
:host { display: block; height: 100%; }

.system-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--space-3);
}

/* Connection status indicator */
.connection-status {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: rgba(0,0,0,0.08);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.status-led {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-led.online {
  background: var(--success);
  box-shadow: 0 0 10px rgba(163,190,140,0.6);
  animation: led-pulse 2s ease-in-out infinite;
}

.status-led.offline {
  background: var(--danger);
  box-shadow: 0 0 8px rgba(191,97,106,0.5);
}

@keyframes led-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(163,190,140,0.4); }
  50% { box-shadow: 0 0 14px rgba(163,190,140,0.7); }
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.status-detail {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

/* Log terminal */
.system-log {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
  padding: var(--space-2);
  background: rgba(0,0,0,0.1);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.7rem;
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) transparent;
}

.log-entry {
  color: var(--text-secondary);
  line-height: 1.4;
}

.log-entry.log-ok { color: var(--success); }
.log-entry.log-warn { color: var(--warn); }
.log-entry.log-error { color: var(--danger); }

/* Compact */
:host-context(.compact) .system-log { display: none; }
```

---

## 📐 TAREA 8: Critical Strip

### Objetivo
La tira de instrumentos críticos en la parte superior debe ser compacta y de alto impacto visual.

### `critical-strip.component.css` — Mejoras:

```css
/* Añadir al .strip-card: */
.strip-card {
  /* estilos glass para cada tile */
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-highlight), var(--shadow-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  transition: box-shadow 0.3s ease;
}

.strip-card:hover {
  box-shadow: var(--glass-highlight), var(--shadow-lg);
}

/* Valor del tile */
.tile-value {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tile-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}
```

---

## 📐 TAREA 9: Dashboard page.css — Grid Layout Mejorado

### Añadir/actualizar en `dashboard.page.css`:

```css
/* Grid más dinámico */
.panel-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(12, 1fr);
  grid-template-areas:
    'nav nav nav nav nav wind wind wind depth depth power power'
    'nav nav nav nav nav wind wind wind depth depth system system';
  align-items: stretch;
}

.panel.navigation { grid-area: nav; min-height: 320px; }
.panel.wind       { grid-area: wind; }
.panel.depth      { grid-area: depth; }
.panel.power      { grid-area: power; }
.panel.system     { grid-area: system; }

/* Responsive: tablet */
@media (max-width: 1024px) {
  .panel-grid {
    grid-template-columns: repeat(6, 1fr);
    grid-template-areas:
      'nav nav nav wind wind wind'
      'depth depth power power system system';
  }
}

/* Responsive: móvil */
@media (max-width: 768px) {
  .panel-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'nav' 'wind' 'depth' 'power' 'system';
  }
}

/* Compact mode — reducir gaps */
.dashboard.compact .panel-grid {
  gap: var(--space-3);
}

/* Density toggle mejorado */
.density-toggle {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  width: 44px;
  height: 44px;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  box-shadow: var(--glass-highlight), var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  z-index: 100;
}

.density-toggle:hover {
  color: var(--text-primary);
  border-color: var(--primary);
  box-shadow: var(--glass-highlight), var(--glow-primary), var(--shadow-lg);
  transform: scale(1.05);
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

El agente debe completar en este orden y confirmar cada paso:

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| 1 | Añadir tokens glass a `_tokens.scss` | `shared/styles/_tokens.scss` | ⬜ |
| 2 | Fondo del dashboard | `dashboard.page.css` | ⬜ |
| 3 | Panel card base glass | `panel-card.component.css` | ⬜ |
| 4 | Navigation panel CSS | `navigation-panel.component.css` | ⬜ |
| 5 | Navigation panel HTML | `navigation-panel.component.html` | ⬜ |
| 6 | Wind panel CSS | `wind-panel.component.css` | ⬜ |
| 7 | Wind panel HTML | `wind-panel.component.html` | ⬜ |
| 8 | Depth panel CSS | `depth-panel.component.css` | ⬜ |
| 9 | Depth panel HTML | `depth-panel.component.html` | ⬜ |
| 10 | Power panel CSS | `power-panel.component.css` | ⬜ |
| 11 | Power panel HTML | `power-panel.component.html` | ⬜ |
| 12 | System panel CSS | `system-panel.component.css` | ⬜ |
| 13 | System panel HTML | `system-panel.component.html` | ⬜ |
| 14 | Critical strip CSS | `critical-strip.component.css` | ⬜ |
| 15 | Dashboard grid layout | `dashboard.page.css` (grid) | ⬜ |
| 16 | Verificar build `npm run build` | — | ⬜ |

---

## 🚨 REGLAS CRÍTICAS (NO NEGOCIABLES)

1. **NO modificar** archivos `.ts` (TypeScript) — ni lógica, ni interfaces, ni ViewModels
2. **NO cambiar** los nombres de clases CSS que estén referenciadas desde TypeScript con `[class.xxx]`
3. **VERIFICAR** siempre el HTML existente antes de reescribir — los bindings `[vm.xxx]` deben conservarse exactamente
4. **LEER** el archivo actual antes de proponer cambios
5. **CONFIRMAR** con el usuario antes de cada implementación
6. **PRESERVAR** el comportamiento de compact mode (`:host-context(.compact)`)
7. **MANTENER** soporte day/night mode — probar mentalmente ambos temas antes de entregar
8. **EJECUTAR** `npm run build` al finalizar para verificar que no hay errores
9. Si encuentras divergencias entre este prompt y el código real, **el código real tiene prioridad** — adapta el diseño, no fuerces el código
10. Ante cualquier duda sobre una propiedad del ViewModel, **lee el facade service** correspondiente

---

## 💡 PRINCIPIOS DE DISEÑO

### Glass Morphism marino
- Las cards son ventanas al océano: translúcidas, con reflejos de luz en el borde superior
- El fondo del dashboard debe tener profundidad (gradientes sutiles de azul marino)
- Los valores críticos (profundidad, velocidad) merecen tipografía monoespaciada grande
- Los colores de alerta deben tener efecto glow para visibilidad en entornos de puente

### Legibilidad marina
- Tipografía mínima 0.7rem para etiquetas, nunca menos
- Contraste WCAG AA mínimo — obligatorio para uso en cubierta
- Touch targets mínimo 44×44px para todos los controles interactivos
- En night mode, reducir saturación para preservar visión nocturna

### Información primero
- Los números son los protagonistas, no la decoración
- Nunca ocultar datos críticos detrás de efectos visuales
- El glass effect debe desvanecerse graciosamente cuando `prefers-reduced-motion: reduce`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .card {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: var(--bg-surface) !important;
  }
}
```

---

## 🔍 VERIFICACIÓN FINAL

Antes de declarar la tarea completada, verificar:

- [ ] `npm run build` pasa sin errores ni warnings nuevos
- [ ] El dashboard se ve en day mode — fondos claros + glass translúcido
- [ ] El dashboard se ve en night mode — fondos oscuros + glass oscuro con borde cyan sutil  
- [ ] Compact mode reduce espaciado pero mantiene legibilidad
- [ ] Los paneles con datos `null` muestran loading spinner sin romper el layout
- [ ] Los paneles con alarma activa muestran el estado de alerta visualmente
- [ ] En mobile (360px) los paneles se apilan correctamente en columna única
- [ ] Ningún valor de instrumento queda truncado o invisible

---

*Prompt v1.0 — Open Marine Instrumentation Dashboard Glass Redesign*
*Generado para uso con agente de desarrollo Angular*
