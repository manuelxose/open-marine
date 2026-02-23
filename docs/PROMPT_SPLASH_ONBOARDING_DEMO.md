# 🚢 PROMPT: Splash Screen, Onboarding Demo & Guided Tour

## Contexto del Proyecto

Estás trabajando en **Open Marine Instrumentation (OMI)**, una aplicación de instrumentación marina profesional construida con **Angular 21.1** (standalone components, no NgModules). La app funciona como un chartplotter profesional tipo Garmin/Raymarine, mostrando datos de navegación en tiempo real vía Signal K.

### Stack Técnico
- **Framework**: Angular 21.1 (standalone components)
- **Build**: Angular CLI 21.1.1 + esbuild
- **Estilos**: SCSS con CSS Custom Properties (design tokens)
- **Paleta**: Nord-inspired + colores náuticos
- **Tipografía**: Space Grotesk (display) + JetBrains Mono (datos)
- **State**: RxJS + Angular Signals + BehaviorSubjects
- **Routing**: Lazy loading por feature
- **Persistencia local**: `localStorage` vía `PreferencesService`

### Principios de Diseño
1. Alta legibilidad en condiciones marinas (día/noche)
2. Touch-friendly: targets mínimos de 44px
3. Estética Glass Bridge profesional
4. Feedback visual inmediato
5. Soporte completo de temas day/night

---

## 🎯 Objetivo General

Implementar **tres sistemas interconectados** que den a OMI el acabado de una aplicación comercial profesional:

1. **Splash Screen** — Pantalla de carga con logo y animación al iniciar la app
2. **Onboarding / Setup Inicial** — Wizard de configuración + demo guiada que se muestra la primera vez
3. **Integración en Settings** — Toggle para volver a activar/repetir la demo desde la configuración

---

## PARTE 1: SPLASH SCREEN

### 1.1 Descripción Funcional

Al abrir la app (`http://localhost:4200`), ANTES de mostrar el `AppShellComponent`, se debe mostrar una pantalla de splash profesional que:

- Muestre el **logo de OMI** centrado (un SVG de ancla/compás o similar temática marina)
- Muestre el **nombre de la app**: "Open Marine Instrumentation"
- Muestre un **loader animado** sutil (spinner náutico, barra de progreso, o puntos)
- Muestre un **texto de estado** que cambie: "Initializing...", "Loading instruments...", "Connecting to Signal K...", "Ready"
- Tenga una **duración mínima de 2.5 segundos** (para que no sea un flash)
- Se desvanezca con una **transición suave** (fade-out + scale) antes de mostrar la app
- Respete el **tema activo** (day/night) leyendo de localStorage directamente

### 1.2 Arquitectura

```
src/app/
├── core/
│   └── splash/
│       ├── splash-screen.component.ts      # Componente standalone
│       ├── splash-screen.component.scss     # Estilos con animaciones
│       └── splash.service.ts               # Controla el ciclo de vida del splash
```

### 1.3 Implementación del SplashService

```typescript
// splash.service.ts
@Injectable({ providedIn: 'root' })
export class SplashService {
  private readonly _visible = new BehaviorSubject<boolean>(true);
  private readonly _status = new BehaviorSubject<string>('Initializing...');
  
  readonly visible$ = this._visible.asObservable();
  readonly status$ = this._status.asObservable();
  
  private readonly MIN_DISPLAY_TIME = 2500; // ms
  private startTime = Date.now();

  updateStatus(message: string): void {
    this._status.next(message);
  }

  async hideSplash(): Promise<void> {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.MIN_DISPLAY_TIME - elapsed);
    
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
    
    this._visible.next(false);
  }
}
```

### 1.4 Integración en AppComponent

Modificar `src/app/app.ts`:

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent, AppToastContainerComponent, MOBAlertComponent, SplashScreenComponent],
  template: `
    @if (splash.visible$ | async) {
      <app-splash-screen />
    } @else {
      <app-app-shell></app-app-shell>
      <app-mob-alert></app-mob-alert>
      <app-toast-container></app-toast-container>
    }
  `,
})
export class AppComponent implements OnInit {
  splash = inject(SplashService);
  private signalK = inject(SignalKClientService);
  
  async ngOnInit() {
    this.splash.updateStatus('Loading instruments...');
    // Esperar a que Signal K intente conectar (o timeout de 2s)
    this.splash.updateStatus('Connecting to Signal K...');
    
    // Simular carga de módulos / datos iniciales
    await firstValueFrom(this.signalK.connected$.pipe(
      filter(c => c === true),
      timeout(3000),
      catchError(() => of(false))
    ));
    
    this.splash.updateStatus('Ready');
    await this.splash.hideSplash();
  }
}
```

### 1.5 Diseño Visual del Splash

El componente debe tener estas características visuales:

```scss
// splash-screen.component.scss

:host {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  // Leer tema de localStorage directamente para evitar FOUC
  background: var(--splash-bg, #1a1f2e); // Fallback oscuro
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

:host(.fade-out) {
  opacity: 0;
  transform: scale(1.02);
  pointer-events: none;
}

.splash-logo {
  width: 120px;
  height: 120px;
  animation: logo-pulse 2s ease-in-out infinite;
  // SVG del logo con colores del tema
}

.splash-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-1);
  margin-top: 1.5rem;
}

.splash-subtitle {
  font-size: 0.8rem;
  color: var(--text-2);
  margin-top: 0.5rem;
  letter-spacing: 0.05em;
}

.splash-loader {
  margin-top: 3rem;
  // Loader circular tipo compás que gira
}

