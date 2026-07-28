---
name: omi-review
description: Review Open Marine changes for regressions, missing tests, leaked secrets, Raspberry service risk, Signal K contract mismatches, and token-heavy generated files.
---

# OMI Review

Lead with findings. Prioritize bugs, regressions and missing validation over style.

Check:

- No secrets in tracked files: passwords, `RPI_PASSWORD`, private keys, tokens, `.env` content.
- No generated bundles/cache: `dist`, `dist-tmp`, `.angular`, `node_modules`, logs.
- Signal K path/type changes centralized in `marine-data-contract`.
- UI endpoint changes work for localhost, LAN and Raspberry-hosted UI.
- Raspberry service changes preserve `omi-ui`, `omi-gps`, `omi-imu` and `signalk` behavior.
- Tests/builds match touched subsystem.
- Autopilot safety: STANDBY default, no motor at boot, watchdog present, E-stop latches.

Also flag heavy/recurring work not run outside `NgZone`, per-message Map clones, and forced reflows.

Return concise findings with file and line references, then residual risk.
