import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AutopilotDecisionLogService,
  DecisionEntry,
  DecisionSeverity,
} from '../../autopilot-decision-log.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

type Filter = 'all' | DecisionSeverity;

/**
 * Enterprise autopilot "Decision Log": a live, operator-facing timeline of the
 * decisions the pilot takes (engage/refuse, faults, no-go, wind hazards, route
 * advance, XTE corrections) and — critically — when TRACK is engaged without an
 * active course. Copy comes from i18n; numeric detail is rendered verbatim.
 */
@Component({
  selector: 'app-autopilot-decision-log',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="dl" #dlEl open>
      <summary class="dl__toggle" (click)="toggle(dlEl)">
        <span class="dl__icon">🧭</span>
        <span class="dl__titles">
          <span class="dl__title">{{ 'autopilot.log.title' | translate }}</span>
          <span class="dl__subtitle">{{ 'autopilot.log.subtitle' | translate }}</span>
        </span>
        <span class="dl__count" *ngIf="(log.entries$ | async)?.length as n">{{ n }}</span>
        <span class="dl__chev">{{ open() ? '▾' : '▸' }}</span>
      </summary>

      <div class="dl__body">
        <div class="dl__toolbar">
          <div class="dl__filters" role="tablist">
            <button
              class="dl__filter"
              *ngFor="let f of filters"
              [class.dl__filter--active]="filter() === f"
              (click)="filter.set(f)"
            >
              {{
                f === 'all'
                  ? ('autopilot.log.filter_all' | translate)
                  : ('autopilot.log.severity.' + f | translate)
              }}
            </button>
          </div>
          <button class="dl__clear" (click)="log.clear()">
            {{ 'autopilot.log.clear' | translate }}
          </button>
        </div>

        <ng-container *ngIf="log.entries$ | async as entries">
          <ul class="dl__list" *ngIf="visible(entries).length; else empty">
            <li class="dl__row" *ngFor="let e of visible(entries)" [attr.data-sev]="e.severity">
              <span class="dl__time">{{ e.ts | date: 'HH:mm:ss' }}</span>
              <span class="dl__sev">{{ 'autopilot.log.severity.' + e.severity | translate }}</span>
              <div class="dl__content">
                <span class="dl__msg">{{ 'autopilot.log.msg.' + e.code | translate }}</span>
                <span class="dl__reason" *ngIf="e.reasonText">{{ e.reasonText }}</span>
                <span class="dl__details" *ngIf="e.detail?.length">
                  <span class="dl__chip" *ngFor="let d of e.detail">
                    <b>{{ d.label }}</b> {{ d.value }}
                  </span>
                </span>
              </div>
            </li>
          </ul>
          <ng-template #empty>
            <p class="dl__empty">{{ 'autopilot.log.empty' | translate }}</p>
          </ng-template>
        </ng-container>
      </div>
    </details>
  `,
  styles: [
    `
      .dl {
        border: 1px solid var(--gb-border-panel);
        border-radius: var(--radius-lg);
        background: var(--gb-bg-panel);
        overflow: hidden;
      }
      .dl[open] {
        border-color: var(--gb-border-active);
      }
      .dl__toggle {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        cursor: pointer;
        user-select: none;
        list-style: none;
        touch-action: manipulation;
        min-height: 44px;
      }
      .dl__toggle::-webkit-details-marker {
        display: none;
      }
      .dl__icon {
        font-size: 1rem;
        flex-shrink: 0;
      }
      .dl__titles {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .dl__title {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--gb-text-value);
      }
      .dl__subtitle {
        font-size: 0.62rem;
        color: var(--gb-text-muted);
        letter-spacing: 0.03em;
      }
      .dl__count {
        margin-left: auto;
        min-width: 1.4rem;
        text-align: center;
        padding: 1px var(--space-2);
        border-radius: var(--radius-full);
        background: var(--gb-bg-glass);
        border: 1px solid var(--gb-border-panel);
        font-family: var(--font-mono, monospace);
        font-size: 0.62rem;
        font-weight: 700;
        color: var(--gb-text-value);
      }
      .dl__chev {
        color: var(--gb-text-muted);
        font-size: 0.65rem;
      }
      .dl__body {
        border-top: 1px solid var(--gb-border-panel);
        background: var(--gb-bg-bezel);
      }
      .dl__toolbar {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
        padding: var(--space-2) var(--space-3);
        border-bottom: 1px solid var(--gb-border-panel);
      }
      .dl__filters {
        display: flex;
        gap: var(--space-1);
        flex-wrap: wrap;
      }
      .dl__filter {
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-full);
        background: var(--gb-bg-panel);
        border: 1px solid var(--gb-border-panel);
        color: var(--gb-text-muted);
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        min-height: 30px;
        touch-action: manipulation;
      }
      .dl__filter--active {
        background: var(--gb-tick-reference);
        border-color: var(--gb-tick-reference);
        color: var(--gb-bg-canvas);
      }
      .dl__clear {
        margin-left: auto;
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        background: var(--gb-bg-glass);
        border: 1px solid var(--gb-border-panel);
        color: var(--gb-text-value);
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        min-height: 30px;
        touch-action: manipulation;
      }
      .dl__list {
        list-style: none;
        margin: 0;
        padding: var(--space-2);
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        max-height: 360px;
        overflow-y: auto;
      }
      .dl__row {
        display: grid;
        grid-template-columns: auto auto 1fr;
        align-items: start;
        gap: var(--space-2);
        padding: var(--space-2);
        border-radius: var(--radius-sm);
        background: var(--gb-bg-panel);
        border-left: 3px solid var(--gb-border-panel);
      }
      .dl__row[data-sev='action'] {
        border-left-color: var(--gb-data-good);
      }
      .dl__row[data-sev='warn'] {
        border-left-color: var(--gb-data-warn);
      }
      .dl__row[data-sev='critical'] {
        border-left-color: var(--gb-data-stale);
        background: var(--gb-alarm-emergency-bg);
      }
      .dl__time {
        font-family: var(--font-mono, monospace);
        font-variant-numeric: tabular-nums;
        font-size: 0.66rem;
        color: var(--gb-text-muted);
        white-space: nowrap;
        padding-top: 1px;
      }
      .dl__sev {
        font-size: 0.55rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: var(--gb-text-muted);
        white-space: nowrap;
        padding-top: 2px;
      }
      .dl__row[data-sev='action'] .dl__sev {
        color: var(--gb-data-good);
      }
      .dl__row[data-sev='warn'] .dl__sev {
        color: var(--gb-data-warn);
      }
      .dl__row[data-sev='critical'] .dl__sev {
        color: var(--gb-data-stale);
      }
      .dl__content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .dl__msg {
        font-size: 0.72rem;
        color: var(--gb-text-value);
        line-height: 1.4;
      }
      .dl__reason {
        font-family: var(--font-mono, monospace);
        font-size: 0.66rem;
        color: var(--gb-text-muted);
        text-transform: uppercase;
        word-break: break-word;
      }
      .dl__details {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
        margin-top: 2px;
      }
      .dl__chip {
        padding: 1px var(--space-2);
        border-radius: var(--radius-sm);
        background: var(--gb-bg-glass);
        border: 1px solid var(--gb-border-panel);
        font-family: var(--font-mono, monospace);
        font-size: 0.62rem;
        color: var(--gb-text-value);
      }
      .dl__chip b {
        color: var(--gb-text-muted);
        font-weight: 700;
        margin-right: 2px;
      }
      .dl__empty {
        margin: 0;
        padding: var(--space-4) var(--space-3);
        text-align: center;
        font-size: 0.7rem;
        color: var(--gb-text-muted);
      }
    `,
  ],
})
export class AutopilotDecisionLogComponent {
  readonly log = inject(AutopilotDecisionLogService);

  readonly open = signal(true);
  readonly filter = signal<Filter>('all');
  readonly filters: Filter[] = ['all', 'action', 'warn', 'critical', 'info'];

  toggle(el: HTMLDetailsElement): void {
    queueMicrotask(() => this.open.set(el.open));
  }

  visible(entries: DecisionEntry[]): DecisionEntry[] {
    const f = this.filter();
    return f === 'all' ? entries : entries.filter((e) => e.severity === f);
  }
}