.splash-status {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: var(--text-2);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
  transition: opacity 0.3s;
}

@keyframes logo-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.05); opacity: 1; }
}
```

### 1.6 Logo SVG

Crear un SVG profesional como logo de la app. Opciones:
- **Compás de navegación** estilizado con líneas limpias
- **Ancla + onda** minimalista
- **Rosa de los vientos** simplificada

El SVG debe:
- Ser monocolor (usar `currentColor` para adaptarse al tema)
- Tener un `viewBox` cuadrado (e.g., `0 0 64 64`)
- Funcionar tanto en day como night mode
- Almacenarse como SVG inline en el componente o en `assets/logo/omi-logo.svg`

### 1.7 Requisitos del Loader

Implementar un loader circular tipo compás:
- Círculo exterior con trazo discontinuo que rota
- Aguja interior que oscila suavemente
- Colores: `var(--accent)` para el trazo activo, `var(--border)` para el fondo
- Tamaño: 48px × 48px
- Animación CSS pura (no JS)

---

## PARTE 2: ONBOARDING / SETUP INICIAL + DEMO GUIADA

### 2.1 Descripción Funcional

La **primera vez** que un usuario abre la app (detectado via `localStorage`), después del splash screen se muestra un **wizard de configuración inicial** que incluye:

1. **Pantalla de Bienvenida** — Presentación de OMI con logo grande
2. **Configuración básica** — Idioma, tema, unidades de medida
3. **Conexión Signal K** — Input para URL del servidor (con detección automática)
4. **Guided Tour** — Demo interactiva que recorre las principales secciones de la app

Después de completarlo (o saltar), la app arranca normalmente y la flag se guarda.

### 2.2 Arquitectura

```
src/app/
├── core/
│   └── onboarding/
│       ├── onboarding.service.ts             # Estado y lógica del onboarding
│       ├── onboarding-overlay.component.ts   # Container/overlay principal
│       ├── steps/
│       │   ├── welcome-step.component.ts     # Paso 1: Bienvenida
│       │   ├── preferences-step.component.ts # Paso 2: Idioma, tema, unidades
│       │   ├── connection-step.component.ts  # Paso 3: Conexión Signal K
│       │   └── tour-step.component.ts        # Paso 4: Inicio del tour
│       └── tour/
│           ├── guided-tour.service.ts        # Orquesta el tour paso a paso
│           ├── tour-highlight.component.ts   # Overlay que resalta elementos
│           └── tour-tooltip.component.ts     # Tooltip con explicación
```

### 2.3 OnboardingService

```typescript
// onboarding.service.ts

const ONBOARDING_KEY = 'omi-onboarding-completed';
const TOUR_ENABLED_KEY = 'omi-tour-enabled';

export interface OnboardingState {
  completed: boolean;       // Ha completado el setup inicial
  tourEnabled: boolean;     // La demo/tour está activada (para repetirla)
  currentStep: number;      // Paso actual del wizard (0-3)
  tourActive: boolean;      // El tour guiado está activo ahora mismo
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly state = new BehaviorSubject<OnboardingState>({
    completed: this.loadCompleted(),
    tourEnabled: this.loadTourEnabled(),
    currentStep: 0,
    tourActive: false,
  });
  
  readonly state$ = this.state.asObservable();
  readonly shouldShowOnboarding$ = this.state$.pipe(map(s => !s.completed));
  readonly isTourActive$ = this.state$.pipe(map(s => s.tourActive));
  
  get snapshot(): OnboardingState { return this.state.value; }

  /** Avanza al siguiente paso del wizard */
  nextStep(): void {
    const current = this.state.value;
    this.state.next({ ...current, currentStep: current.currentStep + 1 });
  }

  /** Retrocede al paso anterior */
  prevStep(): void {
    const current = this.state.value;
    if (current.currentStep > 0) {
      this.state.next({ ...current, currentStep: current.currentStep - 1 });
    }
  }

  /** Salta el onboarding completo */
  skip(): void {
    this.markCompleted();
  }

  /** Marca el onboarding como completado */
  markCompleted(): void {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    this.state.next({ ...this.state.value, completed: true, tourActive: false });
  }

  /** Inicia el tour guiado (desde onboarding o desde settings) */
  startTour(): void {
    this.state.next({ ...this.state.value, tourActive: true });
  }

  /** Finaliza el tour guiado */
  endTour(): void {
    this.state.next({ ...this.state.value, tourActive: false });
    // Si venía del onboarding, marcar como completado
    if (!this.state.value.completed) {
      this.markCompleted();
    }
  }

  /** Toggle del tour desde settings */
  setTourEnabled(enabled: boolean): void {
    localStorage.setItem(TOUR_ENABLED_KEY, JSON.stringify(enabled));
    this.state.next({ ...this.state.value, tourEnabled: enabled });
    if (enabled) {
      this.startTour();
    }
  }

  /** Resetear onboarding (para desarrollo/testing) */
  reset(): void {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(TOUR_ENABLED_KEY);
    this.state.next({
      completed: false,
      tourEnabled: false,
      currentStep: 0,
      tourActive: false,
    });
  }

  private loadCompleted(): boolean {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  }

