# Marine Chart Engine

Local/LAN chart service for loading legal nautical chart data into the Open Marine MapLibre UI.

It imports and serves MBTiles raster/vector charts, starts managed conversion jobs for legal local raster/S-57 files, exposes a dynamic catalog, and keeps encrypted/commercial chart formats out of scope. It does not use OpenCPN as a runtime dependency.

## Start

From the repository root:

```bash
npm run build:charts
npm run start:charts
```

The default service URL is `http://localhost:8088` in development. On Raspberry it runs as `omi-charts` on port `8088`.

Useful environment variables:

```txt
CHART_ENGINE_PORT=8088
CHART_ENGINE_DATA_DIR=/var/lib/open-marine
CHART_ENGINE_CACHE_DIR=/var/lib/open-marine/chart-cache
CHART_ENGINE_UPLOAD_DIR=/var/lib/open-marine/chart-uploads
CHART_ENGINE_REGISTRY_FILE=/var/lib/open-marine/charts/registry.local.json
CHART_ENGINE_UPLOAD_MAX_MB=2048
EMODNET_TILE_URL_TEMPLATE=
CHART_ENGINE_OWM_API_KEY=
CHART_ENGINE_COPERNICUS_SYNC_ENABLED=false
CHART_ENGINE_COPERNICUS_SYNC_HOURS=6
CHART_ENGINE_PYTHON=python3
```

On Windows development, paths default to `marine-chart-engine/data/`. On Linux/Raspberry, paths default to `/var/lib/open-marine`, so imported charts live in `/var/lib/open-marine/charts`. Use USB/SSD storage for large chart catalogs or bathymetry and mount or bind-mount it under `/var/lib/open-marine`.

## Raspberry Service

Install the service after building:

```bash
sudo mkdir -p /var/lib/open-marine/charts /var/lib/open-marine/chart-cache /var/lib/open-marine/chart-uploads
sudo chown -R manu:manu /var/lib/open-marine
sudo cp marine-sensor-gateway/rpi/systemd/omi-charts.service /etc/systemd/system/omi-charts.service
sudo systemctl daemon-reload
sudo systemctl enable --now omi-charts
```

Diagnostics:

```bash
curl http://localhost:8088/health
curl http://localhost:8088/charts
journalctl -u omi-charts -f
```

## HTTP API

- `GET /health`
- `GET /charts`
- `GET /charts/:chartId/metadata`
- `POST /charts/import/mbtiles`
- `POST /charts/import/raster`
- `POST /charts/import/s57`
- `GET /charts/jobs/:jobId`
- `DELETE /charts/:chartId`
- `GET /charts/:chartId/raster/{z}/{x}/{y}.png`
- `GET /charts/:chartId/vector/{z}/{x}/{y}.pbf`
- `GET /bathymetry/emodnet/{z}/{x}/{y}.png`
- `GET /packages/ria-vigo`
- `GET /environment/catalog`
- `GET /environment/:layerId/times`
- `GET /environment/:layerId/:time.geojson`
- `GET /environment/:layerId/:time/:z/:x/:y.png`
- `GET /environment/sync/status`
- `POST /environment/sync`
- `GET /tides/vigo?date=YYYY-MM-DD`

Import endpoints accept multipart form data with a `file` field plus:

```txt
id=<lowercase-kebab-id>
label=<display name>
kind=raster|vector   # MBTiles only
```

Jobs are in-memory and report `queued`, `running`, `completed`, or `failed`. The imported chart catalog is persisted in `registry.local.json`, which is ignored by Git and should live under the configured persistent chart directory.

## Ria de Vigo preset

`GET /packages/ria-vigo` exposes the fixed bounds `[-9.05, 42.05, -8.40, 42.40]`, covering the inner ria, Cies, approaches and Baiona. IHM P2-P5 are selected automatically by zoom and remain online-only. EMODnet is marked offline-capable under its CC BY 4.0 product policy and can be captured with the resumable area-download endpoint or imported from an official DTM extract. OpenSeaMap remains online-only; import a legally obtained local seamark extract for its offline equivalent.

