import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

interface BatteryView {
  voltage: string;
  current: string;
  soc: number;
  socStr: string;
  quality: DataQuality;
  source: string;
  age: number | null;
  isCharging: boolean;
  statusColor: string;
  dashOffset: number;
  isLowBattery: boolean;
}

@Component({
  selector: 'app-battery-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './battery-widget.component.html',
  styleUrls: ['./battery-widget.component.scss']
})
export class BatteryWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 5000); 

  private voltage$ = this.store.observe<number>(PATHS.electrical.batteries.house.voltage);
  private current$ = this.store.observe<number>(PATHS.electrical.batteries.house.current);
  private soc$ = this.store.observe<number>('electrical.batteries.house.capacity.stateOfCharge'); 

  private vm$ = combineLatest([
    this.voltage$.pipe(startWith(undefined)),
    this.current$.pipe(startWith(undefined)),
    this.soc$.pipe(startWith(undefined)),
    this.ticker$
  ]).pipe(
    map(([voltData, currData, socData]) => {
      
      const v = voltData?.value ?? 0;
      const a = currData?.value ?? 0;
      
      let socPct = 0;
      if (socData && typeof socData.value === 'number') {
        socPct = socData.value * 100;
      } else {
        socPct = Math.max(0, Math.min(100, ((v - 11.5) / (13.6 - 11.5)) * 100));
      }
      
      const isCharging = a > 0.1; 
      const isLow = socPct < 20 || v < 11.5;

      // Colores Neon
      let statusColor = '#00e676'; // Green
      if (socPct < 50) statusColor = '#ffea00'; // Yellow
      if (socPct < 20) statusColor = '#ff3d00'; // Red
      if (v <= 11.0) statusColor = '#ff3d00';

      // SVG Dash Offset
      // C = 534 (2 * PI * 85). Offset = C * (1 - pct)
      const maxDash = 534;
      const dashOffset = maxDash * (1 - (socPct / 100));

      const now = Date.now();
      const lastUpdate = Math.max(voltData?.timestamp || 0, currData?.timestamp || 0);
      const age = (now - lastUpdate) / 1000;
      const quality: DataQuality = age < 5 ? 'good' : 'warn';

      return {
        voltage: v.toFixed(2),
        current: Math.abs(a).toFixed(1), // Mostramos magnitud, el signo lo indica el icono
        soc: socPct,
        socStr: socPct.toFixed(0),
        quality,
        source: voltData?.source || 'sim',
        age,
        isCharging,
        statusColor,
        dashOffset,
        isLowBattery: isLow
      } as BatteryView;
    })
  );

  view = toSignal(this.vm$, {
    initialValue: { 
      voltage: '0.00', current: '0.0', soc: 0, socStr: '0', 
      quality: 'bad' as DataQuality, source: '', age: null, 
      isCharging: false, statusColor: '#8b9bb4', dashOffset: 534, isLowBattery: false 
    }
  });
}
