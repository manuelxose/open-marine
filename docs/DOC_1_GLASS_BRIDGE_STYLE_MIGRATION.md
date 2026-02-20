# DOCUMENTO MAESTRO 1: MARINE GLASS BRIDGE — MIGRACIÓN DE SISTEMA DE ESTILOS
## Open Marine Instrumentation (OMI) — Angular 21.1

**Versión:** 1.0  
**Tipo:** Agent Execution Guide  
**Alcance:** Sistema completo de Design Tokens, Temas, Tipografía e Instrumentos SVG  
**Prerequisito:** Proyecto Angular 21.1 operativo con SCSS configurado  
**Duración estimada:** 8–12 sesiones de trabajo  

---

## ⚠️ PROTOCOLO OBLIGATORIO DE INICIALIZACIÓN PARA EL AGENTE

Antes de modificar cualquier archivo DEBES ejecutar este protocolo completo:

1. **Leer este documento completo** antes de escribir código
2. **Crear el documento de tracking** en `docs/GLASS_BRIDGE_MIGRATION_STATUS.md`
3. **Auditar el estado actual** leyendo todos los archivos de estilos listados en la Sección 1
4. **Confirmar el plan** respondiendo con la lista exacta de archivos que se van a modificar en la sesión actual
5. **Implementar UNA FASE a la vez**, validar, luego preguntar "¿Continúo con la Fase N+1?"
6. **Actualizar el documento de tracking** al finalizar cada fase

**Nunca implementar más de una fase por sesión sin confirmación explícita del usuario.**

---

## 0. CONTEXTO DEL PROYECTO ACTUAL

### 0.1 Stack Tecnológico
- **Framework:** Angular 21.1 con standalone components
- **Estilos:** SCSS con CSS Custom Properties en `/shared/styles/`
- **Tema actual:** Nord-inspired, Space Grotesk + JetBrains Mono
- **Estado:** Funcional pero sin estándar Glass Bridge marino profesional

### 0.2 Archivos de Estilos Actuales (AUDITAR ANTES DE MODIFICAR)
```
marine-instrumentation-ui/src/app/shared/styles/
├── _tokens.scss          ← MODIFICAR (expandir con Glass Bridge tokens)
├── _typography.scss      ← MODIFICAR (añadir tabular-nums y fuentes mono)
├── _reset.scss           ← NO MODIFICAR
├── _utilities.scss       ← REVISAR (pueden necesitar ajustes)
├── _animations.scss      ← MODIFICAR (añadir animación mecánica de aguja)
├── _breakpoints.scss     ← NO MODIFICAR
└── index.scss            ← REVISAR imports
```

### 0.3 Componentes con SVG (AUDITAR JERARQUÍA)
```
marine-instrumentation-ui/src/app/features/
├── chart/components/compass/          ← REFACTORIZAR SVG completo
├── dashboard/components/panels/       ← REVISAR instrumentos
└── instruments/                       ← REFACTORIZAR todos los widgets
```

### 0.4 Criterio de Éxito por Componente
Un componente está migrado SOLO cuando cumple TODOS:
- [ ] Cero colores hardcodeados (todo via CSS variables)
- [ ] `font-variant-numeric: tabular-nums` aplicado a valores digitales
- [ ] SVG sigue la anatomía de 7 capas (Sección 4)
- [ ] Lógica de rotación shortest-path implementada en TS
- [ ] Datos obsoletos (>15s) muestran `---` o se atenúan
- [ ] Funciona en Day Mode y Night Mode sin cambios de código
- [ ] Touch-friendly (mínimo 44px en controles interactivos)
- [ ] Pasa test visual en escala 25% (legibilidad a 2m)

---

## 1. AUDITORÍA INICIAL (EJECUTAR EN FASE 0)

### 1.1 Checklist de Auditoría de Estilos

El agente debe ejecutar la siguiente auditoría y documentar los resultados:

```bash
# Buscar colores hardcodeados en estilos
grep -rn "#[0-9a-fA-F]\{3,6\}" src/app --include="*.scss" --include="*.css" | grep -v "_tokens.scss" | grep -v "node_modules"

# Buscar estilos inline en componentes TypeScript
grep -rn "style=\"" src/app --include="*.html" | grep -v "node_modules"

# Buscar componentes SVG existentes
find src/app -name "*.html" | xargs grep -l "<svg" 2>/dev/null

# Verificar qué variables CSS ya existen
grep -n "^  --" src/app/shared/styles/_tokens.scss | head -80

# Identificar fuentes actuales
grep -rn "font-family" src/app/shared/styles/ 
```

### 1.2 Tabla de Inventario (Completar en Auditoría)

| Archivo/Componente | Colores HC | SVG | Rotación | Datos Stale | Riesgo |
|--------------------|------------|-----|----------|-------------|--------|
| `_tokens.scss` | - | N | N | N | BAJO |
| `compass.component` | ? | SI | ? | ? | ALTO |
| `dashboard panels` | ? | ? | ? | ? | MEDIO |
| `instruments widgets` | ? | ? | ? | ? | ALTO |

**Riesgo ALTO = implementar primero en rama de feature separada.**

---

## 2. FASE 1 — SISTEMA DE TOKENS GLASS BRIDGE

### 2.1 Objetivo
Establecer el archivo central `src/app/shared/styles/_glass-bridge-theme.scss` con el sistema completo de tokens semánticos para Day Mode y Night Mode, sin romper los tokens existentes.

### 2.2 Estrategia de Compatibilidad
Los tokens existentes en `_tokens.scss` se mantienen. Los nuevos tokens Glass Bridge se añaden como **capa adicional** con nombres prefijados `--gb-` para evitar colisiones, y los tokens existentes que sean equivalentes se remapean gradualmente.

### 2.3 Archivo a Crear: `_glass-bridge-theme.scss`