  private loadTourEnabled(): boolean {
    try { return JSON.parse(localStorage.getItem(TOUR_ENABLED_KEY) || 'false'); } 
    catch { return false; }
  }
}
```

### 2.4 Wizard de Onboarding — Componente Overlay

```typescript
// onboarding-overlay.component.ts

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule, WelcomeStepComponent, PreferencesStepComponent, ConnectionStepComponent, TourStepComponent],
  template: `
    <div class="onboarding-overlay" @fadeIn>
      <div class="onboarding-container">
        <!-- Progress indicator -->
        <div class="step-indicators">
          @for (step of steps; track step.id; let i = $index) {
            <div class="step-dot" 
                 [class.active]="i === currentStep()"
                 [class.completed]="i < currentStep()">
            </div>
          }
        </div>

        <!-- Step content -->
        <div class="step-content" [@stepTransition]="currentStep()">
          @switch (currentStep()) {
            @case (0) { <app-welcome-step (next)="next()" (skip)="skip()" /> }
            @case (1) { <app-preferences-step (next)="next()" (back)="back()" /> }
            @case (2) { <app-connection-step (next)="next()" (back)="back()" /> }
            @case (3) { <app-tour-step (startTour)="startTour()" (skip)="finish()" /> }
          }
        </div>

        <!-- Skip button -->
        <button class="skip-all-btn" (click)="skip()">
          {{ 'onboarding.skipAll' | translate }}
        </button>
      </div>
    </div>
  `,
  // ... styles y animations
})
export class OnboardingOverlayComponent {
  private onboarding = inject(OnboardingService);
  
  steps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'connection', label: 'Connection' },
    { id: 'tour', label: 'Tour' },
  ];
  
  currentStep = computed(() => this.onboarding.snapshot.currentStep);
  
  next() { this.onboarding.nextStep(); }
  back() { this.onboarding.prevStep(); }
  skip() { this.onboarding.skip(); }
  finish() { this.onboarding.markCompleted(); }
  startTour() {
    this.onboarding.markCompleted(); // Cierra el wizard
    this.onboarding.startTour();     // Inicia el tour sobre la app real
  }
}
```

### 2.5 Pasos del Wizard

#### Paso 1: Welcome Step

```
┌─────────────────────────────────────────┐
│                                         │
│            [Logo OMI grande]            │
│                                         │
│     Open Marine Instrumentation         │
│                                         │
│   Your professional navigation system   │
│   for open-source marine computing.     │
│                                         │
│   • Real-time instrument data           │
│   • Chart plotter with AIS             │
│   • Alarm system & MOB                  │
│   • Autopilot integration              │
│                                         │
│         [ Get Started →  ]              │
│                                         │
│           Skip setup ↓                  │
└─────────────────────────────────────────┘
```

- Logo grande con animación de entrada
- Breve descripción de la app
- Lista de features principales con iconos
- Botón "Get Started" prominente
- Link "Skip setup" discreto

#### Paso 2: Preferences Step

```
┌─────────────────────────────────────────┐
│                                         │
│       ⚙️  Basic Configuration           │
│                                         │
│   Language                              │
│   ┌────────────────────────────┐        │
│   │ English              ▼    │        │
│   └────────────────────────────┘        │
│                                         │
│   Theme                                 │
│   ┌─────────┐  ┌─────────┐             │
│   │  ☀ Day  │  │ 🌙 Night │            │
│   └─────────┘  └─────────┘             │
│                                         │
│   Speed Unit                            │
│   ┌──────┐ ┌──────┐ ┌───────┐          │
│   │  kn  │ │ m/s  │ │ km/h  │          │
│   └──────┘ └──────┘ └───────┘          │
│                                         │
│   Depth Unit                            │
│   ┌──────┐ ┌──────┐                    │
│   │  m   │ │  ft  │                    │
│   └──────┘ └──────┘                    │
│                                         │
│      [ ← Back ]    [ Next → ]           │
└─────────────────────────────────────────┘
```

- Cada opción se aplica inmediatamente vía `PreferencesService`
- Botones de selección tipo pill/card para tema y unidades
- Select nativo para idioma
- Los cambios se reflejan en tiempo real (el tema cambia al seleccionarlo)

#### Paso 3: Connection Step

```
┌─────────────────────────────────────────┐
│                                         │
│       🔗  Signal K Connection           │
│                                         │
│   Server URL                            │
│   ┌────────────────────────────┐        │
│   │ http://localhost:3000      │        │
│   └────────────────────────────┘        │
│                                         │
│   [ 🔍 Auto-detect ]                   │
│                                         │
│   Status:  ● Connected                  │
│   Server:  Signal K v2.12.0             │
│   Self:    vessels.urn:mrn:...          │
│                                         │
│   ⓘ You can change this later in        │
│     Settings → Connection               │
│                                         │
│      [ ← Back ]    [ Next → ]           │
└─────────────────────────────────────────┘
```

- Input para la URL del servidor Signal K
- Botón de auto-detección (mDNS/network scan fallback)
- Indicador de estado de conexión en tiempo real
- Info del servidor una vez conectado
- Nota de que se puede cambiar después

#### Paso 4: Tour Step (Pre-tour)

```
┌─────────────────────────────────────────┐
│                                         │
│       🗺️  Explore OMI                   │
│                                         │
│   Would you like a quick guided         │
│   tour of the application?              │
│                                         │
│   We'll show you:                       │
│   📊 Dashboard — Live instruments       │
│   🗺️ Chart — Navigation map            │
│   ⚓ Instruments — Detailed gauges      │
│   🔔 Alarms — Safety system            │
│   ⚙️ Settings — Customization          │
│                                         │
│   Takes about 2 minutes.               │
│                                         │
│   [ Start Tour 🎯 ]                    │
│                                         │
│   [ Skip, go to app → ]                │
└─────────────────────────────────────────┘
```

- Presenta qué incluye el tour
- Estimación de tiempo
- Botón prominente para iniciar
- Opción de saltar

### 2.6 Estilos del Wizard

```scss
.onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.onboarding-container {
  width: 100%;
  max-width: 520px;
  padding: 2rem;
  text-align: center;
}

