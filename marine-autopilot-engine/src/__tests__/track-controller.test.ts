import { test } from "node:test";
import assert from "node:assert/strict";
import { TrackController, applySailingLimit } from "../control/track-controller.js";
import { SimWorld } from "../sim/sim-world.js";
import { SimMotor } from "../actuators/backends/sim-backend.js";
import { Logger } from "../app/logger.js";

const pid = { kp: 1.2, ki: 0.05, kd: 8, deadband: 0.5, integralLimit: 15, outputMin: -35, outputMax: 35 };
const silent = new Logger("test", "error");

test("demandedHeading corrects toward the track for a cross-track error", () => {
  const tc = new TrackController(pid);
  // Boat to starboard of track (XTE > 0) → demanded heading turns to port of the bearing.
  const onTrack = tc.demandedHeading({ xteMeters: 0, bearingToWaypointDeg: 90, headingDeg: 90 });
  const offStbd = tc.demandedHeading({ xteMeters: 20, bearingToWaypointDeg: 90, headingDeg: 90 });
  assert.equal(onTrack, 90);
  assert.ok(offStbd < 90, `expected correction to port, got ${offStbd}`);
});

test("XTE heading correction is clamped", () => {
  const tc = new TrackController(pid);
  const huge = tc.demandedHeading({ xteMeters: 100000, bearingToWaypointDeg: 90, headingDeg: 90 });
  // Clamped to bearing - 30°.
  assert.equal(huge, 60);
});

test("sailing limit passes a beam/broad reach through unchanged", () => {
  // AWA at the demanded heading is well outside the no-go zone → not limited.
  const r = applySailingLimit(120, 100, 80, 40); // awaAt(120) = 80 + 100 - 120 = 60° ≥ 40
  assert.equal(r.limited, false);
  assert.equal(r.headingDeg, 120);
});

test("sailing limit clamps a heading inside the no-go zone", () => {
  // Demanded heading would put apparent wind at 10° (inside 40° no-go).
  // awaAt(h) = awa + heading - h = 20 + 0 - 10 = 10°.
  const r = applySailingLimit(10, 0, 20, 40);
  assert.equal(r.limited, true);
  // Clamped so awaAt(steered) == 40 on the same (positive) side → steered = 20 + 0 - 40 = -20 → 340.
  assert.equal(Math.round(r.headingDeg), 340);
});

test("bench route auto-advances through waypoints on arrival", async () => {
  const world = new SimWorld({ startLat: 43, startLon: -3, cruiseSpeedKt: 6, trueWindDirDeg: 200 });
  // Two short legs: north then east.
  world.activateRouteByLegs([
    { bearingDeg: 0, distanceNm: 0.2 },
    { bearingDeg: 90, distanceNm: 0.2 },
  ]);
  const motor = new SimMotor(world, silent);
  await motor.init();
  await motor.enable();

  assert.equal(world.getRouteLeg(), 1);
  assert.equal(world.getRouteLength(), 2);

  const tc = new TrackController(pid);
  const dt = 0.2;
  let reachedLeg2 = false;
  for (let i = 0; i < 6000; i += 1) {
    const xte = world.getXteMeters() ?? 0;
    const brg = world.getBearingToWaypointDeg();
    if (brg === undefined) {
      break; // route complete
    }
    const heading = world.getState().headingDeg;
    const rudderDeg = tc.computeRudder({ xteMeters: xte, bearingToWaypointDeg: brg, headingDeg: heading }, dt);
    motor.command({ rudderDeg, drive: rudderDeg / 35 });
    world.step(dt);
    if (world.getRouteLeg() === 2) {
      reachedLeg2 = true;
    }
  }

  assert.ok(reachedLeg2, "expected the boat to advance to leg 2");
  assert.equal(world.isRouteComplete(), true);
});

test("TRACK closed loop converges onto the track (XTE → 0) on the bench", async () => {
  const world = new SimWorld({ startLat: 43, startLon: -3, cruiseSpeedKt: 5, trueWindDirDeg: 200 });
  // Waypoint due north, ~0.5 nm away; start the boat heading north but offset to starboard.
  world.activateWaypointByBearing(0, 0.5);
  const motor = new SimMotor(world, silent);
  await motor.init();
  await motor.enable();

  const tc = new TrackController(pid);
  const dt = 0.1;
  // Nudge the boat off-track to starboard first by steering east briefly.
  for (let i = 0; i < 200; i += 1) {
    motor.command({ rudderDeg: 20, drive: 20 / 35 });
    world.step(dt);
  }
  const xteStart = Math.abs(world.getXteMeters() ?? 0);

  for (let i = 0; i < 3000; i += 1) {
    const xte = world.getXteMeters() ?? 0;
    const brg = world.getBearingToWaypointDeg() ?? 0;
    const heading = world.getState().headingDeg;
    const rudderDeg = tc.computeRudder({ xteMeters: xte, bearingToWaypointDeg: brg, headingDeg: heading }, dt);
    motor.command({ rudderDeg, drive: rudderDeg / 35 });
    world.step(dt);
  }

  const xteEnd = Math.abs(world.getXteMeters() ?? 0);
  assert.ok(xteStart > 5, `expected a meaningful initial offset, got ${xteStart.toFixed(1)} m`);
  assert.ok(xteEnd < xteStart * 0.5, `expected XTE to halve (start ${xteStart.toFixed(1)} → end ${xteEnd.toFixed(1)})`);
});
