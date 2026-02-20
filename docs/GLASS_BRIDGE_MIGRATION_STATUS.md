# Glass Bridge Migration Status

**Proyecto:** Open Marine Instrumentation
**Inicio:** 2026-02-19
**Ultima actualizacion:** 2026-02-19

## Estado General
| Fase | Nombre | Estado | Fecha Inicio | Fecha Fin | Notas |
|------|--------|--------|--------------|-----------|-------|
| 1 | Design Tokens | COMPLETADA | 2026-02-19 | 2026-02-19 | Nuevo archivo `_glass-bridge-theme.scss`, import en `index.scss`, init tema en `app.ts`, default Night en `PreferencesService` |
| 2 | Tipografia | COMPLETADA | 2026-02-19 | 2026-02-19 | `_typography.scss` migrado con clases `gb-*`, `tabular-nums` y tipografia SVG, manteniendo compatibilidad legacy |
| 3 | Animaciones | COMPLETADA | 2026-02-19 | 2026-02-19 | `_animations.scss` actualizado con tokens `--gb-anim-*`, aguja mecanica, calidad/stale y transicion Day/Night |
| 4 | SVG Layer Spec | COMPLETADA | 2026-02-19 | 2026-02-19 | `app-compass` migrado a anatomia SVG de 7 capas con ticks/labels/aguja/pin/overlay y accesibilidad `role=img` + `aria-label` |
| 5 | Rotation Engine | COMPLETADA | 2026-02-19 | 2026-02-19 | Motor shortest-path creado en `shared/utils`, integrado en `app-compass`; tests del motor en Vitest (4/4 OK) |
| 6 | Stale Data Logic | COMPLETADA | 2026-02-19 | 2026-02-19 | `DataQualityService` + `DataQualityDirective` creados y conectados en `app-compass` para estado stale/missing + clases de calidad |
| 7 | Bezel Component | COMPLETADA | 2026-02-19 | 2026-02-19 | Componente standalone `omi-gb-bezel` creado con variantes `compact/interactive`, estados de calidad y estructura header/content/footer |
| 8 | Component Migration | COMPLETADA | 2026-02-19 | 2026-02-19 | Paneles `wind/depth/navigation/power/system` + todo `ui/instruments` migrado a `omi-gb-bezel`, stale `---`/atenuacion aplicada, accesibilidad SVG (`aria-label` dinamico) y rotacion `gb-needle-wrapper` con shortest-path donde aplica |

## Auditoria Inicial (Fase 0)
### Checklist ejecutado
- Hardcoded colors en `src/app` (sin `_tokens.scss`): **278**
- Estilos inline `style="..."` en templates: **0**
- Templates con `<svg>`: **22**
- Variables CSS en `_tokens.scss`: **223**
- Definiciones `font-family` en `shared/styles`: **8**

### Inventario de auditoria (Seccion 1.2 del documento maestro)
| Archivo/Componente | Colores HC | SVG | Rotacion | Datos Stale | Riesgo |
|--------------------|------------|-----|----------|-------------|--------|
| `_tokens.scss` | N/A (archivo fuente de tokens) | N | N | N | BAJO |
| `compass.component` (`shared/components/patterns/compass`) | SI (fallback hex detectado) | SI | SI (sin motor shortest-path desacoplado) | NO | ALTO |
| `dashboard panels` (`features/dashboard/components/panels`) | NO (hex) | NO | NO | SI (via facade/status) | MEDIO |
| `instruments widgets` (`ui/instruments`) | SI (muchos hex hardcoded) | SI | SI (logica distribuida por widget) | SI (parcial, no estandar unificado) | ALTO |

