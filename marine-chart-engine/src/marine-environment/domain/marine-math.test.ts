import assert from 'node:assert/strict';
import test from 'node:test';
import {
  knotsToMetersPerSecond,
  metersPerSecondToKnots,
  meteorologicalFromToVector,
  vectorToBearing,
} from './marine-math.js';

test('marine unit conversions round-trip knots and metres per second', () => {
  assert.ok(Math.abs(metersPerSecondToKnots(knotsToMetersPerSecond(12.5)) - 12.5) < 1e-10);
});

test('meteorological FROM bearings convert to vector TO components', () => {
  const north = meteorologicalFromToVector(10, 0);
  assert.ok(Math.abs(north.u) < 1e-10);
  assert.ok(Math.abs(north.v + 10) < 1e-10);
  assert.ok(Math.abs(vectorToBearing(north.u, north.v) - 180) < 1e-10);

  const east = meteorologicalFromToVector(10, 90);
  assert.ok(Math.abs(east.u + 10) < 1e-10);
  assert.ok(Math.abs(east.v) < 1e-10);
  assert.ok(Math.abs(vectorToBearing(east.u, east.v) - 270) < 1e-10);
});

test('direction wrap-around does not create a south vector', () => {
  const left = meteorologicalFromToVector(10, 359);
  const right = meteorologicalFromToVector(10, 1);
  const bearing = vectorToBearing((left.u + right.u) / 2, (left.v + right.v) / 2);
  assert.ok(Math.abs(bearing - 180) < 1e-8);
});

