# Marine Instrumentation UI

Angular dashboard that consumes Signal K REST + WebSocket updates.

## Requirements

- Node.js 20 LTS

## Install

```bash
npm install
```

## Run

```bash
npm start
```

## Chart (MapLibre)

- Chart route: `http://localhost:4200/chart`
- Base map: OpenStreetMap raster tiles over HTTPS (development default).
- Map engine: MapLibre GL JS with WebGL-accelerated pan/zoom/rotate.

### Adding nautical chart sources later

1. Add a new source entry in `src/app/data-access/chart/chart-sources.ts` (XYZ raster tiles or a vector style URL).
2. Wire the selected `sourceId` into `ChartMapService.setChartSource(...)` (e.g., from a preferences setting).
3. If serving MBTiles locally, expose them via a tileserver that supports HTTPS and point the style/tiles URL at it.

## Configuration

Edit `src/environments/environment.ts`:

```ts
export const environment = {
  baseUrl: "http://localhost:3000",
};
```

## Expected URLs

- Signal K REST: http://localhost:3000/signalk/v1/api/
- Signal K stream: ws://localhost:3000/signalk/v1/stream

## Screenshots

- [Navigation dashboard](../docs/screenshots/navigation-dashboard.png)
- [GPS fix loss](../docs/screenshots/gps-fix-loss.png)
- [Depth alarm](../docs/screenshots/depth-alarm.png)

(Placeholders only; images not included.)

## Usage notes

- The simulator periodically pauses GPS updates to simulate fix loss.
- Depth is simulated with a seabed profile and shallow-water events.
- Fix quality is derived from the age of the last position update:
  - Good: <= 2 seconds
  - Suspect: <= 10 seconds
  - Bad: > 10 seconds
- Low depth alarms trigger below 3.0 m and clear above 3.5 m.
- Acknowledged alarms remain visible until depth clears the hysteresis band.
