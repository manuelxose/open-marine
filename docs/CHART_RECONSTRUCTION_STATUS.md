# Chart Reconstruction Status

**Proyecto:** Open Marine Instrumentation  
**Feature:** Chart Page Full Reconstruction  
**Inicio:** 2026-02-19  
**Ultima actualizacion:** 2026-02-19 (Utilidades avanzadas)

## Protocolo de Inicializacion
- `DOC_2_CHART_RECONSTRUCTION.md`: LEIDO
- `docs/chart-architecture-spec.md`: NO ENCONTRADO en el repositorio
- Tracking document: CREADO (`docs/CHART_RECONSTRUCTION_STATUS.md`)
- Auditoria de codigo en chart: COMPLETADA sobre `marine-instrumentation-ui/src/app/features/chart`
- Auditoria de estilos: COMPLETADA — migrados tokens legacy a design system

## Auditoria Inicial (estado real del repo)
| Area | Archivo(s) auditado(s) | Estado | Gap vs DOC_2 |
|------|-------------------------|--------|--------------|
| Entry/orquestacion | `chart.page.ts` | Funcional con layout flotante por zonas | No existe top bar dedicada ni layout grid objetivo |
| Fachada | `chart-facade.service.ts` | Expone VMs para canvas/controls/hud/waypoints, AIS y capas | No expone ViewModel de top bar, anchor watch, MOB, playback chart-native |
| Engine MapLibre | `maplibre-engine.service.ts` | Vessel/track/vector/trueWind/waypoints/route/range rings/bearing/AIS/CPA | Sin capas anchor watch y MOB |
| Settings | `chart-settings.service.ts` | Persistencia local para track/vector/trueWind/range rings | Sin settings de anchor watch, tiles avanzados, paneles y estado completo chart |
| Tipos VM/GeoJSON | `chart-vm.ts`, `chart-geojson.ts` | Tipos base de HUD, controles y waypoints | Falta `chart-state.ts` y tipos para top bar/milestones P0 |
| Componentes UI chart | `components/*` | Canvas, controles, HUD, instrumentos rapidos, tool panels | No existe `chart-top-bar`, `left-panel`, `bottom-panel` del target |
| Navegacion de ruta | `route.service.ts` | Route line y leg basico | Falta XTE/ETA/TTG navegacion avanzada |
| Seguridad | (sin archivos dedicados) | No implementado | Falta Anchor Watch y MOB (P0) |

## Correccion de Estilos (2026-02-19)
Se detecto inconsistencia de tokens en 3 componentes legacy. Corregido:

| Componente | Problema | Correccion |
|------------|----------|------------|
| `chart-canvas.component.css` | Tokens legacy (`--surface-1`, `--border`, `--radius`, `--shadow`, `--text-1/2`, `--muted`), borde/radio/gradiente innecesarios en mapa fullbleed | Eliminado borde/bg decorativo. Migrado a `--chart-overlay-*`, `--text-primary/secondary/tertiary` |
| `chart-controls.component.css` | Tokens legacy/inexistentes (`--text-on-primary`, `--primary-hover`, `--surface-0/2/3`, `--accent`, `--border-color`), fallbacks hardcoded | Migrado a design system (`--chart-overlay-*`, `--bg-surface-secondary`, `--primary`, `--text-*`). Active state con subtlety (no full-fill primary) |
| `chart-waypoint-list.component.css` | Tokens legacy (`--surface-1/2/3`, `--border`, `--text-1/2/3`, `--accent`, `--muted`), shadow/width fijos | Migrado a design system. Eliminado width fijo (ahora `100%` para fit en left-panel). Patron visual unificado con chart overlay |

Archivos muertos eliminados:
- `chart-hud.component.html` (componente usa template inline)
- `chart-hud.component.css` (componente usa styles inline)
- `chart-controls.component.html_snippet` (fragmento orfano)
- `.vscode/tasks.json` (tarea de dev a nivel feature)

Animacion corregida:
- `chart.page.ts`: Top bar usa `chart-zone-enter-slide-down` (sin `translateX(-50%)`). Solo alarm strip (centrado con `transform: translateX(-50%)`) usa `chart-zone-enter-top`.

