import type { Logger } from "../app/logger.js";

export type AlarmKind = "off-course" | "fault" | "tack" | "gybe" | "gust" | "no-go";

/**
 * Buzzer / UI alarm abstraction. Default implementation logs; a GPIO backend
 * would drive a piezo buzzer. Alarms are also surfaced to the UI as Signal K
 * notifications by the publisher.
 */
export class Alarm {
  private active = new Set<AlarmKind>();

  constructor(private readonly log: Logger) {}

  raise(kind: AlarmKind): void {
    if (!this.active.has(kind)) {
      this.active.add(kind);
      this.log.warn(`alarm ON: ${kind}`);
    }
  }

  clear(kind: AlarmKind): void {
    if (this.active.delete(kind)) {
      this.log.info(`alarm OFF: ${kind}`);
    }
  }

  isActive(kind: AlarmKind): boolean {
    return this.active.has(kind);
  }
}