.step-indicators {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.3s ease;
  
  &.active {
    background: var(--accent);
    transform: scale(1.3);
  }
  
  &.completed {
    background: var(--success, #22c55e);
  }
}

.step-content {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

// Botones de navegación del wizard
.wizard-nav {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  
  .btn-primary {
    background: var(--accent);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover { filter: brightness(1.1); transform: translateY(-1px); }
  }
  
  .btn-secondary {
    background: transparent;
    color: var(--text-2);
    border: 1px solid var(--border);
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    
    &:hover { border-color: var(--text-2); color: var(--text-1); }
  }
}

// Opciones tipo pill
.option-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0.75rem 0;
}

.option-pill {
  padding: 0.6rem 1.25rem;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--surface-1);
  color: var(--text-2);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &.selected {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
  }
  
  &:hover:not(.selected) {
    border-color: var(--text-2);
  }
}

.skip-all-btn {
  margin-top: 2rem;
  background: none;
  border: none;
  color: var(--text-2);
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0.6;
  
  &:hover { opacity: 1; text-decoration: underline; }
}
```

---

## PARTE 3: GUIDED TOUR (DEMO INTERACTIVA)

### 3.1 Descripción Funcional

El Guided Tour es una **demo interactiva tipo spotlight/coach-marks** que:

- Se superpone sobre la app real (no una simulación)
- Resalta elementos específicos con un **spotlight** (overlay oscuro con hueco)
- Muestra **tooltips explicativos** junto a cada elemento resaltado
- Permite navegar: **Siguiente**, **Anterior**, **Saltar**
- Muestra un **indicador de progreso** (e.g., "3 de 12")
- **Navega automáticamente** entre páginas cuando el tour lo requiere (e.g., va a /chart para explicar el mapa)
- Se puede **cerrar en cualquier momento**

### 3.2 Definición de Pasos del Tour

```typescript
// tour/tour-steps.ts

export interface TourStep {
  id: string;
  route?: string;              // Ruta a navegar antes de mostrar el paso
  targetSelector: string;      // CSS selector del elemento a resaltar
  title: string;               // Título del tooltip (i18n key)
  description: string;         // Descripción del tooltip (i18n key)
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightPadding?: number;   // Padding extra alrededor del highlight (px)
  beforeShow?: () => Promise<void>; // Hook antes de mostrar (e.g., abrir un drawer)
}

export const TOUR_STEPS: TourStep[] = [
  // --- SIDEBAR ---
  {
    id: 'sidebar',
    targetSelector: '.sidenav',
    title: 'tour.sidebar.title',           // "Navigation Menu"
    description: 'tour.sidebar.desc',      // "Access all sections of OMI from here. The sidebar can be collapsed for more screen space."
    position: 'right',
  },

  // --- DASHBOARD ---
  {
    id: 'dashboard-overview',
    route: '/dashboard',
    targetSelector: '.dashboard-content',   // Ajustar al selector real
    title: 'tour.dashboard.title',          // "Dashboard"
    description: 'tour.dashboard.desc',     // "Your real-time instrument overview. See speed, heading, depth, wind, and more at a glance."
    position: 'center',
  },
  {
    id: 'dashboard-strip',
    route: '/dashboard',
    targetSelector: '.critical-strip',      // Ajustar al selector real
    title: 'tour.strip.title',             // "Critical Data Strip"
    description: 'tour.strip.desc',        // "The most important navigation data always visible at the top: SOG, COG, depth, and wind."
    position: 'bottom',
  },

  // --- CHART ---
  {
    id: 'chart-overview',
    route: '/chart',
    targetSelector: '.chart-page',
    title: 'tour.chart.title',             // "Navigation Chart"
    description: 'tour.chart.desc',        // "Full-screen chart plotter with your vessel position, AIS targets, waypoints, and routes."
    position: 'center',
  },
  {
    id: 'chart-controls',
    route: '/chart',
    targetSelector: '.map-controls',        // Ajustar al selector real
    title: 'tour.chartControls.title',     // "Map Controls"
    description: 'tour.chartControls.desc', // "Zoom, center on vessel, toggle north-up/head-up orientation, and manage map layers."
    position: 'left',
  },
  {
    id: 'chart-instruments',
    route: '/chart',
    targetSelector: '.instruments-drawer-toggle', // Ajustar al selector real
    title: 'tour.chartInstr.title',        // "Instrument Overlay"
    description: 'tour.chartInstr.desc',   // "Open the instruments drawer to see compass, wind rose, depth gauge, and more overlaid on the chart."
    position: 'left',
  },

  // --- INSTRUMENTS ---
  {
    id: 'instruments-page',
    route: '/instruments',
    targetSelector: 'app-instruments-page',
    title: 'tour.instruments.title',       // "Instruments"
    description: 'tour.instruments.desc',  // "Detailed instrument displays with customizable widgets. Drag to reorder, resize, and configure."
    position: 'center',
  },

  // --- ALARMS ---
  {
    id: 'alarms-page',
    route: '/alarms',
    targetSelector: 'app-alarms-page',
    title: 'tour.alarms.title',           // "Alarms & Safety"
    description: 'tour.alarms.desc',      // "Configure depth alarms, CPA warnings, anchor watch, and Man Overboard (MOB) emergency alert."
    position: 'center',
  },

  // --- TOP BAR ---
  {
    id: 'topbar-connection',
    targetSelector: 'app-top-bar',
    title: 'tour.topbar.title',           // "Status Bar"
    description: 'tour.topbar.desc',      // "Shows connection status, current position, and quick access to theme toggle and alerts."
    position: 'bottom',
  },

  // --- SETTINGS ---
  {
    id: 'settings-page',
    route: '/settings',
    targetSelector: 'app-settings-page',
    title: 'tour.settings.title',         // "Settings"
    description: 'tour.settings.desc',    // "Customize units, theme, language, alarm thresholds, and widget layout. You can restart this tour from here anytime."
    position: 'center',
  },

  // --- FINAL ---
  {
    id: 'tour-complete',
    targetSelector: 'body',
    title: 'tour.complete.title',         // "You're All Set! 🎉"
    description: 'tour.complete.desc',    // "OMI is ready for navigation. Fair winds and following seas! You can replay this tour anytime from Settings."
    position: 'center',
  },
];
```

### 3.3 GuidedTourService

```typescript
// tour/guided-tour.service.ts

