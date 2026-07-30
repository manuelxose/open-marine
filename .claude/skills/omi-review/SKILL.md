---
name: omi-review
description: Review Open Marine changes for regressions, missing tests, leaked secrets, Raspberry service risk, Signal K contract mismatches, and token-heavy generated files.
---

# OMI Review

Lead with findings. Prioritize bugs, regressions and missing validation over style.

Check:

- No secrets in tracked files: passwords, `RPI_PASSWORD`, private keys, tokens, `.env` content.
- No generated bundles or cache files added: `dist`, `dist-tmp`, `.angular`, `node_modules`, logs.
- Signal K path/type changes remain centralized in `marine-data-contract`.
- UI endpoint changes still work for localhost, LAN and Raspberry-hosted UI.
- Browser map/weather URLs use `APP_ENVIRONMENT.chartEngineApiUrl`; no emitted `localhost:8088`.
- MapLibre mutations are guarded by current style generation and `style.load`; rapid style changes
  preserve own vessel, AIS, navigation and environment overlays.
- Offline packages never prefetch prohibited OSM/Esri/IHM/OpenSeaMap tiles. Licensed IHM/S-63
  exchange sets remain guided imports; manifests retain source, coverage, datum, attribution and license.
- Weather failures are controlled: fresh cache 15 minutes, stale fallback up to 24 hours, requests
  coalesced per position/area, selected wind bounds validated and persisted.
- Raspberry service changes preserve `omi-ui`, `omi-gps`, `omi-imu` and `signalk` behavior.
- Tests/builds match touched subsystem.
- Autopilot safety: STANDBY default, no motor at boot, watchdog present, E-stop latches.

Also flag heavy/recurring work not run outside `NgZone`, per-message Map clones, and forced reflows
(see performance rules in `.claude/references/architecture.md`).

Return concise findings with file and line references, then residual risk.
