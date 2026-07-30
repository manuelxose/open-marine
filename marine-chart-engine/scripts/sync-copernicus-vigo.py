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
from functools import lru_cache
from pathlib import Path
from typing import Any

import copernicusmarine
import numpy as np
import xarray as xr
from shapely.geometry import Point as ShapelyPoint
from shapely.geometry import MultiLineString, box, mapping, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import polylabel

BOUNDS = (-9.05, 42.05, -8.40, 42.40)
PHY_DATASET = os.environ.get(
    "CHART_ENGINE_COPERNICUS_PHY_DATASET",
    "cmems_mod_ibi_phy_anfc_0.027deg-2D_PT1H-m",
)
WAVE_DATASET = os.environ.get(
    "CHART_ENGINE_COPERNICUS_WAVE_DATASET",
    "cmems_mod_ibi_wav_anfc_0.027deg_PT1H-i",
)
OUTPUT_ROOT = Path(os.environ.get("CHART_ENGINE_DATA_DIR", Path(__file__).parents[1] / "data")) / "environment"
MARINE_MASK_PATH = Path(os.environ.get(
    "CHART_ENGINE_COPERNICUS_MARINE_MASK",
    Path(__file__).parents[1] / "resources" / "ria-vigo-marine-mask.geojson",
))
_MARINE_MASK: BaseGeometry | None = None
MAX_INTERPOLATION_DISTANCE_KM = float(os.environ.get(
    "CHART_ENGINE_COPERNICUS_MAX_INTERPOLATION_KM",
    "12",
))
MIN_WAVE_SYMBOL_WATER_FRACTION = float(os.environ.get(
    "CHART_ENGINE_WAVE_SYMBOL_MIN_WATER_FRACTION",
    "0.15",
))
MIN_WAVE_SYMBOL_CLEARANCE_DEGREES = float(os.environ.get(
    "CHART_ENGINE_WAVE_SYMBOL_MIN_CLEARANCE_DEGREES",
    "0.0005",
))
WAVE_VARIABLES = [
    "VHM0", "VMDR", "VTM10", "VTM02", "VTPK", "VPED", "VCMX", "VMXL",
    "VSDX", "VSDY",
    "VHM0_WW", "VTM01_WW", "VMDR_WW",
    "VHM0_SW1", "VTM01_SW1", "VMDR_SW1",
    "VHM0_SW2", "VTM01_SW2", "VMDR_SW2",
]


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    raw = OUTPUT_ROOT / "raw"
    raw.mkdir(exist_ok=True)
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    end = now + timedelta(days=5)

    phy_file = raw / "ibi-phy.nc"
    wave_file = raw / "ibi-wave.nc"
    subset(PHY_DATASET, ["thetao", "uo", "vo", "zos"], now, end, phy_file)
    subset(WAVE_DATASET, WAVE_VARIABLES, now, end, wave_file)

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
    if not output.exists():
        raise RuntimeError(
            "Copernicus download did not produce data. Authenticate once with "
            "`marine-chart-engine/.venv/Scripts/copernicusmarine login` and retry."
        )


def write_temperature(data: xr.Dataset, manifest: dict[str, list[str]]) -> None:
    variable = first_variable(data, "thetao", "bottomT")
    for instant, frame in frames(data, variable):
        features = scalar_cell_features(frame, lambda value, interpolated, distance: {
            "featureType": "cell",
            "value": round(float(value), 2),
            "interpolated": interpolated,
            "sourceDistanceKm": round(distance, 1),
        })
        write_frame("seaTemperature", instant, features, manifest)


def write_currents(data: xr.Dataset, manifest: dict[str, list[str]]) -> None:
    east = first_variable(data, "uo", "vozocrtx")
    north = first_variable(data, "vo", "vomecrty")
    for index, instant in enumerate(times(data)):
        u = surface(data[east].isel(time=index))
        v = surface(data[north].isel(time=index))
        features: list[dict[str, Any]] = []
        lon_edges, lat_edges = grid_edges(u)
        for (
            lat_index,
            lon_index,
            lon,
            lat,
            values,
            interpolated,
            source_distance,
        ) in interpolated_grid_values(u, v):
            eastward, northward = values
            if not np.isfinite(eastward) or not np.isfinite(northward):
                continue
            speed = math.hypot(float(eastward), float(northward))
            direction = (math.degrees(math.atan2(float(eastward), float(northward))) + 360) % 360
            properties = {
                "speedKnots": round(speed * 1.943844, 2),
                "directionDeg": round(direction, 1),
                "interpolated": interpolated,
                "sourceDistanceKm": round(source_distance, 1),
            }
            cell = cell_feature(lon_edges, lat_edges, lon_index, lat_index, {
                **properties,
                "featureType": "cell",
            })
            if cell is None:
                continue
            features.append(cell)
            arrow = direction_arrow_feature(
                lon,
                lat,
                direction,
                0.009 + min(speed * 1.943844, 2) * 0.002,
                {
                    **properties,
                    "featureType": "direction",
                },
            )
            if arrow is not None:
                features.append(arrow)
        write_frame("currents", instant, features, manifest)


