# Open Marine — AI Agent Operating System

> Model-agnostic canonical brain. Every agent (Codex, Claude, Kimi, DeepSeek/Copilot) reads this first.
> Keep responses concise. No introductions. No generic conclusions.

## 1. Repository Purpose

Open Marine Instrumentation: modular marine navigation system.

- Signal K data bus (Docker)
- Angular 21 UI with MapLibre charts
- TypeScript sensor gateway + Raspberry Python scripts
- Deterministic simulator
- Autopilot engine with safety-critical state machine
- Test bench, chart toolkit, tile server

## 2. Module Map (one line each)

| Module                       | Entry                  | Validation                        | Depends  |
| ---------------------------- | ---------------------- | --------------------------------- | -------- |
| `marine-data-contract`       | `src/index.ts`         | `npm run test:contract`           | none     |
| `marine-sensor-gateway`      | `src/cli.ts`           | `npm run test:gateway`            | contract |
| `marine-simulation-platform` | `src/cli/index.ts`     | `npm run test:simulation`         | contract |
| `marine-instrumentation-ui`  | `src/main.ts`          | `npm run build:ui`                | contract |
| `marine-autopilot-engine`    | `src/cli.ts`           | `npm run test:autopilot`          | contract |
| `marine-chart-toolkit`       | `dist/index.js` (CLI)  | `npm run build:toolkit`           | none     |
| `marine-chart-engine`        | `dist/server.js`       | `npm run test:charts`             | none     |
| `marine-tile-server`         | `dist/index.js`        | `npm run build:tile-server`       | none     |
| `signalk-runtime`            | `docker compose up -d` | `docker ps --filter name=signalk` | none     |
| `scripts/`                   | cross-platform `.mjs`  | `npm run status`                  | varies   |

## 3. Task Routing Table

Route by keyword → mode → narrowest validation.

| Keywords                                                                           | Mode                    | Module                      | Validation                                            |
| ---------------------------------------------------------------------------------- | ----------------------- | --------------------------- | ----------------------------------------------------- |
| path, DataPoint, unit, quality, PATHS                                              | `MODE_CONTRACT_FIRST`   | contract                    | `npm run test:contract`                               |
| GPS, IMU, AIS, wind, NMEA, serial, gateway, publisher, rpi                         | `MODE_SENSOR_GATEWAY`   | gateway                     | `npm run test:gateway`                                |
| scenario, simulator, demo, timeline, publish                                       | `MODE_SIMULATOR`        | simulation-platform         | `npm run test:simulation`                             |
| Angular, component, route, chart, instrument, dashboard, style, PWA, lazy          | `MODE_UI_CHANGE`        | UI                          | `npm run build:ui`                                    |
| autopilot, PID, motor, steering, watchdog, heartbeat, failsafe, E-stop, drive-test | `MODE_AUTOPILOT_SAFETY` | autopilot                   | `npm run test:autopilot`                              |
| test-bench, isolated, simulation orchestration                                     | `MODE_TEST_BENCH`       | simulation-platform         | `npm run test:simulation`                             |
| Signal K, Docker, plugin, runtime, WebSocket, HTTP                                 | `MODE_SIGNALK_RUNTIME`  | signalk-runtime             | `docker ps --filter name=signalk`                     |
| Raspberry, systemd, SSH, deploy, omi-gps, omi-imu, omi-ui                          | `MODE_RASPBERRY_DEPLOY` | scripts + Raspberry         | `npm run status` + SSH checks                         |
| MBTiles, chart, tile, map data, rendering                                          | `MODE_CHARTS_AND_TILES` | chart-toolkit + tile-server | `npm run build:toolkit` ; `npm run build:tile-server` |
| CI, GitHub Actions, workflow, build matrix                                         | `MODE_CI_VALIDATION`    | root `.github/workflows`    | `npm run status` + per-package builds                 |
| review, diff, regression, secret, leak                                             | `MODE_REVIEW`           | all touched                 | narrowest per touched module                          |
| error, bug, crash, log, diagnose                                                   | `MODE_ERROR_DIAGNOSIS`  | affected module             | narrowest command + logs                              |
| docs, reference, compress, memory                                                  | `MODE_DOC_COMPRESSION`  | `.claude/references/`       | n/a                                                   |

## 4. Context-Loading Rules

1. **Search before open.** Use `grep_search` / `file_search` (Codex/DeepSeek) or `rg` (Claude Code) first.
2. **Reference before exploration.** Load `.claude/references/architecture.md` only when file routing or data flow is unclear. Load `.claude/references/design-system.md` only for UI styling. Load `.claude/references/validation.md` only when validation strategy is unclear. Load `.claude/references/safety.md` only for autopilot safety questions.
3. **Module before repo.** Read only the package that changed. Cross-module changes start at contract.
4. **Patch before rewrite.** Propose diffs, not full files.
5. **Summary before full file.** If a file >100 lines is needed, summarize first 20 and last 20 unless the change requires middle details.