## Inventario de Componentes
| Componente | Colores HC | SVG | Rotation | Stale | Migrado |
|------------|------------|-----|----------|-------|---------|
| compass | NO (SVG principal) | SI | SI | SI | SI |
| wind-panel | NO | NO | NO | SI | SI |
| depth-panel | NO | NO | NO | SI | SI |
| navigation-panel | NO | NO | NO | SI | SI |
| power-panel | NO | NO | NO | SI | SI |
| system-panel | NO | NO | NO | SI | SI |
| compass-widget | NO (SVG heredado eliminado, usa `app-compass`) | SI | SI | SI | SI |
| wind-widget | NO | SI | SI | SI | SI |
| depth-gauge-widget | NO | SI | N/A | SI | SI |
| speedometer-widget | NO | SI | SI | SI | SI |
| rudder-widget | NO | SI | SI | SI | SI |
| engine-rpm-widget | NO | SI | SI | SI | SI |
| battery-widget | NO | SI | N/A | SI | SI |
| meteo-widget | NO | SI | N/A | SI | SI |
| depth-widget | NO | SI | N/A | SI | SI |
| depth-card | NO | NO | N/A | SI | SI |
| wind-card | NO | NO | N/A | SI | SI |
| navigation-card | NO | SI | SI | SI | SI |
| power-card | NO | NO | N/A | SI | SI |
| tank-widget | NO | SI | N/A | SI | SI |
| diagnostics-summary | NO | NO | N/A | SI | SI |

## ADR Log (Decisiones Arquitectonicas)
| ID | Decision | Motivo | Fecha |
|----|----------|--------|-------|
| ADR-001 | Prefijo `--gb-` para tokens nuevos | Evitar colision con tokens existentes | 2026-02-19 |
| ADR-002 | Rotation acumulativa en utils separado | Testeable, reutilizable | 2026-02-19 |
| ADR-003 | Stale threshold: 15s | Estandar marino (Signal K) | 2026-02-19 |
| ADR-004 | Inicializacion de tema en `app.ts` con fallback `omi-preferences` + `omi-theme` | Compatibilidad con arquitectura real del repo (no existe `app.component.ts`) | 2026-02-19 |
| ADR-005 | Default de tema cambiado a `night` en `PreferencesService` | Cumplir criterio de Fase 1: Night Mode activo por defecto | 2026-02-19 |
| ADR-006 | Mapeo `StatusTone -> DataQuality` en paneles dashboard | Reusar `omi-gb-bezel` sin romper VMs existentes (sin timestamp por metrica) | 2026-02-19 |

## Validacion Fase 5
- `npx vitest run src/app/shared/utils/needle-rotation.utils.spec.ts`: **OK** (4 tests passed).
- `ng test --watch=false --include=src/app/shared/utils/needle-rotation.utils.spec.ts`: **bloqueado** por errores TypeScript preexistentes en specs no relacionadas (`waypoint.service.spec.ts`, `playback-store.service.spec.ts`).

## Validacion Fase 6
- `ng build --configuration development`: **OK**.

## Validacion Fase 7
- `ng build --configuration development`: **OK**.

## Validacion Fase 8 (completada)
- `ng build --configuration development`: **OK** tras migrar paneles dashboard (`wind/depth/navigation/power/system`) y ajustes de color en `app-compass`.
- `ng build --configuration development`: **OK** tras migrar widgets prioritarios (`compass-widget`, `wind-widget`, `depth-gauge-widget`).
- `ng build --configuration development`: **OK** tras migrar widgets restantes de la tanda actual (`speedometer-widget`, `rudder-widget`, `engine-rpm-widget`, `battery-widget`, `meteo-widget`).
- `ng build --configuration development`: **OK** tras migrar legacy restante de `ui/instruments` (`depth-widget`, `depth-card`, `wind-card`, `navigation-card`, `power-card`, `tank-widget`, `diagnostics-summary`).
- `ng build --configuration development`: **OK** tras eliminar uso de `InstrumentCardComponent` en `ui/instruments` (migrado a `omi-gb-bezel`).
- `ng build --configuration development`: **OK** tras cierre de stale/aria/needle wrappers en widgets y cards legacy.
- `ng build --configuration development`: **OK** tras cierre de stale por timestamp real en `wind-panel`, `depth-panel`, `power-panel`.
- `ng build --configuration production`: **OK** (con warnings de budget preexistentes, no bloqueantes).
- Auditoria tecnica de cierre Fase 8 (`src/app/ui/instruments`):
  - Hardcoded colors literales: **0** (excluyendo entidades HTML como `&#176;`)
  - Estilos inline `style="..."`: **0**
  - Templates con `<svg>`: **10**

## Proximo Paso Exacto
Ejecutar validacion manual final del checklist (Day/Night, legibilidad a 25%, touch targets >=44px, contraste) y, tras cierre visual, iniciar el documento siguiente del programa (`DOC_2_CHART_RECONSTRUCTION.md`).
