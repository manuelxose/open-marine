# DOCUMENTO MAESTRO 4: UX/UI FINAL — APLICACIÓN COMERCIAL PROFESIONAL
## Open Marine Instrumentation (OMI) — Diseño de Interfaz Grado Producción

**Versión:** 1.0  
**Tipo:** UX/UI Engineering Specification — Final Product  
**Alcance:** Rediseño completo de shell, navegación, páginas y micro-interacciones  
**Stack:** Angular 21.1 · SCSS Glass Bridge Design System · Styleguide Components existentes  
**Dependencia:** Documentos 1, 2 y 3 completados (o en progreso paralelo)  
**Duración estimada:** 10–14 sesiones de trabajo  

---

## ⚠️ PROTOCOLO OBLIGATORIO DE INICIALIZACIÓN

1. **Leer este documento completo** antes de tocar código
2. **Auditar el App Shell actual** (`ui/layout/app-shell/`) — es el punto de entrada de todo
3. **Inventariar los componentes del styleguide existentes** — usar primero lo que ya existe
4. **Crear el tracking document** en `docs/UXUI_FINAL_STATUS.md`
5. **Implementar sección a sección** con confirmación entre cada una
6. **Cada commit = estado visual funcional** — no dejar la app rota entre commits

---

## 0. FILOSOFÍA DE DISEÑO FINAL

### 0.1 Principios Inamovibles

```
1. INFORMATION FIRST
   Los datos de navegación críticos siempre visibles.
   La UI no compite con los datos, los enmarca.

2. GLANCEABILITY
   Cualquier dato crítico legible en 0.5s desde 2 metros.
   Color semántico consistente: verde=bueno, amarillo=atención, rojo=peligro.

3. CERO AMBIGÜEDAD
   Rumbos siempre 3 dígitos. Unidades siempre visibles.
   Datos obsoletos siempre marcados. Estado de conexión siempre presente.

4. GLASS BRIDGE AESTHETIC
   Profundidad real mediante gradientes y sombras, no decoración plana.
   El bisel del instrumento existe. El cristal existe. La aguja existe.
   Inspiración: Garmin GPSMap 1000 series, Raymarine Axiom Pro.

5. OPERABILIDAD CON GUANTES
   Touch targets mínimo 48px en controles críticos.
   Controles de emergencia (MOB, Anchor Watch) con doble confirmación
   pero accesibles en 2 taps máximo.

6. DAY/NIGHT SIN COMPROMISOS
   Night: máxima retención de visión nocturna (#030507 canvas).
   Day: máximo contraste solar (#e2e8ec canvas, sin glow, negro de texto).
   La transición entre modos no interrumpe la operación.
```

### 0.2 Referentes Visuales

| Aspecto | Referente | Qué tomar |
|---------|-----------|-----------|
| Layout general | Garmin GPSMap 1000 | Top bar datos, mapa central, controles bottom |
| Instrumentos circulares | Raymarine Axiom | Bisel oscuro, Safety Orange needle, glow nocturno |
| Paleta de color | Simrad GO | Nord polar night, acentos azul marina |
| Tipografía datos | B&G Triton 2 | Mono tabular, números grandes, labels uppercase tiny |
| Alarmas | Garmin VHF 215 | Banners persistentes, audio + visual, severidad clara |
| Chart UX | Navionics | HUD flotante, controles discretos, mapa protagonista |

---

## 1. APP SHELL — REDISEÑO COMPLETO

### 1.1 Problema Actual

El App Shell actual (`ui/layout/app-shell/`) tiene sidenav izquierda colapsable. En un entorno marino esto es **subóptimo** porque:
- La sidenav ocupa espacio horizontal valioso en pantallas landscape
- En Chart (pantalla principal), la nav compite con el mapa
- En móvil/tablet landscape, el espacio horizontal es crítico

### 1.2 Arquitectura de Shell Target

```
MODO DESKTOP (≥1024px landscape):
┌──────────────────────────────────────────────────────────────────────────┐
│ [⚓ OMI]  [SOG 6.2kts] [COG 145°] [HDG 142°T] [41°23'N 002°11'E] [UTC] │ ← GLOBAL TOP BAR (48px)
├──────────────────────────────────────────────────────────────────────────┤
│ ⚠️ ALARM BANNER (colapsable, aparece solo cuando hay alarmas activas)    │ ← ALARM STRIP
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                  │
│  SIDE  │   CONTENIDO DE LA PÁGINA ACTIVA                                 │
│  NAV   │                                                                  │
│  (72px │   (Chart, Dashboard, Instruments, Resources, etc.)              │
│  icon- │                                                                  │
│  only) │                                                                  │
│        │                                                                  │
└────────┴─────────────────────────────────────────────────────────────────┘

MODO TABLET (768–1023px):
- Sidenav: slide-over desde izquierda, overlay encima del contenido
- Trigger: hamburger en top-bar
- Top bar igual que desktop pero más compacto

MODO CHART (cualquier tamaño):
- Sidenav completamente oculta (chart usa 100% del espacio)
- Acceso a nav: botón "☰" flotante sobre el mapa
```

### 1.3 Especificación del Global Top Bar

```typescript
// ui/layout/global-top-bar/global-top-bar.component.ts

interface GlobalTopBarVM {
  // Brand
  appName: string;  // "OMI"
  
  // Critical vessel data (siempre visibles)
  sog: DataPoint<number>;
  cog: DataPoint<number>;
  hdg: DataPoint<number>;
  position: DataPoint<{ lat: number; lon: number }>;
  
  // Time
  utcTime: string;
  
  // Connection
  signalkConnected: boolean;
  
  // Active alarm count (badge)
  activeAlarmCount: number;
  
  // Theme
  isDayMode: boolean;
  
  // Chart mode (oculta algunos elementos para maximizar espacio)
  isChartMode: boolean;
}
```