def write_waves(data: xr.Dataset, manifest: dict[str, list[str]]) -> None:
    names = {
        "significantHeight": first_variable(data, "VHM0", "swh"),
        "directionFrom": first_variable(data, "VMDR", "mwd"),
        "meanPeriod": first_variable(data, "VTM10", "mwp"),
        "spectralPeriodTm02": first_variable(data, "VTM02"),
        "peakPeriod": first_variable(data, "VTPK"),
        "peakDirectionFrom": first_variable(data, "VPED"),
        "maximumHeight": first_variable(data, "VCMX"),
        "maximumCrestHeight": first_variable(data, "VMXL"),
        "stokesU": first_variable(data, "VSDX"),
        "stokesV": first_variable(data, "VSDY"),
        "windSeaHeight": first_variable(data, "VHM0_WW"),
        "windSeaPeriod": first_variable(data, "VTM01_WW"),
        "windSeaDirectionFrom": first_variable(data, "VMDR_WW"),
        "primarySwellHeight": first_variable(data, "VHM0_SW1"),
        "primarySwellPeriod": first_variable(data, "VTM01_SW1"),
        "primarySwellDirectionFrom": first_variable(data, "VMDR_SW1"),
        "secondarySwellHeight": first_variable(data, "VHM0_SW2"),
        "secondarySwellPeriod": first_variable(data, "VTM01_SW2"),
        "secondarySwellDirectionFrom": first_variable(data, "VMDR_SW2"),
    }
    circular_indexes = {
        index for index, name in enumerate(names)
        if name.endswith("DirectionFrom")
    }
    for index, instant in enumerate(times(data)):
        arrays = [surface(data[source].isel(time=index)) for source in names.values()]
        height = arrays[0]
        features = []
        lon_edges, lat_edges = grid_edges(height)
        for (
            lat_index,
            lon_index,
            lon,
            lat,
            values,
            interpolated,
            source_distance,
        ) in interpolated_grid_values(*arrays, circular_indexes=circular_indexes):
            properties = {
                name: round(float(value), 2) if np.isfinite(value) else None
                for name, value in zip(names, values)
            }
            h = values[0]
            d = values[1]
            if np.isfinite(h):
                render_properties = {
                    **properties,
                    "heightMeters": properties["significantHeight"],
                    "directionDeg": round(float(d), 1) if np.isfinite(d) else None,
                    "periodSeconds": properties["meanPeriod"],
                    "interpolated": interpolated,
                    "sourceDistanceKm": round(source_distance, 1),
                }
                cell = cell_feature(lon_edges, lat_edges, lon_index, lat_index, {
                    **render_properties,
                    "featureType": "cell",
                })
                if cell is None:
                    continue
                features.append(cell)
                if np.isfinite(d):
                    symbol = wave_symbol_feature(
                        shape(cell["geometry"]),
                        float(abs(
                            (lon_edges[lon_index + 1] - lon_edges[lon_index])
                            * (lat_edges[lat_index + 1] - lat_edges[lat_index])
                        )),
                        {
                            **render_properties,
                            "featureType": "waveSymbol",
                        },
                    )
                    if symbol is not None:
                        features.append(symbol)
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


def indexed_grid_values(*arrays: xr.DataArray):
    first = arrays[0]
    lat_name = "latitude" if "latitude" in first.coords else "lat"
    lon_name = "longitude" if "longitude" in first.coords else "lon"
    for lat_index, latitude in enumerate(first[lat_name].values):
        for lon_index, longitude in enumerate(first[lon_name].values):
            yield (
                lat_index,
                lon_index,
                float(longitude),
                float(latitude),
                *(float(array.values[lat_index, lon_index]) for array in arrays),
            )


