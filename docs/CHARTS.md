# Nautical Charts

Open Marine supports legal local chart data through the `marine-chart-engine`. The UI consumes the engine catalog on `/charts`; the navigation map remains on `/chart` and preserves AIS, own vessel, routes, tracks, CPA, wind, autopilot overlays, range rings, and OpenSeaMap when base styles change.

## Supported Formats

| Format | Flow | Notes |
|---|---|---|
| MBTiles raster | Direct import | Best production path for local raster charts and bathymetry |
| MBTiles vector | Direct import | Used by local ENC vector tile styles |
| GeoTIFF | GDAL conversion to raster MBTiles | Requires `gdal_translate` and `gdaladdo` |
| KAP | GDAL conversion to raster MBTiles | Requires GDAL support for the source |
| S-57 `.000` | ogr2ogr + tippecanoe conversion to vector MBTiles | Only unencrypted, legal, open S-57 data |

Explicitly unsupported:

- S-63
- oeSENC
- encrypted charts
- commercial chart decryption
- license bypass workflows

## Import From UI

Open `/charts` from the main navbar:

- `Sources`: OSM, Nautical, ENC demo, and local charts returned by `GET /charts`.
- `Import`: MBTiles upload, GeoTIFF/KAP conversion, open S-57 conversion, and job progress.
- `Diagnostics`: recent MapLibre tile/glyph/source errors and Raspberry storage notes.

When the chart engine is offline, local chart selection and imports are disabled. Built-in base maps remain available.

## Import From CLI

```bash
npm run charts:import-mbtiles -- --id local-raster --label "Local Raster" --kind raster --file /path/to/chart.mbtiles
npm run charts:import-mbtiles -- --id local-enc --label "Local ENC" --kind vector --file /path/to/enc.mbtiles
```

The chart registry is stored in:

```txt
/var/lib/open-marine/charts/registry.local.json
```

In Windows development, the default storage remains under `marine-chart-engine/data/`.

## Raster Conversion

Required tools:

```txt
gdal_translate
gdaladdo
```

Dry run:

```bash
npm run charts:convert-raster -- --input /path/to/source.tif --output /tmp/source.mbtiles --dry-run
```

Production flow:

```txt
gdal_translate -of MBTILES -co TILE_FORMAT=PNG <input> <output.mbtiles>
gdaladdo -r average <output.mbtiles> 2 4 8 16
```

For Raspberry deployments, large raster conversions may be slow. It is valid to convert on a workstation and import the resulting MBTiles into the Raspberry.

## S-57 To Vector Tiles

Required tools:

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
npm run charts:convert-s57 -- --input /path/to/chart.000 --output /tmp/chart.mbtiles --dry-run
```

The generated vector MBTiles are consumed by the UI ENC vector style using these source-layer names.

## Bathymetry

Complete local bathymetry should be imported as raster MBTiles. EMODnet WMS is available for online display; use an official EMODnet DTM extract and the raster conversion workflow for offline use.

## Ria de Vigo offline package

The `ria-vigo` preset uses bounds `[-9.05, 42.05, -8.40, 42.40]`. It includes the inner ria, Cies, approaches and Baiona. Check its requirements and tile estimates with:

```bash
curl http://localhost:8088/packages/ria-vigo
```

1. Download the permitted EMODnet DTM extract for those bounds.
2. Convert it to raster MBTiles with `npm run charts:convert-raster -- --input <dtm.tif> --output <ria-vigo-bathymetry.mbtiles>`.
3. Import it with `npm run charts:import-mbtiles -- --id ria-vigo-bathymetry --label "Ria de Vigo bathymetry" --kind raster --file <ria-vigo-bathymetry.mbtiles>`.
4. Import a locally produced/open seamark extract if required. Do not bulk-cache the public OpenSeaMap tile endpoint.

For a smaller rendered snapshot, `POST /catalog/download/area` accepts provider `emodnet-bathymetry`, the preset bounds and zooms 6-14. The resulting resumable `ria-vigo-bathymetry.mbtiles` contains 916 signature-verified tiles. Retain the EMODnet/EU CC BY 4.0 attribution. Use the DTM workflow above when numeric depths, a declared vertical datum or later re-rendering are required.

IHM P2-P5 remain online-only and are selected by zoom. Do not cache IHM unless its current terms explicitly permit it.

## Environmental forecasts and tides

Install `marine-chart-engine/scripts/requirements-copernicus.txt`, authenticate a free Copernicus Marine account using its standard credentials store, and run `npm run charts:sync-copernicus`. Never put credentials in Git. Set `CHART_ENGINE_COPERNICUS_SYNC_ENABLED=true` for scheduled refreshes. Optional atmospheric overlays use `CHART_ENGINE_OWM_API_KEY`; point conditions continue to use Open-Meteo.

Vigo tides come from IHM port 29 through `/tides/vigo?date=YYYY-MM-DD`. Values are official predictions and retain local `Europe/Madrid` clock times. Cached or stale state and age are shown explicitly. They are not observed levels and are not silently applied to chart soundings.

Use SSD storage for `CHART_ENGINE_DATA_DIR`. S-63, oeSENC, encrypted charts, decryption and license bypasses remain unsupported. Open Marine is recreational assistance, not an ECDIS or a substitute for official charts.

## Frequent Errors

`Chart engine offline`: start `omi-charts` on Raspberry or run `npm run start:charts` in development.

`Missing GDAL/tippecanoe`: install the external conversion tools on the host running `marine-chart-engine`, or pre-convert charts on another machine.

`Tile unavailable`: the chart is registered but the requested z/x/y tile is absent, outside zoom range, or the chart source failed to load. The map should continue running with overlays intact.

`Unsupported chart format`: the upload is not MBTiles, GeoTIFF, KAP, or open S-57 `.000`, or it is an encrypted/commercial package that this project does not import.
