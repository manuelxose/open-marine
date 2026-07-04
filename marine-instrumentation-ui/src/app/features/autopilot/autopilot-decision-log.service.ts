import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, pairwise, startWith } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { AutopilotFacadeService } from './autopilot.facade';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';

export type DecisionSeverity = 'info' | 'action' | 'warn' | 'critical';

/** A universal, locale-neutral data chip (nautical abbreviation + formatted value). */
export interface DecisionDetail {
  label: string;
  value: string;
}

/**
 * One operator-facing decision in the autopilot activity timeline. `code` maps to
 * an i18n message (`autopilot.log.msg.<code>`); `detail`/`reasonText` carry the
 * data that drove the decision (rendered verbatim, no translation).
 */
export interface DecisionEntry {
  id: number;
  ts: number;
  severity: DecisionSeverity;
  code: string;
  detail?: DecisionDetail[];
  reasonText?: string;
}

const MAX_ENTRIES = 200;
/** Course data older than this (local arrival) is considered absent for TRACK. */
const COURSE_STALE_MS = 3000;
/** Min gap and magnitude change between logged XTE corrections (anti-spam). */
const XTE_MIN_INTERVAL_MS = 5000;
const XTE_MIN_DELTA_M = 15;

/**
 * Derives an enterprise "decision log" for the autopilot **entirely in the UI**
 * from state already published to Signal K (autopilot state/fault/hazard/route +
 * navigation course), plus command results. No engine or contract changes.
 *
 * The critical case it surfaces: TRACK can engage on a valid heading alone, so if
 * no destination/course is flowing the engine silently holds heading instead of
 * tracking — here that becomes an explicit `TRACK_NO_COURSE` warning.
 */
@Injectable({ providedIn: 'root' })
export class AutopilotDecisionLogService implements OnDestroy {
  private readonly facade = inject(AutopilotFacadeService);
  private readonly store = inject(DatapointStoreService);
  private readonly zone = inject(NgZone);

  private readonly entriesSubject = new BehaviorSubject<DecisionEntry[]>([]);
  /** Newest-first list of decisions. */
  readonly entries$: Observable<DecisionEntry[]> = this.entriesSubject.asObservable();

  private readonly courseActiveSubject = new BehaviorSubject<boolean>(false);
  /** True while a fresh destination/course is flowing (drives the follow banner). */
  readonly courseActive$: Observable<boolean> = this.courseActiveSubject.asObservable();

  private nextId = 1;
  private readonly subs: Subscription[] = [];
  private staleTimer: ReturnType<typeof setInterval> | null = null;

  // Live course tracking (local arrival time avoids producer clock-skew).
  private currentState = 'standby';
  private lastCourseArrivalMs = 0;
  private lastBearingRad: number | undefined;
  private lastDistanceM: number | undefined;
  private noCourseFlagged = false;
  private destinationAnnounced = false;
  private lastXteEntryMs = 0;
  private lastXteEnteredM: number | undefined;
  private lastXteSide = '';

  private readonly paths = {
    bearing:
      PATHS.navigation?.courseGreatCircle?.nextPoint?.bearingTrue ??
      'navigation.courseGreatCircle.nextPoint.bearingTrue',
    xte:
      PATHS.navigation?.courseGreatCircle?.crossTrackError ??
      'navigation.courseGreatCircle.crossTrackError',
    distance:
      PATHS.navigation?.courseGreatCircle?.nextPoint?.distance ??
      'navigation.courseGreatCircle.nextPoint.distance',
  } as const;

