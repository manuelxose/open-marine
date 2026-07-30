---
name: omi-contract-first
description: Change shared Signal K paths, types, units, or quality flags. Use when marine-data-contract changes or when another module needs new shared data shapes.
---

# OMI Contract-First

## When to use
- Adding or changing Signal K paths
- Changing DataPoint, units, quality flags
- Any cross-module data shape change

## Files to inspect
- `marine-data-contract/src/paths.ts` — PATHS
- `marine-data-contract/src/types.ts` — DataPoint, shared types
- `marine-data-contract/src/units.ts` — unit constants
- `marine-data-contract/src/quality.ts` — quality flags
- `marine-data-contract/src/index.ts` — exports

## Files to avoid
- Do not duplicate PATHS strings in gateway, simulator, UI, or autopilot.
- Do not create UI-only DTOs for data that should be shared.
- Do not put chart catalogs, package manifests, weather forecast envelopes or MapLibre layer
  descriptors in `marine-data-contract`; they belong to chart-engine/UI data access unless they
  represent Signal K sensor data shared across runtime modules.

## Workflow
1. Change contract first.
2. Validate contract: `cd marine-data-contract && npm run test:run && npm run build`
3. Update downstream packages that import `@omi/marine-data-contract`.
4. Validate each downstream package separately.
5. Do not validate everything at once unless the change is a breaking type rename.

## Expected output
- Path/type change summary
- Downstream impact list
- Per-package validation results