```html
<!-- global-top-bar.component.html -->
<header class="global-top-bar" role="banner" [attr.data-chart-mode]="isChartMode">
  
  <!-- SLOT IZQUIERDO: Brand + Nav trigger (tablet) -->
  <div class="top-bar__left">
    
    <!-- Hamburger (solo en tablet) -->
    <button class="top-bar__menu-btn" 
            *ngIf="isTablet"
            (click)="toggleNav()"
            aria-label="Toggle navigation">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
    </button>
    
    <!-- Brand -->
    <a class="top-bar__brand" routerLink="/chart" aria-label="OMI Home">
      <!-- SVG: ancla estilizada + "OMI" -->
      <svg class="top-bar__logo" width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="2" fill="var(--gb-needle-primary)"/>
        <line x1="12" y1="7" x2="12" y2="19" stroke="var(--gb-needle-primary)" stroke-width="2"/>
        <path d="M6 10 Q12 8 18 10" stroke="var(--gb-needle-primary)" stroke-width="1.5" fill="none"/>
        <line x1="6" y1="19" x2="18" y2="19" stroke="var(--gb-needle-primary)" stroke-width="1.5"/>
      </svg>
      <span class="top-bar__brand-text" *ngIf="!isChartMode">OMI</span>
    </a>
    
  </div>
  
  <!-- SLOT CENTRAL: Datos críticos del barco -->
  <nav class="top-bar__vessel-data" aria-label="Vessel data">
    
    <div class="top-bar__datum" [class.top-bar__datum--stale]="sog.quality === 'stale'">
      <span class="top-bar__datum-label">SOG</span>
      <span class="top-bar__datum-value">
        {{ sog.quality === 'stale' ? '---' : (sog.value | number:'1.1-1') }}
      </span>
      <span class="top-bar__datum-unit">KTS</span>
    </div>
    
    <div class="top-bar__separator" aria-hidden="true"></div>
    
    <div class="top-bar__datum" [class.top-bar__datum--stale]="cog.quality === 'stale'">
      <span class="top-bar__datum-label">COG</span>
      <span class="top-bar__datum-value">
        {{ cog.quality === 'stale' ? '---' : (cog.value | heading) }}
      </span>
    </div>
    
    <div class="top-bar__separator" aria-hidden="true"></div>
    
    <div class="top-bar__datum" [class.top-bar__datum--stale]="hdg.quality === 'stale'">
      <span class="top-bar__datum-label">HDG</span>
      <span class="top-bar__datum-value">
        {{ hdg.quality === 'stale' ? '---' : (hdg.value | heading) }}
      </span>
      <span class="top-bar__datum-unit">T</span>
    </div>
    
    <div class="top-bar__separator" aria-hidden="true"></div>
    
    <!-- Posición GPS -->
    <div class="top-bar__position" [class.top-bar__datum--stale]="position.quality === 'stale'">
      <span class="top-bar__datum-label">POS</span>
      <div class="top-bar__coords">
        <span>{{ position.quality === 'stale' ? '---' : (position.value | latLon:'lat') }}</span>
        <span>{{ position.quality === 'stale' ? '---' : (position.value | latLon:'lon') }}</span>
      </div>
    </div>
    
  </nav>
  
  <!-- SLOT DERECHO: UTC, conexión, alarmas, tema -->
  <div class="top-bar__right">
    
    <!-- Hora UTC -->
    <time class="top-bar__utc" [attr.datetime]="utcISO">{{ utcTime }}</time>
    
    <!-- Indicador alarmas activas -->
    <button class="top-bar__alarm-btn" 
            *ngIf="activeAlarmCount > 0"
            routerLink="/alarms"
            [attr.aria-label]="activeAlarmCount + ' active alarms'"
            class="top-bar__alarm-btn top-bar__alarm-btn--active">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 1a5.5 5.5 0 00-5.5 5.5v2L1 10h14l-1.5-1.5v-2A5.5 5.5 0 008 1z" 
              fill="currentColor"/>
        <path d="M6 13a2 2 0 004 0H6z" fill="currentColor"/>
      </svg>
      <span class="top-bar__alarm-badge">{{ activeAlarmCount }}</span>
    </button>
    
    <!-- Estado conexión SK -->
    <div class="top-bar__connection"
         [class.top-bar__connection--online]="signalkConnected"
         [class.top-bar__connection--offline]="!signalkConnected"
         [attr.aria-label]="signalkConnected ? 'Signal K connected' : 'Signal K offline'"
         [appTooltip]="signalkConnected ? 'Signal K Online' : 'Signal K Offline'">
      <span class="connection-dot"></span>
      <span class="top-bar__datum-label">SK</span>
    </div>
    
    <!-- Toggle Day/Night -->
    <button class="top-bar__theme-btn"
            (click)="toggleTheme()"
            [attr.aria-label]="isDayMode ? 'Switch to Night mode' : 'Switch to Day mode'"
            [appTooltip]="isDayMode ? 'Night Mode' : 'Day Mode'">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <!-- Sol (day) o Luna (night) según isDayMode -->
        <ng-container *ngIf="isDayMode">
          <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 3.05l-1.06 1.06M3.05 11.89l1.06-1.06" 
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </ng-container>
        <ng-container *ngIf="!isDayMode">
          <path d="M13 8A5 5 0 116 1a6 6 0 107 7z" fill="currentColor"/>
        </ng-container>
      </svg>
    </button>
    
  </div>
  
</header>
```

