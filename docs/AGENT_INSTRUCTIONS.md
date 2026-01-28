# 🤖 Instrucciones para Agente de Implementación

## Proyecto: Open Marine Instrumentation - Chart Feature Upgrade

**Documento de referencia:** `chart-architecture-spec.md`  
**Fecha de inicio:** 2026-01-28  
**Modo de trabajo:** Paso a paso con confirmación humana

---

## 📋 REGLAS FUNDAMENTALES

### 1. Flujo de Trabajo Obligatorio

```
┌─────────────────────────────────────────────────────────────┐
│  POR CADA TAREA:                                            │
│                                                             │
│  1. LEER la tarea del documento                             │
│  2. EXPLICAR qué vas a hacer (máx 5 líneas)                 │
│  3. PREGUNTAR: "¿Procedo con esta tarea?"                   │
│  4. ESPERAR confirmación del humano                         │
│  5. IMPLEMENTAR la tarea                                    │
│  6. MOSTRAR resultado (código, archivos creados)            │
│  7. ACTUALIZAR el documento marcando ✅ la tarea            │
│  8. PREGUNTAR: "¿Continúo con la siguiente tarea?"          │
│                                                             │
│  ⚠️ NUNCA saltes pasos ni implementes sin confirmación      │
└─────────────────────────────────────────────────────────────┘
```

### 2. Formato de Comunicación

Antes de cada tarea, usa este formato:

```markdown
## 📌 Tarea Actual: [ID] [Nombre]

**Milestone:** M[X] - [Nombre del Milestone]
**Progreso del Milestone:** [X/10] tareas completadas

### Qué voy a hacer:
[Explicación breve de la implementación]

### Archivos que voy a crear/modificar:
- `ruta/archivo1.ts` - [descripción]
- `ruta/archivo2.ts` - [descripción]

### Dependencias:
- [Tarea previa requerida, si aplica]

### Riesgos:
- [Posibles problemas, si los hay]

---
**¿Procedo con esta tarea? (sí/no/modificar)**
```

### 3. Formato de Actualización del Documento

Después de completar cada tarea, actualiza `chart-architecture-spec.md`:

```markdown
# En la tabla de tareas del milestone:

| ID | Tarea | Input | Output | Verificable |
|----|-------|-------|--------|-------------|
| M1.1 | ~~Crear enum `MapOrientation`~~ | - | ✅ `types/chart-vm.ts` | ✅ Completado 2026-01-28 |
```

Y añade al final del documento una sección de log:

```markdown
---
## 📝 Log de Implementación

### 2026-01-28
- ✅ M1.1: Creado enum MapOrientation en types/chart-vm.ts
- ✅ M1.2: Añadido orientation$ a ChartFacadeService
- ⏳ M1.3: En progreso...
```

---

## 🚀 SECUENCIA DE IMPLEMENTACIÓN

### FASE 0: Preparación (Hacer primero)

Antes de empezar cualquier milestone:

```
□ 0.1 Verificar que el proyecto compila: `npm run build`
□ 0.2 Verificar que los tests pasan: `npm run test`
□ 0.3 Leer PROJECT_STATE.md para contexto actual
□ 0.4 Leer CLAUDE.md para convenciones del proyecto
□ 0.5 Crear rama de trabajo: `git checkout -b feature/chart-upgrade-m1`
```

**Pregunta al humano:** "He verificado el estado del proyecto. ¿Procedo con el Milestone 1?"

---

### MILESTONE 1: Chart Core Hardening

**Objetivo:** Estabilizar el chart existente y preparar la base para nuevas features.

**Orden de tareas:**

```
M1.1 → M1.2 → M1.3 → M1.4 → M1.5 → M1.6 → M1.7 → M1.8 → M1.9 → M1.10
```

#### Tarea M1.1: Crear enum MapOrientation

**Archivo:** `src/app/features/chart/types/chart-vm.ts`

**Implementación:**
```typescript
// Añadir al archivo existente:
export type MapOrientation = 'north-up' | 'course-up';
```

**Verificación:**
- [ ] Type existe y es exportado
- [ ] No hay errores de compilación

---

#### Tarea M1.2: Añadir orientation$ a ChartFacadeService

**Archivo:** `src/app/features/chart/services/chart-facade.service.ts`

**Implementación:**
```typescript
// Añadir:
private readonly _orientation$ = new BehaviorSubject<MapOrientation>('north-up');
readonly orientation$ = this._orientation$.asObservable();

toggleOrientation(): void {
  const current = this._orientation$.value;
  this._orientation$.next(current === 'north-up' ? 'course-up' : 'north-up');
}
```

**Verificación:**
- [ ] Observable emite valores correctos
- [ ] Toggle cambia el valor

