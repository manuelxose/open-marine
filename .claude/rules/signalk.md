---
paths:
  - "signalk-runtime/**/*"
  - "marine-data-contract/**/*"
  - "marine-simulation-platform/**/*"
---

# Signal K Rules

- Prefer `PATHS` and exported types from `marine-data-contract` over duplicated Signal K strings.
- Normalize timestamps with the contract helpers when producing `DataPoint` values.
- Preserve `vessels.self`/`self` context normalization behavior in publishers.
- Signal K runtime data may contain operational settings; check for secrets before committing changes.
- Validate contract changes with `cd marine-data-contract && npm run test:run && npm run build`.
