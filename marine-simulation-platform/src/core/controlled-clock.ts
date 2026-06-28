export class ControlledClock {
  private simulatedTimeMs = 0;
  private lastRealTimeMs: number | null = null;
  private running = false;

  constructor(private speed = 1) {}

  start(): void {
    this.running = true;
    this.lastRealTimeMs = performance.now();
  }

  tick(): number {
    if (!this.running) return this.simulatedTimeMs;
    const now = performance.now();
    if (this.lastRealTimeMs === null) {
      this.lastRealTimeMs = now;
      return this.simulatedTimeMs;
    }
    this.simulatedTimeMs += (now - this.lastRealTimeMs) * this.speed;
    this.lastRealTimeMs = now;
    return this.simulatedTimeMs;
  }

  advance(deltaMs: number): number {
    this.simulatedTimeMs += deltaMs * this.speed;
    return this.simulatedTimeMs;
  }

  setSpeed(speed: number): void {
    if (this.running) this.tick();
    this.speed = speed;
  }

  getSimulatedTimeMs(): number {
    return this.simulatedTimeMs;
  }

  stop(): void {
    this.running = false;
    this.lastRealTimeMs = null;
  }
}

