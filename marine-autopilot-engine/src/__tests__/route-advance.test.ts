import { test } from "node:test";
import assert from "node:assert/strict";
import { RouteAdvanceLatch } from "../signalk/sk-course.js";

test("fires once on arrival, then re-arms after moving away", () => {
  const latch = new RouteAdvanceLatch();
  const radius = 30;
  // Approaching: outside the radius → no advance.
  assert.equal(latch.shouldAdvance(100, radius), false);
  assert.equal(latch.shouldAdvance(40, radius), false);
  // Crosses inside → advance once.
  assert.equal(latch.shouldAdvance(20, radius), true);
  // Still inside / lingering → does not re-fire.
  assert.equal(latch.shouldAdvance(10, radius), false);
  assert.equal(latch.shouldAdvance(25, radius), false);
  // Moving onto the next leg (beyond 1.5× radius) re-arms; next arrival fires.
  assert.equal(latch.shouldAdvance(60, radius), false);
  assert.equal(latch.shouldAdvance(15, radius), true);
});

test("undefined distance never advances", () => {
  const latch = new RouteAdvanceLatch();
  assert.equal(latch.shouldAdvance(undefined, 30), false);
});

test("reset re-arms the latch", () => {
  const latch = new RouteAdvanceLatch();
  assert.equal(latch.shouldAdvance(10, 30), true);
  assert.equal(latch.shouldAdvance(10, 30), false);
  latch.reset();
  assert.equal(latch.shouldAdvance(10, 30), true);
});