@Injectable({ providedIn: 'root' })
export class GuidedTourService {
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingService);
  
  private readonly _currentStepIndex = new BehaviorSubject<number>(0);
  private readonly _isActive = new BehaviorSubject<boolean>(false);
  
  readonly currentStepIndex$ = this._currentStepIndex.asObservable();
  readonly isActive$ = this._isActive.asObservable();
  readonly totalSteps = TOUR_STEPS.length;
  
  readonly currentStep$ = this._currentStepIndex.pipe(
    map(i => TOUR_STEPS[i] ?? null)
  );
  
  readonly progress$ = this._currentStepIndex.pipe(
    map(i => ({ current: i + 1, total: this.totalSteps }))
  );

  async start(): Promise<void> {
    this._currentStepIndex.next(0);
    this._isActive.next(true);
    await this.navigateToStep(TOUR_STEPS[0]);
  }

  async next(): Promise<void> {
    const nextIndex = this._currentStepIndex.value + 1;
    if (nextIndex >= TOUR_STEPS.length) {
      this.end();
      return;
    }
    this._currentStepIndex.next(nextIndex);
    await this.navigateToStep(TOUR_STEPS[nextIndex]);
  }

  async prev(): Promise<void> {
    const prevIndex = Math.max(0, this._currentStepIndex.value - 1);
    this._currentStepIndex.next(prevIndex);
    await this.navigateToStep(TOUR_STEPS[prevIndex]);
  }

  end(): void {
    this._isActive.next(false);
    this._currentStepIndex.next(0);
    this.onboarding.endTour();
  }

  private async navigateToStep(step: TourStep): Promise<void> {
    if (step.route) {
      await this.router.navigate([step.route]);
      // Esperar a que el componente se renderice
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (step.beforeShow) {
      await step.beforeShow();
    }
  }
}
```

### 3.4 Tour Highlight Component

```typescript
// tour/tour-highlight.component.ts
// Overlay que cubre toda la pantalla con un "hueco" spotlight sobre el elemento target

@Component({
  selector: 'app-tour-highlight',
  standalone: true,
  imports: [CommonModule, TourTooltipComponent, TranslatePipe],
  template: `
    @if (tourService.isActive$ | async) {
      <div class="tour-overlay" (click)="onOverlayClick($event)">
        <!-- SVG overlay con hueco -->
        <svg class="tour-mask" width="100%" height="100%">
          <defs>
            <mask id="tour-spotlight">
              <rect width="100%" height="100%" fill="white" />
              <rect 
                [attr.x]="spotlight().x" 
                [attr.y]="spotlight().y"
                [attr.width]="spotlight().width"
                [attr.height]="spotlight().height"
                [attr.rx]="12"
                fill="black" 
              />
            </mask>
          </defs>
          <rect 
            width="100%" height="100%" 
            fill="rgba(0,0,0,0.7)" 
            mask="url(#tour-spotlight)" 
          />
        </svg>

        <!-- Tooltip -->
        <app-tour-tooltip
          [step]="currentStep()"
          [progress]="progress()"
          [position]="tooltipPosition()"
          (next)="tourService.next()"
          (prev)="tourService.prev()"
          (close)="tourService.end()"
        />
      </div>
    }
  `,
  styles: [`
    .tour-overlay {
      position: fixed;
      inset: 0;
      z-index: 8000;
      pointer-events: all;
    }
    .tour-mask {
      position: absolute;
      inset: 0;
    }
  `]
})
```

### 3.5 Tour Tooltip Component

```typescript
// tour/tour-tooltip.component.ts

@Component({
  selector: 'app-tour-tooltip',
  template: `
    <div class="tour-tooltip" [style]="tooltipStyle()">
      <div class="tooltip-header">
        <span class="tooltip-progress">{{ progress.current }} / {{ progress.total }}</span>
        <button class="tooltip-close" (click)="close.emit()">✕</button>
      </div>
      
      <h3 class="tooltip-title">{{ step.title | translate }}</h3>
      <p class="tooltip-desc">{{ step.description | translate }}</p>
      
      <div class="tooltip-actions">
        <button 
          class="btn-back" 
          (click)="prev.emit()" 
          [disabled]="progress.current === 1">
          {{ 'tour.back' | translate }}
        </button>
        
        <button class="btn-next" (click)="next.emit()">
          {{ progress.current === progress.total 
             ? ('tour.finish' | translate) 
             : ('tour.next' | translate) }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .tour-tooltip {
      position: absolute;
      width: 340px;
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.25rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 8001;
      pointer-events: all;
    }
    
    .tooltip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    
    .tooltip-progress {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    
    .tooltip-close {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-2);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem;
      &:hover { background: var(--surface-2); }
    }
    
    .tooltip-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-1);
      margin-bottom: 0.5rem;
    }
    
    .tooltip-desc {
      font-size: 0.85rem;
      color: var(--text-2);
      line-height: 1.5;
      margin-bottom: 1.25rem;
    }
    
    .tooltip-actions {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }
    
    .btn-next {
      flex: 1;
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.6rem 1rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      &:hover { filter: brightness(1.1); }
    }
    
    .btn-back {
      background: transparent;
      color: var(--text-2);
      border: 1px solid var(--border);
      padding: 0.6rem 1rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      &:disabled { opacity: 0.3; cursor: not-allowed; }
      &:hover:not(:disabled) { border-color: var(--text-2); }
    }
  `]
})
```

### 3.6 Posicionamiento del Tooltip

El tooltip debe posicionarse inteligentemente:

```typescript
// Dentro de tour-highlight.component.ts

