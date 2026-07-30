---
name: omi-charts
description: Implement, debug, review, or validate Open Marine charts and environmental mapping. Use for marine-chart-engine, MapLibre lifecycle, chart catalogs and proxies, offline area packages, S-57/S-63/MBTiles, IHM/EMODnet/GEBCO/OpenSeaMap sources, weather forecasts and overlays, Copernicus sync, tides, map selection, coverage, or chart UI diagnostics.
---

# OMI Charts

Work locally unless the user explicitly authorizes Raspberry deployment. Preserve unrelated dirty
changes, especially local waypoint deletions and chart data.

## Architecture

- `/chart` is the only map experience. `ChartManagerComponent` owns base maps, navigation,
  weather/sea, offline packages and diagnostics. Quick forecast remains an independent top widget.
- `marine-chart-engine` serves catalog, tiles/proxies, imports, package planning, environment data,
  forecast fallback and tides on `:8088`.
- The UI obtains every engine URL through `APP_ENVIRONMENT.chartEngineApiUrl`. Never let
  `localhost:8088` reach a LAN browser.
- Chart/package/weather DTOs are local to chart engine and UI data access. Use
  `marine-data-contract` only for actual Signal K paths and sensor values.

## Key Files

- Engine bootstrap/config: `marine-chart-engine/src/{server,config}.ts`
- Catalog/proxies: `src/catalog/`, `src/routes/{catalog,packages,wms-proxy,xyz-proxy}.routes.ts`
- Packages: `src/services/{area-geometry,area-search,package-planner,chart-package}.ts`
- Environment: `src/routes/{environment,weather}.routes.ts`,
  `src/services/{environment-catalog,environment-sync,weather-forecast,wind-field,tide}.service.ts`
- Copernicus: `marine-chart-engine/scripts/sync-copernicus-vigo.py`
- UI orchestration: `marine-instrumentation-ui/src/app/features/chart/chart.page.ts`
- Map engine: `features/chart/services/{maplibre-engine,coalesced-map-effects}.ts`
- Canonical UI state: `features/chart/services/chart-settings.service.ts`
- Manager/panels: `features/chart/components/{chart-manager,environment-panel,chart-source-catalog}/`

## MapLibre Invariants

1. Increment style generation before every `setStyle()` and on destroy.
2. Cancel stale RAF, idle tasks, timers and pending style initialization.
3. Mutate sources/layers only for the current generation after its `style.load`.
4. Retain desired overlay state while a style loads and apply it once when ready.
5. Avoid double initialization from `load` plus `style.load`.
6. Run map work outside Angular; coalesce effects and batch `setData()`.
7. Use cached symbol-layer icons, not DOM markers. Weather wind uses standard meteorological
   barbs: half=5 kn, full=10 kn, pennant=50 kn; shaft points from the wind.

## Sources, Packages and Licensing

- Build selectable maps from real base factories, engine catalog and registered MBTiles. Remove
  demos and deduplicate equivalent bathymetry entries.
- Disable unavailable/out-of-coverage sources before selection and fall back to OSM on runtime
  base-style failure.
- Never bulk-download standard OSM, Esri, IHM WMS or OpenSeaMap tiles.
- Spain packages prioritize licensed IHM ENC import, then legal MBAR/EMODnet, coastline and OSM
  seamark extracts. GEBCO is supplementary and not for navigation.
- Package planning accepts GeoJSON polygon geometry. Installation uses resumable jobs, checksums,
  staging, atomic activation and a manifest with coverage, datum, source/version, attribution and license.
- S-63 production requires legal exchange sets, permits and OEM/distributor arrangements. Never
  commit permits, keys, decrypted cells or credentials.

## Weather and Environment

- Forecast endpoint: `/weather/forecast?latitude&longitude[&refresh=1]`; fresh cache 15 minutes,
  stale fallback up to 24 hours and duplicate requests coalesced.
- Detailed wind endpoint: `/weather/wind-field.geojson?bbox=west,south,east,north`; validate ordered
  bounds, max 12° per axis, persist `weatherBounds`, cache separately per area and batch upstream calls.
- Vigo currently yields an adaptive 18×10 grid (about 4.3 km spacing). Selection supports current
  viewport, drawn rectangle and Vigo preset.
- OpenWeatherMap raster overlays are global. Copernicus IBI frames are synchronized local model
  data with explicit coverage/time; never pretend missing/out-of-area frames are provider failures.
- Preserve attribution, update age and fresh/cached/stale/unavailable states.

## Validation

1. Engine: `cd marine-chart-engine && npm test`
2. UI unit tests: `cd marine-instrumentation-ui && npm run test:ci`
3. UI build/lint: `npm run build` and `npm run lint`
4. Map E2E: `npx playwright test e2e/chart-environment.spec.ts`
5. For provider changes, start a temporary local engine on a free port and verify real response
   status, feature count, grid metadata and bounds. Do not restart the Raspberry.
6. Finish with `git diff --check` and confirm no cache, secret or chart binary was added.