def cell_features(frame: xr.DataArray, properties, clip_to_marine: bool = True) -> list[dict[str, Any]]:
    lon_edges, lat_edges = grid_edges(frame)
    features: list[dict[str, Any]] = []
    for lat_index, lon_index, _lon, _lat, value in indexed_grid_values(frame):
        if not np.isfinite(value):
            continue
        cell = cell_feature(
            lon_edges,
            lat_edges,
            lon_index,
            lat_index,
            properties(value),
            clip_to_marine=clip_to_marine,
        )
        if cell is not None:
            features.append(cell)
    return features


def scalar_cell_features(frame: xr.DataArray, properties) -> list[dict[str, Any]]:
    lon_edges, lat_edges = grid_edges(frame)
    features: list[dict[str, Any]] = []
    for (
        lat_index,
        lon_index,
        _lon,
        _lat,
        values,
        interpolated,
        source_distance,
    ) in interpolated_grid_values(frame):
        value = values[0]
        if not np.isfinite(value):
            continue
        cell = cell_feature(
            lon_edges,
            lat_edges,
            lon_index,
            lat_index,
            properties(value, interpolated, source_distance),
        )
        if cell is not None:
            features.append(cell)
    return features


def interpolated_grid_values(
    *arrays: xr.DataArray,
    circular_indexes: set[int] | None = None,
):
    first = arrays[0]
    lat_name = "latitude" if "latitude" in first.coords else "lat"
    lon_name = "longitude" if "longitude" in first.coords else "lon"
    latitudes = np.asarray(first[lat_name].values, dtype=float)
    longitudes = np.asarray(first[lon_name].values, dtype=float)
    lon_edges, lat_edges = grid_edges(first)
    circular = circular_indexes or set()

    source_coordinates = np.array([
        (longitude, latitude)
        for latitude in latitudes
        for longitude in longitudes
    ])
    flattened = [np.asarray(array.values, dtype=float).reshape(-1) for array in arrays]

    for lat_index, latitude in enumerate(latitudes):
        for lon_index, longitude in enumerate(longitudes):
            marine_geometry = clipped_cell_geometry(
                float(min(lon_edges[lon_index], lon_edges[lon_index + 1])),
                float(min(lat_edges[lat_index], lat_edges[lat_index + 1])),
                float(max(lon_edges[lon_index], lon_edges[lon_index + 1])),
                float(max(lat_edges[lat_index], lat_edges[lat_index + 1])),
            )
            if marine_geometry.is_empty:
                continue

            flat_index = lat_index * len(longitudes) + lon_index
            output: list[float] = []
            interpolated = False
            source_distance_km = 0.0
            for array_index, values in enumerate(flattened):
                current = values[flat_index]
                if np.isfinite(current):
                    output.append(float(current))
                    continue

                value, distance_km = interpolate_value(
                    float(longitude),
                    float(latitude),
                    source_coordinates,
                    values,
                    circular=array_index in circular,
                )
                output.append(value)
                if np.isfinite(value):
                    interpolated = True
                    source_distance_km = max(source_distance_km, distance_km)

            if not np.isfinite(output[0]):
                continue
            yield (
                lat_index,
                lon_index,
                float(longitude),
                float(latitude),
                tuple(output),
                interpolated,
                source_distance_km,
            )


def interpolate_value(
    longitude: float,
    latitude: float,
    source_coordinates: np.ndarray,
    values: np.ndarray,
    circular: bool,
) -> tuple[float, float]:
    valid = np.isfinite(values)
    if not valid.any():
        return math.nan, 0.0
    candidates = source_coordinates[valid]
    candidate_values = values[valid]
    longitude_scale = math.cos(math.radians(latitude))
    distances_km = np.hypot(
        (candidates[:, 0] - longitude) * longitude_scale,
        candidates[:, 1] - latitude,
    ) * 111.32
    nearby = np.where(distances_km <= MAX_INTERPOLATION_DISTANCE_KM)[0]
    if nearby.size == 0:
        return math.nan, 0.0
    nearest = nearby[np.argsort(distances_km[nearby])[:4]]
    selected_distances = np.maximum(distances_km[nearest], 0.05)
    weights = 1 / np.square(selected_distances)
    selected_values = candidate_values[nearest]
    if circular:
        radians = np.radians(selected_values)
        value = math.degrees(math.atan2(
            float(np.sum(np.sin(radians) * weights)),
            float(np.sum(np.cos(radians) * weights)),
        )) % 360
    else:
        value = float(np.average(selected_values, weights=weights))
    return value, float(np.min(selected_distances))


def grid_edges(frame: xr.DataArray) -> tuple[np.ndarray, np.ndarray]:
    lat_name = "latitude" if "latitude" in frame.coords else "lat"
    lon_name = "longitude" if "longitude" in frame.coords else "lon"
    return coordinate_edges(frame[lon_name].values), coordinate_edges(frame[lat_name].values)