private calculateSpotlight(): { x: number; y: number; width: number; height: number } {
  const step = this.currentStepSignal();
  if (!step) return { x: 0, y: 0, width: 0, height: 0 };
  
  const el = document.querySelector(step.targetSelector);
  if (!el) return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  
  const rect = el.getBoundingClientRect();
  const pad = step.highlightPadding ?? 8;
  
  return {
    x: rect.left - pad,
    y: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

private calculateTooltipPosition(): { top: string; left: string } {
  const step = this.currentStepSignal();
  const spot = this.calculateSpotlight();
  
  // Lógica según step.position
  switch (step?.position) {
    case 'bottom':
      return { top: `${spot.y + spot.height + 16}px`, left: `${spot.x}px` };
    case 'top':
      return { top: `${spot.y - 200}px`, left: `${spot.x}px` };
    case 'right':
      return { top: `${spot.y}px`, left: `${spot.x + spot.width + 16}px` };
    case 'left':
      return { top: `${spot.y}px`, left: `${spot.x - 356}px` };
    case 'center':
    default:
      return { top: '50%', left: '50%' }; // Con transform: translate(-50%, -50%)
  }
}
```

---

## PARTE 4: INTEGRACIÓN EN SETTINGS

### 4.1 Añadir sección al SettingsPage existente

Añadir una nueva sección en `src/app/pages/settings/settings.page.ts` dentro del template, **después de las secciones existentes**:

```html
<!-- Onboarding & Tour Section -->
<section class="settings-section">
  <h2>{{ 'settings.sections.tour' | translate }}</h2>
  
  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">{{ 'settings.tour.replay.label' | translate }}</span>
      <span class="setting-description">{{ 'settings.tour.replay.description' | translate }}</span>
    </div>
    <button class="theme-toggle" (click)="startTour()">
      {{ 'settings.tour.replay.button' | translate }}
    </button>
  </div>

  <div class="setting-item">
    <div class="setting-info">
      <span class="setting-label">{{ 'settings.tour.reset.label' | translate }}</span>
      <span class="setting-description">{{ 'settings.tour.reset.description' | translate }}</span>
    </div>
    <button class="reset-btn" style="width: auto; margin-top: 0;" (click)="resetOnboarding()">
      {{ 'settings.tour.reset.button' | translate }}
    </button>
  </div>
</section>
```

### 4.2 Lógica en SettingsPage

Añadir al componente `SettingsPage`:

```typescript
// Inyectar el servicio
private readonly onboardingService = inject(OnboardingService);
private readonly guidedTourService = inject(GuidedTourService);

/** Inicia el tour guiado desde settings */
startTour(): void {
  this.guidedTourService.start();
}

/** Resetea el onboarding para que se muestre de nuevo al recargar */
resetOnboarding(): void {
  this.onboardingService.reset();
  // Opcional: mostrar toast de confirmación
  this.toastService.show({
    message: 'Onboarding has been reset. It will show on next app reload.',
    type: 'info',
    duration: 3000,
  });
}
```

### 4.3 Traducciones i18n

Añadir las keys al sistema de traducción existente (`LanguageService` / archivos de traducción):

```typescript
// EN
'onboarding.skipAll': 'Skip setup',
'tour.back': 'Back',
'tour.next': 'Next',
'tour.finish': 'Finish',
'tour.sidebar.title': 'Navigation Menu',
'tour.sidebar.desc': 'Access all sections of OMI from here. The sidebar can be collapsed for more screen space.',
'tour.dashboard.title': 'Dashboard',
'tour.dashboard.desc': 'Your real-time instrument overview. See speed, heading, depth, wind, and more at a glance.',
'tour.strip.title': 'Critical Data Strip',
'tour.strip.desc': 'The most important navigation data always visible: SOG, COG, depth, and wind.',
'tour.chart.title': 'Navigation Chart',
'tour.chart.desc': 'Full-screen chart plotter with your vessel position, AIS targets, waypoints, and routes.',
'tour.chartControls.title': 'Map Controls',
'tour.chartControls.desc': 'Zoom, center on vessel, toggle orientation, and manage map layers.',
'tour.chartInstr.title': 'Instrument Overlay',
'tour.chartInstr.desc': 'Open the instruments drawer to see compass, wind rose, and depth gauge overlaid on the chart.',
'tour.instruments.title': 'Instruments',
'tour.instruments.desc': 'Detailed instrument displays with customizable widgets. Drag to reorder and configure.',
'tour.alarms.title': 'Alarms & Safety',
'tour.alarms.desc': 'Configure depth alarms, CPA warnings, anchor watch, and Man Overboard emergency alert.',
'tour.topbar.title': 'Status Bar',
'tour.topbar.desc': 'Shows connection status, position, and quick access to theme toggle and alerts.',
'tour.settings.title': 'Settings',
'tour.settings.desc': 'Customize units, theme, language, and alarm thresholds. Restart this tour from here anytime.',
'tour.complete.title': 'You\'re All Set! 🎉',
'tour.complete.desc': 'OMI is ready for navigation. Fair winds and following seas!',
'settings.sections.tour': 'Guided Tour',
'settings.tour.replay.label': 'Replay Tour',
'settings.tour.replay.description': 'Start the guided tour again to explore all features of OMI.',
'settings.tour.replay.button': 'Start Tour',
'settings.tour.reset.label': 'Reset Initial Setup',
'settings.tour.reset.description': 'Show the initial setup wizard again on next app launch.',
'settings.tour.reset.button': 'Reset',

// ES
'onboarding.skipAll': 'Saltar configuración',
'tour.back': 'Atrás',
'tour.next': 'Siguiente',
'tour.finish': 'Finalizar',
'tour.sidebar.title': 'Menú de Navegación',
'tour.sidebar.desc': 'Accede a todas las secciones de OMI desde aquí. La barra lateral se puede colapsar para más espacio.',
'tour.dashboard.title': 'Panel Principal',
'tour.dashboard.desc': 'Vista general de instrumentos en tiempo real. Velocidad, rumbo, profundidad, viento y más.',
'tour.strip.title': 'Franja de Datos Críticos',
'tour.strip.desc': 'Los datos de navegación más importantes siempre visibles: SOG, COG, profundidad y viento.',
'tour.chart.title': 'Carta de Navegación',
'tour.chart.desc': 'Carta náutica con posición del barco, objetivos AIS, waypoints y rutas.',
'tour.chartControls.title': 'Controles del Mapa',
'tour.chartControls.desc': 'Zoom, centrar en embarcación, cambiar orientación y gestionar capas del mapa.',
'tour.chartInstr.title': 'Instrumentos Superpuestos',
'tour.chartInstr.desc': 'Abre el cajón de instrumentos para ver compás, rosa de vientos y sonda sobre la carta.',
'tour.instruments.title': 'Instrumentos',
'tour.instruments.desc': 'Displays de instrumentos detallados con widgets configurables. Arrastra para reordenar.',
'tour.alarms.title': 'Alarmas y Seguridad',
'tour.alarms.desc': 'Configura alarmas de profundidad, avisos CPA, vigilancia de ancla y alerta de Hombre al Agua (MOB).',
'tour.topbar.title': 'Barra de Estado',
'tour.topbar.desc': 'Muestra el estado de conexión, posición y acceso rápido al cambio de tema y alertas.',
'tour.settings.title': 'Configuración',
'tour.settings.desc': 'Personaliza unidades, tema, idioma y umbrales de alarma. Repite este tour desde aquí cuando quieras.',
'tour.complete.title': '¡Todo Listo! 🎉',
'tour.complete.desc': 'OMI está listo para navegar. ¡Buen viento y buena mar!',
'settings.sections.tour': 'Tour Guiado',
'settings.tour.replay.label': 'Repetir Tour',
'settings.tour.replay.description': 'Inicia el tour guiado de nuevo para explorar todas las funciones de OMI.',
'settings.tour.replay.button': 'Iniciar Tour',
'settings.tour.reset.label': 'Reiniciar Configuración Inicial',
'settings.tour.reset.description': 'Muestra el asistente de configuración inicial de nuevo al recargar la app.',
'settings.tour.reset.button': 'Reiniciar',
```

---

## PARTE 5: INTEGRACIÓN COMPLETA EN AppComponent

### 5.1 Flujo Completo

```
App Loads
    │
    ▼
[SplashScreen] ── 2.5s mínimo + conexión Signal K ──► Fade out
    │
    ▼
¿Onboarding completado? (localStorage)
    │
    ├── NO ──► [OnboardingOverlay] (wizard 4 pasos)
    │              │
    │              ├── Paso 4: "Start Tour" ──► [GuidedTour] sobre la app real
    │              │                                    │
    │              │                                    └── Fin ──► App normal
    │              │
    │              └── "Skip" ──► App normal
    │
    └── SÍ ──► App normal
                   │
                   └── Settings > "Start Tour" ──► [GuidedTour] sobre la app real
```

### 5.2 AppComponent Final

```typescript
// app.ts

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AppShellComponent, 
    AppToastContainerComponent, 
    MOBAlertComponent, 
    SplashScreenComponent, 
    OnboardingOverlayComponent,
    TourHighlightComponent,
  ],
  template: `
    <!-- Capa 1: Splash Screen -->
    @if (showSplash()) {
      <app-splash-screen />
    }
    
    <!-- Capa 2: App real (siempre renderizada después del splash) -->
    @if (!showSplash()) {
      <!-- Capa 2a: Onboarding overlay (si no completado) -->
      @if (showOnboarding()) {
        <app-onboarding-overlay />
      }
      
      <!-- Capa 2b: App shell (siempre visible bajo el onboarding) -->
      <app-app-shell />
      <app-mob-alert />
      <app-toast-container />
      
      <!-- Capa 2c: Tour highlight (superpuesto cuando activo) -->
      <app-tour-highlight />
    }
  `,
})
export class AppComponent implements OnInit {
  private splash = inject(SplashService);
  private onboarding = inject(OnboardingService);
  