```scss
// global-top-bar.component.scss

.global-top-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: 48px;
  padding: 0 var(--space-3);
  background: var(--gb-bg-bezel);
  border-bottom: 1px solid var(--gb-border-panel);
  position: relative;
  z-index: var(--z-20);
  user-select: none;
  gap: var(--space-4);
  
  // Borde inferior con efecto glow sutil en Night Mode
  [data-theme="night"] & {
    box-shadow: 0 1px 0 rgba(82, 102, 122, 0.3),
                0 2px 12px rgba(0, 0, 0, 0.4);
  }
  
  // Chart mode: más compacto, menos brand
  &[data-chart-mode="true"] {
    grid-template-columns: 48px 1fr auto;
  }
}

.top-bar__left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.top-bar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  
  &:hover .top-bar__brand-text {
    color: var(--gb-text-value);
  }
}

.top-bar__brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.875rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gb-text-muted);
  transition: color 200ms ease;
}

.top-bar__vessel-data {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
  
  // En pantallas pequeñas, ocultar posición
  @media (max-width: 900px) {
    .top-bar__position { display: none; }
  }
  @media (max-width: 640px) {
    .top-bar__datum:nth-child(n+5) { display: none; }
  }
}

.top-bar__datum {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-shrink: 0;
  transition: opacity 300ms ease;
  
  &--stale {
    opacity: 0.45;
  }
}

.top-bar__datum-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gb-text-muted);
  line-height: 1;
}

.top-bar__datum-value {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--gb-text-value);
  line-height: 1;
}

.top-bar__datum-unit {
  @extend .top-bar__datum-label;
  font-size: 0.5rem;
}

.top-bar__separator {
  width: 1px;
  height: 20px;
  background: var(--gb-border-panel);
  flex-shrink: 0;
  margin: 0 var(--space-1);
}

.top-bar__position {
  display: flex;
  align-items: center;
  gap: 6px;
}

.top-bar__coords {
  display: flex;
  flex-direction: column;
  gap: 1px;
  
  span {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--gb-text-value);
    line-height: 1;
  }
}

.top-bar__right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.top-bar__utc {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--gb-text-muted);
  letter-spacing: 0.04em;
}

.top-bar__alarm-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--gb-text-muted);
  transition: all 150ms ease;
  
  &--active {
    color: var(--gb-data-stale);
    animation: gb-alarm-beat 1.2s ease-in-out infinite;
  }
  
  &:hover {
    background: var(--gb-bg-glass-active);
    color: var(--gb-text-value);
  }
}

.top-bar__alarm-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  background: var(--gb-data-stale);
  color: white;
  font-size: 0.55rem;
  font-weight: 700;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.top-bar__connection {
  display: flex;
  align-items: center;
  gap: 5px;
  
  .connection-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background-color 400ms ease, box-shadow 400ms ease;
  }
  
  &--online .connection-dot {
    background: var(--gb-data-good);
    box-shadow: 0 0 5px rgba(var(--gb-data-good-rgb), 0.7);
  }
  
  &--offline .connection-dot {
    background: var(--gb-data-stale);
    animation: gb-pulse-stale 1.5s ease-in-out infinite;
  }
}

.top-bar__theme-btn,
.top-bar__menu-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--gb-text-muted);
  transition: all 150ms ease;
  
  &:hover {
    background: var(--gb-bg-glass-active);
    border-color: var(--gb-border-panel);
    color: var(--gb-text-value);
  }
}
```

### 1.4 Sidenav — Solo Íconos (Icon Rail)

```scss
// app-shell rediseño: sidenav → icon rail de 64px

.sidenav {
  width: 64px;          // Fijo, nunca se expande en desktop
  background: var(--gb-bg-bezel);
  border-right: 1px solid var(--gb-border-panel);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2) 0;
  gap: var(--space-1);
  z-index: var(--z-10);
  
  // En chart mode: oculto completamente
  &.sidenav--chart-hidden {
    display: none;
  }
}

.nav-item {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--gb-text-muted);
  text-decoration: none;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  
  // Tooltip nativo del title para accesibilidad
  
  svg {
    width: 22px;
    height: 22px;
    stroke-width: 1.75px;
  }
  
  // Badge para alarmas
  &__badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background: var(--gb-data-stale);
    border-radius: 50%;
    border: 2px solid var(--gb-bg-bezel);
  }
  
  &:hover {
    background: var(--gb-bg-glass-active);
    color: var(--gb-text-value);
  }
  
  &.active {
    background: rgba(74, 144, 217, 0.15);
    color: #4a90d9;
    
    // Indicador activo: línea izquierda
    &::before {
      content: '';
      position: absolute;
      left: -1px;          // Fuera del borde izquierdo del nav
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 24px;
      background: #4a90d9;
      border-radius: 0 2px 2px 0;
    }
    
    [data-theme="night"] & {
      box-shadow: 0 0 12px rgba(74, 144, 217, 0.2);
    }
  }
}

// Separador en el nav
.nav-separator {
  width: 32px;
  height: 1px;
  background: var(--gb-border-panel);
  margin: var(--space-1) 0;
}

// Grupo de navegación principal al centro
.nav-main { flex: 1; display: flex; flex-direction: column; gap: var(--space-1); }

// Footer del nav (settings, theme)
.nav-footer { display: flex; flex-direction: column; gap: var(--space-1); padding-bottom: var(--space-2); }
```

---

## 2. ALARM BANNER — DISEÑO FINAL

```scss
// alarm-banner.component.scss

.alarm-banner {
  position: relative;
  z-index: var(--z-20);
  overflow: hidden;
  
  // Animación de entrada/salida
  transition: max-height 300ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 300ms ease;
  
  &:empty,
  &--empty {
    max-height: 0;
    opacity: 0;
    pointer-events: none;
  }
  
  &--has-alarms {
    max-height: 52px;
    opacity: 1;
  }
}

.alarm-banner__inner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  height: 44px;
  
  // Color según severidad más alta activa
  &[data-severity="emergency"] {
    background: var(--gb-alarm-emergency-bg);
    border-bottom: 2px solid var(--gb-alarm-emergency-border);
    animation: gb-alarm-beat 0.8s ease-in-out infinite;
  }
  
  &[data-severity="critical"] {
    background: var(--gb-alarm-critical-bg);
    border-bottom: 2px solid var(--gb-alarm-critical-border);
    animation: gb-alarm-beat 1.2s ease-in-out infinite;
  }
  
  &[data-severity="warning"] {
    background: var(--gb-alarm-warning-bg);
    border-bottom: 1px solid var(--gb-alarm-warning-border);
  }
  
  &[data-severity="info"] {
    background: var(--gb-alarm-info-bg);
    border-bottom: 1px solid var(--gb-alarm-info-border);
  }
}

.alarm-banner__icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.alarm-banner__message {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gb-text-value);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alarm-banner__count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: var(--gb-text-muted);
  flex-shrink: 0;
}

.alarm-banner__actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.alarm-banner__btn {
  height: 28px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid;
  transition: all 150ms ease;
  
  &--ack {
    background: transparent;
    border-color: var(--gb-text-muted);
    color: var(--gb-text-muted);
    &:hover { border-color: var(--gb-text-value); color: var(--gb-text-value); }
  }
  
  &--view {
    background: transparent;
    border-color: #4a90d9;
    color: #4a90d9;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    &:hover { background: rgba(74,144,217,0.12); }
  }
}
```