---

#### Tarea M1.3: Implementar rotación de mapa en MapLibreEngine

**Archivo:** `src/app/features/chart/services/maplibre-engine.service.ts`

**Implementación:**
```typescript
// Añadir método:
setOrientation(orientation: MapOrientation, heading: number | null): void {
  if (!this.map) return;
  
  if (orientation === 'north-up') {
    this.map.setBearing(0);
  } else if (heading !== null) {
    // Course-up: rotar mapa para que el heading apunte arriba
    this.map.setBearing(-heading);
  }
}
```

**Verificación:**
- [ ] Mapa rota visualmente con course-up
- [ ] North-up resetea bearing a 0

---

#### Tarea M1.4: Crear MapControlsComponent

**Archivos a crear:**
- `src/app/features/chart/components/map-controls/map-controls.component.ts`
- `src/app/features/chart/components/map-controls/map-controls.component.html`
- `src/app/features/chart/components/map-controls/map-controls.component.css`

**Referencia:** Spec D.3.2 del documento de arquitectura

**Verificación:**
- [ ] Componente renderiza botones
- [ ] Emite eventos correctamente

---

#### Tarea M1.5: Conectar toggle orientation en UI

**Archivo:** `src/app/features/chart/chart.page.ts`

**Implementación:**
- Añadir MapControlsComponent a imports
- Conectar eventos a facade
- Crear effect para sincronizar orientation con engine

**Verificación:**
- [ ] Click en botón cambia orientación
- [ ] Mapa rota visualmente

---

#### Tarea M1.6: Implementar range rings layer

**Archivo a crear:** `src/app/features/chart/layers/range-rings.layer.ts`

**Implementación:**
```typescript
export interface RangeRingsConfig {
  center: [number, number];
  rings: number[]; // distancias en nm
  color: string;
  opacity: number;
}

export function generateRangeRingsGeoJson(config: RangeRingsConfig): FeatureCollection {
  // Generar círculos GeoJSON
}
```

**Verificación:**
- [ ] Función genera GeoJSON válido
- [ ] Círculos visibles en mapa

---

#### Tarea M1.7: Añadir config de range rings

**Archivos:**
- `src/app/features/chart/services/chart-settings.service.ts`
- Actualizar ChartFacadeService

**Implementación:**
- Añadir `rangeRings: number[]` a ChartSettings
- Persistir en localStorage

**Verificación:**
- [ ] Settings persisten entre recargas
- [ ] UI refleja cambios

---

#### Tarea M1.8: Mejorar vessel marker estados

**Archivo:** `src/app/features/chart/services/maplibre-engine.service.ts`

**Implementación:**
- Modificar `createVesselIcon()` para aceptar fixState
- Colores: fix=azul, stale=azul-50%, no-fix=gris

**Verificación:**
- [ ] Marker cambia color según estado
- [ ] Transiciones suaves

---

#### Tarea M1.9: Implementar bearing line layer

**Archivo a crear:** `src/app/features/chart/layers/bearing-line.layer.ts`

**Implementación:**
- Source y layer para línea de bearing
- Actualización desde facade

**Verificación:**
- [ ] Línea visible desde vessel a punto
- [ ] Se actualiza con movimiento

---

#### Tarea M1.10: Conectar bearing line a activeWaypoint

**Archivo:** `src/app/features/chart/chart.page.ts`

**Implementación:**
- Effect que conecta waypointService.activeWaypoint$ con bearing layer

**Verificación:**
- [ ] Línea aparece al activar waypoint
- [ ] Línea desaparece al desactivar

---

### Al completar Milestone 1:

```markdown
**Checklist de finalización M1:**
- [ ] Todos los tests pasan
- [ ] Build sin errores
- [ ] Funcionalidad verificada manualmente
- [ ] Documento actualizado con todos los ✅
- [ ] Commit con mensaje: "feat(chart): complete M1 - Chart Core Hardening"

**Pregunta al humano:** "M1 completado. ¿Procedo con M2: Primitives Library?"
```

---

## 📁 MILESTONES RESTANTES (Resumen)

### M2: Primitives Library
```
M2.1 → M2.2 → M2.3 → M2.4 → M2.5 → M2.6 → M2.7 → M2.8 → M2.9 → M2.10
```
Crear componentes base: Button, Icon, Badge, Modal, Drawer, Toast, Toggle, Slider

### M3: AIS Integration
```
M3.1 → M3.2 → M3.3 → M3.4 → M3.5 → M3.6 → M3.7 → M3.8 → M3.9 → M3.10
```
Store AIS, targets en mapa, lista, cálculo CPA, alarmas

