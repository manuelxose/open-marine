from __future__ import annotations

import importlib.util
import math
import unittest
from pathlib import Path

import numpy as np
import xarray as xr


SCRIPT = Path(__file__).with_name("sync-copernicus-vigo.py")
SPEC = importlib.util.spec_from_file_location("sync_copernicus_vigo", SCRIPT)
assert SPEC and SPEC.loader
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


class CopernicusGridGeometryTest(unittest.TestCase):
    def test_coordinate_edges_cover_the_complete_model_grid(self) -> None:
        edges = sync.coordinate_edges(np.array([-9.0, -8.75, -8.5]))

        np.testing.assert_allclose(edges, [-9.125, -8.875, -8.625, -8.375])

    def test_cell_features_keep_the_land_mask_and_do_not_emit_points(self) -> None:
        frame = xr.DataArray(
            np.array([[16.5, math.nan], [17.0, 17.5]]),
            coords={"latitude": [42.1, 42.2], "longitude": [-8.9, -8.8]},
            dims=("latitude", "longitude"),
        )

        features = sync.cell_features(
            frame,
            lambda value: {
                "featureType": "cell",
                "value": float(value),
            },
            clip_to_marine=False,
        )

        self.assertEqual(len(features), 3)
        self.assertTrue(all(item["geometry"]["type"] == "Polygon" for item in features))
        self.assertTrue(all(item["properties"]["featureType"] == "cell" for item in features))
        self.assertNotIn(
            [-8.8, 42.1],
            [
                coordinate
                for item in features
                for ring in item["geometry"]["coordinates"]
                for coordinate in ring
            ],
        )

    def test_cell_polygon_is_closed_and_uses_half_grid_boundaries(self) -> None:
        item = sync.cell_feature(
            np.array([-9.05, -8.95, -8.85]),
            np.array([42.05, 42.15, 42.25]),
            lon_index=1,
            lat_index=0,
            properties={"featureType": "cell"},
            clip_to_marine=False,
        )
        ring = item["geometry"]["coordinates"][0]

        self.assertEqual(ring[0], ring[-1])
        self.assertEqual(sync.shape(item["geometry"]).bounds, (-8.95, 42.05, -8.85, 42.15))

    def test_real_mask_clips_a_coastal_cell_and_rejects_land_direction_points(self) -> None:
        full_cell = sync.box(-8.75, 42.22, -8.69, 42.28)
        clipped = sync.clipped_cell_geometry(-8.75, 42.22, -8.69, 42.28)

        self.assertGreater(clipped.area, 0)
        self.assertLess(clipped.area, full_cell.area)
        self.assertTrue(sync.point_is_marine(-8.72, 42.245))
        self.assertFalse(sync.point_is_marine(-8.70, 42.22))

    def test_interpolation_fills_nearby_marine_gaps_but_not_distant_ones(self) -> None:
        coordinates = np.array([[-8.8, 42.2], [-8.7, 42.2]])
        values = np.array([18.0, 20.0])

        nearby, distance = sync.interpolate_value(
            -8.75,
            42.2,
            coordinates,
            values,
            circular=False,
        )
        distant, _ = sync.interpolate_value(
            -8.4,
            42.4,
            coordinates,
            values,
            circular=False,
        )

        self.assertAlmostEqual(nearby, 19.0, places=5)
        self.assertGreater(distance, 0)
        self.assertTrue(math.isnan(distant))

    def test_direction_interpolation_wraps_across_north(self) -> None:
        value, _ = sync.interpolate_value(
            -8.75,
            42.2,
            np.array([[-8.8, 42.2], [-8.7, 42.2]]),
            np.array([350.0, 10.0]),
            circular=True,
        )

        self.assertTrue(value < 1 or value > 359)

    def test_vector_arrow_is_font_independent_and_clipped_to_water(self) -> None:
        arrow = sync.direction_arrow_feature(
            -8.72,
            42.245,
            90,
            0.02,
            {"featureType": "direction"},
        )

        self.assertIsNotNone(arrow)
        geometry = sync.shape(arrow["geometry"])
        self.assertIn(geometry.geom_type, ("LineString", "MultiLineString"))
        self.assertEqual(geometry.difference(sync.marine_mask()).length, 0)

    def test_wave_symbol_uses_the_safest_point_inside_the_marine_fragment(self) -> None:
        coastal = sync.clipped_cell_geometry(-8.75, 42.22, -8.69, 42.28)
        symbol = sync.wave_symbol_feature(
            coastal,
            sync.box(-8.75, 42.22, -8.69, 42.28).area,
            {"featureType": "waveSymbol"},
        )

        self.assertIsNotNone(symbol)
        anchor = sync.shape(symbol["geometry"])
        self.assertTrue(coastal.covers(anchor))
        self.assertTrue(sync.point_is_marine(anchor.x, anchor.y))
        self.assertGreater(symbol["properties"]["waterClearanceKm"], 0)

    def test_wave_symbol_rejects_residual_water_slivers(self) -> None:
        sliver = sync.box(-8.8, 42.2, -8.7999, 42.21)

        symbol = sync.wave_symbol_feature(
            sliver,
            sync.box(-8.8, 42.2, -8.79, 42.21).area,
            {"featureType": "waveSymbol"},
        )

        self.assertIsNone(symbol)


if __name__ == "__main__":
    unittest.main()