def coordinate_edges(values: np.ndarray) -> np.ndarray:
    coordinates = np.asarray(values, dtype=float)
    if coordinates.size < 2:
        raise RuntimeError("Copernicus grid needs at least two coordinates per axis")
    midpoints = (coordinates[:-1] + coordinates[1:]) / 2
    return np.concatenate((
        [coordinates[0] - (midpoints[0] - coordinates[0])],
        midpoints,
        [coordinates[-1] + (coordinates[-1] - midpoints[-1])],
    ))


def cell_feature(
    lon_edges: np.ndarray,
    lat_edges: np.ndarray,
    lon_index: int,
    lat_index: int,
    properties: dict[str, Any],
    clip_to_marine: bool = True,
) -> dict[str, Any] | None:
    west, east = sorted((float(lon_edges[lon_index]), float(lon_edges[lon_index + 1])))
    south, north = sorted((float(lat_edges[lat_index]), float(lat_edges[lat_index + 1])))
    geometry = clipped_cell_geometry(west, south, east, north) if clip_to_marine else box(west, south, east, north)
    if geometry.is_empty:
        return None
    return {
        "type": "Feature",
        "geometry": mapping(geometry),
        "properties": properties,
    }


def marine_mask() -> BaseGeometry:
    global _MARINE_MASK
    if _MARINE_MASK is None:
        document = json.loads(MARINE_MASK_PATH.read_text(encoding="utf-8"))
        geometries = [shape(item["geometry"]) for item in document.get("features", [])]
        if len(geometries) != 1 or geometries[0].is_empty:
            raise RuntimeError(f"Invalid marine mask: {MARINE_MASK_PATH}")
        _MARINE_MASK = geometries[0]
    return _MARINE_MASK


@lru_cache(maxsize=1024)
def clipped_cell_geometry(west: float, south: float, east: float, north: float) -> BaseGeometry:
    return box(west, south, east, north).intersection(marine_mask())


def point_is_marine(longitude: float, latitude: float) -> bool:
    return marine_mask().covers(ShapelyPoint(longitude, latitude))


def wave_symbol_feature(
    marine_geometry: BaseGeometry,
    full_cell_area: float,
    properties: dict[str, Any],
) -> dict[str, Any] | None:
    if marine_geometry.is_empty or full_cell_area <= 0:
        return None
    water_fraction = marine_geometry.area / full_cell_area
    if water_fraction < MIN_WAVE_SYMBOL_WATER_FRACTION:
        return None

    polygons = (
        [marine_geometry]
        if marine_geometry.geom_type == "Polygon"
        else [part for part in getattr(marine_geometry, "geoms", []) if part.geom_type == "Polygon"]
    )
    if not polygons:
        return None
    largest = max(polygons, key=lambda polygon: polygon.area)
    anchor = polylabel(largest, tolerance=0.0001)
    clearance = anchor.distance(largest.boundary)
    if clearance < MIN_WAVE_SYMBOL_CLEARANCE_DEGREES:
        return None
    return {
        "type": "Feature",
        "geometry": mapping(anchor),
        "properties": {
            **properties,
            "waterFraction": round(water_fraction, 3),
            "waterClearanceKm": round(clearance * 111.32, 3),
        },
    }


def direction_arrow_feature(
    longitude: float,
    latitude: float,
    direction_degrees: float,
    length_degrees: float,
    properties: dict[str, Any],
) -> dict[str, Any] | None:
    half_length = length_degrees / 2
    tail = project(longitude, latitude, (direction_degrees + 180) % 360, half_length)
    tip = project(longitude, latitude, direction_degrees, half_length)
    head_length = length_degrees * 0.32
    left = project(tip[0], tip[1], (direction_degrees + 150) % 360, head_length)
    right = project(tip[0], tip[1], (direction_degrees - 150) % 360, head_length)
    arrow = MultiLineString(((tail, tip), (tip, left), (tip, right))).intersection(marine_mask())
    if arrow.is_empty:
        return None
    return {
        "type": "Feature",
        "geometry": mapping(arrow),
        "properties": properties,
    }


def project(
    longitude: float,
    latitude: float,
    bearing_degrees: float,
    distance_degrees: float,
) -> tuple[float, float]:
    bearing = math.radians(bearing_degrees)
    return (
        longitude + math.sin(bearing) * distance_degrees / max(math.cos(math.radians(latitude)), 0.1),
        latitude + math.cos(bearing) * distance_degrees,
    )


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
