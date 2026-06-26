/**
 * Software watchdog. The main loop must call {@link kick} every tick. An
 * independent timer checks liveness; if no kick arrives within the timeout the
 * `onTimeout` callback fires (the engine cuts the motor and enters FAULT). This
 * is the software half of the failsafe — the hardware half lives in the
 * microcontroller, which cuts power if it stops receiving the serial heartbeat.
 */
export class Watchdog {
  private lastKickMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tripped = false;

  constructor(
    private readonly timeoutMs: number,
    private readonly onTimeout: () => void,
    private readonly nowFn: () => number = () => Date.now(),
  ) {
    this.lastKickMs = this.nowFn();
  }

  start(): void {
    if (this.timer) {
      return;
    }
    const checkEvery = Math.max(50, Math.floor(this.timeoutMs / 2));
    this.timer = setInterval(() => this.check(), checkEvery);
    if (typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  kick(): void {
    this.lastKickMs = this.nowFn();
    this.tripped = false;
  }

  /** Exposed for tests / manual checks; normally driven by the internal timer. */
  check(): void {
    if (this.tripped) {
      return;
    }
    if (this.nowFn() - this.lastKickMs > this.timeoutMs) {
      this.tripped = true;
      this.onTimeout();
    }
  }

  isTripped(): boolean {
    return this.tripped;
  }
}
