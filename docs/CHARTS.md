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

Complete local bathymetry should be imported as raster MBTiles. EMODnet is represented by a configurable proxy endpoint. Set `EMODNET_TILE_URL_TEMPLATE` only when you have a legal tile-compatible service URL. Open Marine does not hardcode EMODnet download URLs.

## Frequent Errors

`Chart engine offline`: start `omi-charts` on Raspberry or run `npm run start:charts` in development.

`Missing GDAL/tippecanoe`: install the external conversion tools on the host running `marine-chart-engine`, or pre-convert charts on another machine.

`Tile unavailable`: the chart is registered but the requested z/x/y tile is absent, outside zoom range, or the chart source failed to load. The map should continue running with overlays intact.

`Unsupported chart format`: the upload is not MBTiles, GeoTIFF, KAP, or open S-57 `.000`, or it is an encrypted/commercial package that this project does not import.