## Estado de Milestones
| ID | Feature | Estado | Est. | Real | Notas |
|----|---------|--------|------|------|-------|
| M1 | Top Bar Datos | COMPLETADO | 3-4h | 1 sesion | Componente `chart-top-bar` creado + VM en facade + integrado en `chart.page.ts` |
| M2 | Left Panel + Tabs | COMPLETADO | 4-6h | 1 sesion | Componente `left-panel` con tabs `layers/ais/waypoints/routes`, integrado y conectado a facade |
| M3 | Map Controls | COMPLETADO | 2-3h | 1 sesion | Auto-center, add-waypoint, anchor watch y MOB buttons integrados con inputs/outputs |
| M4 | Anchor Watch | COMPLETADO | 4-5h | 1 sesion | `AnchorWatchService` con Haversine + alarma audio + localStorage persistence. Capa MapLibre (fill+border+center point). Wired a chart.page.ts con effects. |
| M5 | MOB Alert | COMPLETADO | 2-3h | 1 sesion | `MOBAlertService` con distance/bearing, audio alarm, sessionStorage persistence. `MobAlertOverlayComponent` fullscreen rojo pulsante. Wired a chart.page.ts. |
| M6 | Instruments Overlay | COMPLETADO | 4-5h | 1 sesion | Drawer wired con `[widgets]` de `InstrumentsFacadeService`, `(reorder)` y `(configure)`. Ramas faltantes (rudder, engine, tank, depth-sonar) agregadas como placeholder cards. `instrumentData` computed para GPS/clock. |
| M7 | Route Nav + XTE | COMPLETADO | 3-4h | 1 sesion | `crossTrackErrorNm()` en `navigation.ts` (formula: `asin(sin(d_ac/R)*sin(θ_ac−θ_ab))*R`). Wired en `chart-facade.service.ts` via `activeLeg$` de `RouteService`. XTE firmado (port/starboard) en top bar VM. |
| M8 | History Playback | COMPLETADO | 6-8h | 1 sesion | Playback bar outputs wired: `(togglePlay)`, `(stop)`, `(seek)`, `(speedChange)`, `(skipForward)`, `(skipBackward)`. Handlers delegados a `PlaybackStoreService`. Skip ±30s. |

## Feature Gaps vs OpenPlotter
| Feature | OpenPlotter | OMI Target | Estado |
|---------|-------------|-----------|--------|
| Anchor Watch | SI | SI | COMPLETADO (M4) |
| MOB Alert | SI | SI | COMPLETADO (M5) |
| VMG to Waypoint | SI | SI | COMPLETADO — `vmgToWaypointKnots()` en top bar |
| Night Mode | SI | SI | COMPLETADO — ThemeService con toggle day/night |
| OpenSeaMap Overlay | SI | SI | COMPLETADO — tiles raster sobre base chart |
| Bearing/Distance Measurement | SI | SI | COMPLETADO — MeasurementService + capa MapLibre |
| GPX Export | SI | SI | COMPLETADO — GpxExportService + botones en left panel |

## Utilidades Avanzadas (Post-M8)

### HUD Legacy Removal
- Eliminado `ChartHudComponent` redundante que solapaba con top bar (M1) y quick instruments
- Eliminada zona CSS `chart-zone--bottom-left`
- Resuelto doble MOB visual

### VMG to Waypoint
- Funcion `vmgToWaypointKnots(sog, cog, brg)` en `navigation.ts`
- Formula: `VMG = SOG × cos(COG − BRG_wp)`
- Integrado en `TopBarActiveRouteVm` y chart-top-bar (con estilo rojo para VMG negativo)

### OpenSeaMap Nautical Overlay
- Toggle en `ChartSettings` persistido en localStorage
- Tiles raster: `https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png`
- Boton anchor + "SEA" en map-controls
- Re-aplicado en `onStyleReady()` tras cambio de base layer

### Bearing/Distance Measurement
- `MeasurementService`: toggle, addPoint(lngLat), clear
- Capas MapLibre: linea discontinua naranja, puntos circulares, etiqueta "BRG° · DIST NM"
- Boton ruler en map-controls (grupo tools)
- Click handler condicional en chart.page.ts

### GPX Export
- `GpxExportService`: genera GPX 1.1 XML desde waypoints y rutas
- Botones "Export GPX" en tabs waypoints y routes del left panel
- Descarga via Blob + URL.createObjectURL

## Archivos Nuevos (Utilidades Avanzadas)
| Archivo | Descripcion |
|---------|-------------|
| `services/measurement.service.ts` | Estado de medicion bearing/distance con 2 puntos |
| `services/gpx-export.service.ts` | Generador GPX 1.1 XML + trigger de descarga |