---

## 3. PÁGINAS — ESPECIFICACIÓN VISUAL COMPLETA

### 3.1 Dashboard — Layout Final

```
DESKTOP DASHBOARD LAYOUT:
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL TOP BAR                                             │
├─────────────────────────────────────────────────────────────┤
│  ALARM BANNER (si hay alarmas)                              │
├──────┬──────────────────────────────────────────────────────┤
│      │                                                      │
│ SIDE │  ┌─────────────────────────────────────────────────┐ │
│ NAV  │  │  PAGE HEADER: "Dashboard"  [+Widget] [Layout ⊞] │ │
│      │  ├─────────────────────────────────────────────────┤ │
│      │  │                                                 │ │
│      │  │  ┌──────────────────────────────────────────┐  │ │
│      │  │  │  NAVIGATION WIDGET (span:2)              │  │ │
│      │  │  │  SOG [6.2] KTS  ·  COG [145°]  ·  HDG  │  │ │
│      │  │  │  Position: 41°23.456'N / 002°11.234'E   │  │ │
│      │  │  └──────────────────────────────────────────┘  │ │
│      │  │  ┌────────────────┐  ┌────────────────────┐    │ │
│      │  │  │  WIND WIDGET   │  │  DEPTH WIDGET      │    │ │
│      │  │  │  AWS [12.3]KTS │  │  [14.2] M          │    │ │
│      │  │  │  AWA [045°]    │  │  ████ trend        │    │ │
│      │  │  └────────────────┘  └────────────────────┘    │ │
│      │  │  ┌────────────────┐  ┌────────────────────┐    │ │
│      │  │  │  POWER WIDGET  │  │  SYSTEM WIDGET     │    │ │
│      │  │  │  [12.8]V       │  │  ● SK Connected    │    │ │
│      │  │  │  [-4.2]A       │  │  ● GPS Fix (good)  │    │ │
│      │  │  └────────────────┘  └────────────────────┘    │ │
│      │  │                                                 │ │
│      │  └─────────────────────────────────────────────────┘ │
│      │                                                      │
└──────┴──────────────────────────────────────────────────────┘
```

```scss
// dashboard.page.scss

.dashboard-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--gb-bg-canvas);
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--gb-border-panel);
  background: var(--gb-bg-bezel);
  flex-shrink: 0;
  
  h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gb-text-muted);
  }
}

.dashboard-actions {
  display: flex;
  gap: var(--space-2);
}

.dashboard-grid {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  
  // Grid adaptativo
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-3);
  align-content: start;
  
  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

// Widgets que ocupan 2 columnas
.dashboard-widget--wide {
  grid-column: span 2;
  
  @media (max-width: 640px) {
    grid-column: span 1;
  }
}
```

### 3.2 Widget Card — Diseño Glass Bridge

```scss
// shared/components/dashboard-widget-card/dashboard-widget-card.scss

.widget-card {
  background: var(--gb-bg-panel);
  border: 1px solid var(--gb-border-panel);
  border-radius: 16px;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  position: relative;
  overflow: hidden;
  box-shadow: var(--gb-shadow-instrument);
  transition: border-color 400ms ease, box-shadow 400ms ease;
  
  // Calidad del dato principal
  &[data-quality="stale"] {
    border-color: rgba(var(--gb-data-stale-rgb), 0.35);
  }
  
  &[data-quality="warn"] {
    border-color: rgba(var(--gb-data-warn-rgb), 0.35);
  }
  
  // Glass overlay highlight (Night Mode)
  [data-theme="night"] &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
  }
}

.widget-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.widget-card__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--gb-text-muted);
}

.widget-card__quality-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  
  &[data-quality="good"]    { background: var(--gb-data-good); box-shadow: 0 0 4px rgba(var(--gb-data-good-rgb),0.6); }
  &[data-quality="warn"]    { background: var(--gb-data-warn); }
  &[data-quality="stale"]   { background: var(--gb-data-stale); animation: gb-pulse-stale 1.5s infinite; }
  &[data-quality="missing"] { background: var(--gb-tick-major); }
}

// Valores principales dentro del widget
.widget-card__primary-value {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  line-height: 1;
  color: var(--gb-text-value);
  letter-spacing: -0.02em;
}

.widget-card__secondary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: var(--space-2);
}

.widget-card__secondary-datum {
  display: flex;
  flex-direction: column;
  gap: 2px;
  
  .label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.55rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gb-text-muted);
  }
  
  .value {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--gb-text-value);
  }
  
  .unit {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.5rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--gb-text-muted);
  }
}
```

---

### 3.3 Página de Alarmas — Layout Final

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL TOP BAR                                             │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ ALARM BANNER (si hay activas, siempre visible)          │
├──────┬──────────────────────────────────────────────────────┤
│      │  Alarms          [All▾] [Acknowledge All] [🔕 Silence]│
│ SIDE │  ──────────────────────────────────────────────────  │
│ NAV  │  🔴 CRITICAL · Shallow Water · 2.1m (< 3.0m)       │
│      │      14:23:07 UTC · Active 4m 32s    [ACK] [Details]│
│      │  ──────────────────────────────────────────────────  │
│      │  🟡 WARNING  · Low Battery · 11.8V (< 12.0V)       │
│      │      14:18:41 UTC · Active 9m 01s    [ACK] [Details]│
│      │  ──────────────────────────────────────────────────  │
│      │  ✅ RESOLVED · CPA Warning · 0.8nm (cleared)        │
│      │      Resolved 14:15:22 UTC            [Dismiss]     │
│      │                                                      │
│      │  ────────────────────────────────────────────────── │
│      │  ALARM CONFIGURATION                                 │
│      │  ┌──────────────────┐  ┌──────────────────────────┐ │
│      │  │ Shallow Water    │  │ Low Battery              │ │
│      │  │ [●────────] 3.0m │  │ [●────────] 12.0V        │ │
│      │  └──────────────────┘  └──────────────────────────┘ │
└──────┴──────────────────────────────────────────────────────┘
```

```scss
// features/alarms/alarms.page.scss