```scss
// ============================================================================
// GLASS BRIDGE THEME SYSTEM
// Open Marine Instrumentation — Professional Marine UI Standard
// Compatible: Garmin / Raymarine / Simrad visual language
// ============================================================================
//
// ARQUITECTURA DE TEMAS:
//   [data-theme="night"]  ← Activo por defecto. Máxima retención visión nocturna.
//   [data-theme="day"]    ← Máximo contraste solar. Se activa desde Settings.
//
// USO:
//   color: var(--gb-text-value);          ← Valor digital principal
//   background: var(--gb-bg-face);        ← Fondo de esfera de instrumento
//   stroke: var(--gb-tick-major);         ← Marcas principales en SVG
//
// REGLA ABSOLUTA: Nunca usar colores literales en componentes.
//                 Todo debe derivar de estas variables.
// ============================================================================

// ----------------------------------------------------------------------------
// NIGHT MODE — DEFAULT
// Filosofía: Máxima retención de visión nocturna. 
//            Rojo safety orange para agujas. Fondo casi negro.
// ----------------------------------------------------------------------------
[data-theme="night"],
:root {

  // --- FONDOS Y SUPERFICIES ---
  
  // Canvas de la aplicación (fondo general de pantalla)
  --gb-bg-canvas:           #030507;
  
  // Bisel exterior del instrumento (marco físico)
  --gb-bg-bezel:            #0b1116;
  
  // Esfera interior del instrumento (profundidad radial)
  --gb-bg-face:             radial-gradient(circle at 50% 50%, #182029 0%, #0b1116 100%);
  
  // Superficie de panel/card (contenedores de instrumentos)
  --gb-bg-panel:            rgba(11, 17, 22, 0.92);
  
  // Overlay de cristal (efecto glass morphism)
  --gb-bg-glass:            rgba(255, 255, 255, 0.03);
  --gb-bg-glass-active:     rgba(255, 255, 255, 0.06);
  
  // Borde de panel con efecto glow
  --gb-border-panel:        rgba(82, 102, 122, 0.35);
  --gb-border-active:       rgba(82, 152, 220, 0.6);

  // --- TIPOGRAFÍA Y DATOS ---
  
  // Valor digital principal (número grande, máximo contraste)
  --gb-text-value:          #ffffff;
  
  // Etiqueta de unidad (KTS, °, NM, etc.)
  --gb-text-unit:           #8ba4bc;
  
  // Etiqueta muted (títulos secundarios, descripciones)
  --gb-text-muted:          #687d97;
  
  // Texto de cardinales N/S/E/W en compás
  --gb-text-cardinal:       #9bb4cc;
  
  // Valor en estado stale (dato obsoleto >15s)
  --gb-text-stale:          #455264;

  // --- ELEMENTOS GRÁFICOS SVG ---
  
  // Marcas principales del dial (cada 90° en compás, cada 10° en otros)
  --gb-tick-major:          #52667a;
  
  // Marcas secundarias del dial
  --gb-tick-minor:          #2a3744;
  
  // Marca de referencia (lubber line, 0° en compás)
  --gb-tick-reference:      #4a90d9;
  
  // Aguja principal — Safety Orange (máxima visibilidad)
  --gb-needle-primary:      #ff5722;
  
  // Aguja secundaria (ej. viento verdadero vs aparente)
  --gb-needle-secondary:    #4a90d9;
  
  // Pin central de la aguja
  --gb-needle-pin:          #1a2530;
  --gb-needle-pin-border:   #52667a;
  
  // Arco de rango (zona óptima, zona de alerta)
  --gb-arc-normal:          rgba(0, 230, 118, 0.25);
  --gb-arc-warning:         rgba(255, 234, 0, 0.25);
  --gb-arc-danger:          rgba(255, 23, 68, 0.25);

  // --- FILTROS Y EFECTOS ---
  
  // Glow filter para aguja (solo activo en Night Mode)
  --gb-glow-filter:         url(#gb-neon-glow);
  
  // Sombra de instrumento (inset para profundidad)
  --gb-shadow-instrument:   inset 0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(82,102,122,0.2);
  
  // Sombra de panel activo
  --gb-shadow-active:       0 0 20px rgba(74, 144, 217, 0.15);

  // --- SEMÁNTICA DE DATOS (CALIDAD DE SEÑAL) ---
  
  // Dato bueno (fresco, actualizado recientemente)
  --gb-data-good:           #00e676;
  --gb-data-good-rgb:       0, 230, 118;
  
  // Dato en advertencia (borderline)
  --gb-data-warn:           #ffea00;
  --gb-data-warn-rgb:       255, 234, 0;
  
  // Dato obsoleto / perdido (stale >15s)
  --gb-data-stale:          #ff1744;
  --gb-data-stale-rgb:      255, 23, 68;
  
  // Indicador de conexión activa
  --gb-connection-active:   #00e676;
  --gb-connection-lost:     #ff1744;
  --gb-connection-stale:    #ffea00;

  // --- ALARMAS ---
  
  --gb-alarm-emergency-bg:  rgba(255, 23, 68, 0.15);
  --gb-alarm-emergency-border: #ff1744;
  --gb-alarm-critical-bg:   rgba(255, 87, 34, 0.15);
  --gb-alarm-critical-border: #ff5722;
  --gb-alarm-warning-bg:    rgba(255, 234, 0, 0.12);
  --gb-alarm-warning-border: #ffea00;
  --gb-alarm-info-bg:       rgba(74, 144, 217, 0.12);
  --gb-alarm-info-border:   #4a90d9;
}

// ----------------------------------------------------------------------------
// DAY MODE
// Filosofía: Máximo contraste solar. Sin efectos glow. 
//            Fondo gris mate que evita reflejos de pantalla.
// ----------------------------------------------------------------------------
[data-theme="day"] {

  // --- FONDOS Y SUPERFICIES ---
  --gb-bg-canvas:           #e2e8ec;
  --gb-bg-bezel:            #cfd9e0;
  --gb-bg-face:             radial-gradient(circle at 50% 50%, #ffffff 0%, #eef2f5 100%);
  --gb-bg-panel:            rgba(245, 248, 250, 0.96);
  --gb-bg-glass:            rgba(255, 255, 255, 0.4);
  --gb-bg-glass-active:     rgba(255, 255, 255, 0.7);
  --gb-border-panel:        rgba(161, 179, 194, 0.6);
  --gb-border-active:       rgba(2, 132, 199, 0.7);

  // --- TIPOGRAFÍA Y DATOS ---
  --gb-text-value:          #090e13;
  --gb-text-unit:           #3d5266;
  --gb-text-muted:          #4a5b6c;
  --gb-text-cardinal:       #1a2d3e;
  --gb-text-stale:          #a0b0be;

  // --- ELEMENTOS GRÁFICOS SVG ---
  --gb-tick-major:          #182029;
  --gb-tick-minor:          #8b9bb4;
  --gb-tick-reference:      #0369a1;
  --gb-needle-primary:      #d83b01;    // Rojo/naranja denso, saturado bajo sol
  --gb-needle-secondary:    #0369a1;
  --gb-needle-pin:          #e8edf1;
  --gb-needle-pin-border:   #8b9bb4;
  
  --gb-arc-normal:          rgba(2, 163, 84, 0.2);
  --gb-arc-warning:         rgba(180, 100, 0, 0.2);
  --gb-arc-danger:          rgba(180, 0, 0, 0.2);

  // --- FILTROS Y EFECTOS ---
  --gb-glow-filter:         none;       // CRÍTICO: Desactivado en Day Mode
  --gb-shadow-instrument:   inset 0 2px 6px rgba(0,0,0,0.12), 0 0 0 1px rgba(161,179,194,0.4);
  --gb-shadow-active:       0 0 12px rgba(2, 132, 199, 0.2);

  // --- SEMÁNTICA DE DATOS ---
  --gb-data-good:           #00a659;
  --gb-data-good-rgb:       0, 166, 89;
  --gb-data-warn:           #c97b00;
  --gb-data-warn-rgb:       201, 123, 0;
  --gb-data-stale:          #c0392b;
  --gb-data-stale-rgb:      192, 57, 43;
  
  --gb-connection-active:   #00a659;
  --gb-connection-lost:     #c0392b;
  --gb-connection-stale:    #c97b00;

  // --- ALARMAS ---
  --gb-alarm-emergency-bg:  rgba(192, 57, 43, 0.1);
  --gb-alarm-emergency-border: #c0392b;
  --gb-alarm-critical-bg:   rgba(180, 60, 0, 0.1);
  --gb-alarm-critical-border: #d83b01;
  --gb-alarm-warning-bg:    rgba(201, 123, 0, 0.1);
  --gb-alarm-warning-border: #c97b00;
  --gb-alarm-info-bg:       rgba(2, 132, 199, 0.08);
  --gb-alarm-info-border:   #0369a1;
}
```

