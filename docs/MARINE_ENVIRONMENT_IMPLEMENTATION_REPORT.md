# Marine environment implementation report

Date: 2026-07-29. Scope: completed desktop coastal environment increment
(Raspberry deployment explicitly excluded).

## Delivered

- Provider-independent `MarineFieldMetadata`, physical point/regular grids,
  explicit null/no-data, provenance and direction conventions.
- Explainable coastal model ranking with different NOW and future policies.
- Provider registry, request deduplication and transparent runtime fallback.
- Open-Meteo wind fallback normalized to U/V without claiming its requested
  display sampling as physical model resolution.
- Copernicus IBI cached-frame adapters for waves/currents. Only features marked
  as original source nodes enter the physical field API.
- Live Puertos HF radar Galicia adapter using OPeNDAP U/V, hourly observation
  age and fill-value rejection.
- APIs:
  - `GET /api/marine/providers`
  - `GET /api/marine/wind`
  - `GET /api/marine/waves`
  - `GET /api/marine/currents`
  - `GET /api/marine/point`
  - `GET /api/marine/debug/source-grid.geojson`
- `/chart` source-grid toggle for wind/waves/currents. The MapLibre layer shows
  physical nodes as circles above the existing scalar/vector representation.
- Continuous wind and current flow through a MapLibre WebGL custom layer:
  adaptive particles, CPU advection over provider U/V, WebGL trails and a
  rasterized in-memory coastal lookup. Static barbs/cells remain as the
  quantitative representation.
- EMODnet numerical WCS mask acquisition (`npm run sync:coastal-mask`), atomic
  GeoJSON output and an offline-served `/api/marine/coastal-mask.geojson`
  endpoint. The generated Vigo mask uses `emodnet:mean` at 1/16 arc minute
  (0.0010416667 degrees) and is supplementary, never a navigation chart.
- Bilinear interpolation for regular grids and four-node IDW for irregular
  physical nodes, including circular directions and distance/provenance.
- Linear temporal interpolation between bracketing Copernicus frames; API
  metadata records both source instants and the interpolation weight.
- Full IBI wave preservation: total sea, wind sea, primary/secondary swell,
  Tm02/peak period, peak direction, maximum wave/crest and Stokes U/V.
- Forecast play/pause/previous/next controls, adjacent-frame prefetch and a
  bounded Cache Storage field cache with network-first offline fallback.

## Vigo benchmark

Temporary local chart engine; bbox `[-8.90, 42.18, -8.66, 42.32]` for the
smaller payload tests and the full Vigo reference bbox for HF current.

| Request | Status | Payload | Result |
| --- | ---: | ---: | --- |
| `/api/marine/providers` | 200 | 447 B | 4 registered adapters. |
| `/api/marine/wind` | 200 | 5,777 B | Open-Meteo fallback; 40 returned model/sample points; physical source resolution explicitly “not exposed”. |
| `/api/marine/debug/source-grid.geojson?variable=wind` | 200 | 17,423 B | 40 visible source/sample nodes; `renderGrid: null`. |
| `/api/marine/point?lat=42.24&lon=-8.78` | 200 | 2,199 B | Wind sample with provenance; waves/current separately marked unavailable in the clean temporary data directory. |
| `/api/marine/currents` full Vigo | 503 | small JSON error | HF Galicia had no valid U/V nodes at the requested current time and clean test storage had no IBI cache. No fill value became zero current. |

External measurements made during source discovery:

- Puertos HF: 47x81 nominal grid, 130 hourly instants in the five-day file;
  Vigo test subset 10x7 = 70 positions, zero valid vectors at
  2026-07-29 09:00 UTC.
- Wind point diagnostic: 407 B.
- Wave point diagnostic: 697 B.

Desktop Playwright/Chromium at 1440x900, with tracing and screenshots enabled:

| Metric | Measured result |
| --- | ---: |
| Wind particles | 1,234 |
| Physical source nodes in fixture | 4 |
| Observed full-browser cadence | 12.6 FPS |
| Particle layer CPU cost | 6.10 ms/frame |
| CPU frame budget | pass (<16.7 ms) |

Tablet 1024x768 day-profile regression: 749 particles, 8.2 traced FPS and
8.90 ms CPU per particle-layer frame (budget also passed).

The global cadence includes MapLibre, Angular, Playwright tracing and repeated
GPU `readPixels` stalls from screenshots. The stable regression gate is the
layer's own CPU cost; real-device GPU cadence should be measured separately
before choosing a higher density. Existing AIS, route, waypoint and vessel
ordering/lifecycle remain above the environmental custom layer.

## Validation

- Chart engine: 55/55 tests pass.
- UI: 56 tests pass, 2 skipped.
- UI production build: pass.
- UI lint: pass with 347 pre-existing warnings and zero errors.
- Python Copernicus/mask geometry: 7/7 tests pass.
- Chromium environmental E2E: 4/4 pass across desktop 1440x900 and tablet
  1024x768 profiles.
- Live public EMODnet WCS mask generation: pass; 82,672-byte GeoJSON.

## External/provider gaps

- MeteoGalicia live WRF/SWAN/MOHID discovery needs the official THREDDS service
  to recover from HTTP 502 before an adapter can be verified.
- AEMET HARMONIE requires authorized data access; it is not OpenData.
- A fresh Copernicus subset still requires an authenticated server-side
  Toolbox session. The sync now requests the complete supported wave variable
  set and cached adapters preserve it.
- Raspberry installation/deployment and Raspberry FPS were intentionally not
  performed per task scope.
