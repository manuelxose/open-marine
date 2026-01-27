import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, pairwise, startWith, timer } from 'rxjs';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';

interface SystemViewModel {
  connected: boolean;
  updateRate: number;
  staleCount: number;
  totalCount: number;
  lastMessageLabel: string;
  lastMessageAge: string;
}

@Component({
  selector: 'app-system-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-card">
      <div class="panel-header">
        <div class="panel-title">System</div>
        <div class="status-pill" [class.connected]="connected()">
          {{ connected() ? 'CONNECTED' : 'RECONNECTING' }}
        </div>
      </div>

      <div class="panel-body">
        <div class="metric-grid">
          <div class="metric">
            <span class="metric-label">Update Rate</span>
            <div class="metric-value">
              {{ updateRate() }}
              <span class="metric-unit">/s</span>
            </div>
          </div>

          <div class="metric">
            <span class="metric-label">Stale Paths</span>
            <div class="metric-value">
              {{ staleCount() }}
              <span class="metric-unit">/ {{ totalCount() }}</span>
            </div>
          </div>

          <div class="metric">
            <span class="metric-label">Last Msg</span>
            <div class="metric-value">{{ lastMessageLabel() }}</div>
            <div class="metric-sub">{{ lastMessageAge() }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .panel-card {
      height: 100%;
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: var(--shadow);
    }

    :host-context(.compact) .panel-card {
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      gap: 0.5rem;
      box-shadow: none;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .status-pill {
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--surface-2);
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--warn);
    }

    .status-pill.connected {
      color: var(--ok);
    }

    .panel-body {
      flex: 1;
      display: flex;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
      width: 100%;
    }

    .metric {
      background: var(--surface-2);
      border-radius: 12px;
      padding: 0.6rem 0.7rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .metric-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .metric-value {
      font-size: 1.1rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-1);
    }

    .metric-unit {
      font-size: 0.75rem;
      color: var(--muted);
      margin-left: 4px;
    }

    .metric-sub {
      font-size: 0.7rem;
      color: var(--muted);
    }
  `],
})
export class SystemPanelComponent {
  private store = inject(DatapointStoreService);
  private signalK = inject(SignalKClientService);

  private refresh$ = timer(0, 1000);

  private updateRate$ = this.refresh$.pipe(
    map(() => this.store.updatesProcessedSnapshot),
    startWith(this.store.updatesProcessedSnapshot),
    pairwise(),
    map(([prev, current]) => Math.max(0, current - prev))
  );

  private staleCount$ = combineLatest([this.store.state$, this.refresh$]).pipe(
    map(([state]) => {
      const now = Date.now();
      let stale = 0;
      state.forEach((point) => {
        if (now - point.timestamp > 5000) {
          stale += 1;
        }
      });
      return { stale, total: state.size };
    })
  );

  private lastMessage$ = combineLatest([this.store.lastUpdate$, this.refresh$]).pipe(
    map(([last]) => {
      if (!last) {
        return { label: '--', age: '--' };
      }
      const ageSeconds = Math.max(0, Math.floor((Date.now() - last) / 1000));
      return {
        label: this.formatTime(last),
        age: `${ageSeconds}s ago`,
      };
    })
  );

  private vm = toSignal(
    combineLatest([
      this.signalK.connected$,
      this.updateRate$,
      this.staleCount$,
      this.lastMessage$,
    ]).pipe(
      map(([connected, updateRate, staleInfo, last]) => ({
        connected,
        updateRate,
        staleCount: staleInfo.stale,
        totalCount: staleInfo.total,
        lastMessageLabel: last.label,
        lastMessageAge: last.age,
      }))
    ),
    {
      initialValue: {
        connected: false,
        updateRate: 0,
        staleCount: 0,
        totalCount: 0,
        lastMessageLabel: '--',
        lastMessageAge: '--',
      } as SystemViewModel,
    }
  );

  connected = computed(() => this.vm().connected);
  updateRate = computed(() => this.vm().updateRate);
  staleCount = computed(() => this.vm().staleCount);
  totalCount = computed(() => this.vm().totalCount);
  lastMessageLabel = computed(() => this.vm().lastMessageLabel);
  lastMessageAge = computed(() => this.vm().lastMessageAge);

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
