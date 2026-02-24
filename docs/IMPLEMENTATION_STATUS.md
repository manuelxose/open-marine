# Implementation Status

Estado tecnico consolidado del proyecto.

Fecha de corte: 2026-02-23.

## 1. Resumen ejecutivo

- `✅` Guia de estilos completada y consolidada en codigo (`/styleguide`).
- `✅` Widgets y componentes funcionales disponibles para demo (`/widgets`).
- `✅` UI Angular compila en modo produccion.
- `✅` Build de `marine-data-simulator` en verde.
- `✅` Build de `marine-sensor-gateway` en verde.
- `✅` Test de integracion IMU en `marine-sensor-gateway` agregado y ejecutado en verde (`npm run test`).
- `✅` Integracion IMU ICM-20948 validada por SSH en Raspberry Pi (`manu@manu.local`).
- `✅` Flujo real IMU -> Signal K validado con fallback WebSocket por restricciones HTTP write (`POST 404`, `PUT 405`).
- `✅` DOC_3 Commercial App Restructuring — Fases A, B, C, D, E, F, G, H, I implementadas.
- `✅` DOC_4 UX/UI Commercial Final — Secciones S1–S10 implementadas (Glass Bridge Design System).
- `✅` Glass Bridge Pro Redesign — Dashboard, panel-card, 5 paneles, critical strip, instruments page con glass morphism premium.
- `✅` Separacion de paginas instruments/vessels — AIS extraido de `/instruments` a nueva ruta `/vessels` dedicada.
- `✅` Unificación instruments/widgets — `/widgets` eliminada, redirect a `/instruments`. Cada instrumento tiene InstrumentContainerComponent con toggle numérico/visual/ambos. Nuevos instrumentos: COG, Position, GPS Status. Dashboard config en Settings.
- `✅` Widgets page rediseñada — **ELIMINADA**: unificada en `/instruments` con dual-view (numérico/visual/ambos). Configuración de dashboard movida a Settings.
- `✅` Catálogo completo de instrumentos — `/instruments` muestra los 50 instrumentos del catálogo (`instrument-catalog.ts`) con filtros por categoría (7 tabs: Navigation, Wind, Depth, Environment, Electrical, Engine, Performance). Cada instrumento usa `omi-instrument-widget` para vista numérica + widget visual dedicado cuando existe. Chart "Configure Instruments" navega a `/instruments`.
- `✅` Dashboard modernizado — migrado a signals + `@if`/`@for`/`@switch`, toolbar compacto, palette sidebar deslizable, drag & drop de tile completo, empty state, layout sin gaps, responsive desktop/tablet/móvil.
- `✅` Dashboard como panel de control principal — Añadidos 2 paneles nuevos: **Engine** (RPM hero, temp. refrigerante, presión aceite, barra nivel combustible, consumo L/h) y **Environment** (temp. agua hero, temp. aire, presión barométrica, humedad). Critical strip ampliada con COG y RPM (8 indicadores). Grid por defecto: Navigation, Wind, Engine, Depth, Power, Environment, System. Nuevos formatters (`formatTemperature`, `formatPressure`, `formatRpm`, `formatPercent`), selectores (`selectRpm`, `selectCoolantTemp`, etc.), VMs (`EnginePanelVm`, `EnvironmentPanelVm`). Simulador actualizado con datos de motor y ambiente.
- `✅` Splash Screen + Onboarding Wizard + Guided Tour — Splash con logo SVG compass + loader animado + status messages. Wizard de 4 pasos (Welcome, Preferences, Connection, Tour). Tour guiado con spotlight SVG-mask y tooltips posicionados. Settings integrados con replay/reset. i18n EN+ES completa. Build en verde.
- `✅` P4 Sistema de Leyenda Náutica — 12 categorías (OMI, AIS, IALA-A, Luces, Peligros, Batimetría, Zonas, Líneas, Abreviaturas, Unidades, Beaufort, Tipos AIS), ~100+ entradas, búsqueda full-text, modal responsive (sidebar+grid), componente `LegendSymbolComponent` (6 tipos de símbolo), integración en `/chart` (botón "?") y ruta standalone `/legend`, i18n EN+ES completa. Build en verde.

## 2. Estado por paquete

