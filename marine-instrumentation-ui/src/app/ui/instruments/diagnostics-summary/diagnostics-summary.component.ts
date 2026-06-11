import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { SignalKClientService } from '../../../data-access/signalk/signalk-client.service';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import type { DataQuality } from '../../../shared/services/data-quality.service';

@Component({
  selector: 'app-diagnostics-summary',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  template: `
    <omi-gb-bezel class="diag-card" label="SYSTEM" [quality]="quality">
      <div class="diag-content">
        <div class="diag-row">
          <span class="gb-instrument-label">Status</span>
          <span class="status-value gb-display-value gb-display-value--sm" [class.online]="connected()" [class.offline]="!connected()">
            {{ connected() ? 'ONLINE' : 'OFFLINE' }}
          </span>
        </div>

        <div class="diag-row">
          <span class="gb-instrument-label">Updates</span>
          <span class="gb-display-value gb-display-value--sm">{{ updates() | number }}</span>
        </div>

        <div class="diag-row">
          <span class="gb-instrument-label">Last Msg</span>
          <span class="gb-display-unit">Now</span>
        </div>
      </div>
    </omi-gb-bezel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .diag-card {
        display: block;
        height: 100%;
      }

      .diag-content {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        height: 100%;
        justify-content: center;
      }

      .diag-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid color-mix(in srgb, var(--gb-border-panel) 40%, transparent);
        padding-bottom: 0.2rem;
      }

      .diag-row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .status-value.online {
        color: var(--gb-data-good);
      }

      .status-value.offline {
        color: var(--gb-data-stale);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticsSummaryComponent {
  private readonly sk = inject(SignalKClientService);
  private readonly store = inject(DatapointStoreService);

  readonly connected = toSignal(this.sk.connected$, { initialValue: false });
  readonly updates = toSignal(this.store.updatesProcessed$, { initialValue: 0 });

  get quality(): DataQuality {
    return this.connected() ? 'good' : 'stale';
  }
}
