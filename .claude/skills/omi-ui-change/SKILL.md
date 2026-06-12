---
name: omi-ui-change
description: Implement focused Angular UI changes in Open Marine with minimal context. Use for chart, dashboard, instruments, settings, styles, PWA manifest, Signal K UI client, or UI build issues.
---

# OMI UI Change

1. Identify the route or component with `rg`, then read only nearby files.
2. Avoid generated output: skip `dist`, `dist-tmp`, `.angular`, service-worker output and bundles.
3. Prefer existing shared components, theme tokens and route patterns.
4. Keep Signal K base URLs centralized in `APP_ENVIRONMENT`.
5. Validate with `cd marine-instrumentation-ui && npm run build`; use focused tests only for changed behavior.

Useful entry points:

- Routes: `marine-instrumentation-ui/src/app/app.routes.ts`
- Environment: `marine-instrumentation-ui/src/app/core/config/app-environment.token.ts`
- Signal K client: `marine-instrumentation-ui/src/app/data-access/signalk/`
- Shared styles: `marine-instrumentation-ui/src/app/shared/styles/`
