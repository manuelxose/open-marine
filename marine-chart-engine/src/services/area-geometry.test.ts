import assert from 'node:assert/strict';
import test from 'node:test';
import { boundsIntersect, geometryBounds, rectangleGeometry, validateAreaGeometry } from './area-geometry.js';

test('validates a rectangle and derives its bounds', () => {
  const geometry = rectangleGeometry([-9.05, 42.05, -8.4, 42.4]);
  assert.deepEqual(geometryBounds(geometry), [-9.05, 42.05, -8.4, 42.4]);
});

test('closes an open polygon ring', () => {
  const geometry = validateAreaGeometry({
    type: 'Polygon',
    coordinates: [[[-9, 42], [-8, 42], [-8, 43], [-9, 43]]],
  });
  assert.deepEqual(geometry.coordinates[0]![0], geometry.coordinates[0]!.at(-1));
});

test('uses a crossing bbox for an antimeridian polygon', () => {
  const geometry = validateAreaGeometry({
    type: 'Polygon',
    coordinates: [[[179, 10], [-179, 10], [-179, 12], [179, 12], [179, 10]]],
  });
  assert.deepEqual(geometryBounds(geometry), [179, 10, -179, 12]);
  assert.equal(boundsIntersect(geometryBounds(geometry), [178, 9, 180, 13]), true);
});

test('rejects degenerate polygons', () => {
  assert.throws(
    () => validateAreaGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [2, 2], [0, 0]]] }),
    /no area/,
  );
});

