---
name: omi-ui-change
description: Implement focused Angular UI changes. Use for chart, dashboard, instruments, settings, styles, PWA manifest, Signal K UI client, or UI build issues.
---

# OMI UI Change

Angular 21 standalone + lazy routes, RxJS + signals, `OnPush`, Glass Bridge `--gb-*` theme.

Start from these files under `marine-instrumentation-ui/src/app/`:

- Routes: `app.routes.ts`; bootstrap: `app.config.ts`
- Endpoints: `core/config/app-environment.token.ts` (`APP_ENVIRONMENT`)
- Signal K client: `data-access/signalk/signalk-client.service.ts`
- State: `state/datapoints/datapoint-store.service.ts`, `state/ais/ais-store.service.ts`
- Chart: `features/chart/chart.page.ts` + `features/chart/services/`
- Scope charts: `shared/components/uplot-chart/` + `features/diagnostics/`
- Shared: `shared/components/`, `shared/styles/`

For simulation/diagnostics UX, prefer `omi-simulation-platform` skill.

Design system: `.claude/references/design-system.md` — night-mode default, **no hardcoded colors** (status via `--gb-data-*`/`--gb-alarm-*`, floating charts via `--chart-overlay-*`, `--space-*`/`--radius-*`).

## Workflow

1. Search with `grep_search`, read narrowly; never read `dist`, `dist-tmp`, `.angular`, bundles.
2. Reuse existing components, theme tokens, route patterns. Style only from design-system tokens.
3. Signal K URLs in `APP_ENVIRONMENT`; paths/types from `@omi/marine-data-contract`.
4. Heavy/recurring work outside `NgZone` (`runOutsideAngular`); coalesce hot streams.
5. Validate: `cd marine-instrumentation-ui && npm run build`. Add tests only for changed behavior.

## Copilot note

- Use `replace_string_in_file` with 3+ context lines. Prefer narrow diffs.
- Use `semantic_search` for codebase exploration instead of reading entire directories.
