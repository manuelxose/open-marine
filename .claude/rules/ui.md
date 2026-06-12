---
paths:
  - "marine-instrumentation-ui/**/*.{ts,html,scss,css,json}"
---

# UI Rules

- Angular app uses standalone/lazy pages in `src/app/app.routes.ts`; preserve lazy loading for feature routes.
- Prefer existing shared components, design tokens and SCSS utilities before adding new styling patterns.
- Signal K endpoints come from `APP_ENVIRONMENT`; avoid hardcoded API URLs outside config.
- Do not read or edit `dist`, `dist-tmp`, `.angular` or generated service-worker output for normal UI changes.
- Validate UI changes with `cd marine-instrumentation-ui && npm run build`; add focused tests only when behavior changes.
