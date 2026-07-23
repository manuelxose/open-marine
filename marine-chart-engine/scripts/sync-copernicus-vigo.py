#!/usr/bin/env python3
"""Synchronize Copernicus Marine IBI fields for the Ria de Vigo offline cache.

Credentials are read by copernicusmarine from its standard environment/file.
No credential is accepted on the command line or written to the output.
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import copernicusmarine
import numpy as np
import xarray as xr

BOUNDS = (-9.05, 42.05, -8.40, 42.40)
PHY_DATASET = os.environ.get(
    "CHART_ENGINE_COPERNICUS_PHY_DATASET",
    "cmems_mod_ibi_phy_anfc_0.027deg-2D_PT1H-m",
)
WAVE_DATASET = os.environ.get(
    "CHART_ENGINE_COPERNICUS_WAVE_DATASET",
    "cmems_mod_ibi_wav_anfc_0.0278deg_PT1H-i",
)
OUTPUT_ROOT = Path(os.environ.get("CHART_ENGINE_DATA_DIR", Path(__file__).parents[1] / "data")) / "environment"


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    raw = OUTPUT_ROOT / "raw"
    raw.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    end = now + timedelta(days=5)

    phy_file = raw / "ibi-phy.nc"
    wave_file = raw / "ibi-wave.nc"
    subset(PHY_DATASET, ["thetao", "uo", "vo", "zos"], now, end, phy_file)
    subset(WAVE_DATASET, ["VHM0", "VMDR", "VTM10"], now, end, wave_file)

    manifest: dict[str, list[str]] = {"seaTemperature": [], "currents": [], "waves": []}
    with xr.open_dataset(phy_file) as data:
        write_temperature(data, manifest)
        write_currents(data, manifest)
    with xr.open_dataset(wave_file) as data:
        write_waves(data, manifest)
    atomic_json(OUTPUT_ROOT / "manifest.json", {
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "layers": manifest,
    })


def subset(dataset_id: str, variables: list[str], start: datetime, end: datetime, output: Path) -> None:
    copernicusmarine.subset(
        dataset_id=dataset_id,
        variables=variables,
        minimum_longitude=BOUNDS[0], maximum_longitude=BOUNDS[2],
        minimum_latitude=BOUNDS[1], maximum_latitude=BOUNDS[3],
        start_datetime=start, end_datetime=end,
        output_directory=output.parent,
        output_filename=output.name,
        overwrite=True,
        disable_progress_bar=True,
    )


def write_temperature(data: xr.Dataset, manifest: dict[str, list[str]]) -> None:
    variable = first_variable(data, "thetao", "bottomT")
    for instant, frame in frames(data, variable):
        features = point_features(frame, lambda value: {"value": round(float(value), 2)})
        write_frame("seaTemperature", instant, features, manifest)


def write_currents(data: xr.Dataset, manifest: dict[str, list[str]]) -> None:
    east = first_variable(data, "uo", "vozocrtx")
    north = first_variable(data, "vo", "vomecrty")
    for index, instant in enumerate(times(data)):
        u = surface(data[east].isel(time=index))
        v = surface(data[north].isel(time=index))
        features: list[dict[str, Any]] = []
        for lon, lat, eastward, northward in grid_values(u, v):
            if not np.isfinite(eastward) or not np.isfinite(northward):
                continue
            speed = math.hypot(float(eastward), float(northward))
            direction = (math.degrees(math.atan2(float(eastward), float(northward))) + 360) % 360
            scale = 0.018 if speed > 0 else 0
            end_lat = lat + math.cos(math.radians(direction)) * scale
            end_lon = lon + math.sin(math.radians(direction)) * scale / max(math.cos(math.radians(lat)), 0.1)
            features.append(feature("LineString", [[lon, lat], [end_lon, end_lat]], {
                "speedKnots": round(speed * 1.943844, 2), "directionDeg": round(direction, 1),
            }))
        write_frame("currents", instant, features, manifest)


def write_waves(data: xr.Dataset, manifest: dict[str, list[str]]) -> None:
    height_name = first_variable(data, "VHM0", "swh")
    direction_name = first_variable(data, "VMDR", "mwd")
    period_name = first_variable(data, "VTM10", "mwp")
    for index, instant in enumerate(times(data)):
        height = surface(data[height_name].isel(time=index))
        direction = surface(data[direction_name].isel(time=index))
        period = surface(data[period_name].isel(time=index))
        features = []
        for lon, lat, h, d, p in grid_values(height, direction, period):
            if np.isfinite(h):
                features.append(feature("Point", [lon, lat], {
                    "heightMeters": round(float(h), 2),
                    "directionDeg": round(float(d), 1) if np.isfinite(d) else None,
                    "periodSeconds": round(float(p), 1) if np.isfinite(p) else None,
                }))
        write_frame("waves", instant, features, manifest)


def frames(data: xr.Dataset, variable: str):
    for index, instant in enumerate(times(data)):
        yield instant, surface(data[variable].isel(time=index))


def times(data: xr.Dataset) -> list[str]:
    return [np.datetime_as_string(value, unit="s") + "Z" for value in data["time"].values]


def surface(array: xr.DataArray) -> xr.DataArray:
    for dimension in ("depth", "deptht", "elevation"):
        if dimension in array.dims:
            return array.isel({dimension: 0})
    return array


def grid_values(*arrays: xr.DataArray):
    first = arrays[0]
    lat_name = "latitude" if "latitude" in first.coords else "lat"
    lon_name = "longitude" if "longitude" in first.coords else "lon"
    for lat_index, latitude in enumerate(first[lat_name].values):
        for lon_index, longitude in enumerate(first[lon_name].values):
            yield float(longitude), float(latitude), *(float(array.values[lat_index, lon_index]) for array in arrays)


def point_features(frame: xr.DataArray, properties) -> list[dict[str, Any]]:
    return [feature("Point", [lon, lat], properties(value)) for lon, lat, value in grid_values(frame) if np.isfinite(value)]


def feature(kind: str, coordinates: Any, properties: dict[str, Any]) -> dict[str, Any]:
    return {"type": "Feature", "geometry": {"type": kind, "coordinates": coordinates}, "properties": properties}


def first_variable(data: xr.Dataset, *names: str) -> str:
    for name in names:
        if name in data.data_vars:
            return name
    raise RuntimeError(f"None of the expected variables {names} exist; found {list(data.data_vars)}")


def write_frame(layer: str, instant: str, features: list[dict[str, Any]], manifest: dict[str, list[str]]) -> None:
    directory = OUTPUT_ROOT / layer
    directory.mkdir(exist_ok=True)
    safe_time = instant.replace(":", "-")
    atomic_json(directory / f"{safe_time}.geojson", {"type": "FeatureCollection", "features": features})
    manifest[layer].append(instant)


def atomic_json(destination: Path, value: Any) -> None:
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_text(json.dumps(value, separators=(",", ":")), encoding="utf-8")
    temporary.replace(destination)


if __name__ == "__main__":
    main()
