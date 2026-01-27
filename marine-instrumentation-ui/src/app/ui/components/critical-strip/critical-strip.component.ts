import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, combineLatest, startWith, timer } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import { formatSpeed, formatAngleDegrees, formatDepth, formatVoltage } from '../../../core/formatting/formatters';
import { PreferencesService } from '../../../services/preferences.service';

interface CriticalValue {
  label: string;
  value: string;
  unit: string;
  quality: 'good' | 'warn' | 'stale' | 'bad';
  ageSeconds: number | null;
}

@Component({
  selector: 'app-critical-strip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="strip">
      @for (item of values(); track item.label) {
        <div class="pill" [class]="'quality-' + item.quality">
          <span class="pill-label">{{ item.label }}</span>
          <div class="pill-value-row">
            <span class="pill-value">{{ item.value }}</span>
            <span class="pill-unit">{{ item.unit }}</span>
          </div>
          <div class="pill-footer">
            <span class="quality-dot"></span>
            <span class="pill-age" *ngIf="item.ageSeconds !== null">{{ item.ageSeconds | number:'1.0-0' }}s</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: stretch;
    }

    .pill {
      flex: 1 1 140px;
      min-width: 120px;
      max-width: 170px;
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.5rem 0.7rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-shadow: var(--shadow);
    }

    :host-context(.compact) .pill {
      padding: 0.35rem 0.5rem;
      min-width: 100px;
      border-radius: 10px;
      box-shadow: none;
    }

    .pill-label {
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
    }

    .pill-value-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .pill-value {
      font-size: 1.2rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
      line-height: 1.1;
    }

    :host-context(.compact) .pill-value {
      font-size: 1rem;
    }

    .pill-unit {
      font-size: 0.7rem;
      color: var(--muted);
      font-weight: 700;
    }

    .pill-footer {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }

    .quality-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--muted);
    }

    .quality-good .quality-dot {
      background: var(--ok);
      box-shadow: 0 0 4px var(--ok);
    }

    .quality-warn .quality-dot,
    .quality-stale .quality-dot {
      background: var(--warn);
    }

    .quality-bad .quality-dot {
      background: var(--danger);
    }

    .pill-age {
      font-size: 0.6rem;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }

    .quality-stale .pill-age {
      color: var(--warn);
    }

    .quality-bad .pill-value {
      color: var(--muted);
    }

    /* Responsive: smaller on mobile */
    @media (max-width: 600px) {
      .pill {
        min-width: 70px;
        max-width: 120px;
      }

      .pill-value {
        font-size: 1rem;
      }
    }
  `],
})
export class CriticalStripComponent {
  private store = inject(DatapointStoreService);
  private prefs = inject(PreferencesService);

  private sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround);
  private hdg$ = this.store.observe<number>(PATHS.navigation.headingTrue);
  private depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer);
  private aws$ = this.store.observe<number>(PATHS.environment.wind.speedApparent);
  private awa$ = this.store.observe<number>(PATHS.environment.wind.angleApparent);
  private voltage$ = this.store.observe<number>(PATHS.electrical.batteries.house.voltage);

  private tick$ = timer(0, 1000);

  private combined$ = combineLatest([
    this.sog$.pipe(startWith(undefined)),
    this.hdg$.pipe(startWith(undefined)),
    this.depth$.pipe(startWith(undefined)),
    this.aws$.pipe(startWith(undefined)),
    this.awa$.pipe(startWith(undefined)),
    this.voltage$.pipe(startWith(undefined)),
    this.prefs.preferences$,
    this.tick$,
  ]).pipe(
    map(([sog, hdg, depth, aws, awa, voltage, prefs, _tick]) => {
      const now = Date.now();
      const STALE_THRESHOLD = 5000; // 5 seconds

      const makeValue = (
        label: string,
        point: { value?: number; timestamp?: number } | undefined,
        formatter: (v: number | null | undefined) => { value: string; unit: string }
      ): CriticalValue => {
        const hasData = point?.value !== undefined && point?.value !== null;
        const age = hasData ? (now - (point.timestamp ?? now)) / 1000 : null;
        const isStale = age !== null && age > STALE_THRESHOLD / 1000;
        const formatted = formatter(hasData ? point.value : undefined);

        return {
          label,
          value: formatted.value,
          unit: formatted.unit,
          quality: !hasData ? 'bad' : isStale ? 'stale' : 'good',
          ageSeconds: age !== null ? Math.min(999, Math.round(age)) : null,
        };
      };

      return [
        makeValue('SOG', sog, (v) => formatSpeed(v, prefs.speedUnit)),
        makeValue('HDG', hdg, formatAngleDegrees),
        makeValue('Depth', depth, (v) => formatDepth(v, prefs.depthUnit)),
        makeValue('AWS', aws, (v) => formatSpeed(v, prefs.speedUnit)),
        makeValue('AWA', awa, formatAngleDegrees),
        makeValue('BAT', voltage, formatVoltage),
      ];
    })
  );

  values = toSignal(this.combined$, { initialValue: [] });
}
