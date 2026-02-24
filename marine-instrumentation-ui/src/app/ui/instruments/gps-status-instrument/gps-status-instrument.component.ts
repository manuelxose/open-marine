import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { AppInstrumentCardComponent } from '../../../shared/components/app-instrument-card/app-instrument-card.component';

@Component({
  selector: 'app-gps-status-instrument',
  standalone: true,
  imports: [CommonModule, AppInstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      label="GPS"
      [value]="display().value"
      icon="satellite"
      [status]="display().status"
      [secondaryLabel]="display().secondaryLabel"
      [secondaryValue]="display().secondaryValue"
    />
  `,
  styles: [
    `
    :host { display: block; }
    `,
  ],
})
export class GpsStatusInstrumentComponent {
  private readonly store = inject(DatapointStoreService);

  private readonly fix = toSignal(
    this.store.observe<string>(PATHS.sensors.gps.fix),
    { initialValue: null },
  );

  private readonly sats = toSignal(
    this.store.observe<number>(PATHS.sensors.gps.satellitesInView),
    { initialValue: null },
  );

  private readonly hdop = toSignal(
    this.store.observe<number>(PATHS.sensors.gps.horizontalDilution),
    { initialValue: null },
  );

  readonly display = computed(() => {
    const fixPoint = this.fix();
    const satsPoint = this.sats();
    const hdopPoint = this.hdop();

    const fixVal = fixPoint?.value;
    const satsVal = satsPoint?.value;
    const hdopVal = hdopPoint?.value;

    if (!fixVal) {
      return {
        value: 'No Fix',
        status: 'error' as const,
        secondaryLabel: '',
        secondaryValue: '',
      };
    }

    const fixLabel = typeof fixVal === 'string' ? fixVal : String(fixVal);
    const parts: string[] = [];
    if (satsVal != null) parts.push(`${satsVal} sats`);
    if (hdopVal != null) parts.push(`HDOP ${Number(hdopVal).toFixed(2)}`);

    const isGood = fixLabel.toLowerCase().includes('3d') || fixLabel.toLowerCase().includes('fix');

    return {
      value: fixLabel,
      status: isGood ? ('success' as const) : ('warning' as const),
      secondaryLabel: satsVal != null ? 'Sats' : '',
      secondaryValue: parts.join(' · ') || '--',
    };
  });
}
