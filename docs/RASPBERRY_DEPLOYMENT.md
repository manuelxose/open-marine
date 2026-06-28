# Raspberry Deployment

Open Marine is designed to run the main runtime on the Raspberry Pi. Phones, tablets, and laptops on the boat should only load the UI from the Raspberry in a browser. They should not run Signal K, sensors, autopilot, or the chart engine locally.

## Service Matrix

| Service | systemd unit | Port | Notes |
|---|---|---:|---|
| Signal K | `signalk` | 3000 | Docker Compose runtime in `signalk-runtime/` |
| UI | `omi-ui` | deployment-specific | Serves the Angular UI |
| GPS | `omi-gps` | n/a | Sensor publisher |
| IMU | `omi-imu` | n/a | Sensor publisher |
| Wind | `omi-wind` | n/a | Sensor publisher |
| AIS | `omi-ais` | UDP 10110 input | AIS publisher |
| Autopilot | `omi-autopilot` | 3990 | Command API |
| Test bench | `omi-test-bench` | 4100 | Isolated simulation |
| Chart engine | `omi-charts` | 8088 | Local chart catalog and tiles |

## Chart Storage

Use persistent storage outside the repository:

```bash
sudo mkdir -p /var/lib/open-marine/charts /var/lib/open-marine/chart-cache /var/lib/open-marine/chart-uploads
sudo chown -R manu:manu /var/lib/open-marine
```

For large MBTiles, raster charts, or bathymetry, mount a USB SSD at `/var/lib/open-marine` or bind-mount the specific chart directories there. SD cards are not recommended for large chart catalogs or heavy tile caches.

## Install Chart Engine Service

Build the package on the Raspberry after deployment:

```bash
cd /home/manu/open-marine
npm install
npm run build:charts
```

Install and start the service:

```bash
sudo cp marine-sensor-gateway/rpi/systemd/omi-charts.service /etc/systemd/system/omi-charts.service
sudo systemctl daemon-reload
sudo systemctl enable --now omi-charts
sudo systemctl status omi-charts
```

The service uses:

```txt
CHART_ENGINE_PORT=8088
CHART_ENGINE_DATA_DIR=/var/lib/open-marine
CHART_ENGINE_CACHE_DIR=/var/lib/open-marine/chart-cache
CHART_ENGINE_UPLOAD_DIR=/var/lib/open-marine/chart-uploads
CHART_ENGINE_REGISTRY_FILE=/var/lib/open-marine/charts/registry.local.json
CHART_ENGINE_UPLOAD_MAX_MB=2048
```

## Browser Access

Open the UI from another device using the Raspberry host, for example:

```txt
http://<raspberry-host>:4200
```

The UI derives `APP_ENVIRONMENT.chartEngineApiUrl` from the same host and port `8088`, so a tablet uses `http://<raspberry-host>:8088`, not its own `localhost`.

## Diagnostics

```bash
npm run status
curl http://localhost:8088/health
curl http://localhost:8088/charts
journalctl -u omi-charts -f
```

If the UI shows `Chart engine offline`, start the service:

```bash
sudo systemctl start omi-charts
```

If imports fail with missing tools, install GDAL and tippecanoe on the Raspberry or perform conversions on a more powerful workstation and import the resulting MBTiles.

## Security

Do not store credentials in the repository. Keep `config/omi.env`, `config/raspberry.env`, Signal K secrets, and any local chart license material outside Git.
