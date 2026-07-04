# Marine Simulation Platform

Unified enterprise simulation module for OMI.

It consolidates live Signal K publishing and scenario orchestration into one package:

- deterministic declarative signal generation
- shared scenario/channel registry
- live Signal K publishing over WebSocket or HTTP
- bench runtime with ARM token, lease, event stream and sample storage
- CLI commands for live, bench and closed-loop modes

## Commands

```bash
npm run build -w marine-simulation-platform
npm test -w marine-simulation-platform
npm run dev -w marine-simulation-platform -- list-scenarios
npm run dev -w marine-simulation-platform -- bench --port 4100
```

`bench` starts the API and publishes started runs to Signal K at `http://localhost:3000` by default, so diagnostics scenarios drive the live UI instruments and chart. Use `--host <url>` to target another Signal K server, or `SIMULATION_PUBLISH_SIGNALK=0` for an isolated bench run with stored samples only.

For live-only streaming without SQLite persistence, use `npm run dev -w marine-simulation-platform -- live --port 4100` — this is an alias for bench mode that always publishes to Signal K.

## Compatibility

The legacy root commands are preserved as aliases:

- `npm run start:simulation-bench` -> bench API mode
- `npm run build:simulator` / `npm run build:test-bench` -> this package
- `npm run test:test-bench` -> this package