  constructor() {
    this.wire();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
    }
  }

  clear(): void {
    this.entriesSubject.next([]);
  }

  /** Record an operator-initiated or externally-sourced decision entry. */
  record(severity: DecisionSeverity, code: string, reasonText?: string): void {
    this.push(severity, code, reasonText ? { reasonText } : {});
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  private wire(): void {
    // State transitions (low-frequency).
    this.subs.push(
      this.facade.state$.pipe(pairwise()).subscribe(([prev, next]) => {
        this.currentState = next;
        this.onStateChange(prev, next);
      }),
    );

    // Command refusals (already carries the engine's 409 reason).
    this.subs.push(
      this.facade.commandError$.subscribe((error) => {
        if (error) {
          this.push('warn', 'COMMAND_REJECTED', { reasonText: error });
        }
      }),
    );

    // Faults.
    this.subs.push(
      this.facade.fault$.pipe(pairwise()).subscribe(([prev, next]) => {
        if (prev === 'none' && next !== 'none') {
          this.push('critical', 'FAULT_RAISED', { reasonText: next });
        } else if (prev !== 'none' && next === 'none') {
          this.push('info', 'FAULT_CLEARED');
        }
      }),
    );

    // Wind hazards (onset only).
    this.subs.push(
      this.facade.windHazard$.pipe(pairwise()).subscribe(([prev, next]) => {
        if (next !== 'none' && next !== prev) {
          const severity: DecisionSeverity = next === 'accidental-gybe' ? 'critical' : 'warn';
          this.push(severity, 'WIND_HAZARD', { reasonText: next });
        }
      }),
    );

    // No-go sailing limit.
    this.subs.push(
      this.facade.noGo$.pipe(pairwise()).subscribe(([prev, next]) => {
        if (next && !prev) {
          this.push('warn', 'NO_GO_ON');
        } else if (!next && prev) {
          this.push('info', 'NO_GO_OFF');
        }
      }),
    );

    // Route leg advance + completion.
    this.subs.push(
      this.facade.routeActiveLeg$.pipe(startWith(0), pairwise()).subscribe(([prev, next]) => {
        if (next > prev && next > 0) {
          const detail: DecisionDetail[] = [{ label: 'LEG', value: this.legText(next) }];
          this.push('action', 'WAYPOINT_ADVANCE', { detail });
        }
      }),
    );
    this.subs.push(
      this.facade.routeComplete$.pipe(pairwise()).subscribe(([prev, next]) => {
        if (next && !prev) {
          this.push('action', 'ROUTE_COMPLETE');
        }
      }),
    );

    // High-frequency course tracking runs outside Angular; entry pushes re-enter
    // the zone so the OnPush timeline updates.
    this.zone.runOutsideAngular(() => {
      this.subs.push(
        this.store.observe<number>(this.paths.bearing).subscribe((dp) => {
          if (typeof dp?.value === 'number') {
            this.lastBearingRad = dp.value;
            this.markCourseFresh();
          }
        }),
      );
      this.subs.push(
        this.store.observe<number>(this.paths.distance).subscribe((dp) => {
          if (typeof dp?.value === 'number') {
            this.lastDistanceM = dp.value;
          }
        }),
      );
      this.subs.push(
        this.store.observe<number>(this.paths.xte).subscribe((dp) => {
          if (typeof dp?.value === 'number') {
            this.markCourseFresh();
            this.maybeLogXte(dp.value);
          }
        }),
      );

      this.staleTimer = setInterval(() => this.evaluateCourseFreshness(), 1000);
    });
  }

  // ── Derivations ───────────────────────────────────────────────────────────

  private onStateChange(prev: string, next: string): void {
    if (next === 'fault') {
      return; // FAULT_RAISED is emitted by the fault$ stream.
    }
    const engaged = (s: string) => s === 'auto' || s === 'wind' || s === 'route';

    if (next === 'route' && prev !== 'route') {
      this.noCourseFlagged = false;
      const detail = this.courseFresh() ? this.courseDetail() : undefined;
      this.push('action', 'ENGAGED_TRACK', detail ? { detail } : {});
      return;
    }
    if (next === 'auto' && !engaged(prev)) {
      this.push('action', 'ENGAGED_AUTO');
      return;
    }
    if (next === 'wind' && !engaged(prev)) {
      this.push('action', 'ENGAGED_WIND');
      return;
    }
    if (next === 'standby' && engaged(prev)) {
      this.push('info', 'DISENGAGED');
      return;
    }
    if (engaged(prev) && engaged(next) && prev !== next) {
      this.push('info', 'MODE_CHANGED', {
        reasonText: `${prev.toUpperCase()} → ${next.toUpperCase()}`,
      });
    }
  }

  private markCourseFresh(): void {
    this.lastCourseArrivalMs = Date.now();
    if (!this.courseActiveSubject.value) {
      this.zone.run(() => this.courseActiveSubject.next(true));
    }
    // A destination just became available while idle — note it once.
    if (this.currentState === 'standby' && !this.destinationAnnounced) {
      this.destinationAnnounced = true;
      this.push('info', 'DESTINATION_SET', { detail: this.courseDetail() });
    }
  }

  private evaluateCourseFreshness(): void {
    const fresh = this.courseFresh();
    if (this.courseActiveSubject.value !== fresh) {
      this.zone.run(() => this.courseActiveSubject.next(fresh));
    }

    if (this.currentState !== 'route') {
      // Re-arm the destination announcement once a course clears.
      if (!fresh) {
        this.destinationAnnounced = false;
      }
      return;
    }
    if (!fresh && !this.noCourseFlagged) {
      this.noCourseFlagged = true;
      this.push('critical', 'TRACK_NO_COURSE');
    } else if (fresh && this.noCourseFlagged) {
      this.noCourseFlagged = false;
      this.push('action', 'TRACK_FOLLOWING', { detail: this.courseDetail() });
    }
  }

  private maybeLogXte(xteM: number): void {
    if (this.currentState !== 'route' || !this.courseFresh()) {
      return;
    }
    const side = xteM > 0 ? 'S' : xteM < 0 ? 'P' : '';
    const now = Date.now();
    const sideFlipped = side !== '' && side !== this.lastXteSide;
    const movedEnough =
      this.lastXteEnteredM === undefined || Math.abs(xteM - this.lastXteEnteredM) >= XTE_MIN_DELTA_M;
    if ((sideFlipped || movedEnough) && now - this.lastXteEntryMs >= XTE_MIN_INTERVAL_MS) {
      this.lastXteEntryMs = now;
      this.lastXteEnteredM = xteM;
      this.lastXteSide = side;
      this.push('info', 'XTE_CORRECTION', {
        detail: [{ label: 'XTE', value: `${side}${Math.abs(Math.round(xteM))} m` }],
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private courseFresh(): boolean {
    return this.lastCourseArrivalMs > 0 && Date.now() - this.lastCourseArrivalMs <= COURSE_STALE_MS;
  }

  private courseDetail(): DecisionDetail[] {
    const detail: DecisionDetail[] = [];
    if (this.lastBearingRad !== undefined) {
      detail.push({ label: 'BRG', value: this.degText(this.lastBearingRad) });
    }
    if (this.lastDistanceM !== undefined) {
      detail.push({ label: 'DIST', value: this.distText(this.lastDistanceM) });
    }
    return detail;
  }

  private degText(rad: number): string {
    const deg = ((Math.round((rad * 180) / Math.PI) % 360) + 360) % 360;
    return `${deg.toString().padStart(3, '0')}°`;
  }

  private distText(meters: number): string {
    return meters >= 1852 ? `${(meters / 1852).toFixed(2)} NM` : `${Math.round(meters)} m`;
  }

  private legText(leg: number): string {
    const len = this.facadeSnapshotLength();
    return len > 0 ? `${leg}/${len}` : `${leg}`;
  }

  /** Best-effort route length for the leg chip (0 if unknown). */
  private facadeSnapshotLength(): number {
    const dp = this.store.get<number>(
      PATHS.steering?.autopilot?.route?.length ?? 'steering.autopilot.route.length',
    );
    return typeof dp?.value === 'number' ? dp.value : 0;
  }

  private push(
    severity: DecisionSeverity,
    code: string,
    opts: { detail?: DecisionDetail[]; reasonText?: string } = {},
  ): void {
    const entry: DecisionEntry = {
      id: this.nextId++,
      ts: Date.now(),
      severity,
      code,
      ...(opts.detail && opts.detail.length ? { detail: opts.detail } : {}),
      ...(opts.reasonText ? { reasonText: opts.reasonText } : {}),
    };
    // Re-enter Angular so async-pipe consumers refresh under OnPush.
    this.zone.run(() => {
      const next = [entry, ...this.entriesSubject.value].slice(0, MAX_ENTRIES);
      this.entriesSubject.next(next);
    });
  }
}