### 2.4 Modificar `index.scss` para importar el nuevo tema

```scss
// Al inicio del archivo, ANTES de los otros imports:
@use 'glass-bridge-theme' as *;

// Resto de imports existentes...
@forward 'tokens';
@forward 'typography';
@forward 'reset';
@forward 'utilities';
@forward 'animations';
@forward 'breakpoints';
```

### 2.5 Modificar `app.component.ts` para inicializar el tema

```typescript
// En app.component.ts, añadir:
export class AppComponent implements OnInit {
  
  ngOnInit() {
    // Inicializar tema desde preferencias guardadas
    const savedTheme = localStorage.getItem('omi-theme') ?? 'night';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}
```

### 2.6 Validación de Fase 1

```bash
# Verificar que el archivo se creó
ls -la src/app/shared/styles/_glass-bridge-theme.scss

# Verificar que la app compila sin errores
ng build --configuration development

# Verificar que las variables CSS están disponibles en runtime
# (Abrir DevTools → Elements → :root → buscar --gb-*)
```

**Criterio de paso:** App compila, variables `--gb-*` visibles en DevTools, tema Night Mode activo por defecto.

---

## 3. FASE 2 — SISTEMA TIPOGRÁFICO DE ALTA PERFORMANCE

### 3.1 Objetivo
Eliminar el "jitter" (temblor de números) durante actualizaciones en tiempo real a 5-10Hz mediante `tabular-nums` y fuentes monoespaciadas en todos los displays de datos.

### 3.2 Modificar `_typography.scss`

```scss
// ============================================================================
// TYPOGRAPHY SYSTEM — MARINE GLASS BRIDGE
// ============================================================================

// Importar fuentes de rendimiento
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

// --- DISPLAY DIGITAL (Valores de instrumentos) ---
// Usado para SOG, COG, HDG, Depth, Wind, etc.
// CRÍTICO: tabular-nums fuerza ancho fijo por dígito → sin jitter

.gb-display-value {
  font-family: 'JetBrains Mono', 'Courier New', 'Roboto Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "zero" 1;  // Alternativa a variant-numeric
  font-weight: 500;
  font-size: clamp(1.5rem, 8vw, 3.5rem);
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--gb-text-value);
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
}

// Tamaños específicos por contexto
.gb-display-value--xl {
  font-size: clamp(2.5rem, 12vw, 5rem);   // SOG principal, depth crítico
}

.gb-display-value--lg {
  font-size: clamp(1.8rem, 8vw, 3.5rem);  // Instrumentos estándar
}

.gb-display-value--md {
  font-size: clamp(1.2rem, 5vw, 2.2rem);  // Instrumentos compactos
}

.gb-display-value--sm {
  font-size: clamp(0.875rem, 3vw, 1.25rem); // Labels secundarios
}

// --- ETIQUETAS DE UNIDAD ---
.gb-display-unit {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: clamp(0.6rem, 2.5vw, 0.875rem);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gb-text-unit);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

// --- CARDINALES DEL COMPÁS ---
.gb-display-cardinal {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gb-text-cardinal);
  fill: var(--gb-text-cardinal);  // Para uso en SVG
}

// --- ETIQUETA DE INSTRUMENTO ---
.gb-instrument-label {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--gb-text-muted);
}

// --- APLICAR A SVG (dentro de elementos <text> en SVG) ---
// Los SVG necesitan estas propiedades como atributos o en style inline del <text>
// Usar estas clases CSS en los elementos <text> de los SVG

text.gb-svg-value {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  font-weight: 500;
  fill: var(--gb-text-value);
  dominant-baseline: middle;
  text-anchor: middle;
}

text.gb-svg-unit {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-weight: 600;
  fill: var(--gb-text-unit);
  text-anchor: middle;
  dominant-baseline: middle;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

text.gb-svg-cardinal {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-weight: 700;
  fill: var(--gb-text-cardinal);
  text-anchor: middle;
  dominant-baseline: middle;
}
```