  showSplash = toSignal(this.splash.visible$, { initialValue: true });
  showOnboarding = toSignal(this.onboarding.shouldShowOnboarding$, { initialValue: false });
  
  async ngOnInit() {
    // El splash se oculta solo cuando el servicio lo decide
    this.splash.updateStatus('Loading instruments...');
    this.splash.updateStatus('Connecting to Signal K...');
    
    // Esperar conexión o timeout
    await firstValueFrom(
      inject(SignalKClientService).connected$.pipe(
        filter(c => c),
        timeout(3000),
        catchError(() => of(false))
      )
    );
    
    this.splash.updateStatus('Ready');
    await this.splash.hideSplash();
  }
}
```

---

## PARTE 6: ARCHIVOS A CREAR / MODIFICAR

### Archivos NUEVOS a crear:

```
src/app/core/splash/
├── splash-screen.component.ts
├── splash-screen.component.scss
└── splash.service.ts

src/app/core/onboarding/
├── onboarding.service.ts
├── onboarding-overlay.component.ts
├── onboarding-overlay.component.scss
├── steps/
│   ├── welcome-step.component.ts
│   ├── preferences-step.component.ts
│   ├── connection-step.component.ts
│   └── tour-step.component.ts
└── tour/
    ├── guided-tour.service.ts
    ├── tour-steps.ts
    ├── tour-highlight.component.ts
    ├── tour-highlight.component.scss
    └── tour-tooltip.component.ts