## 5. Token Budget Rules (hard ceilings)

| Output type            | Max tokens |
| ---------------------- | ---------- |
| Simple answer          | 250        |
| Direct diagnosis       | 600        |
| Diff review            | 900        |
| Implementation plan    | 1000       |
| Patch proposal         | 1200       |
| Architecture decision  | 1500       |
| Full agent-layer audit | 2500       |
| Repository map update  | 3000       |

If exceeded: split by subsystem, compress, or ask user which subsystem.

## 6. Model Portability Rules

### Codex

- Usa `AGENTS.md` como fuente principal. Carga `.copilot/skills/*` cuando la tarea coincida con el nombre del skill.
- Usa el subagente `Explore` (`runSubagent`) para exploración amplia del codebase; no para ediciones puntuales.
- No cargues `.claude/skills/` ni `.claude/agents/` (son solo para Claude Code).
- Usa los modos de tarea (§3) como reglas de enrutamiento — mapea keywords a módulo + comando de validación.
- Busca antes de leer: `file_search` con glob patterns, `grep_search` para texto, `semantic_search` para explorar código.
- Prefiere parches exactos con `replace_string_in_file` incluyendo 3+ líneas de contexto.
- Usa validación estrecha — ejecuta solo el comando del módulo cambiado (§11), nunca la matriz completa.
- Mantén respuestas bajo 400 tokens salvo que la tarea requiera más.
- No leas `dist`, `dist-tmp`, `.angular`, `node_modules`, logs, bundles generados.
- Carga referencias (§4) solo bajo demanda.
- Para trabajo cross-module, empieza en `marine-data-contract` y valida paquetes downstream uno a uno.

### Claude Code

- Read `AGENTS.md` first, then `CLAUDE.md`.
- Use `.claude/skills/` only when the task matches the skill name.
- Use `.claude/agents/` only for broad exploration or review, not for every task.
- Load `.claude/references/` on demand, never all by default.
- Keep `CLAUDE.md` thin; do not duplicate `AGENTS.md`.

### Kimi

- Use compressed task context: module name + task + `AGENTS.md`.
- Do not load the whole repo.
- Use `PROJECT_STATE_SUMMARY` from `.claude/references/architecture.md` only if needed.
- Prefer: decision + patch + validation.
- Avoid long explanations.

### DeepSeek / GitHub Copilot

- Read `AGENTS.md` first; do not load `CLAUDE.md`.
- Load `.copilot/skills/*` only when the task matches the skill name.
- Usa el subagente `Explore` (`runSubagent`) para exploración amplia del codebase.
- Load `.claude/references/*` on demand, never all by default.
- Use `grep_search` (not `rg`) for text search; use `semantic_search` for codebase exploration.
- Prefer `replace_string_in_file` for edits — include 3+ lines of context.
- Keep outputs under 500 tokens unless the task demands more.
- Avoid reading `dist`, `dist-tmp`, `.angular`, `node_modules`, logs.

## 7. Contract-First Rules

- `marine-data-contract` is the single source of truth for Signal K paths, types, units, quality.
- No duplicated Signal K strings in gateway, simulator, UI, or autopilot.
- Import contract as `@omi/marine-data-contract`.
- Contract changes must validate first: `cd marine-data-contract && npm run test:run && npm run build`.
- Downstream packages rebuild after contract changes.

## 8. Autopilot Safety Rules (hard)

- **STANDBY by default.** No motor enable at boot.
- **No hardware backend without explicit configuration.** Simulator-first validation always.
- **No actuator control without failsafe.** Watchdog must cut motor. Heartbeat must be present.
- **E-stop must latch.** Faults must be explicit and visible in Signal K state.
- **Drive-test only in STANDBY.** Never drive-test while ENGAGED or AUTO.
- **Signal K state visibility.** Autopilot publishes `steering.autopilot.*` via contract paths.
- **Serial/GPIO/CAN are opt-in.** Never default to real hardware.
- **Test bench must never control real hardware.** Isolated ports, local DB only.

## 9. UI / Design-System Rules

- Use `APP_ENVIRONMENT` token for all endpoints.
- Use Glass Bridge `--gb-*` tokens; never hardcode colors.
- MapLibre WebGL paint is the only exception: literal hex + comment mapping to token.
- Standalone components, lazy routes, `OnPush`.
- Heavy/recurring work outside `NgZone`.
- Coalesce high-frequency streams (AIS, fast sensors).

## 10. Raspberry / Secrets Rules

- Never commit credentials. `config/omi.env` and `config/raspberry.env` are local-only.
- Use SSH aliases (`omi-raspberry-lan`, `omi-raspberry-cable`), never raw passwords in docs.
- Prefer read-only diagnostics before restarts.
- Preserve systemd services: `omi-ui`, `omi-gps`, `omi-imu`, `omi-wind`, `omi-ais`, `omi-autopilot`, `signalk`.

## 11. CI Validation Matrix

Run only the narrowest command for the changed module.

