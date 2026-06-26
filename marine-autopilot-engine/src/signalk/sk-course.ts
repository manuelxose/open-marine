import type { Logger } from "../app/logger.js";

/**
 * Edge-triggered arrival latch for live route sequencing. Returns `true` exactly
 * once when the boat first comes within the arrival radius of the active
 * waypoint, then re-arms only after it has clearly moved away (onto the next
 * leg), so a single arrival never fires repeated advance requests.
 */
export class RouteAdvanceLatch {
  private latched = false;

  shouldAdvance(distanceMeters: number | undefined, radiusMeters: number): boolean {
    if (distanceMeters === undefined) {
      return false;
    }
    if (!this.latched && distanceMeters <= radiusMeters) {
      this.latched = true;
      return true;
    }
    if (this.latched && distanceMeters > radiusMeters * 1.5) {
      this.latched = false;
    }
    return false;
  }

  reset(): void {
    this.latched = false;
  }
}

/**
 * Minimal client for the Signal K v2 Course API. Used to advance the active
 * route to the next point on arrival (live route sequencing); the Course API
 * does not auto-advance, so the autopilot requests it.
 */
export class SignalKCourseClient {
  private readonly baseUrl: string;

  constructor(
    httpBaseUrl: string,
    private readonly log: Logger,
  ) {
    this.baseUrl = httpBaseUrl.endsWith("/") ? httpBaseUrl.slice(0, -1) : httpBaseUrl;
  }

  /** Advance the active route by one point. Returns false if there is no next point. */
  async advanceToNextPoint(): Promise<boolean> {
    const url = `${this.baseUrl}/signalk/v2/api/vessels/self/navigation/course/activeRoute/nextPoint`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: 1 }),
      });
      if (response.ok) {
        this.log.info("advanced active route to next point");
        return true;
      }
      // 4xx typically means the route has no further points (arrived).
      this.log.info(`no next point to advance to (${response.status})`);
      return false;
    } catch (error) {
      this.log.warn(
        "course advance failed",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }
}
