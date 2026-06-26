export class ControlledClock {
  private simTimeMs = 0;
  private realTimeMs = 0;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly rateHz: number,
    private speed = 1,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.realTimeMs = performance.now();
    const intervalMs = Math.max(1, Math.floor(1000 / this.rateHz));
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  tick(): number {
    if (!this.running) return this.simTimeMs;
    const now = performance.now();
    const dtReal = now - this.realTimeMs;
    this.realTimeMs = now;
    this.simTimeMs += dtReal * this.speed;
    return this.simTimeMs;
  }

  getSimulatedTimeMs(): number {
    return this.simTimeMs;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getSpeed(): number {
    return this.speed;
  }

  isRunning(): boolean {
    return this.running;
  }
}