src/assets/logo/
└── omi-logo.svg
```

### Archivos EXISTENTES a modificar:

| Archivo | Cambio |
|---------|--------|
| `src/app/app.ts` | Añadir imports de Splash, Onboarding, Tour. Reestructurar template. Añadir lógica ngOnInit. |
| `src/app/pages/settings/settings.page.ts` | Añadir sección "Guided Tour" con botones de replay y reset. Inyectar OnboardingService y GuidedTourService. |
| `src/app/core/services/language.service.ts` (o archivo de traducciones) | Añadir todas las keys i18n listadas en Parte 4.3. |

---

## PARTE 7: CRITERIOS DE VALIDACIÓN

### ✅ Splash Screen
- [ ] Se muestra al cargar la app antes de cualquier otro contenido
- [ ] Muestra logo, nombre, loader animado y texto de estado
- [ ] El texto de estado cambia progresivamente
- [ ] Dura mínimo 2.5 segundos
- [ ] Se desvanece suavemente al terminar
- [ ] Respeta el tema day/night activo
- [ ] No hay flash de contenido (FOUC) al desaparecer

### ✅ Onboarding Wizard
- [ ] Se muestra la primera vez que se abre la app (localStorage vacío)
- [ ] NO se muestra en visitas posteriores
- [ ] El wizard tiene 4 pasos con indicadores de progreso
- [ ] Se puede navegar adelante y atrás entre pasos
- [ ] Se puede saltar en cualquier momento
- [ ] El paso de preferencias aplica cambios en tiempo real
- [ ] El paso de conexión muestra el estado real de Signal K
- [ ] Las transiciones entre pasos son suaves

### ✅ Guided Tour
- [ ] Se puede iniciar desde el onboarding (paso 4) o desde settings
- [ ] Navega automáticamente entre páginas de la app
- [ ] Resalta el elemento correcto con spotlight
- [ ] El tooltip se posiciona correctamente sin salirse de pantalla
- [ ] Muestra progreso (X de Y)
- [ ] Se puede ir adelante, atrás, y cerrar
- [ ] Al cerrar, la app queda en estado normal
- [ ] Funciona correctamente tanto en day como night mode

### ✅ Integración Settings
- [ ] Hay un botón "Start Tour" en settings que inicia el tour
- [ ] Hay un botón "Reset" que reinicia el onboarding
- [ ] Después de reset, al recargar la página se muestra el onboarding

### ✅ General
- [ ] Todos los textos están en el sistema i18n (EN + ES)
- [ ] Todos los componentes son standalone
- [ ] No hay errores de TypeScript en compilación estricta
- [ ] Las animaciones son CSS puras (no dependencias externas)
- [ ] Touch-friendly (targets ≥ 44px)
- [ ] La app existente sigue funcionando exactamente igual si el onboarding ya está completado

---

## PARTE 8: PROTOCOLO DE EJECUCIÓN

### Orden de implementación recomendado:

1. **SplashService + SplashScreenComponent** — Componente independiente, fácil de probar
2. **Logo SVG** — Necesario para splash y onboarding
3. **OnboardingService** — Lógica de estado sin UI
4. **OnboardingOverlayComponent + Steps** — UI del wizard
5. **Integración en AppComponent** — Conectar splash + onboarding al flujo
6. **GuidedTourService + tour-steps.ts** — Lógica del tour sin UI
7. **TourHighlightComponent + TourTooltipComponent** — UI del tour
8. **Integración en Settings** — Botones de replay/reset
9. **Traducciones i18n** — Todas las keys EN + ES
10. **Testing y polish** — Verificar flujo completo, animaciones, edge cases

### ⚠️ Reglas obligatorias:

1. **NO instalar dependencias externas** — Todo con Angular + CSS puro
2. **NO romper la app existente** — Si el onboarding está completado, el usuario ve la app normal
3. **Usar los componentes UI existentes** donde sea posible (AppButton, AppIcon, AppModal, etc.)
4. **Respetar el sistema de temas** — Usar CSS custom properties, nunca colores hardcoded
5. **Standalone components** — Todo con `standalone: true`, sin NgModules
6. **Confirmar cada fase** antes de pasar a la siguiente