### M4: Alarm System Refactor
```
M4.1 → M4.2 → M4.3 → M4.4 → M4.5 → M4.6 → M4.7 → M4.8 → M4.9 → M4.10
```
AlarmStore, AudioService, MOB, Anchor Watch

### M5: Resources CRUD
```
M5.1 → M5.2 → M5.3 → M5.4 → M5.5 → M5.6 → M5.7 → M5.8 → M5.9 → M5.10
```
Signal K resources, waypoints, routes, GPX import

### M6: Autopilot Console
```
M6.1 → M6.2 → M6.3 → M6.4 → M6.5 → M6.6 → M6.7 → M6.8 → M6.9 → M6.10
```
API autopilot, store, console UI, modos

### M7: Playback System
```
M7.1 → M7.2 → M7.3 → M7.4 → M7.5 → M7.6 → M7.7 → M7.8 → M7.9 → M7.10
```
History storage, timeline, reproducción

### M8: Instruments & Polish
```
M8.1 → M8.2 → M8.3 → M8.4 → M8.5 → M8.6 → M8.7 → M8.8 → M8.9 → M8.10
```
Drawer instrumentos, widgets, settings, mobile

---

## ⚠️ MANEJO DE ERRORES

### Si encuentras un error de compilación:

```
1. DETENER la implementación
2. MOSTRAR el error completo
3. EXPLICAR la causa probable
4. PROPONER solución
5. PREGUNTAR: "¿Cómo procedo?"
```

### Si una tarea requiere cambios en el spec:

```
1. EXPLICAR por qué el spec necesita cambios
2. PROPONER la modificación
3. PREGUNTAR: "¿Actualizo el spec con estos cambios?"
4. Si sí, actualizar chart-architecture-spec.md
5. Continuar con la implementación
```

### Si hay conflicto con código existente:

```
1. MOSTRAR el código existente
2. MOSTRAR el código propuesto
3. EXPLICAR el conflicto
4. PROPONER estrategia de merge
5. PREGUNTAR: "¿Qué enfoque prefieres?"
```

---

## 🔄 COMANDOS ÚTILES

El humano puede usar estos comandos en cualquier momento:

| Comando | Acción |
|---------|--------|
| `status` | Mostrar progreso actual (milestone, tarea, %) |
| `skip` | Saltar tarea actual (marcar como ⏭️ Saltada) |
| `pause` | Pausar y guardar estado actual |
| `resume` | Continuar desde última tarea |
| `rollback` | Deshacer última tarea completada |
| `show [ID]` | Mostrar detalles de una tarea específica |
| `help` | Mostrar esta lista de comandos |

---

## 📊 TRACKING DE PROGRESO

Mantener actualizado al final del documento de spec:

```markdown
## 📈 Progreso General

| Milestone | Estado | Progreso | Última actualización |
|-----------|--------|----------|---------------------|
| M1: Chart Core | 🔄 En progreso | 3/10 (30%) | 2026-01-28 |
| M2: Primitives | ⏳ Pendiente | 0/10 (0%) | - |
| M3: AIS | ⏳ Pendiente | 0/10 (0%) | - |
| M4: Alarms | ⏳ Pendiente | 0/10 (0%) | - |
| M5: Resources | ⏳ Pendiente | 0/10 (0%) | - |
| M6: Autopilot | ⏳ Pendiente | 0/10 (0%) | - |
| M7: Playback | ⏳ Pendiente | 0/10 (0%) | - |
| M8: Polish | ⏳ Pendiente | 0/10 (0%) | - |

**Progreso Total:** 3/80 tareas (3.75%)
```

---

## 🏁 INICIO DE SESIÓN

Al comenzar una nueva sesión de trabajo:

```markdown
## Inicio de Sesión

1. Cargar `chart-architecture-spec.md`
2. Leer sección "📈 Progreso General"
3. Identificar última tarea completada
4. Mostrar resumen:

---
**Estado del Proyecto:**
- Último milestone: M[X]
- Última tarea completada: M[X].[Y]
- Siguiente tarea: M[X].[Y+1]
- Progreso total: [X]%

**¿Continuamos con la tarea M[X].[Y+1]?**
---
```

---

## ✅ CHECKLIST PRE-IMPLEMENTACIÓN

Antes de escribir cualquier código, verificar:

- [ ] He leído la tarea completa del spec
- [ ] Entiendo las dependencias con tareas anteriores
- [ ] Conozco los archivos que voy a modificar
- [ ] He verificado que no hay conflictos con código existente
- [ ] He explicado al humano qué voy a hacer
- [ ] He recibido confirmación para proceder

---

*Última actualización: 2026-01-28*
*Versión del protocolo: 1.0*
