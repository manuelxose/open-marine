# Raspberry Runtime Reference

Use SSH aliases instead of credentials:

- `omi-raspberry-lan` -> LAN address `192.168.1.43`
- `omi-raspberry-cable` -> direct cable address `192.168.137.2`
- Remote project path: `/home/manu/open-marine`

## URLs

- UI LAN: `http://192.168.1.43:4200/`
- UI cable: `http://192.168.137.2:4200/`
- Signal K LAN: `http://192.168.1.43:3000/signalk`
- Signal K cable: `http://192.168.137.2:3000/signalk`

## Service Checks

```bash
systemctl is-active omi-ui.service omi-gps.service omi-imu.service
systemctl is-enabled omi-ui.service
docker ps --filter name=signalk
curl -I --max-time 8 http://127.0.0.1:4200/
curl -I --max-time 8 http://127.0.0.1:3000/signalk
```

Never include the Raspberry password in committed files or final summaries.
