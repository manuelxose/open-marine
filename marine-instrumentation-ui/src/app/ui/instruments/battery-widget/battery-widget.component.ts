import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { DataQualityService, type DataQuality } from '../../../shared/services/data-quality.service';

interface BatteryView {
  voltage: string;
  current: string;
  soc: number;
  socStr: string;
  quality: DataQuality;
  isStale: boolean;
  source: string;
  age: number | null;
  isCharging: boolean;
  statusColor: string;
  dashOffset: number;
  isLowBattery: boolean;
  ariaLabel: string;
}

@Component({
  selector: 'app-battery-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './battery-widget.component.html',
  styleUrls: ['./battery-widget.component.scss'],
})
export class BatteryWidgetComponent {
  private readonly store = inject(DatapointStoreService);
  private readonly quality = inject(DataQualityService);
  private readonly ticker$ = timer(0, 1000);

  private readonly voltage$ = this.store.observe<number>(PATHS.electrical.batteries.house.voltage).pipe(startWith(undefined));
  private readonly current$ = this.store.observe<number>(PATHS.electrical.batteries.house.current).pipe(startWith(undefined));
  private readonly soc$ = this.store.observe<number>('electrical.batteries.house.capacity.stateOfCharge').pipe(startWith(undefined));

  private readonly vm$ = combineLatest([this.voltage$, this.current$, this.soc$, this.ticker$]).pipe(
    map(([voltData, currData, socData]) => {
      const volts = voltData?.value ?? 0;
      const amps = currData?.value ?? 0;

      let socPct = 0;
      if (socData && typeof socData.value === 'number') {
        socPct = socData.value * 100;
      } else {
        socPct = Math.max(0, Math.min(100, ((volts - 11.5) / (13.6 - 11.5)) * 100));
      }

      const isCharging = amps > 0.1;
      const isLowBattery = socPct < 20 || volts < 11.5;

      const maxDash = 534;
      const dashOffset = maxDash * (1 - socPct / 100);

      const lastUpdate = Math.max(voltData?.timestamp ?? 0, currData?.timestamp ?? 0, socData?.timestamp ?? 0);
      const quality = this.quality.getQuality(lastUpdate || null);
      const isStale = quality === 'stale' || quality === 'missing';
      const voltage = isStale ? '---' : volts.toFixed(2);
      const current = isStale ? '---' : Math.abs(amps).toFixed(1);
      const socStr = isStale ? '---' : socPct.toFixed(0);

      let statusColor = 'var(--gb-data-good)';
      if (socPct < 50) {
        statusColor = 'var(--gb-data-warn)';
      }
      if (socPct < 20 || volts <= 11) {
        statusColor = 'var(--gb-data-stale)';
      }
      if (isStale) {
        statusColor = 'var(--gb-data-stale)';
      }

      return {
        voltage,
        current,
        soc: socPct,
        socStr,
        quality,
        isStale,
        source: voltData?.source ?? currData?.source ?? socData?.source ?? '',
        age: lastUpdate > 0 ? (Date.now() - lastUpdate) / 1000 : null,
        isCharging: isStale ? false : isCharging,
        statusColor,
        dashOffset,
        isLowBattery: isStale ? false : isLowBattery,
        ariaLabel: isStale
          ? 'Battery gauge. Data stale.'
          : `Battery gauge ${voltage} volts, state of charge ${socStr} percent.`,
      } satisfies BatteryView;
    }),
  );

  readonly view = toSignal(this.vm$, {
    initialValue: {
      voltage: '0.00',
      current: '0.0',
      soc: 0,
      socStr: '0',
      quality: 'missing',
      isStale: true,
      source: '',
      age: null,
      isCharging: false,
      statusColor: 'var(--gb-text-unit)',
      dashOffset: 534,
      isLowBattery: false,
      ariaLabel: 'Battery gauge. Data unavailable.',
    } satisfies BatteryView,
  });
}
