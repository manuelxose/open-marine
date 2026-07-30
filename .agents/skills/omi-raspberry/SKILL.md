---
name: omi-raspberry
description: Diagnose and operate the Open Marine Raspberry deployment. Use for SSH connection, LAN/direct-cable access, systemd services, Signal K, UI/chart-engine availability, GPS/IMU/AIS service checks, storage, and deployment notes.
---

# OMI Raspberry

Use host aliases instead of raw credentials:

- LAN: `ssh omi-raspberry-lan`
- Direct cable: `ssh omi-raspberry-cable`
- Project path on Raspberry: `/home/manu/open-marine`

## Checks

```bash
hostname
whoami
systemctl is-active omi-ui.service omi-charts.service omi-gps.service omi-imu.service omi-ais.service
systemctl is-enabled omi-ui.service omi-charts.service
docker ps --filter name=signalk
curl -I --max-time 8 http://127.0.0.1:4200/
curl -fsS --max-time 8 http://127.0.0.1:8088/health
curl -I --max-time 8 http://127.0.0.1:3000/signalk
```

## Known URLs

- UI LAN: `http://192.168.1.43:4200/`
- UI cable: `http://192.168.137.2:4200/`
- Signal K LAN: `http://192.168.1.43:3000/signalk`
- Signal K cable: `http://192.168.137.2:3000/signalk`
- Chart engine local API: `http://127.0.0.1:8088`

Keep secrets in ignored files only. Do not add passwords to docs, skills, agents, scripts or commit messages.
Chart credentials belong in `/etc/open-marine/charts.env`; Copernicus authentication and S-63
permits stay outside Git. Diagnose first and deploy/restart only when the user explicitly requests it.
