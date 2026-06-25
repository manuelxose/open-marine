export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Minimal structured logger with a scope prefix and level threshold. */
export class Logger {
  constructor(
    private readonly scope: string,
    private readonly threshold: LogLevel = "info",
  ) {}

  child(scope: string): Logger {
    return new Logger(`${this.scope}:${scope}`, this.threshold);
  }

  debug(message: string, data?: unknown): void {
    this.emit("debug", message, data);
  }
  info(message: string, data?: unknown): void {
    this.emit("info", message, data);
  }
  warn(message: string, data?: unknown): void {
    this.emit("warn", message, data);
  }
  error(message: string, data?: unknown): void {
    this.emit("error", message, data);
  }

  private emit(level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.threshold]) {
      return;
    }
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.scope}]`;
    const line = `${prefix} ${message}`;
    const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    if (data === undefined) {
      sink(line);
    } else {
      sink(line, data);
    }
  }
}
