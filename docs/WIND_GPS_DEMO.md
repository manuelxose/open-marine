# Wind and GPS demo

## Local scenario

Start Signal K, the deterministic wind/GPS simulator, and the Angular UI:

```powershell
npm run start:wind-demo
```

Open:

- UI: `http://localhost:4200/`
- Signal K: `http://localhost:3000/signalk`
- Signal K vessel API: `http://localhost:3000/signalk/v1/api/vessels/self`

On the chart, enable the wind control. The chart settings allow selecting true or
apparent wind. The line and arrow change color with intensity and the label shows
speed and the recent apparent-wind gust.

The launcher writes `.omi-wind-demo-*.log` and `.omi-wind-demo-*.pid` runtime
files in the repository root. Do not run the real wind publisher and
`wind-gps-demo` at the same time because both publish `environment.wind.*`.

## Raspberry NMEA 0183 wind sensor

Supported sentences:

- `MWV` apparent (`R`) and true-relative (`T`) wind.
- `MWD` true-ground direction and speed.
- Speed units `N` (knots), `K` (km/h), and `M` (m/s).

Configure `config/omi.env`:

```dotenv
WIND_DEVICE=/dev/ttyUSB0
WIND_BAUD=4800
WIND_HOST=127.0.0.1
WIND_PORT=3000
WIND_NO_PUBLISH=false
```

Install the serial and Signal K WebSocket dependencies:

```bash
bash marine-sensor-gateway/rpi/wind/setup_wind.sh
```

Validate without publishing:

```bash
WIND_NO_PUBLISH=true bash scripts/start-wind.sh
```

Run normally:

```bash
bash scripts/start-wind.sh
```

Install the prepared service after adjusting `User`, `WorkingDirectory`, and
`ExecStart` if the repository is not in `/home/manu/open-marine`:

```bash
sudo cp marine-sensor-gateway/rpi/systemd/omi-wind.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now omi-wind.service
systemctl status omi-wind.service
journalctl -u omi-wind.service -f
```

The UI derives true wind when the sensor only provides apparent wind, using live
heading/COG and GPS speed. Wind visualization is hidden after five seconds
without a complete fresh sample.
