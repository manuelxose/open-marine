import { test } from "node:test";
import assert from "node:assert/strict";
import { SimCourseBridge, type CoursePositionSource } from "../sim/sim-course-bridge.js";
import { SimWorld } from "../sim/sim-world.js";
import { Logger } from "../app/logger.js";

const silent = new Logger("test", "error");

/** Minimal stub standing in for a live Signal K subscription. */
class FakeCourseSource implements CoursePositionSource {
  value: unknown;
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  get<T>(): T | undefined {
    return this.value as T | undefined;
  }
}

const makeWorld = (): SimWorld => new SimWorld({ startLat: 43.46, startLon: -3.8 });

test("applies a live destination to the bench world", () => {
  const source = new FakeCourseSource();
  const world = makeWorld();
  const bridge = new SimCourseBridge(source, world, silent);

  assert.equal(world.hasWaypoint(), false);
  source.value = { latitude: 43.47, longitude: -3.8 };
  bridge.tick();

  assert.equal(world.hasWaypoint(), true);
  assert.equal(world.getBearingToWaypointDeg(), 0);
});

test("ignores no-op re-publishes of the same destination", () => {
  const source = new FakeCourseSource();
  const world = makeWorld();
  const bridge = new SimCourseBridge(source, world, silent);

  source.value = { latitude: 43.47, longitude: -3.8 };
  bridge.tick();
  const origin = world.getRouteOrigin();

  // Re-publish the identical point (e.g. periodic SK snapshot) — must not reset
  // the track (which would zero XTE progress and restart the leg).
  source.value = { latitude: 43.47, longitude: -3.8 };
  bridge.tick();

  assert.deepEqual(world.getRouteOrigin(), origin);
});

test("adopts a new destination when the operator changes it", () => {
  const source = new FakeCourseSource();
  const world = makeWorld();
  const bridge = new SimCourseBridge(source, world, silent);

  source.value = { latitude: 43.47, longitude: -3.8 };
  bridge.tick();
  assert.equal(world.getBearingToWaypointDeg(), 0);

  source.value = { latitude: 43.46, longitude: -3.79 };
  bridge.tick();
  assert.equal(world.getBearingToWaypointDeg(), 90);
});

test("clears the bench route when the destination is removed", () => {
  const source = new FakeCourseSource();
  const world = makeWorld();
  const bridge = new SimCourseBridge(source, world, silent);

  source.value = { latitude: 43.47, longitude: -3.8 };
  bridge.tick();
  assert.equal(world.hasWaypoint(), true);

  source.value = undefined;
  bridge.tick();
  assert.equal(world.hasWaypoint(), false);
});

test("ignores malformed values", () => {
  const source = new FakeCourseSource();
  const world = makeWorld();
  const bridge = new SimCourseBridge(source, world, silent);

  source.value = { href: "/resources/waypoints/abc" };
  bridge.tick();

  assert.equal(world.hasWaypoint(), false);
});
