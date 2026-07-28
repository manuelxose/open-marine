# Open Marine Project Map

Authoritative key-file index, sensor→screen data flow and performance rules live in the repo at
`.claude/references/architecture.md` — read it before broad exploration. This file is the quick module/command summary.

## Modules

- `marine-instrumentation-ui/`: Angular 21 UI, standalone/lazy routes, Signal K client, MapLibre chart, dashboard, instruments, PWA assets.
- `marine-data-contract/`: shared Signal K `PATHS`, units, quality flags, `DataPoint`, timestamp normalization.
- `marine-sensor-gateway/`: TypeScript gateway, adapters and publishers; `rpi/omi-imu/` Python operational scripts.
- `marine-data-simulator/`: deterministic scenarios and HTTP/WebSocket Signal K publishers.
- `signalk-runtime/`: Docker Compose and Signal K runtime plugin/settings data.
- `marine-chart-toolkit/`: MBTiles/chart processing CLI.
- `marine-tile-server/`: Express tile server.
- `scripts/`: init, migration, status and start helpers.

## Commands

- Root: `npm run init`, `npm run status`, `npm run build:contract`
- Signal K: `npm run start:signalk`, `npm run stop:signalk`, `npm run logs:signalk`
- UI: `cd marine-instrumentation-ui && npm run build`
- Contract: `cd marine-data-contract && npm run test:run && npm run build`
- Gateway: `cd marine-sensor-gateway && npm test && npm run build`
- Simulator: `cd marine-data-simulator && npm run build`

## Coding Defaults

- Prefer shared `PATHS` and types from `marine-data-contract`.
- Preserve existing TypeScript module style and package-local scripts.
- Keep UI endpoint logic centralized in `APP_ENVIRONMENT`.
- UI state = RxJS + Angular signals with per-feature `*FacadeService` view-models; components standalone + `OnPush`.
- Do not commit local env files or Raspberry credentials.

## Performance Rules

- Run heavy/recurring/map/high-frequency work outside `NgZone` (`runOutsideAngular`); re-enter with `zone.run` only to publish UI state.
- Coalesce high-frequency emissions (e.g. AIS) into interval snapshots; avoid per-message Map clones.
- Avoid forced reflows; batch DOM reads in one `requestAnimationFrame`. Throttle map `easeTo` against sensor jitter.
