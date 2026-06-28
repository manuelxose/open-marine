# Open Marine Instrumentation

Open Marine Instrumentation is a local/LAN marine navigation stack for a Raspberry Pi or development workstation. The Raspberry runs the runtime services; tablets and laptops on board open the Angular UI in a browser.

## Runtime Services

| Service | Default port | Purpose |
|---|---:|---|
| Signal K | 3000 | Marine data bus and WebSocket stream |
| UI | 4200 in dev, systemd/nginx in Raspberry deployments | Angular chart and instruments UI |
| Autopilot engine | 3990 | Autopilot command API and state machine |
| Test bench | 4100 | Isolated simulation and scenario orchestration |
| Chart engine | 8088 | Local nautical chart catalog, import jobs, raster/vector tiles |

## Common Commands

```bash
npm run init
npm run start:signalk
npm run start:ui
npm run start:charts
npm run status
```

Build and test the chart stack:

```bash
npm run build:charts
npm run test:charts
npm run build:ui
```

## Raspberry Layout

Recommended production layout:

- Code: `/home/manu/open-marine`
- Persistent chart data: `/var/lib/open-marine/charts`
- Chart upload staging: `/var/lib/open-marine/chart-uploads`
- Chart cache: `/var/lib/open-marine/chart-cache`

Large MBTiles and bathymetry datasets should live on USB/SSD storage mounted or bind-mounted under `/var/lib/open-marine`. Do not store operational chart data inside the Git checkout.

## Documentation

- [Raspberry deployment](docs/RASPBERRY_DEPLOYMENT.md)
- [Nautical charts](docs/CHARTS.md)
- [Chart engine](marine-chart-engine/README.md)

S-63, oeSENC, encrypted charts, commercial chart decryption, and license bypass flows are intentionally not implemented.
