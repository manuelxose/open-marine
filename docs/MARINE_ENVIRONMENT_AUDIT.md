# Marine environment audit

Audit date: 2026-07-29. Reference area: Ria de Vigo
(`[-9.05, 42.05, -8.40, 42.40]`, WGS84).

## CURRENT IMPLEMENTATION

| Component | File | Responsibility / provider / format | Resolution and cache | Rendering | Observed problems |
| --- | --- | --- | --- | --- | --- |
| Quick forecast | `marine-chart-engine/src/services/weather-forecast.service.ts` | Point forecast from Open-Meteo; JSON | Point selected by upstream; 15 min fresh, stale fallback up to 24 h; in-flight dedupe | Separate meteo widget | It is not a physical field and must not be used as a dense map grid. |
| Wind field | `marine-chart-engine/src/services/wind-field.service.ts` | Samples Open-Meteo at an application-created grid; GeoJSON points with speed, gust and FROM/TO direction | Adaptive 5-18 points/axis, max 240 samples; approximately 4.3 km in the Vigo preset; disk cache per bbox | MapLibre symbol layer with meteorological barbs | The requested sampling grid is not the upstream model grid. Metadata does not identify product, run, lead time or physical source resolution; it lacks U/V arrays. |
| Atmospheric raster | `marine-chart-engine/src/services/environment-catalog.service.ts`, `src/routes/environment.routes.ts` | OpenWeatherMap temperature, wind, precipitation, clouds and pressure tiles | Provider tile pyramid; tile cache in chart engine | MapLibre raster | Useful overview, but its model grid/provenance cannot be audited from a tile. Wind raster and wind barbs have different providers. |
| Copernicus acquisition | `marine-chart-engine/scripts/sync-copernicus-vigo.py` | Server-side subset of IBI physics and waves; NetCDF decoded with xarray, converted to GeoJSON | Fixed Vigo bbox; local manifest and frames | Polygon cells plus direction symbols | Good server-side subsetting and coastal clipping are reusable. Current variables are only `uo/vo`; waves currently retain only total Hs/direction/period. The generated display interpolation is mixed into the stored frame, although features carry `interpolated` and `sourceDistanceKm`. |
| Environment catalogue/API | `marine-chart-engine/src/types/environment.types.ts`, `src/routes/environment.routes.ts` | Layer availability, times and tile/vector URLs | Manifest age determines cached/stale; local files | Supplies raster/vector URLs | Layer catalogue is not a provider registry. There is no selection decision, provider health model, normalized physical field or point query. |
| Bathymetry | `marine-chart-engine/src/services/emodnet-proxy.service.ts`, `src/routes/bathymetry.routes.ts`, WMS registration in `src/server.ts` | EMODnet rendering and proxying | Cached WMS/tiles | Raster | Suitable display layer, not yet a numerical DTM/mask service for interpolation. It must not be treated as a nautical chart. |
| Tides | `marine-chart-engine/src/services/tide.service.ts` | Vigo extrema from the official Spanish port service with cache | Daily extrema; periodic refresh | Environment panel | Not a tidal-current field. It must not be converted into U/V without a hydrodynamic product. |
| UI data access | `marine-instrumentation-ui/src/app/data-access/chart/environment-api.service.ts` | Catalogue and Vigo tide calls through `APP_ENVIRONMENT.chartEngineApiUrl` | Browser HTTP cache only | Angular panel | Provider-specific metadata and point sampling are absent. No IndexedDB field cache exists. |
| Environment UI | `marine-instrumentation-ui/src/app/features/chart/components/environment-panel/environment-panel.component.ts` | Layer, area, time and attribution controls | Settings persist in `ChartSettingsService` | Existing `/chart` panel | A mostly exclusive thematic-layer model; no separate wind/wave/current render controls, provider decision or source-grid toggle. |
| Map rendering | `marine-instrumentation-ui/src/app/features/chart/services/maplibre-engine.service.ts` | Style-generation-safe MapLibre sources/layers; raster overlays, current arrows, wave symbols and wind barbs | Coalesced updates; cached generated icons | WebGL raster/fill/symbol | Strong reusable lifecycle foundation. There are no scalar field textures or particle renderer yet. Existing IBI polygons are a display grid, not an explicit source grid. |
| Map state | `marine-instrumentation-ui/src/app/features/chart/services/chart-settings.service.ts` | Environmental visibility, opacity, selected valid time and weather bbox | `localStorage` settings | Drives chart effects | Large physical fields must not be added to localStorage. There is no common marine clock or quality level. |
| Signal K environment | `marine-instrumentation-ui/src/app/core/services/environment-state.service.ts`, gateway wind scripts and contract paths | Onboard observations (including wind) | Live Signal K state | Instruments and vessel overlays | Vessel observations are separate from regional forecast, which is correct; they are not yet exposed as typed marine observation providers. |
| Leaflet | Repository search | No active environmental Leaflet implementation was found | n/a | `/chart` uses MapLibre | New work must integrate with the actual MapLibre chart, not introduce a parallel Leaflet map. |

## TARGET IMPLEMENTATION

`marine-chart-engine` remains the environmental backend. The first compatible increment adds:

```text
providers -> normalization -> quality/coverage -> explainable selection
          -> physical field -> interpolation/render representation -> /chart
```

- `marine-environment/domain`: provider-independent field metadata, regular/point
  grids, observations, directions, no-data and provenance.
- `marine-environment/application`: registry, explainable model selector,
  `MarineEnvironmentEngine`, cache boundaries and point sampling.
- `marine-environment/infrastructure`: adapters for the existing Open-Meteo wind
  fallback, local Copernicus IBI frames and live Puertos HF radar discovery.
- `routes/marine-environment.routes.ts`: `/api/marine/providers`,
  `/api/marine/wind`, `/api/marine/waves`, `/api/marine/currents` and
  `/api/marine/point`.

The existing environment catalogue, Copernicus sync, MapLibre lifecycle, settings,
AIS, route, waypoint and vessel layers are retained. Physical source grids,
interpolated fields and render grids remain distinct. A later renderer increment
can add Canvas/WebGL particles without changing the field API.

Initial selection policy for Rias Baixas:

1. Recent valid observations only for explicit current-conditions requests.
2. Operational local/nested products with complete viewport coverage.
3. Copernicus IBI regional wave/current forecast.
4. Global/regional fallback, clearly labelled.

HARMONIE-AROME is not treated as an available public adapter because AEMET states
that numerical-model outputs are not OpenData. RAIA Vigo is not treated as live:
its public catalogue stops in 2024. The live Galicia HF product is evaluated per
request and receives no observation bonus when the requested bbox contains only
fill values.