.alarms-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--gb-bg-canvas);
}

.alarms-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--gb-border-panel);
  background: var(--gb-bg-bezel);
  flex-shrink: 0;
  
  h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gb-text-muted);
  }
  
  .toolbar-spacer { flex: 1; }
}

.alarms-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.alarm-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: 12px;
  border: 1px solid;
  transition: border-color 300ms ease, background 300ms ease;
  
  &[data-severity="emergency"] {
    background: var(--gb-alarm-emergency-bg);
    border-color: var(--gb-alarm-emergency-border);
    animation: gb-alarm-beat 0.8s ease-in-out infinite;
  }
  
  &[data-severity="critical"] {
    background: var(--gb-alarm-critical-bg);
    border-color: var(--gb-alarm-critical-border);
  }
  
  &[data-severity="warning"] {
    background: var(--gb-alarm-warning-bg);
    border-color: var(--gb-alarm-warning-border);
  }
  
  &[data-state="resolved"] {
    opacity: 0.5;
    animation: none;
  }
}

.alarm-row__severity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.alarm-row__body {
  flex: 1;
  min-width: 0;
  
  .alarm-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gb-text-value);
  }
  
  .alarm-detail {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--gb-text-unit);
    margin-top: 2px;
  }
  
  .alarm-meta {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    color: var(--gb-text-muted);
    margin-top: 4px;
  }
}

.alarm-row__actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
```

---

### 3.4 Página de Instrumentos — Layout Final

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL TOP BAR                                             │
├──────┬──────────────────────────────────────────────────────┤
│      │  Instruments    [Grid▾]  [Edit Layout]              │
│ SIDE │  ═══════════════════════════════════════════════════ │
│ NAV  │  NAVIGATION              WIND                       │
│      │  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐  │
│      │  │  SOG     │ │  COG  │ │  AWS     │ │  TWA     │  │
│      │  │          │ │       │ │          │ │          │  │
│      │  │  [SVG    │ │ [SVG  │ │  [SVG    │ │  [SVG    │  │
│      │  │  gauge]  │ │ rose] │ │  gauge]  │ │  rose]   │  │
│      │  │          │ │       │ │          │ │          │  │
│      │  │  6.2 KTS │ │ 145°  │ │ 12.3 KTS│ │ 045°     │  │
│      │  └──────────┘ └───────┘ └──────────┘ └──────────┘  │
│      │  DEPTH                   ELECTRICAL                 │
│      │  ┌──────────────────────┐ ┌──────────┐ ┌──────────┐ │
│      │  │  DEPTH (wide)        │ │  BATT V  │ │  BATT A  │ │
│      │  │  [linear gauge]      │ │  [gauge] │ │  [gauge] │ │
│      │  │  14.2 M              │ │  12.8V   │ │  -4.2A   │ │
│      │  └──────────────────────┘ └──────────┘ └──────────┘ │
└──────┴──────────────────────────────────────────────────────┘
```

```scss
// features/instruments/instruments.page.scss

.instruments-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--gb-bg-canvas);
}

.instruments-toolbar {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--gb-border-panel);
  background: var(--gb-bg-bezel);
  flex-shrink: 0;
  gap: var(--space-3);
}

.instruments-section {
  margin-bottom: var(--space-5);
  
  &__title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--gb-text-muted);
    padding: var(--space-3) 0 var(--space-2);
    border-bottom: 1px solid var(--gb-border-panel);
    margin-bottom: var(--space-3);
  }
}

.instruments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    padding: var(--space-3);
  }
}

// Tarjeta de instrumento individual
.instrument-tile {
  background: var(--gb-bg-panel);
  border: 1px solid var(--gb-border-panel);
  border-radius: 14px;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  position: relative;
  box-shadow: var(--gb-shadow-instrument);
  aspect-ratio: 1;    // Cuadrados por defecto
  
  &--wide {
    aspect-ratio: 2/1;
    grid-column: span 2;
  }
  
  &--stale {
    border-color: rgba(var(--gb-data-stale-rgb), 0.3);
    
    .instrument-tile__value { color: var(--gb-text-stale); }
  }
}

.instrument-tile__label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--gb-text-muted);
  align-self: flex-start;
}

.instrument-tile__gauge {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.instrument-tile__value-group {
  display: flex;
  align-items: baseline;
  gap: 4px;
  align-self: flex-end;
}

.instrument-tile__value {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--gb-text-value);
  line-height: 1;
}

.instrument-tile__unit {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gb-text-unit);
}
```

---

### 3.5 Página de Settings — Layout Final