### 3.3 Validación de Fase 2

Abrir la app en el browser y verificar:
- Números en el dashboard usan fuente monoespaciada
- Al simular cambios rápidos de datos, los números no "saltan" visualmente
- Las clases `.gb-display-value`, `.gb-display-unit` están disponibles globalmente

---

## 4. FASE 3 — SISTEMA DE ANIMACIÓN MECÁNICA

### 4.1 Objetivo
Implementar transiciones que imiten el movimiento físico de un instrumento analógico marino real (motor paso a paso con ligerísimo rebote).

### 4.2 Modificar `_animations.scss`

```scss
// ============================================================================
// ANIMATION SYSTEM — MARINE GLASS BRIDGE
// Filosofía: Imitar el comportamiento de instrumentos analógicos reales.
//            Transiciones mecánicas, no digitales.
// ============================================================================

// --- TOKENS DE ANIMACIÓN ---
:root {
  // Duración base para actualización de instrumentos
  --gb-anim-needle:         400ms;
  
  // Rebote mecánico (simula motor paso a paso)
  --gb-ease-mechanical:     cubic-bezier(0.34, 1.56, 0.64, 1);
  
  // Ease suave para datos (sin rebote)
  --gb-ease-data:           cubic-bezier(0.4, 0.0, 0.2, 1);
  
  // Duración para fade de datos stale
  --gb-anim-stale-fade:     800ms;
  
  // Pulsación de alarma
  --gb-anim-alarm-pulse:    1200ms;
  
  // Transición de tema Day/Night
  --gb-anim-theme:          350ms;
}

// --- ANIMACIÓN DE AGUJA DE INSTRUMENTO ---
// APLICAR al elemento <g class="gb-needle-wrapper"> en SVGs
.gb-needle-wrapper {
  will-change: transform;           // Habilitar compositing layer
  transform-origin: center center;  // Rotar desde el centro del SVG
  transition: transform var(--gb-anim-needle) var(--gb-ease-mechanical);
}

// Estado stale: aguja atenúa
.gb-needle-wrapper--stale {
  opacity: 0.35;
  transition: opacity var(--gb-anim-stale-fade) var(--gb-ease-data);
}

// --- DISPLAY DE VALOR DIGITAL ---
.gb-value-updating {
  transition: color 150ms var(--gb-ease-data),
              opacity 150ms var(--gb-ease-data);
}

.gb-value-updating--stale {
  color: var(--gb-text-stale) !important;
  opacity: 0.6;
}

// --- INDICADOR DE CALIDAD DE DATO ---
.gb-quality-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  transition: background-color 300ms var(--gb-ease-data),
              box-shadow 300ms var(--gb-ease-data);
}

.gb-quality-dot--good {
  background-color: var(--gb-data-good);
  box-shadow: 0 0 4px rgba(var(--gb-data-good-rgb), 0.6);
}

.gb-quality-dot--warn {
  background-color: var(--gb-data-warn);
  box-shadow: 0 0 4px rgba(var(--gb-data-warn-rgb), 0.6);
}

.gb-quality-dot--stale {
  background-color: var(--gb-data-stale);
  box-shadow: 0 0 4px rgba(var(--gb-data-stale-rgb), 0.6);
  animation: gb-pulse-stale 1.5s ease-in-out infinite;
}

@keyframes gb-pulse-stale {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

// --- ALARMA PULSANTE ---
.gb-alarm-pulse {
  animation: gb-alarm-beat var(--gb-anim-alarm-pulse) ease-in-out infinite;
}

@keyframes gb-alarm-beat {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(var(--gb-data-stale-rgb), 0.4); }
  50%       { opacity: 0.85; box-shadow: 0 0 0 8px rgba(var(--gb-data-stale-rgb), 0); }
}

// --- TRANSICIÓN DE TEMA ---
// Aplicar al root para transicionar suavemente entre Day/Night
[data-theme-transition] * {
  transition: background-color var(--gb-anim-theme) ease,
              color var(--gb-anim-theme) ease,
              border-color var(--gb-anim-theme) ease,
              fill var(--gb-anim-theme) ease !important;
}
```

---

## 5. FASE 4 — ANATOMÍA SVG DE INSTRUMENTOS CIRCULARES

### 5.1 Principio de Diseño
Cualquier instrumento circular (Compás, Viento, Timón, RPM) DEBE seguir este orden de capas.  
El **orden en el código SVG determina el Z-order**: primero = fondo, último = encima.

### 5.2 Template Base SVG (Usar como Referencia)

