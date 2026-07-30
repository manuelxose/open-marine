# Open Marine — Architecture & Key Files

On-demand reference for both Claude and Codex. Load it to locate code or understand
data flow instead of exploring trees. All paths are repo-relative. Keep reads narrow.

## Data flow (sensor → screen)

Sensor / simulator → Signal K (Docker) → WebSocket → `SignalKClientService` →
`DatapointStoreService` (+ `AisStoreService`) → selectors → per-feature `*FacadeService`
(RxJS + signals) → standalone `OnPush` components / `MapLibreEngineService`.

## UI key files (`marine-instrumentation-ui/src/app/`)

- Bootstrap / routes: `app.config.ts`, `app.routes.ts` (standalone, lazy feature routes).
- Endpoints: `core/config/app-environment.token.ts` — `APP_ENVIRONMENT` holds every Signal K base URL.
- Signal K ingestion: `data-access/signalk/signalk-client.service.ts` (WS; splits `self` vs `vessels.*` AIS),
  `signalk-mapper.ts`, `signalk-message.types.ts`.
- Central state hub: `state/datapoints/datapoint-store.service.ts` (live DataPoint map, history ring
  buffers, own-ship track filtering) and `state/datapoints/datapoint.selectors.ts`.
- AIS state: `state/ais/ais-store.service.ts` (targets signal, CPA/TCPA risk, track buffer; emissions coalesced).
- Other state: `state/{alarms,autopilot,calculations,connectivity,playback,resources,vessel}/`.
- Chart: `features/chart/chart.page.ts` (single `/chart` experience; wires coalesced signal effects
  → engine), `features/chart/services/maplibre-engine.service.ts` (plain WebGL class with
  style-generation guards), `features/chart/services/{chart-facade,chart-settings,coalesced-map-effects}.ts`.
- Chart manager: `features/chart/components/{chart-manager,chart-source-catalog,environment-panel}/`
  — base maps, navigation, weather/sea, offline area packages and diagnostics. Quick weather
  forecast is intentionally separate.
- Chart APIs: `data-access/chart/{chart-engine-api,chart-remote-catalog,environment-api}.service.ts`;
  every URL starts from `APP_ENVIRONMENT.chartEngineApiUrl`.
- Shared UI: `shared/components/`, `shared/styles/` (theme tokens), `shared/directives/`.
- Aesthetic / design system (read before styling): `design-system.md` — Glass Bridge `--gb-*` theme, night-mode default, no hardcoded colors.

## Backend / data key files

- Contract (`marine-data-contract/src/`): `paths.ts` (`PATHS`), `types.ts` (`DataPoint`, etc.),
  `units.ts`, `quality.ts`, `index.ts`. Imported elsewhere as `@omi/marine-data-contract`.
- Gateway (`marine-sensor-gateway/src/`): adapters + Signal K publishers; Python operational scripts in `rpi/omi-imu/`.
- Simulator (`marine-simulation-platform/`): deterministic scenarios + presets + HTTP/WebSocket publishers; API on 4100 (`bench`/`closed-loop`), `live` streams to Signal K.
- Runtime: `signalk-runtime/` (docker compose + plugin/settings data).
- Tiles: `marine-chart-toolkit/` (MBTiles CLI), `marine-tile-server/src/index.ts` (Express).
- Chart engine (`marine-chart-engine/src/`): `server.ts`/`config.ts`; source catalog and WMS/XYZ
  proxies; `/catalog/package-plans` and `/catalog/packages`; S-57/S-63/MBTiles import support;
  `/weather/forecast`, `/weather/wind-field.geojson`, environment frames and Vigo tides.
- Offline package services: `services/{area-geometry,area-search,package-planner,chart-package}.ts`.
- Environment services: `services/{environment-catalog,environment-sync,weather-forecast,wind-field,tide}.service.ts`;
  Copernicus sync script in `marine-chart-engine/scripts/sync-copernicus-vigo.py`.
- Cross-platform helpers: `scripts/` (init, migrate/deploy, status, start-{ais,gps,imu}).

## Patterns & conventions

- State = RxJS observables + Angular signals; each feature exposes a `*FacadeService` view-model; components are standalone + `OnPush`.
- Signal K paths/types come from `PATHS` / contract types — never hardcode Signal K strings.
- UI endpoints only via `APP_ENVIRONMENT`.
- Preserve `vessels.self` / `self` context normalization and contract timestamp helpers in publishers.

## Performance rules (hard-won)

- Run heavy or recurring work (intervals, map ops, high-frequency streams) inside
  `NgZone.runOutsideAngular`; re-enter with `zone.run` only to publish UI state. The MapLibre
  map is created and driven outside the zone (see `chart.page.ts`).
- Coalesce high-frequency emissions (e.g. AIS): flush a snapshot on an interval instead of per
  message; do not clone Maps per message.
- Avoid per-frame `getBoundingClientRect` / forced reflow; batch DOM reads inside one `requestAnimationFrame`.
- Throttle camera animation (`easeTo`) against sensor jitter using bearing/center deltas.
- Treat every MapLibre style as a generation: invalidate stale RAF/idle/timers, initialize only
  from the current `style.load`, and reapply desired vessel/AIS/navigation/weather state once.
- Weather wind fields use cached symbol-layer meteorological barbs. Persist area bounds, update the
  GeoJSON source URL as one coalesced operation and let stale requests be cancelled.

## Validation (narrowest first)

- UI: `cd marine-instrumentation-ui && npm run build` — CSS budget warnings are pre-existing, not failures.
- Contract: `cd marine-data-contract && npm run test:run && npm run build`
- Gateway: `cd marine-sensor-gateway && npm test && npm run build`
- Simulator: `npm run test:simulation` (or `cd marine-simulation-platform && npm run build`)
- Root status: `npm run status`. Add focused tests only for changed behavior.

## Never

- Read `node_modules/`, `dist/`, `dist-tmp/`, `.angular/`, coverage, logs or bundles unless debugging generated output.
- Commit secrets or Raspberry credentials; use SSH aliases (see the raspberry skill/reference).
