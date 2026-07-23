---
name: omi-dev
description: Work efficiently in the open-marine-instrumentation repository with low token usage. Use when coding, reviewing, debugging, validating, or operating Open Marine modules including Angular UI, Signal K, Raspberry GPS/IMU/AIS, simulator, chart tooling, setup scripts, and deployment docs.
---

# OMI Dev

Use this skill to avoid rediscovering the Open Marine repo structure. Keep the main context small: search first, read narrowly, and load references only when needed.

For focused tasks, prefer the specialized OMI skills:
- `omi-ui-change` — Angular UI, chart, dashboard, instruments, styles
- `omi-sensor-change` — sensors, gateway, simulator, Signal K contract
- `omi-contract-first` — shared paths, types, units, quality flags
- `omi-autopilot-safety` — autopilot, motor, failsafe, safety-critical code
- `omi-raspberry` — Raspberry deployment, systemd, SSH
- `omi-simulation-platform` — simulator scenarios, test bench
- `omi-test-bench` — isolated simulation orchestration
- `omi-run` — narrowest validation command
- `omi-review` — diff/regression review

These skills are available in `.claude/skills/`, `.copilot/skills/`, and `.agents/skills/`.

## Default Workflow

1. Start at `c:\Users\Admin\Documents\workspace\open-marine-instrumentation`.
2. Check dirty state before edits: `git status --short --branch`.
3. Search with `rg`/`rg --files`; avoid broad reads of generated files.
4. For the key-file index, sensor→screen data flow and performance rules, read the in-repo
   `.claude/references/architecture.md` (authoritative) before broad exploration.
5. For any UI styling, read the in-repo `.claude/references/design-system.md` first: the app uses
   the Glass Bridge marine theme (`--gb-*` tokens), defaults to night mode, and forbids hardcoded
   colors — status via `--gb-data-*`/`--gb-alarm-*`, floating chart panels via `--chart-overlay-*`,
   and the `--space-*`/`--radius-*` scales. MapLibre WebGL paint is the only place a color literal is
   allowed (mirror a token value and comment it).
6. Load `references/project-map.md` only when module boundaries or commands are unclear.
7. Load `references/raspberry-runtime.md` only for Raspberry, Signal K, SSH, or systemd work.
8. Validate only the affected package unless the change crosses package boundaries.

## Do Not Load By Default

Skip these unless the user is specifically asking about generated output:

- `node_modules/`
- `dist/`
- `dist-tmp/`
- `.angular/`
- coverage, logs, caches and compiled bundles

## Useful Script

Run this non-mutating context audit when a task risks broad exploration:

```powershell
python C:\Users\Admin\.codex\skills\omi-dev\scripts\audit_context.py c:\Users\Admin\Documents\workspace\open-marine-instrumentation
```

It reports tracked large files and generated/noisy files so you can avoid reading them.
