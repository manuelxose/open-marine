import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_CLOCK_DRIFT_MS, normalizeTimestamp } from "./types.js";

describe("normalizeTimestamp", () => {
  const nowMs = Date.parse("2026-01-28T12:00:00.000Z");

  it("keeps timestamps within the drift window", () => {
    const inputMs = nowMs - 1_000;
    const result = normalizeTimestamp(new Date(inputMs), { nowMs });

    expect(result.timestamp).toBe(new Date(inputMs).toISOString());
    expect(result.driftMs).toBe(inputMs - nowMs);
    expect(result.wasClamped).toBe(false);
  });

  it("clamps timestamps that exceed the drift window", () => {
    const inputMs = nowMs + DEFAULT_MAX_CLOCK_DRIFT_MS + 1;
    const result = normalizeTimestamp(inputMs, { nowMs });

    expect(result.timestamp).toBe(new Date(nowMs).toISOString());
    expect(result.driftMs).toBe(inputMs - nowMs);
    expect(result.wasClamped).toBe(true);
  });

  it("clamps invalid timestamps to now", () => {
    const result = normalizeTimestamp("not-a-timestamp", { nowMs });

    expect(result.timestamp).toBe(new Date(nowMs).toISOString());
    expect(result.driftMs).toBe(0);
    expect(result.wasClamped).toBe(true);
  });
});
