import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type DetectionPhase = 'probing' | 'found' | 'fallback';

export interface DetectionProgress {
  phase: DetectionPhase;
  host: string;
}

/** localStorage key where the last auto-detected Signal K host is persisted. */
export const AUTO_DETECTED_HOST_KEY = 'omi.autoDetectedHost';

/** localStorage key for the user-selected Signal K host. */
const SIGNALK_HOST_OVERRIDE_KEY = 'omi.signalKHost';

/** Signal K HTTP API base path used for reachability probing. */
const SIGNALK_PROBE_PATH = '/signalk/v1/api/';

/** Signal K server port. */
const SIGNALK_PORT = 3000;

/** Per-host probe timeout in milliseconds. */
const PROBE_TIMEOUT_MS = 2000;

/**
 * Known Raspberry Pi hosts to probe, ordered by priority.
 *   - 192.168.1.43  → Wi-Fi / LAN
 *   - 192.168.137.2 → Direct Ethernet cable
 * See docs/RASPBERRY_CONNECTION.md
 */
const CANDIDATE_HOSTS: readonly string[] = ['192.168.1.43', '192.168.137.2'];

/**
 * Probes known Raspberry Pi hosts in parallel to find a reachable Signal K
 * server. Stores the result in localStorage for future boots. Falls back to
 * `localhost` when no remote host responds.
 */
@Injectable({ providedIn: 'root' })
export class SignalKHostDetectorService {
  private readonly _progress = new BehaviorSubject<DetectionProgress>({
    phase: 'probing',
    host: CANDIDATE_HOSTS[0] ?? 'localhost',
  });

  /** Emits progress events during detection so the splash screen can react. */
  readonly progress$: Observable<DetectionProgress> = this._progress.asObservable();

  /**
   * Run host detection.
   *
   * Probes every candidate in parallel. The first host that responds to an HTTP
   * GET on its Signal K API is selected. If none respond within the timeout the
   * method falls back to `localhost`.
   *
   * The result is persisted under {@link AUTO_DETECTED_HOST_KEY} so the
   * `app-environment.token` can pick it up on the next boot.
   *
   * @returns The detected Signal K host (IP or `'localhost'`).
   */
  async detect(): Promise<string> {
    const override = this._resolveOverride();
    if (override) {
      return this._persist(override);
    }

    const results = await Promise.allSettled(
      this._candidateHosts().map((host) => this._tryProbeHost(host)),
    );

    const found = results.find(
      (r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled',
    );

    if (found) {
      return this._persist(found.value);
    }

    return this._persist('localhost');
  }

  // ── private helpers ──────────────────────────────────────────────────────

  private async _tryProbeHost(host: string): Promise<string> {
    this._progress.next({ phase: 'probing', host });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
      const url = `http://${host}:${SIGNALK_PORT}${SIGNALK_PROBE_PATH}`;
      await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      // Any HTTP response (even 4xx/5xx) means the host is reachable.
      return host;
    } catch {
      throw new Error(`Host ${host} not reachable`);
    } finally {
      clearTimeout(timer);
    }
  }

  private _candidateHosts(): string[] {
    const candidates = new Set<string>();
    if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost') {
      candidates.add(window.location.hostname);
    }
    for (const host of CANDIDATE_HOSTS) candidates.add(host);
    return Array.from(candidates);
  }

  private _resolveOverride(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const queryOverride = params.get('signalKHost') ?? params.get('signalkHost');
      if (queryOverride) {
        const normalized = queryOverride.trim();
        if (normalized === 'auto') {
          localStorage.removeItem(SIGNALK_HOST_OVERRIDE_KEY);
          return null;
        }
        localStorage.setItem(SIGNALK_HOST_OVERRIDE_KEY, normalized);
        return normalized;
      }
      return localStorage.getItem(SIGNALK_HOST_OVERRIDE_KEY);
    } catch {
      return null;
    }
  }

  private _persist(host: string): string {
    this._progress.next({
      phase: host === 'localhost' ? 'fallback' : 'found',
      host,
    });

    try {
      localStorage.setItem(AUTO_DETECTED_HOST_KEY, host);
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded).
      // The detection result is still valid for this session.
    }

    return host;
  }
}