```html
<!-- TEMPLATE: gb-instrument-compass.component.html -->
<!-- viewBox fijo en 240x240. Usar unidades absolutas para precisión. -->
<svg
  [attr.viewBox]="'0 0 ' + size + ' ' + size"
  [attr.width]="size"
  [attr.height]="size"
  class="gb-instrument-svg"
  role="img"
  [attr.aria-label]="'Compás: ' + formattedValue + '° True'"
>

  <!-- ================================================================
       CAPA 0: DEFS — Gradientes y filtros (invisible, solo definiciones)
       ================================================================ -->
  <defs>
    <!-- Gradiente radial para la esfera -->
    <radialGradient id="gb-face-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#182029"/>
      <stop offset="100%" stop-color="#0b1116"/>
    </radialGradient>
    
    <!-- Gradiente de la aguja (punta brillante, base oscura) -->
    <linearGradient id="gb-needle-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ff6b3d"/>
      <stop offset="100%" stop-color="#cc3300"/>
    </linearGradient>
    
    <!-- FILTRO: Neon Glow (SOLO para Night Mode - controlado por CSS var) -->
    <filter id="gb-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    
    <!-- Clip para limitar el contenido al círculo -->
    <clipPath id="gb-instrument-clip">
      <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="faceRadius"/>
    </clipPath>
  </defs>

  <!-- ================================================================
       CAPA 1: FONDO DE LA ESFERA
       bg-bezel → bisel exterior (borde grueso)
       bg-face  → esfera interior (gradiente radial)
       ================================================================ -->
  
  <!-- Bisel exterior (sombra profunda del instrumento) -->
  <circle
    [attr.cx]="cx"
    [attr.cy]="cy"
    [attr.r]="outerRadius"
    fill="var(--gb-bg-bezel)"
    class="gb-bezel"
  />
  
  <!-- Esfera interior con gradiente -->
  <circle
    [attr.cx]="cx"
    [attr.cy]="cy"
    [attr.r]="faceRadius"
    fill="url(#gb-face-gradient)"
    stroke="var(--gb-border-panel)"
    stroke-width="1"
    class="gb-face"
  />

  <!-- ================================================================
       CAPA 2: TICKS / MARCAS DEL DIAL
       Generadas DINÁMICAMENTE en TypeScript (NO hardcodeadas en HTML)
       ================================================================ -->
  <g class="gb-ticks-group">
    <!-- Marcas mayores: *ngFor en TS, cada 10° (36 marcas) -->
    <line
      *ngFor="let tick of majorTicks"
      [attr.x1]="tick.x1" [attr.y1]="tick.y1"
      [attr.x2]="tick.x2" [attr.y2]="tick.y2"
      stroke="var(--gb-tick-major)"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <!-- Marcas menores: cada 5° (menor longitud) -->
    <line
      *ngFor="let tick of minorTicks"
      [attr.x1]="tick.x1" [attr.y1]="tick.y1"
      [attr.x2]="tick.x2" [attr.y2]="tick.y2"
      stroke="var(--gb-tick-minor)"
      stroke-width="0.75"
    />
  </g>

  <!-- ================================================================
       CAPA 3: CARDINALES / ETIQUETAS FIJAS
       N, S, E, W siempre en la misma posición relativa al instrumento
       ================================================================ -->
  <g class="gb-cardinals-group">
    <text [attr.x]="cx"         [attr.y]="cardinalOffset"       class="gb-svg-cardinal gb-cardinal-n">N</text>
    <text [attr.x]="cx"         [attr.y]="size - cardinalOffset" class="gb-svg-cardinal">S</text>
    <text [attr.x]="size - cardinalOffset" [attr.y]="cy + 1"    class="gb-svg-cardinal">E</text>
    <text [attr.x]="cardinalOffset"         [attr.y]="cy + 1"   class="gb-svg-cardinal">W</text>
    
    <!-- Marcas de 30° (opcionales, para compás detallado) -->
    <text *ngFor="let label of degreeLabels"
      [attr.x]="label.x" [attr.y]="label.y"
      class="gb-svg-degree-label"
      [attr.transform]="label.rotate"
    >{{ label.value }}</text>
  </g>

  <!-- ================================================================
       CAPA 4: DISPLAY CENTRAL DIGITAL
       Jerarquía: Valor grande arriba, unidad pequeña debajo
       ================================================================ -->
  <g class="gb-display-group" [attr.transform]="'translate(' + cx + ',' + cy + ')'">
    <!-- Fondo semitransparente del display -->
    <rect
      x="-32" y="-22"
      width="64" height="44"
      rx="4"
      fill="rgba(3, 5, 7, 0.7)"
    />
    
    <!-- Valor digital (3 dígitos para rumbos: 005°) -->
    <text
      x="0" y="-4"
      class="gb-svg-value gb-display-value--lg"
      [attr.font-size]="displayFontSize"
    >{{ formattedValue }}</text>
    
    <!-- Unidad -->
    <text
      x="0" y="14"
      class="gb-svg-unit"
      font-size="9"
    >{{ unit }}</text>
  </g>

  <!-- ================================================================
       CAPA 5: AGUJA / INDICADOR DINÁMICO
       CRÍTICO: La rotación se aplica SOLO al grupo <g>, nunca al path.
       transform-origin: cx cy (centro del instrumento)
       ================================================================ -->
  <g
    class="gb-needle-wrapper"
    [class.gb-needle-wrapper--stale]="isStale"
    [attr.transform]="needleTransform"
    [attr.filter]="needleFilter"
  >
    <!-- Aguja principal: polígono con base más ancha que la punta -->
    <!-- Diseño: punta hacia 0° (arriba = norte), base en el centro -->
    <polygon
      [attr.points]="needlePoints"
      fill="url(#gb-needle-gradient)"
      class="gb-needle-shape"
    />
    
    <!-- Contrapeso de la aguja (lado opuesto, más corto) -->
    <polygon
      [attr.points]="needleCounterweightPoints"
      fill="var(--gb-bg-bezel)"
      opacity="0.8"
    />
  </g>

  <!-- ================================================================
       CAPA 6: PIN CENTRAL
       Tapa la base de la aguja. Da aspecto mecánico auténtico.
       ================================================================ -->
  <circle
    [attr.cx]="cx"
    [attr.cy]="cy"
    r="5"
    fill="var(--gb-needle-pin)"
    stroke="var(--gb-needle-pin-border)"
    stroke-width="1.5"
    class="gb-center-pin"
  />

  <!-- ================================================================
       CAPA 7 (OPCIONAL): GLASS OVERLAY
       Reflejo de cristal. Sutil highlight en la mitad superior.
       Solo visible si [data-theme="night"] (se puede controlar con CSS opacity)
       ================================================================ -->
  <ellipse
    [attr.cx]="cx"
    [attr.cy]="cy * 0.6"
    [attr.rx]="faceRadius * 0.7"
    [attr.ry]="faceRadius * 0.35"
    fill="white"
    opacity="0.04"
    class="gb-glass-overlay"
  />

</svg>
```

### 5.3 Definiciones de Puntos y Medidas en TypeScript

