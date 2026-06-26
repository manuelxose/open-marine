import type { Logger } from "../app/logger.js";

/**
 * Motor power-cut relay abstraction. Independent of the driver enable so that
 * cutting power is a separate, harder action than de-asserting PWM/enable.
 * Default implementation just logs; real backends (GPIO/serial) override the
 * line drive. Defaults to OPEN (power cut) so the motor is never live at boot.
 */
export class Relay {
  private closed = false;

  constructor(private readonly log: Logger) {}

  /** Close = allow motor power. */
  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.log.info("motor power relay CLOSED");
    }
  }

  /** Open = cut motor power. */
  open(): void {
    if (this.closed) {
      this.closed = false;
      this.log.info("motor power relay OPEN (power cut)");
    }
  }

  isClosed(): boolean {
    return this.closed;
  }
}