| Paquete | Estado | Nota |
| --- | --- | --- |
| `marine-data-contract` | `✅` | Build y tests en verde. |
| `marine-instrumentation-ui` | `✅` | Build en verde; warnings de budget. |
| `marine-data-simulator` | `✅` | Build en verde tras fix de tipado en CLI y escenario AIS. |
| `marine-sensor-gateway` | `✅` | Build en verde + contratos IMU y scripts RPi validados en entorno real. |
| `signalk-runtime` | `✅` | Compose listo para entorno local. |

## 3. Estado funcional UI

Rutas activas (fuente: `marine-instrumentation-ui/src/app/app.routes.ts`):

- `✅ /dashboard`
- `✅ /chart` — Chart Reconstruction M1-M8 completados + utilidades avanzadas (VMG, OpenSeaMap overlay, measurement tool, GPX export)
- `✅ /instruments` — Catálogo completo: 50 instrumentos, 7 categorías con filtros, dual-view (numérico/visual/ambos), sección AIS
- `✅ /alarms`
- `✅ /diagnostics`
- `✅ /settings` — Incluye configuración de dashboard widgets (drag & drop, visibilidad)
- `↩️ /widgets` — Redirect a `/instruments` (página eliminada)
- `✅ /styleguide`
- `✅ /resources`
- `✅ /autopilot`
- `✅ /vessels` — Nuevo: AIS targets dedicado (lista + detalle, danger indicators, responsive split layout)
- `✅ /performance` — Nuevo: polar sailing performance (VMG, polar ratio, CSV upload)
- `✅ /onboarding` — Nuevo: setup wizard (welcome, connection, vessel)
- `✅ /legend` — Nuevo: leyenda náutica completa (12 categorías, búsqueda, responsive)

Rutas protegidas por `onboardingGuard` (DOC_3):

- Todas las rutas principales requieren onboarding completado.
- `/onboarding/*` y `/styleguide` permanecen sin guard.

## 4. Verificacion de comandos (ejecutado 2026-02-19)

## 4.1 `marine-data-contract`

Comando:

```powershell
npm run test:run
```

Resultado:

- `✅` 1 archivo de test, 3 tests en verde.

## 4.2 `marine-instrumentation-ui`

Comando:

```powershell
npm run build
```

Resultado:

- `✅` Build completado.
- `[IN_PROGRESS]` Warnings de budget (bundle inicial y varios SCSS de composites).

## 4.3 `marine-data-simulator`

Comando:

```powershell
npm run build
```

Resultado:

- `✅` Build completado.

Correcciones aplicadas en esta iteracion:

- `src/index.ts`: parseo posicional con guardas para evitar acceso a indice `undefined`.
- `src/scenarios/busyShippingLane.ts`: fallback de tipo de buque para evitar union con `undefined`.

## 4.4 `marine-sensor-gateway`

Comando:

```powershell
npm run build
```

Resultado:

- `✅` Build completado.

Correcciones aplicadas en esta iteracion:

- `src/ais/rtlAisGateway.ts`: tipado de proceso hijo alineado con `stdio: ["ignore", "pipe", "pipe"]`.
- `src/ais/rtlAisGateway.ts`: manejo de `pid` compatible con `exactOptionalPropertyTypes`.
- `src/__tests__/imu-integration.test.ts`: nuevo test de integracion IMU (tipos, conversiones, paths y delta publisher).
- `package.json`: nuevo script `npm run test` para ejecutar test IMU con `tsx --test`.

## 5. Calidad visual y styleguide

Estado:

- `✅` La guia de estilos se considera completada en codigo.
- `✅` El simbolo oficial de completado es `✅`.
- `✅` Hamburger menu integrado en TopBar (chart mode) — eliminado boton flotante que solapaba iconos.
- `✅` Widgets page (`/widgets`) migrada a tokens `--gb-*` con toggle switches custom (sin checkbox nativo).
- `✅` Widgets page (`/widgets`) rediseñada con layout card-grid, glass-morphism cards con previews, section icons, stat counters y size badges.
- `✅` Vessels page (`/vessels`) nueva — split layout lista+detalle AIS, header con conteo de targets y danger count, slide-in animation, responsive.
- `✅` Instruments page (`/instruments`) limpia — eliminado bloque AIS (AisTargetListComponent, AisStoreService), añadido empty state.
- `✅` Dashboard page (`/dashboard`) modernizado — observables→signals con `toSignal()`, template `@if`/`@for`/`@switch`, toolbar compacto, palette sidebar con animación slide-in, drag & drop de tiles completas (cursor grab/grabbing), CDK placeholder/preview mejorados, empty state, layout sin gaps, responsive 3-tier (desktop/tablet/mobile).
- `✅` Styleguide page (`/styleguide`) migrada a tokens `--gb-*` consistente con Glass Bridge.
- `✅` AppButtonComponent migrado a tokens `--gb-*` (glass morphism, marine-pro look).
- `✅` MapLibreEngineService: ResizeObserver + post-load resize() para evitar mapa gris tras transiciones de grid.
- `✅` app-shell: CSS flex para routed components (`flex: 1; min-height: 0`) — fix de layout para instruments y demas paginas.
- `✅` mock-server.js: escenarios ciclicos de alarma (shallow water 1.5-3m, low battery 10.8-11.3V, GPS lost 35s).

Regla de prevencion incorporada:

- No anidar superficies visuales (caja + borde + radio) sobre componentes que ya renderizan su propia superficie.
- Revisar en `/styleguide` y `/widgets` despues de cada cambio visual.

Referencia de proceso: `docs/AI_PLAYBOOK.md`.

## 6. Riesgos vigentes

- `[PENDING]` Smoke test E2E completo aun pendiente.
- `[IN_PROGRESS]` Presupuesto de bundle UI superado (impacto en perf inicial).
- `[IN_PROGRESS]` Cobertura de pruebas baja fuera de `marine-data-contract`.

## 7. Definicion de proyecto "estable"

Para considerar estable el estado base:

- Build verde en los 4 paquetes Node/Angular.
- Smoke test manual completo (`dashboard`, `chart`, `alarms`, `resources`, `autopilot`).
- Sin errores TS pendientes en roadmap activo.

## 8. Historial de consolidacion documental

En esta iteracion se eliminaron los documentos heredados duplicados (`*_PROMPT.md`, `STATUS`, `PROJECT_STATE`, `roadmap` antiguos, etc.) y se reemplazaron por el set canonico actual.

Ver `README.md` para el mapa vigente.

## 9. DOC_3 Commercial App Restructuring — Estado de implementacion

Referencia: `docs/DOC_3_COMMERCIAL_APP_RESTRUCTURING.md`.

### Fase A — Route & Guard Architecture

- `✅` Ruta default cambiada a `/chart`.
- `✅` `onboardingGuard` (functional `CanActivateFn`) creado en `core/guards/onboarding.guard.ts`.
- `✅` Rutas principales protegidas; `/onboarding` y `/styleguide` sin guard.

### Fase B — State Services

- `✅` `VesselProfileService` — state/vessel/vessel-profile.service.ts (BehaviorSubject + localStorage).
- `✅` `ConnectivityService` — state/connectivity/connectivity.service.ts (derives from SignalK/network).
- `✅` `AppStateService` — state/app/app-state.service.ts (onboarding, theme, fullscreen, alerts).
- `✅` `DashboardLayoutService` — features/dashboard/services/dashboard-layout.service.ts (grid configurable, 8 widget types, localStorage persistence).

### Fase D — Onboarding Wizard

- `✅` Onboarding routes — features/onboarding/onboarding.routes.ts.
- `✅` Welcome page — features/onboarding/pages/welcome/onboarding-welcome.page.ts.
- `✅` Connection page — features/onboarding/pages/connection/onboarding-connection.page.ts.
- `✅` Vessel setup page — features/onboarding/pages/vessel/onboarding-vessel.page.ts.

### Fase E — Alarm Expansion

- `✅` Alarm types expanded: 11 tipos incluyendo engine-overheat, low-oil, storm-warning, connection-lost.
- `✅` AlarmCategory type added (8 categories).
- `✅` AlarmSeverity.Info added.
- `✅` AlarmState.Resolved, AlarmState.Inhibited added.
- `✅` AlarmStoreService: resolveAlarm, inhibitAlarm, acknowledgeAll, silenceAll.
- `✅` AlarmSettingsService: thresholds con hysteresis (shallow depth, battery, CPA, GPS lost).
- `✅` Type-safe index signature access for data fields in facade/page/component.

### Fase H — Settings Components