```scss
// features/settings/settings.page.scss

.settings-page {
  height: 100%;
  display: grid;
  grid-template-columns: 220px 1fr;
  overflow: hidden;
  background: var(--gb-bg-canvas);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}

// Sidebar de categorías
.settings-sidebar {
  background: var(--gb-bg-bezel);
  border-right: 1px solid var(--gb-border-panel);
  overflow-y: auto;
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.settings-sidebar__section-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--gb-text-muted);
  padding: var(--space-2) var(--space-2) var(--space-1);
  margin-top: var(--space-2);
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  color: var(--gb-text-muted);
  transition: all 150ms ease;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  
  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  
  &:hover {
    background: var(--gb-bg-glass-active);
    color: var(--gb-text-value);
  }
  
  &.active {
    background: rgba(74, 144, 217, 0.12);
    color: #4a90d9;
  }
}

// Panel de contenido de settings
.settings-content {
  overflow-y: auto;
  padding: var(--space-5);
  
  h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--gb-text-value);
    margin-bottom: var(--space-1);
  }
  
  .settings-subtitle {
    font-size: 0.8125rem;
    color: var(--gb-text-muted);
    margin-bottom: var(--space-5);
  }
}

// Grupo de configuración
.settings-group {
  background: var(--gb-bg-panel);
  border: 1px solid var(--gb-border-panel);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: var(--space-4);
}

.settings-group__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gb-text-muted);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--gb-border-panel);
  background: var(--gb-bg-bezel);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  gap: var(--space-4);
  border-bottom: 1px solid rgba(var(--gb-border-panel), 0.5);
  
  &:last-child { border-bottom: none; }
  
  .settings-row__label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gb-text-value);
  }
  
  .settings-row__desc {
    font-size: 0.75rem;
    color: var(--gb-text-muted);
    margin-top: 2px;
  }
  
  .settings-row__control {
    flex-shrink: 0;
  }
}
```

---

## 4. MICRO-INTERACCIONES Y ESTADOS

### 4.1 Loading States

```scss
// Skeleton para instrumentos mientras cargan
.instrument-skeleton {
  background: var(--gb-bg-panel);
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    transform: translateX(-100%);
  }
}

@keyframes skeleton-shimmer {
  100% { transform: translateX(100%); }
}

// Estado de reconexión WebSocket
.reconnecting-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(var(--gb-data-warn-rgb), 0.1);
  border-bottom: 1px solid rgba(var(--gb-data-warn-rgb), 0.3);
  
  .reconnecting-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(var(--gb-data-warn-rgb), 0.3);
    border-top-color: var(--gb-data-warn);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  span {
    font-size: 0.75rem;
    color: var(--gb-data-warn);
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
  }
}

@keyframes spin { to { transform: rotate(360deg); } }
```

### 4.2 Transición de Tema Day/Night

```typescript
// core/theme/theme.service.ts

@Injectable({ providedIn: 'root' })
export class ThemeService {
  
  private readonly THEME_KEY = 'omi-theme';
  
  readonly theme$ = new BehaviorSubject<'day' | 'night'>(this._getSavedTheme());
  
  toggleTheme(): void {
    const current = this.theme$.value;
    const next = current === 'night' ? 'day' : 'night';
    this._applyTheme(next);
    this.theme$.next(next);
    localStorage.setItem(this.THEME_KEY, next);
  }
  
  private _applyTheme(theme: 'day' | 'night'): void {
    const root = document.documentElement;
    
    // Habilitar transición suave entre temas
    root.setAttribute('data-theme-transition', '');
    root.setAttribute('data-theme', theme);
    
    // Quitar el atributo de transición tras completarse
    setTimeout(() => root.removeAttribute('data-theme-transition'), 400);
  }
  
  private _getSavedTheme(): 'day' | 'night' {
    // Auto-detect según hora si no hay preferencia guardada
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved === 'day' || saved === 'night') return saved;
    
    const hour = new Date().getHours();
    return (hour >= 7 && hour < 19) ? 'day' : 'night';
  }
}
```

### 4.3 Feedback de Interacción en Controles Críticos

```scss
// Para botones críticos (MOB, Anchor Watch, etc.)
// Efecto "ripple" marino al pulsar

.btn-critical {
  position: relative;
  overflow: hidden;
  
  // Estado normal: rojo/naranja
  background: rgba(var(--gb-data-stale-rgb), 0.15);
  border: 1px solid var(--gb-data-stale);
  color: var(--gb-data-stale);
  
  // Ripple al click
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: rgba(var(--gb-data-stale-rgb), 0.3);
    border-radius: inherit;
    transform: scale(0);
    opacity: 0;
    transition: transform 0.4s ease, opacity 0.4s ease;
  }
  
  &:active::after {
    transform: scale(2);
    opacity: 0;
    transition: 0s;
  }
  
  // Press state
  &:active {
    transform: scale(0.97);
    transition: transform 100ms ease;
  }
}

// Botón MOB específico
.mob-trigger-btn {
  @extend .btn-critical;
  
  min-width: 80px;
  min-height: 48px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.875rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-radius: 12px;
  
  // Double-tap confirmation: requiere 2 taps en 2 segundos
  // La implementación es en TypeScript
}
```

---

## 5. SISTEMA DE TIPOGRAFÍA — JERARQUÍA COMPLETA

```scss
// _typography-complete.scss — Jerarquía final de toda la app

// NIVEL 1: Valores de instrumentos
.type-instrument-xl {  // Profundidad crítica, SOG principal
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: clamp(2.5rem, 8vw, 5rem);
  font-weight: 400;
  color: var(--gb-text-value);
  line-height: 1;
}

.type-instrument-lg {  // Instrumentos estándar
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: clamp(1.75rem, 5vw, 3rem);
  font-weight: 400;
  color: var(--gb-text-value);
  line-height: 1;
}

.type-instrument-md {  // Datos secundarios
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: clamp(1.1rem, 3vw, 1.75rem);
  font-weight: 500;
  color: var(--gb-text-value);
  line-height: 1;
}

.type-instrument-sm {  // Top bar datos, side panels
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gb-text-value);
  line-height: 1;
}

// NIVEL 2: Labels y unidades
.type-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--gb-text-muted);
  line-height: 1;
}

.type-unit {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gb-text-unit);
  line-height: 1;
}

// NIVEL 3: UI General
.type-heading-page {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gb-text-muted);
}

.type-heading-section {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--gb-text-muted);
}

.type-body {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--gb-text-value);
  line-height: 1.5;
}

.type-body-sm {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  color: var(--gb-text-muted);
  line-height: 1.4;
}

.type-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: var(--gb-text-value);
  background: var(--gb-bg-bezel);
  padding: 2px 6px;
  border-radius: 4px;
}
```

