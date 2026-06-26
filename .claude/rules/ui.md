---
paths:
  - "marine-instrumentation-ui/**/*.{ts,html,scss,css,json}"
---

# UI Rules

- Angular app uses standalone/lazy pages in `src/app/app.routes.ts`; preserve lazy loading for feature routes.
- Prefer existing shared components, design tokens and SCSS utilities before adding new styling patterns.
- Never hardcode colors. Style only from the Glass Bridge `--gb-*` tokens and the spacing/radius/shadow scales; floating chart panels use the `--chart-overlay-*` tokens. Full palette and conventions: `.claude/references/design-system.md`.
- Signal K endpoints come from `APP_ENVIRONMENT`; avoid hardcoded API URLs outside config.
- Do not read or edit `dist`, `dist-tmp`, `.angular` or generated service-worker output for normal UI changes.
- State uses RxJS + Angular signals with per-feature `*FacadeService` view-models; components are standalone + `OnPush`.
- Run heavy/recurring/map/high-frequency work outside `NgZone` (`runOutsideAngular`); coalesce hot streams and avoid per-message Map clones or forced reflows.
- Validate UI changes with `cd marine-instrumentation-ui && npm run build`; add focused tests only when behavior changes.
- Deeper key-file index and performance rules: `.claude/references/architecture.md`.
