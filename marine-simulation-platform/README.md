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
npm run dev -w marine-simulation-platform -- live --scenario wind-gps-demo --host http://localhost:3000
npm run dev -w marine-simulation-platform -- bench --port 4100
```

## Compatibility

The legacy root commands are preserved as aliases:

- `npm run start:simulator` -> live mode
- `npm run start:test-bench` -> bench API mode
- `npm run build:simulator` / `npm run build:test-bench` -> this package
- `npm run test:test-bench` -> this package