---

## 6. ESPACIADO Y GRID SYSTEM

```scss
// El sistema de espaciado de 4px ya existe en tokens.
// Esta sección define el uso SEMÁNTICO de los espacios.

// REGLAS DE ESPACIADO POR CONTEXTO:

// Dentro de un widget card / instrument tile:
// - Padding externo: --space-4 (16px)
// - Gap entre elementos internos: --space-3 (12px)
// - Gap entre label y valor: --space-1 (4px)

// Entre widgets en un grid:
// - Gap: --space-3 (12px) en tablet, --space-4 (16px) en desktop

// Dentro de la sidenav:
// - Padding del rail: --space-2 (8px)
// - Gap entre nav items: --space-1 (4px)

// Sectiones de página:
// - Padding de contenido: --space-5 (20px) desktop, --space-3 (12px) mobile
// - Separación entre secciones: --space-5 (20px)
```

---

## 7. RESPONSIVE BREAKPOINTS — COMPORTAMIENTO POR TAMAÑO

```
BREAKPOINTS DEFINIDOS:
  sm:  640px  → Teléfono portrait
  md:  768px  → Tablet portrait / Teléfono landscape
  lg:  1024px → Tablet landscape / Pantalla pequeña
  xl:  1280px → Pantalla estándar
  2xl: 1440px → Pantalla grande / MFD dedicado

COMPORTAMIENTOS POR BREAKPOINT:

< 640px (Teléfono portrait):
  - Sidenav: Oculta. Acceso via bottom nav bar (4 items: Chart, Dashboard, Instruments, ⋯)
  - Top Bar: Solo SOG + COG + connection dot
  - Dashboard: 1 columna de widgets
  - Instruments: 2 columnas de tiles compactos
  - Chart: Fullscreen, controles flotantes mínimos

640-1023px (Tablet portrait / Landscape):
  - Sidenav: Slide-over overlay desde izquierda
  - Top Bar: SOG + COG + HDG + position (truncada)
  - Dashboard: 2 columnas
  - Instruments: 3 columnas
  - Chart: Full con left panel colapsado por defecto

≥ 1024px (Desktop / Bridge display):
  - Sidenav: Icon rail fijo de 64px
  - Top Bar: Datos completos
  - Dashboard: 2-3 columnas adaptativas
  - Instruments: 4+ columnas
  - Chart: Full con todos los panels disponibles
```

---

## 8. ICONOGRAFÍA — SISTEMA FINAL

```typescript
// El styleguide ya tiene un sistema de iconos.
// Íconos náuticos ADICIONALES necesarios para OMI:

// Íconos que NO están en el styleguide actual y hay que añadir:

const NAUTICAL_ICONS_NEEDED = [
  // Navegación
  'anchor',         // Anchor Watch
  'mob',            // Man Overboard (persona en agua)
  'compass-rose',   // Compás con rosa de los vientos
  'heading',        // Flecha de heading (triángulo)
  'waypoint',       // Pin de waypoint (lozenge)
  'waypoint-active',// Pin activo (con círculo)
  'route',          // Línea con puntos intermedios
  'track',          // Línea de rastro con flechas
  'bearing-line',   // Línea de marcación
  
  // Instrumentos
  'depth-sounder',  // Onda + fondo
  'wind-arrow',     // Flecha con viento (fletched)
  'speedometer',    // Velocímetro náutico
  'barometer',      // Barómetro
  'rudder',         // Timón (helm)
  
  // AIS
  'vessel-sail',    // Barco de vela (triángulo)
  'vessel-motor',   // Barco de motor (rectángulo con proa)
  'vessel-danger',  // Barco peligroso (rojo)
  'vessel-static',  // Barco estático (ancla pequeña)
  
  // Sistema
  'signal-k',       // Logo Signal K (ondas)
  'nmea',           // Conector NMEA
];

// Todos los íconos SVG se implementan como inline SVG en el sprite
// para poder cambiar color con currentColor
```

---

## 9. MEJORAS ADICIONALES AL PRODUCTO FINAL

### 9.1 Haptic Feedback (Mobile/Tablet)

```typescript
// shared/utils/haptics.utils.ts
// Feedback táctil para acciones críticas en dispositivos con Vibration API

export function triggerHaptic(pattern: 'tap' | 'warning' | 'error' | 'success'): void {
  if (!navigator.vibrate) return;
  
  const patterns = {
    tap:     [10],
    warning: [50, 30, 50],
    error:   [100, 50, 100, 50, 100],
    success: [30, 20, 30],
  };
  
  navigator.vibrate(patterns[pattern]);
}

// Uso: al confirmar MOB
triggerHaptic('error');

// Uso: al poner waypoint con click
triggerHaptic('tap');
```

### 9.2 Keyboard Shortcuts

```typescript
// core/keyboard/keyboard-shortcuts.service.ts

// Shortcuts globales de la aplicación:
const SHORTCUTS = {
  'alt+c': () => router.navigate(['/chart']),          // Alt+C → Chart
  'alt+d': () => router.navigate(['/dashboard']),       // Alt+D → Dashboard
  'alt+i': () => router.navigate(['/instruments']),     // Alt+I → Instruments
  'alt+a': () => router.navigate(['/alarms']),          // Alt+A → Alarmas
  'alt+n': () => themeService.toggleTheme(),            // Alt+N → Toggle Night
  'alt+m': () => mobService.triggerConfirmation(),      // Alt+M → MOB (con confirm)
  'alt+w': () => anchorWatchService.toggleDialog(),     // Alt+W → Anchor Watch
  'alt+z': () => mapService.centerOnVessel(),           // Alt+Z → Center map
  'escape': () => closeAllPanels(),                     // Esc → Cerrar panels
};
```

### 9.3 Accesibilidad WCAG AA — Checklist