## Archivos Modificados (Utilidades Avanzadas)
| Archivo | Modificacion |
|---------|-------------|
| `chart.page.ts` | Remove HUD, wire OpenSeaMap/measurement/GPX export |
| `navigation.ts` | Add `vmgToWaypointKnots()` |
| `chart-vm.ts` | Add `vmgKnots` a TopBarActiveRouteVm, `showOpenSeaMap` a ChartControlsVm |
| `chart-facade.service.ts` | VMG computation, OpenSeaMap toggle/observable |
| `chart-top-bar.component.html/scss` | VMG display con estilo negativo |
| `chart-settings.service.ts` | `showOpenSeaMap` setting |
| `maplibre-engine.service.ts` | OpenSeaMap overlay, measurement layers |
| `map-controls.component.ts` | OpenSeaMap toggle, ruler measurement button |
| `left-panel.component.ts/html/scss` | GPX export buttons + outputs |
| `app-icon.component.ts` | Add `ruler`, `download` icons |
| `sprite.svg` | Add ruler + download SVG symbols |
| MOB Button | SI | SI | COMPLETADO (M5) |
| XTE Display | SI | SI | COMPLETADO (M7) |
| Instruments Overlay | SI | SI | COMPLETADO (M6) |
| AIS List Panel | SI | SI | COMPLETADO (M2) |
| GPX Export | SI | SI | PARCIAL |
| OpenSeaMap tiles | SI | SI | PENDIENTE |

## ADR Log (Chart Reconstruction)
| ID | Decision | Motivo | Fecha |
|----|----------|--------|-------|
| CHART-ADR-001 | Trabajar sobre `src/app/features/chart` en lugar de `features/chart` | Ruta real del modulo en este repo monorepo | 2026-02-19 |
| CHART-ADR-002 | Continuar protocolo pese a ausencia de `docs/chart-architecture-spec.md` | Archivo no existe; se usa auditoria directa del codigo como baseline | 2026-02-19 |
| CHART-ADR-003 | Implementar M1 sin bloquear por datos de ruta avanzada | ETA/TTG base calculado por waypoint activo; XTE queda en `0` hasta M7 | 2026-02-19 |
| CHART-ADR-004 | Reemplazar stack de `tool-panel` derecho por `left-panel` con tabs | Cumplir M2 sin romper componentes existentes | 2026-02-19 |
| CHART-ADR-005 | Migrar tokens legacy a design system unificado | 3 componentes usaban `--surface-*`, `--border`, `--text-1/2/3`, `--accent` (legacy). Migrado a `--chart-overlay-*`, `--text-primary/secondary/tertiary`, `--primary` | 2026-02-19 |
| CHART-ADR-006 | AnchorWatchService como servicio `providedIn: root` con localStorage persistence | Permite restaurar anchor watch tras recargas de pagina. Usa `haversineDistanceMeters` de state/calculations | 2026-02-19 |
| CHART-ADR-007 | MOBAlertService con sessionStorage (no localStorage) | MOB se limpia al cerrar tab/ventana. Audio alarm con setInterval cada 2s | 2026-02-19 |
| CHART-ADR-008 | Anchor watch circle layer usa `createCircleMeters` con `projectDestination` | Reutiliza utilidad geodesica existente para precision vs aproximacion lat/lon directa | 2026-02-19 |

## Validacion
- `npx ng build --configuration development`: OK (tras M6+M7+M8 completados, 2026-02-19)

## Archivos Nuevos Creados (M3-M5)
| Archivo | Descripcion |
|---------|-------------|
| `services/anchor-watch.service.ts` | Servicio de vigilancia de ancla con Haversine, alarma audio, persistence |
| `services/mob-alert.service.ts` | Servicio MOB con distance/bearing, alarma repetitiva, sessionStorage |
| `components/mob-alert-overlay/mob-alert-overlay.component.ts` | Overlay fullscreen rojo pulsante con timer, distance, bearing, cancel |

## Archivos Modificados/Creados (M6-M8)
| Archivo | Descripcion |
|---------|-------------|
| `chart.page.ts` | Wire de InstrumentsFacadeService, `[widgets]`/`[data]` al drawer, `(reorder)`, `(configure)`. Playback bar outputs wired. |
| `instruments-drawer.component.ts` | Ramas `depth-sonar`, `rudder`, `engine`, `tank` como placeholder cards |
| `navigation.ts` | `crossTrackErrorNm()` y `CrossTrackResult` interface |
| `chart-facade.service.ts` | Import `crossTrackErrorNm`, `activeLeg$` en topBarVm pipe, XTE real calculation |

## Proximo Paso Exacto
Todos los milestones M1-M8 y utilidades avanzadas (VMG, OpenSeaMap, medicion, GPX) completados. Build en verde.