```typescript
// gb-compass.component.ts — Propiedades calculadas

export class GbCompassComponent implements OnInit, OnChanges {
  
  // --- CONFIGURACIÓN DEL INSTRUMENTO ---
  @Input() value: number = 0;           // Heading en grados (0-359)
  @Input() size: number = 240;          // Tamaño total del SVG
  @Input() timestamp: number = 0;       // UTC timestamp del dato
  @Input() unit: string = '° TRUE';
  
  // --- PROPIEDADES CALCULADAS ---
  get cx(): number { return this.size / 2; }
  get cy(): number { return this.size / 2; }
  get outerRadius(): number { return this.size / 2 - 2; }
  get faceRadius(): number { return this.size / 2 - 8; }
  get cardinalOffset(): number { return 22; }
  get displayFontSize(): number { return Math.round(this.size * 0.13); }
  
  // --- FORMATO DE VALOR (3 DÍGITOS OBLIGATORIO) ---
  get formattedValue(): string {
    if (this.isStale) return '---';
    // Siempre 3 dígitos: 5° → "005", 90° → "090", 270° → "270"
    return String(Math.round(this.value) % 360).padStart(3, '0');
  }
  
  // --- DETECCIÓN DE DATO OBSOLETO ---
  get isStale(): boolean {
    if (!this.timestamp) return false;
    return (Date.now() - this.timestamp) > 15000; // 15 segundos
  }
  
  // --- FILTRO DE AGUJA (Glow en Night, none en Day) ---
  get needleFilter(): string {
    const theme = document.documentElement.getAttribute('data-theme') ?? 'night';
    return theme === 'night' && !this.isStale ? 'url(#gb-neon-glow)' : 'none';
  }
  
  // --- PUNTOS DE LA AGUJA (Polígono) ---
  // Aguja apuntando a 12 en punto (norte). La rotación se aplica vía transform.
  get needlePoints(): string {
    const cx = this.cx;
    const cy = this.cy;
    const tipY = cy - this.faceRadius * 0.72;  // Punta (hacia arriba)
    const baseY = cy + this.faceRadius * 0.15;  // Base (hacia abajo)
    const halfW = this.size * 0.025;            // Ancho de la base
    return `${cx},${tipY} ${cx - halfW},${baseY} ${cx + halfW},${baseY}`;
  }
  
  get needleCounterweightPoints(): string {
    const cx = this.cx;
    const cy = this.cy;
    const tailY = cy + this.faceRadius * 0.35;
    const baseY = cy + this.faceRadius * 0.15;
    const halfW = this.size * 0.018;
    return `${cx},${tailY} ${cx - halfW},${baseY} ${cx + halfW},${baseY}`;
  }
  
  // --- TRANSFORM DE LA AGUJA ---
  get needleTransform(): string {
    return `rotate(${this._visualAngle}, ${this.cx}, ${this.cy})`;
  }
  
  // --- GENERACIÓN DE TICKS ---
  get majorTicks() {
    return this._generateTicks(10, 12, 18);  // cada 10°, longitud 12px
  }
  
  get minorTicks() {
    return this._generateTicks(5, 6, 8, [0, 10, 20, 30]);  // cada 5°, excluir los mayores
  }
  
  private _generateTicks(
    step: number, 
    outerGap: number, 
    innerGap: number,
    exclude: number[] = []
  ) {
    const ticks = [];
    for (let angle = 0; angle < 360; angle += step) {
      if (exclude.some(e => angle % (e || 360) === 0 && e !== 0)) continue;
      const rad = (angle - 90) * Math.PI / 180;
      const outer = this.faceRadius - outerGap;
      const inner = this.faceRadius - innerGap;
      ticks.push({
        x1: this.cx + outer * Math.cos(rad),
        y1: this.cy + outer * Math.sin(rad),
        x2: this.cx + inner * Math.cos(rad),
        y2: this.cy + inner * Math.sin(rad),
      });
    }
    return ticks;
  }
}
```

---

## 6. FASE 5 — MOTOR DE ROTACIÓN SHORTEST-PATH

### 6.1 El Problema
CSS estándar con `transform: rotate(Xdeg)` rotará por el camino más largo cuando el ángulo cruza el 0/360.  
Ejemplo: aguja en 350°, nuevo valor 10° → CSS rota -340° en lugar de +20°.

### 6.2 Implementación del Motor de Rotación

```typescript
// shared/utils/needle-rotation.utils.ts

/**
 * Motor de rotación acumulativa para agujas de instrumentos marinos.
 * Garantiza que la aguja siempre tome el camino más corto (máx. 180°).
 * 
 * ALGORITMO:
 * 1. Calcular delta normalizado entre -180 y +180
 * 2. Acumular el ángulo visual (puede superar 360° o ser negativo)
 * 3. Aplicar el ángulo visual acumulado al transform CSS
 * 
 * EJEMPLO:
 *   prevAngle = 350°, newAngle = 10°
 *   delta = ((10 - 350 + 540) % 360) - 180 = (200 % 360) - 180 = +20°
 *   visualAngle = 350 + 20 = 370° → CSS aplica rotate(370deg) = visualmente 10°
 */

export interface NeedleRotationState {
  logicalAngle: number;  // Ángulo real del dato (0-359)
  visualAngle: number;   // Ángulo acumulado para CSS (puede ser negativo o >360)
}

export function initNeedleState(initialAngle: number): NeedleRotationState {
  return {
    logicalAngle: normalizeAngle(initialAngle),
    visualAngle: normalizeAngle(initialAngle),
  };
}

export function updateNeedleAngle(
  state: NeedleRotationState,
  newAngle: number
): NeedleRotationState {
  const normalized = normalizeAngle(newAngle);
  
  // Calcular el delta usando el shortest-path algorithm
  // Fórmula: ((new - prev + 540) % 360) - 180
  // Resultado siempre en rango [-180, +180]
  const delta = ((normalized - state.logicalAngle + 540) % 360) - 180;
  
  return {
    logicalAngle: normalized,
    visualAngle: state.visualAngle + delta,
  };
}

export function normalizeAngle(angle: number): number {
  // Normalizar cualquier ángulo al rango [0, 360)
  return ((angle % 360) + 360) % 360;
}

export function getRotateTransform(
  state: NeedleRotationState,
  cx: number,
  cy: number
): string {
  return `rotate(${state.visualAngle}, ${cx}, ${cy})`;
}
```

### 6.3 Integración en el Componente