```markdown
## Accesibilidad Obligatoria

### Contraste de Color
- [ ] Texto normal: ratio 4.5:1 mínimo
- [ ] Texto grande (≥18px bold): ratio 3:1 mínimo
- [ ] Elementos gráficos: ratio 3:1 con fondo
- Verificar con: https://webaim.org/resources/contrastchecker/

Night Mode critical pairs:
- --gb-text-value (#ffffff) sobre --gb-bg-panel: ✅ >21:1
- --gb-needle-primary (#ff5722) sobre --gb-bg-bezel: verificar
- --gb-text-muted (#687d97) sobre --gb-bg-bezel: verificar (puede ser <4.5:1)

Day Mode critical pairs:
- --gb-text-value (#090e13) sobre --gb-bg-panel: ✅ >20:1
- --gb-needle-primary (#d83b01) sobre --gb-bg-face: verificar

### Focus Management
- [ ] Todos los controles interactivos tienen :focus-visible visible
- [ ] Orden de tab lógico (top-left a bottom-right)
- [ ] Modales atrapan el foco (focus trap)
- [ ] Escape cierra overlays/modales

### ARIA
- [ ] SVG de instrumentos: role="img" aria-label="SOG: 6.2 knots"
- [ ] Alarmas: role="alert" aria-live="assertive"
- [ ] Nav: role="navigation" aria-label="Main navigation"
- [ ] Botones icon-only: aria-label descriptivo
- [ ] Toggle theme: aria-pressed

### Touch
- [ ] Mínimo 44×44px para todos los controles táctiles
- [ ] 48×48px para controles críticos (MOB, ACK alarma)
- [ ] No hover-only interactions
```

---

## 10. TRACKING DOCUMENT

```markdown
# UX/UI Final Product Status

**Proyecto:** Open Marine Instrumentation  
**Target:** UI Comercial Final v1.0  
**Inicio:** [FECHA]  

## Estado por Sección
| Sección | Descripción | Estado | Notas |
|---------|-------------|--------|-------|
| S1 | Global Top Bar | PENDIENTE | Datos vessel + theme toggle |
| S2 | Alarm Banner | PENDIENTE | Severidad + acciones rápidas |
| S3 | Sidenav → Icon Rail | PENDIENTE | 64px, solo iconos |
| S4 | Dashboard Layout | PENDIENTE | Grid adaptativo |
| S5 | Widget Card Glass | PENDIENTE | Bisel + quality indicator |
| S6 | Instruments Page | PENDIENTE | Grid de tiles |
| S7 | Alarms Page | PENDIENTE | Lista + config |
| S8 | Settings Page | PENDIENTE | Sidebar + panels |
| S9 | Tipografía completa | PENDIENTE | Classes type-* |
| S10 | Micro-interacciones | PENDIENTE | Skeleton, transitions |
| S11 | Accesibilidad | PENDIENTE | WCAG AA audit |
| S12 | Iconos náuticos | PENDIENTE | Añadir al sprite |

## Componentes del Styleguide Reutilizados
| Componente | Usado en | Estado |
|------------|---------|--------|
| AppButton | Alarms ACK/Silence, Settings actions | ✅ Existente |
| AppToggle | Settings toggles | ✅ Existente |
| AppTabs | Left panel chart, Settings sidebar mobile | ✅ Existente |
| AppSlider | Alarm thresholds en Settings | ✅ Existente |
| AppInput | Settings connection URL | ✅ Existente |
| AppTooltip | Top bar connection, theme btn | ✅ Existente |
| AppSelect | Settings units, chart tiles | ✅ Existente |

## Criterios de Release UI v1.0
- [ ] Global Top Bar con todos los datos vessel
- [ ] Alarm Banner semántico con animaciones
- [ ] Sidenav Icon Rail de 64px funcional
- [ ] Dashboard cards con Glass Bridge design
- [ ] Instruments grid con tiles coherentes
- [ ] Settings con sidebar de categorías
- [ ] Day/Night transition ≤ 400ms sin parpadeo
- [ ] Touch targets ≥ 44px verificados
- [ ] WCAG AA contraste verificado
- [ ] 60fps durante transiciones

## Próximo Paso Exacto
[El agente escribe aquí el siguiente paso atómico]
```

---

## 11. ORDEN DE IMPLEMENTACIÓN PARA EL AGENTE

Seguir este orden exacto para no romper la app en ningún momento:

```
SESIÓN 1: Global Top Bar
  → Modificar global-top-bar (ya existe como app-top-bar)
  → Añadir datos SOG/COG/HDG/POS desde GlobalTopBarFacade
  → Aplicar estilos Glass Bridge

SESIÓN 2: Sidenav → Icon Rail
  → Reducir sidenav a 64px fijo
  → Eliminar texto, solo íconos con title para tooltip
  → Añadir nav-item badge para alarmas

SESIÓN 3: Alarm Banner
  → Refactorizar alarm-banner con estilos semánticos
  → Añadir severidad dinámica (emergency/critical/warning)
  → Animación pulsante para emergency/critical

SESIÓN 4: Dashboard Cards
  → Rediseñar cada panel (navigation, wind, depth, power, system)
  → Aplicar widget-card glass style
  → Quality dot en cada card

SESIÓN 5: Instruments Page
  → Implementar instruments-grid
  → Instrument tile component
  → Categorías con section headers

SESIÓN 6: Alarms Page
  → alarm-row component con severidad
  → Sección de configuración con sliders
  → Botones ACK/Silence con AppButton existente

SESIÓN 7: Settings Page
  → settings-sidebar navigation
  → settings-group + settings-row
  → Secciones Connection, Vessel, Display, Units, Alarms

SESIÓN 8: Tipografía y Pulido Final
  → Aplicar type-* classes en toda la app
  → Revisar consistencia visual
  → Validar contraste WCAG AA
  → Test touch targets

SESIÓN 9: Accesibilidad y Performance
  → ARIA labels
  → focus-visible styles
  → Skeleton loaders
  → Animaciones de transición
```

---

*Documento generado para Open Marine Instrumentation — UI Commercial Final*  
*Basado en Design System existente + Glass Bridge Enhancement*  
*Todas las implementaciones usan componentes del styleguide cuando están disponibles*