Imported local sources are added dynamically and returned by `GET /charts`. Bulk area caching is rejected for providers marked online-only; this includes IHM and the public OpenSeaMap tile service.

## MBTiles

MBTiles import copies a legal local `.mbtiles` file under `data/charts/` and registers it. Raster tile content type is detected from MBTiles metadata (`png`, `jpg`, `jpeg`, `webp`). Vector tiles are served as protobuf and `Content-Encoding: gzip` is sent only when the tile bytes are actually gzip-compressed.

CLI:

```bash
npm run charts:import-mbtiles -- --id galicia-raster --label "Galicia Raster" --kind raster --file C:\charts\galicia.mbtiles
npm run charts:import-mbtiles -- --id vigo-enc --label "Vigo ENC" --kind vector --file C:\charts\vigo.mbtiles
```

## Raster Conversion

GeoTIFF/KAP conversion requires GDAL on `PATH`:

```txt
gdal_translate
gdaladdo
```

The managed API and CLI convert to MBTiles with:

```txt
gdal_translate -of MBTILES -co TILE_FORMAT=PNG <input> <output.mbtiles>
gdaladdo -r average <output.mbtiles> 2 4 8 16
```

Dry run:

```bash
npm run charts:convert-raster -- --input C:\charts\source.tif --output C:\charts\source.mbtiles --dry-run
```

## S-57 Open ENC Conversion

Only unencrypted, legal S-57 `.000` files are supported. Conversion requires:

```txt
ogr2ogr
tippecanoe
```

Layer mapping:

```txt
DEPARE -> depth_areas
DEPCNT -> depth_contours
SOUNDG -> soundings
BOYLAT/BOYCAR/BOYSAW/BOYSPP -> buoys
WRECKS/OBSTRN/UWTROC -> hazards
ACHARE -> anchorages
TSS* -> traffic_separation
LIGHTS -> lights
LNDARE -> land
COALNE -> shoreline
```

Dry run:

```bash
npm run charts:convert-s57 -- --input C:\charts\US5EXAMPLE.000 --output C:\charts\example-enc.mbtiles --dry-run
```

## Bathymetry and environmental data

EMODnet WMS is available online. For a dependable offline Vigo package, download an official EMODnet DTM extract, convert it with `charts:convert-raster`, and import the resulting MBTiles. Store large rasters and caches on SSD-backed `CHART_ENGINE_DATA_DIR`.

Copernicus Marine IBI synchronization needs a free Copernicus Marine account and the Python dependencies in `scripts/requirements-copernicus.txt`. Authenticate with the standard `copernicusmarine login` flow, then run `npm run charts:sync-copernicus`. Setting `CHART_ENGINE_COPERNICUS_SYNC_ENABLED=true` refreshes the five-day cache with exponential backoff; the last valid forecast remains available offline. OpenWeather atmospheric tiles are optional and need `CHART_ENGINE_OWM_API_KEY`. IHM Vigo port 29 predictions are cached automatically.

## UI Integration

The Angular UI reads `APP_ENVIRONMENT.chartEngineApiUrl`, loads the engine catalog from `GET /charts`, and merges engine sources with the built-in OSM, Nautical, and ENC demo sources. Runtime navigation stays on `/chart`; chart source management, import, jobs, and diagnostics live on the independent `/charts` page.

When the UI is opened from another device, the chart engine URL is built from the same host and port `8088`, so the browser calls `http://<raspberry-host>:8088` instead of its own `localhost`.

If the chart engine is offline, already imported MBTiles continue to work. Remote IHM, EMODnet and atmospheric layers report an explicit unavailable or stale state.

## Explicitly Out Of Scope

S-63, oeSENC, encrypted charts, commercial chart decryption, and licensing bypasses are not supported. Those formats require legal permits, licensed datasets, and compliant vendor/decryption flows outside this service.

This software is for recreational situational awareness. It is not an ECDIS and does not replace current official charts or Notices to Mariners. Tide predictions are predictions, not observed water levels; the UI does not apply them to soundings unless the source datum is known and compatible.