- `✅` vessel-settings — VesselProfileService form (name, MMSI, callsign, type, dimensions).
- `✅` connection-settings — Signal K URL, connection test, auto-reconnect, demo mode.
- `✅` display-settings — Theme toggle, compact mode.
- `✅` units-settings — Speed, depth, temperature, pressure unit selection.
- `✅` alarm-settings — Safety thresholds with hysteresis.
- `✅` chart-settings — All chart layer/display toggles (AIS, OpenSeaMap, range rings, etc.).
- `✅` data-settings — Reset onboarding, clear tile cache, clear all prefs.
- `✅` experiments-settings — Night mode beta, advanced instruments toggle.
- `✅` Settings page restructured with sidebar navigation and component delegation.
- `✅` Dashboard widget visibility integrated with DashboardLayoutService.

### Fase I — PWA & Deployment

- `✅` manifest.webmanifest created (fullscreen, landscape, themed icons).
- `✅` ngsw-config.json updated (manifest, OpenSeaMap tile caching).
- `✅` index.html meta tags (theme-color, apple-mobile-web-app, description).
- `✅` CI/CD workflow .github/workflows/ci.yml (build, test, lint).
- `✅` IDB storage service — core/storage/idb-store.service.ts (positions, datapoints, alarm-history, prune, throttled save).

### Fase C — Instrument System

- `✅` PATHS extended with 50+ Signal K paths (depth, wind, environment, electrical, propulsion, tanks, navigation, performance).
- `✅` Instrument catalog — features/instruments/data/instrument-catalog.ts (50 instruments, 7 categories).
- `✅` InstrumentWidgetComponent — features/instruments/components/instrument-widget/ (digital, analog-circular, analog-linear, wind-rose display types, quality indicator, stale detection).
- `✅` Instruments page restructured — category tabs (All / Navigation / Wind / Depth / Environment / Electrical / Engine / Performance) + dynamic grid rendering all 50 instruments via InstrumentWidgetComponent. AIS targets extraido a `/vessels` page dedicada.

### Fase F — Performance Sailing

- `✅` Polar parser — features/performance/utils/polar-parser.ts (CSV/semicolon/tab, bilinear interpolation, VMG optimization).
- `✅` PerformanceService — features/performance/performance.service.ts (polar-based calculations, real-time recommendations).
- `✅` Performance page — features/performance/performance.page.ts (VMG, polar ratio, target TWA, CSV upload).
- `✅` Performance route wired in app.routes.ts (`/performance`).

### Fase G — Autopilot Console Enhancement

- `✅` Enhanced template — status badge, engage/disengage toggle, target display, dodge buttons (±1°, ±10°), mode selector tabs (Auto/Wind/Route), rudder indicator, off-course warning.
- `✅` Rudder angle observation via DatapointStoreService + PATHS.steering.rudderAngle.
- `✅` Off-course detection using configurable threshold.

### Fases pendientes

- `[PENDING]` Fase J — Testing (unit tests for XTE, CPA, anchor watch, true wind).
- `[PENDING]` Fase K — User documentation (docs-user/, help overlay).

## 10. IMU ICM-20948 - Validacion tecnica (2026-02-22)

Resumen:

- `✅` `marine-data-contract` ampliado con:
  - `sensors.imu.accelerometer`
  - `sensors.imu.gyroscope`
  - `sensors.imu.magnetometer`
  - Tipos `Vector3` y `Attitude`
- `✅` `marine-sensor-gateway` ampliado con:
  - `src/adapters/imu.ts`
  - `src/publishers/signalkPublisher.ts`
  - scripts RPi en `rpi/omi-imu/`
- `✅` Validacion en Raspberry Pi:
  - `setup.sh` ejecutado en verde
  - `01_test_sensor.py` leyendo 9 ejes en tiempo real
  - `02_publish_signalk.py` publicando en Signal K

Comportamiento observado en Signal K:

- `GET /signalk/v1/api/` responde `200`.
- `POST /signalk/v1/api/` responde `404`.
- `PUT /signalk/v1/api/vessels/self/...` responde `405`.
- WebSocket `/signalk/v1/stream?subscribe=none` permite envio de deltas (`ws.icm20948`).

Endpoints de lectura validados:

- `/signalk/v1/api/vessels/self/navigation/headingMagnetic`
- `/signalk/v1/api/vessels/self/navigation/attitude`
- `/signalk/v1/api/vessels/self/sensors/imu`
