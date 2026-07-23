---
name: omi-ui-change
description: Implement focused Angular UI changes in Open Marine with minimal context. Use for chart, dashboard, instruments, settings, styles, PWA manifest, Signal K UI client, or UI build issues.
---

# OMI UI Change

Angular 21: standalone + lazy routes, RxJS + Angular signals, per-feature `*FacadeService`
view-models, `OnPush` components. Theme via shared style tokens.

Start from these files (don't grep to rediscover them) — all under `marine-instrumentation-ui/src/app/`:

- Routes: `app.routes.ts`; bootstrap `app.config.ts`
- Endpoints: `core/config/app-environment.token.ts` (`APP_ENVIRONMENT`)
- Signal K client: `data-access/signalk/signalk-client.service.ts`
- State hubs: `state/datapoints/datapoint-store.service.ts`, `state/ais/ais-store.service.ts`
- Chart (map): `features/chart/chart.page.ts` + `features/chart/services/` (incl. `maplibre-engine.service.ts`) — vessel marker, true/apparent wind vectors. Recent performance refactor: effects are coalesced via `coalesced-map-effects.ts`, `MapLibreEngineService` uses a static icon cache, `onStyleReady()` is batched with a 4 ms budget, and `FRAME_LAYER_BUDGET` is 1. Do not revert these patterns.
- Signal charts: `shared/components/uplot-chart/` rendered by `features/diagnostics/` (simulation/autopilot/motor signals over time)
- Shared: `shared/components/`, `shared/styles/`

For simulation/diagnostics, scenario and signal-chart UX, prefer the `omi-simulation-platform` skill.

Full key-file index, data flow and performance rules: `.claude/references/architecture.md` (load on demand).
Aesthetic / design system (read before any styling): `.claude/references/design-system.md` — Glass
Bridge `--gb-*` theme, night-mode default, **no hardcoded colors** (status via `--gb-data-*`/`--gb-alarm-*`,
floating chart panels via `--chart-overlay-*`, `--space-*`/`--radius-*` scales).

Workflow:

1. Search with `rg`, read narrowly; never read `dist`, `dist-tmp`, `.angular` or bundles.
2. Reuse existing shared components, theme tokens and route patterns before adding new ones.
   Style only from design-system tokens — never hardcode colors (MapLibre WebGL paint is the one
   exception; mirror a token value in hex and comment it).
3. Keep Signal K base URLs in `APP_ENVIRONMENT`; paths/types from `@omi/marine-data-contract`.
4. Heavy/recurring/map/high-frequency work must run outside `NgZone` (`runOutsideAngular`); coalesce
   hot streams. See the performance rules in `architecture.md`.
5. Validate: `cd marine-instrumentation-ui && npm run build` (CSS budget warnings are pre-existing).
   Add focused tests only for changed behavior.
