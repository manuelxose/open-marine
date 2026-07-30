#!/usr/bin/env python3
"""Build the Ria de Vigo marine mask from the numerical EMODnet WCS DTM.

The generated GeoJSON is a runtime/display mask, never a navigational chart.
The existing checked-in GSHHG polygon remains usable when WCS is unavailable.
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
import rasterio
from rasterio.features import shapes
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

BOUNDS = (-9.05, 42.05, -8.40, 42.40)
RESOLUTION = float(os.environ.get("CHART_ENGINE_EMODNET_MASK_RESOLUTION", "0.0010416667"))
WCS_URL = os.environ.get("CHART_ENGINE_EMODNET_WCS_URL", "https://ows.emodnet-bathymetry.eu/wcs")
OUTPUT = Path(os.environ.get(
    "CHART_ENGINE_COPERNICUS_MARINE_MASK",
    Path(__file__).parents[1] / "resources" / "ria-vigo-marine-mask.geojson",
))


def main() -> None:
    query = urlencode({
        "service": "WCS",
        "version": "1.0.0",
        "request": "GetCoverage",
        "coverage": "emodnet:mean",
        "crs": "EPSG:4326",
        "BBOX": ",".join(str(value) for value in BOUNDS),
        "format": "image/tiff",
        "interpolation": "nearest",
        "resx": str(RESOLUTION),
        "resy": str(RESOLUTION),
    })
    request = Request(f"{WCS_URL}?{query}", headers={"User-Agent": "Open-Marine/1 coastal-mask"})
    with urlopen(request, timeout=120) as response, tempfile.TemporaryDirectory() as temporary:
        coverage_path = Path(temporary) / "emodnet-coverage.tif"
        coverage_path.write_bytes(response.read())
        with rasterio.open(coverage_path) as dataset:
            depth = dataset.read(1, masked=True)
            # EMODnet mean uses negative elevations for water. Masked/no-data
            # cells and positive topography are land for particle purposes.
            water = np.logical_and(~np.ma.getmaskarray(depth), np.asarray(depth) < 0).astype("uint8")
            polygons = [
                shape(geometry)
                for geometry, value in shapes(water, mask=water == 1, transform=dataset.transform)
                if value == 1
            ]
    if not polygons:
        raise RuntimeError("EMODnet WCS returned no marine cells for the requested area")
    marine = unary_union(polygons).buffer(0).simplify(RESOLUTION * 0.35, preserve_topology=True)
    document = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": mapping(marine),
            "properties": {
                "source": "EMODnet Bathymetry WCS emodnet:mean",
                "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "resolutionDegrees": RESOLUTION,
                "criterion": "finite depth below 0 m",
                "navigationUse": False,
            },
        }],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = OUTPUT.with_suffix(".geojson.tmp")
    temporary_output.write_text(json.dumps(document, separators=(",", ":")), encoding="utf-8")
    temporary_output.replace(OUTPUT)
    print(f"Wrote EMODnet coastal mask to {OUTPUT}")


if __name__ == "__main__":
    main()
