export class Backoff {
  private attempt = 0;

  constructor(
    private readonly baseMs: number,
    private readonly maxMs: number,
    private readonly jitterMs: number = 250,
  ) {}

  reset(): void {
    this.attempt = 0;
  }

  nextDelay(): number {
    const raw = Math.min(this.maxMs, this.baseMs * 2 ** this.attempt);
    this.attempt += 1;
    const jitter = Math.floor(Math.random() * this.jitterMs);
    return raw + jitter;
  }
}
