import { PATHS } from "@omi/marine-data-contract";
import type { Logger } from "../app/logger.js";
import { SignalKSubscriber } from "../signalk/sk-subscriber.js";
import type { SimWorld } from "./sim-world.js";

const POLL_INTERVAL_MS = 500;
/** Ignore no-op deltas (GPS jitter / re-publishes of the same destination). */
const POSITION_EPSILON_DEG = 1e-6;

interface LatLon {
  latitude: number;
  longitude: number;
}

const isLatLon = (value: unknown): value is LatLon =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as LatLon).latitude === "number" &&
  typeof (value as LatLon).longitude === "number";

/** The slice of {@link SignalKSubscriber} the bridge needs — narrowed for testability. */
export type CoursePositionSource = Pick<SignalKSubscriber, "start" | "stop" | "get">;

/**
 * Bridges a live Signal K Course API destination into the bench's {@link SimWorld},
 * so a waypoint set from the UI (chart "Navigate to waypoint") drives the simulated
 * boat the same way a boot-time `AP_SIM_ROUTE`/`AP_SIM_WP_*` waypoint would — without
 * requiring any env var change. Read-only: never writes to Signal K, the state
 * machine, or the motor.
 */
export class SimCourseBridge {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastApplied: LatLon | null = null;

  constructor(
    private readonly sub: CoursePositionSource,
    private readonly world: SimWorld,
    private readonly log: Logger,
  ) {}

  async start(): Promise<void> {
    await this.sub.start();
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
    if (typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.sub.stop();
  }

  /** Exposed for deterministic unit testing. */
  tick(): void {
    const raw = this.sub.get<unknown>(PATHS.navigation.courseGreatCircle.nextPoint.position);

    if (raw === undefined || raw === null) {
      if (this.lastApplied) {
        this.lastApplied = null;
        this.world.activateRoute([]);
        this.log.info("bench course cleared (destination removed)");
      }
      return;
    }

    if (!isLatLon(raw)) {
      return;
    }

    if (this.lastApplied && this.isSamePoint(this.lastApplied, raw)) {
      return;
    }

    this.lastApplied = raw;
    this.world.activateWaypoint(raw.latitude, raw.longitude);
    this.log.info(`bench course set from live destination: ${raw.latitude.toFixed(5)}, ${raw.longitude.toFixed(5)}`);
  }

  private isSamePoint(a: LatLon, b: LatLon): boolean {
    return (
      Math.abs(a.latitude - b.latitude) < POSITION_EPSILON_DEG &&
      Math.abs(a.longitude - b.longitude) < POSITION_EPSILON_DEG
    );
  }
}
