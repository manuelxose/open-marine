# Marine Chart Toolkit

CLI tool to process nautical charts into georeferenced tile pyramids (MBTiles).

## Installation

```bash
cd marine-chart-toolkit
npm install
npm run build
npm link
```

## Usage

### Import a GeoTIFF

```bash
marine-chart-toolkit import ./charts/area-a1.tif -o ./output/area-a1.mbtiles --min-zoom 10 --max-zoom 15
```

## Features
- MBTiles generation from georeferenced raster sources.
- Metadata extraction and preservation.
- XYZ tile pyramid creation (internal).

## Requirements
- Node.js 18+
- SQLite3 (via better-sqlite3)
- Sharp (for image processing)