```typescript
// gb-compass.component.ts — Integración del motor de rotación

import { initNeedleState, updateNeedleAngle, type NeedleRotationState } from '../../../shared/utils/needle-rotation.utils';

export class GbCompassComponent implements OnInit, OnChanges {
  
  private _rotationState: NeedleRotationState = initNeedleState(0);
  
  @Input() set heading(value: number) {
    this._rotationState = updateNeedleAngle(this._rotationState, value);
  }
  
  get _visualAngle(): number {
    return this._rotationState.visualAngle;
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this._rotationState = updateNeedleAngle(
        this._rotationState,
        changes['value'].currentValue
      );
    }
  }
}
```

### 6.4 Unit Tests Requeridos para el Motor

```typescript
// needle-rotation.utils.spec.ts

describe('NeedleRotationUtils', () => {
  
  it('should rotate forward when new angle is ahead', () => {
    let state = initNeedleState(350);
    state = updateNeedleAngle(state, 10);
    expect(state.visualAngle).toBe(370);  // +20°, no -340°
  });
  
  it('should rotate backward when new angle is behind', () => {
    let state = initNeedleState(10);
    state = updateNeedleAngle(state, 350);
    expect(state.visualAngle).toBe(-10);  // -20°, no +340°
  });
  
  it('should accumulate multiple rotations correctly', () => {
    let state = initNeedleState(0);
    state = updateNeedleAngle(state, 90);
    state = updateNeedleAngle(state, 180);
    state = updateNeedleAngle(state, 270);
    state = updateNeedleAngle(state, 0);  // Full circle
    expect(state.visualAngle).toBe(360);  // Acumuló 360°
  });
  
  it('should handle rapid oscillation without spinning', () => {
    let state = initNeedleState(5);
    for (let i = 0; i < 10; i++) {
      state = updateNeedleAngle(state, i % 2 === 0 ? 355 : 5);
    }
    // La aguja no debe haber viajado más de ±180° en total
    expect(Math.abs(state.visualAngle)).toBeLessThan(180);
  });
});
```

---

## 7. FASE 6 — LÓGICA DE DATOS STALE

### 7.1 Service de Calidad de Datos

```typescript
// shared/services/data-quality.service.ts

export type DataQuality = 'good' | 'warn' | 'stale' | 'missing';

export interface QualityIndicator {
  quality: DataQuality;
  cssClass: string;
  displayValue: string | null;  // null = usar valor real
}

@Injectable({ providedIn: 'root' })
export class DataQualityService {
  
  private readonly STALE_THRESHOLD_MS = 15000;   // 15 segundos
  private readonly WARN_THRESHOLD_MS  = 8000;    // 8 segundos (advertencia)
  
  getQuality(timestamp: number | null | undefined): DataQuality {
    if (!timestamp) return 'missing';
    const age = Date.now() - timestamp;
    if (age > this.STALE_THRESHOLD_MS) return 'stale';
    if (age > this.WARN_THRESHOLD_MS)  return 'warn';
    return 'good';
  }
  
  getIndicator(
    value: number | null,
    timestamp: number | null | undefined,
    formatter: (v: number) => string = String
  ): QualityIndicator {
    const quality = this.getQuality(timestamp);
    
    return {
      quality,
      cssClass: `gb-quality--${quality}`,
      displayValue: quality === 'stale' || quality === 'missing'
        ? '---'
        : value !== null ? formatter(value) : '---',
    };
  }
}
```

### 7.2 Directiva de Indicador de Calidad

```typescript
// shared/directives/data-quality.directive.ts

@Directive({
  selector: '[gbDataQuality]',
  standalone: true,
})
export class DataQualityDirective implements OnInit, OnDestroy {
  
  @Input() gbDataQuality!: number;  // timestamp en ms
  
  private interval?: ReturnType<typeof setInterval>;
  private readonly qualityService = inject(DataQualityService);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  
  ngOnInit() {
    // Verificar calidad cada 2 segundos
    this.interval = setInterval(() => this.updateQualityClass(), 2000);
    this.updateQualityClass();
  }
  
  private updateQualityClass() {
    const quality = this.qualityService.getQuality(this.gbDataQuality);
    const classes: DataQuality[] = ['good', 'warn', 'stale', 'missing'];
    
    classes.forEach(q => {
      this.renderer.removeClass(this.el.nativeElement, `gb-quality--${q}`);
    });
    
    this.renderer.addClass(this.el.nativeElement, `gb-quality--${quality}`);
  }
  
  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }
}
```

---

## 8. FASE 7 — COMPONENTE GLASS BRIDGE BEZEL

### 8.1 Componente Base para Todos los Instrumentos

```typescript
// shared/components/gb-instrument-bezel/gb-instrument-bezel.component.ts

@Component({
  selector: 'omi-gb-bezel',
  standalone: true,
  template: `
    <div
      class="gb-bezel-wrapper"
      [class.gb-bezel--compact]="compact"
      [class.gb-bezel--interactive]="interactive"
      [ngClass]="qualityCssClass"
    >
      <!-- Título del instrumento -->
      <header class="gb-bezel-header" *ngIf="label">
        <span class="gb-instrument-label">{{ label }}</span>
        <span class="gb-quality-dot" [ngClass]="qualityDotClass"></span>
      </header>
      
      <!-- Contenido del instrumento (proyectado) -->
      <div class="gb-bezel-content">
        <ng-content></ng-content>
      </div>
      
      <!-- Footer opcional (unidad, sub-valor) -->
      <footer class="gb-bezel-footer" *ngIf="subLabel">
        <span class="gb-display-unit">{{ subLabel }}</span>
      </footer>
    </div>
  `,
})
export class GbInstrumentBezelComponent {
  @Input() label?: string;
  @Input() subLabel?: string;
  @Input() compact = false;
  @Input() interactive = false;
  @Input() quality: DataQuality = 'good';
  
  get qualityCssClass() {
    return `gb-bezel--quality-${this.quality}`;
  }
  
  get qualityDotClass() {
    return `gb-quality-dot--${this.quality}`;
  }
}
```