| Module              | Command                     |
| ------------------- | --------------------------- |
| Contract            | `npm run test:contract`     |
| Gateway             | `npm run test:gateway`      |
| Simulation platform | `npm run test:simulation`   |
| UI                  | `npm run build:ui`          |
| Autopilot           | `npm run test:autopilot`    |
| Chart toolkit       | `npm run build:toolkit`     |
| Chart engine        | `npm run test:charts`       |
| Tile server         | `npm run build:tile-server` |
| Root status         | `npm run status`            |
| Full build          | `npm run build`             |

Only run full cross-module validation if the change touches `marine-data-contract` or shared types.

## 12. Response Formats

### Implementation

```
PATCH PLAN
- file:
  - change:
VALIDATION
- command
```

### Review

```
FINDINGS
1. [severity] file/path
   - Issue:
   - Fix:
VALIDATION
- command
```

### Diagnosis

```
RESULT
- Mode:
- Files:
- Decision:
- Change:
- Validation:
- Risk:
```

### Prompt (for subagents)

```
PROMPT
[clean prompt only]
```

No introductions. No restatement of user request. No generic offers.

## 13. Files / Directories Never to Read

- `node_modules/`
- `dist/`, `dist-tmp/`
- `.angular/`
- `coverage/`
- `logs/` (unless debugging a specific runtime issue)
- Generated bundles, service worker output
- `package-lock.json` unless dependency resolution is the task
- Large binary/chart data files unless chart tooling requires them
- `.env`, `config/omi.env`, `config/raspberry.env`

## 14. References to Load On Demand

| Reference                             | When                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| `.claude/references/architecture.md`  | File routing, data flow, key-file index, performance rules       |
| `.claude/references/design-system.md` | UI styling, tokens, Glass Bridge theme                           |
| `.claude/references/validation.md`    | Validation strategy, CI matrix, test commands                    |
| `.claude/references/safety.md`        | Autopilot safety rules, failsafe, watchdog, E-stop               |
| `docs/CHARTS.md`                      | Chart formats, import CLI, GDAL/tippecanoe, bathymetry           |
| `docs/RASPBERRY_CONNECTION.md`        | SSH config, IP addresses, MACs, DHCP helper, service checks      |
| `docs/RASPBERRY_DEPLOYMENT.md`        | Service matrix, chart storage, chart engine install, diagnostics |
| `docs/WIND_GPS_DEMO.md`               | Wind-gps demo scenario, NMEA 0183 wind sensor setup, systemd     |

## 15. AI Skills & Agents Discovery

All agents should load the appropriate skill automatically. Skills are duplicated across agent-specific directories so each IDE/tool discovers them natively.

### Skill directories in this repo

| Agent / IDE | Directory | Skills |
|-------------|-----------|--------|
| Claude Code | `.claude/skills/` | `omi-autopilot-safety`, `omi-charts`, `omi-contract-first`, `omi-raspberry`, `omi-review`, `omi-run`, `omi-sensor-change`, `omi-simulation-platform`, `omi-test-bench`, `omi-ui-change`, `omi-dev` |
| GitHub Copilot / Codex | `.copilot/skills/` | `omi-autopilot-safety`, `omi-charts`, `omi-contract-first`, `omi-raspberry`, `omi-review`, `omi-run`, `omi-sensor-change`, `omi-simulation-platform`, `omi-test-bench`, `omi-ui-change`, `omi-dev` |
| Kimi Code CLI | `.agents/skills/` | `omi-autopilot-safety`, `omi-charts`, `omi-contract-first`, `omi-raspberry`, `omi-review`, `omi-run`, `omi-sensor-change`, `omi-simulation-platform`, `omi-test-bench`, `omi-ui-change`, `omi-dev` |

### User-scope skills

- `omi-dev` is also available globally for Codex/Copilot at `~/.codex/skills/omi-dev/`.
- `omi-charts` is also available globally for Codex at `~/.codex/skills/omi-charts/`.
- `omi-dev` is also available globally for Claude at `~/.claude/skills/omi-dev/`.
- `omi-dev` is also available globally for Kimi at `~/.config/agents/skills/omi-dev/` and `~/.kimi/skills/omi-dev/`.

### Claude-specific agents and rules

Agents (subagent definitions with model hints): `omi-autopilot-safety`, `omi-backend-explorer`, `omi-chart-explorer`, `omi-ci-validator`, `omi-raspberry-operator`, `omi-reviewer`, `omi-sim-explorer`, `omi-test-bench`, `omi-ui-explorer`.

Rules (path-based agent rules): `sensors.md`, `signalk.md`, `ui.md`.

## 16. Concise Professional Output Rules

- No motivational text.
- No generic conclusions.
- No "here is a comprehensive overview" unless asked.
- No long bullet lists when 3 bullets are enough.
- No full file output unless required.
- No repeated module map.
- No repeated validation matrix.
- No chain-of-thought.
- Use short professional English for technical output (project code uses English).
- Spanish only when the user writes in Spanish.
