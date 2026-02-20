# Implementation Status

Estado tecnico consolidado del proyecto.

Fecha de corte: 2026-02-20.

## 1. Resumen ejecutivo

- `✅` Guia de estilos completada y consolidada en codigo (`/styleguide`).
- `✅` Widgets y componentes funcionales disponibles para demo (`/widgets`).
- `✅` UI Angular compila en modo produccion.
- `✅` Build de `marine-data-simulator` en verde.
- `✅` Build de `marine-sensor-gateway` en verde.
- `✅` DOC_3 Commercial App Restructuring — Fases A, B, C, D, E, F, G, H, I implementadas.

## 2. Estado por paquete

| Paquete | Estado | Nota |
| --- | --- | --- |
| `marine-data-contract` | `✅` | Build y tests en verde. |
| `marine-instrumentation-ui` | `✅` | Build en verde; warnings de budget. |
| `marine-data-simulator` | `✅` | Build en verde tras fix de tipado en CLI y escenario AIS. |
| `marine-sensor-gateway` | `✅` | Build en verde tras fix de tipado en gateway AIS. |
| `signalk-runtime` | `✅` | Compose listo para entorno local. |

## 3. Estado funcional UI

Rutas activas (fuente: `marine-instrumentation-ui/src/app/app.routes.ts`):

- `✅ /dashboard`
- `✅ /chart` — Chart Reconstruction M1-M8 completados + utilidades avanzadas (VMG, OpenSeaMap overlay, measurement tool, GPX export)
- `✅ /instruments`
- `✅ /alarms`
- `✅ /diagnostics`
- `✅ /settings`
- `✅ /widgets`
- `✅ /styleguide`
- `✅ /resources`
- `✅ /autopilot`
- `✅ /performance` — Nuevo: polar sailing performance (VMG, polar ratio, CSV upload)
- `✅ /onboarding` — Nuevo: setup wizard (welcome, connection, vessel)

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

## 5. Calidad visual y styleguide

Estado:

- `✅` La guia de estilos se considera completada en codigo.
- `✅` El simbolo oficial de completado es `✅`.

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