```scss
// gb-instrument-bezel.component.scss

.gb-bezel-wrapper {
  position: relative;
  background: var(--gb-bg-panel);
  border: 1px solid var(--gb-border-panel);
  border-radius: 12px;
  padding: var(--space-3);
  box-shadow: var(--gb-shadow-instrument);
  
  // Transición suave para cambios de calidad
  transition: border-color 400ms ease, box-shadow 400ms ease;
  
  &.gb-bezel--quality-stale {
    border-color: rgba(var(--gb-data-stale-rgb), 0.4);
  }
  
  &.gb-bezel--quality-warn {
    border-color: rgba(var(--gb-data-warn-rgb), 0.4);
  }
  
  &.gb-bezel--interactive {
    cursor: pointer;
    
    &:hover {
      background: var(--gb-bg-glass-active);
      border-color: var(--gb-border-active);
      box-shadow: var(--gb-shadow-active);
    }
  }
  
  &.gb-bezel--compact {
    padding: var(--space-2);
    border-radius: 8px;
  }
}

.gb-bezel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.gb-bezel-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gb-bezel-footer {
  margin-top: var(--space-1);
  text-align: center;
}
```

---

## 9. FASE 8 — MIGRACIÓN DE COMPONENTES EXISTENTES

### 9.1 Orden de Migración (por Riesgo)

| Prioridad | Componente | Riesgo | Tiempo Est. |
|-----------|------------|--------|-------------|
| 1 | `compass.component` | ALTO | 4h |
| 2 | `wind-panel.component` | ALTO | 3h |
| 3 | `depth-panel.component` | MEDIO | 2h |
| 4 | `navigation-panel.component` | MEDIO | 2h |
| 5 | `power-panel.component` | BAJO | 1.5h |
| 6 | Widgets del drawer | MEDIO | 6h total |

### 9.2 Checklist por Componente

Antes de marcar un componente como migrado:

```markdown
## Checklist de Migración: [NOMBRE_COMPONENTE]

### Estilos
- [ ] Todos los colores usan variables `--gb-*`
- [ ] Gradientes usan variables SVG o CSS
- [ ] `box-shadow` usa tokens semánticos
- [ ] Responsive funciona en 320px, 768px, 1280px

### Tipografía  
- [ ] Valores numéricos: `font-variant-numeric: tabular-nums`
- [ ] Fuente monoespaciada en displays de datos
- [ ] Etiquetas: Space Grotesk, uppercase, letter-spacing

### SVG (si aplica)
- [ ] 7 capas en orden correcto
- [ ] Ticks generados programáticamente
- [ ] Rotación solo en `<g class="gb-needle-wrapper">`
- [ ] Filtro glow controlado por tema via CSS var
- [ ] Polígono como aguja (no línea simple)

### Datos
- [ ] Lógica de stale implementada (>15s → '---')
- [ ] Timestamp propagado via @Input
- [ ] Motor shortest-path para rotaciones
- [ ] Formato marino: 3 dígitos para rumbos

### Temas
- [ ] Day Mode: aspecto correcto (sin glow, alto contraste)
- [ ] Night Mode: aspecto correcto (glow activo, fondo oscuro)
- [ ] Transición entre temas suave

### Accesibilidad
- [ ] `role="img"` en SVG
- [ ] `aria-label` con valor y unidad
- [ ] Contraste mínimo WCAG AA (4.5:1)
- [ ] Touch targets ≥ 44px en controles
```

---

## 10. DOCUMENTO DE TRACKING (CREAR AL INICIO)

```markdown
# Glass Bridge Migration Status

**Proyecto:** Open Marine Instrumentation  
**Inicio:** [FECHA]  
**Última actualización:** [FECHA]  

## Estado General
| Fase | Nombre | Estado | Fecha Inicio | Fecha Fin | Notas |
|------|--------|--------|--------------|-----------|-------|
| 1 | Design Tokens | PENDIENTE | - | - | |
| 2 | Tipografía | PENDIENTE | - | - | |
| 3 | Animaciones | PENDIENTE | - | - | |
| 4 | SVG Layer Spec | PENDIENTE | - | - | |
| 5 | Rotation Engine | PENDIENTE | - | - | |
| 6 | Stale Data Logic | PENDIENTE | - | - | |
| 7 | Bezel Component | PENDIENTE | - | - | |
| 8 | Component Migration | PENDIENTE | - | - | |

## Inventario de Componentes
| Componente | Colores HC | SVG | Rotation | Stale | Migrado |
|------------|------------|-----|----------|-------|---------|
| compass | ? | ? | ? | ? | ❌ |
| wind-panel | ? | ? | ? | ? | ❌ |
| depth-panel | ? | ? | ? | ? | ❌ |
| navigation-panel | ? | ? | ? | ? | ❌ |
| power-panel | ? | ? | ? | ? | ❌ |

## ADR Log (Decisiones Arquitectónicas)
| ID | Decisión | Motivo | Fecha |
|----|----------|--------|-------|
| ADR-001 | Prefijo `--gb-` para tokens nuevos | Evitar colisión con tokens existentes | |
| ADR-002 | Rotation acumulativa en utils separado | Testeable, reutilizable | |
| ADR-003 | Stale threshold: 15s | Estándar marino (Signal K) | |

## Próximo Paso Exacto
[El agente escribe aquí el siguiente paso atómico a ejecutar]
```

---

## 11. CRITERIOS GLOBALES DE ACEPTACIÓN

La migración está completa cuando:

1. **Compilación:** `ng build --prod` sin warnings de estilos
2. **Runtime:** Cambiar `data-theme` en DevTools actualiza TODO instantáneamente
3. **Performance:** 0 layout reflows medibles al actualizar datos a 10Hz
4. **Visual Night:** Background `#030507`, aguja naranja `#ff5722` con glow
5. **Visual Day:** Background `#e2e8ec`, aguja roja `#d83b01` sin glow
6. **Stale:** Datos >15s muestran `---` y calidad indica rojo
7. **Rotation:** Aguja 350°→10° rota +20°, NO -340°
8. **Format:** Rumbos siempre `005°`, no `5°`
9. **Tests:** Motor de rotación cubre 4 casos edge
10. **Docs:** `GLASS_BRIDGE_MIGRATION_STATUS.md` actualizado

---

*Documento generado para Open Marine Instrumentation — Glass Bridge Migration Program*  
*Stack: Angular 21.1 + SCSS + CSS Custom Properties + SVG*
