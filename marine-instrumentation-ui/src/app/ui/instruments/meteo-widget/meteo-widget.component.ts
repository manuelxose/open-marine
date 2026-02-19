import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { HistoryPoint } from '../../../state/datapoints/datapoint.models';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

@Component({
  selector: 'app-meteo-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  templateUrl: './meteo-widget.component.html',
  styleUrls: ['./meteo-widget.component.scss']
})
export class MeteoWidgetComponent {
  private store = inject(DatapointStoreService);
  private readonly PRESSURE_PATH = 'environment.outside.pressure';

  // Observable for meta
  private pressurePoint$ = this.store.observe<number>(this.PRESSURE_PATH);

  // Computed Values
  pressure = toSignal(
    this.pressurePoint$.pipe(
      map(d => (d?.value ?? 101325) / 100) // Convert Pa to hPa
    ),
    { initialValue: 1013 }
  );
  
  quality = toSignal(
    this.pressurePoint$.pipe(
      map(d => {
         const age = (Date.now() - (d?.timestamp || 0)) / 1000;
         return (age < 60 ? 'good' : 'bad') as DataQuality;
      })
    ), { initialValue: 'bad' as DataQuality }
  );

  age = toSignal(
    this.pressurePoint$.pipe(
       map(d => (Date.now() - (d?.timestamp || 0)) / 1000)
    ), { initialValue: 0 }
  );

  source = toSignal(
     this.pressurePoint$.pipe(map(d => d?.source || '')),
     { initialValue: '' }
  );

  // History (last 12h = 43200s)
  history = toSignal(
    this.store.series$(this.PRESSURE_PATH, 12 * 60 * 60).pipe(
        map((points: HistoryPoint[]) => points.map(p => ({ ...p, value: p.value / 100 }))) // Convert to hPa
    ),
    { initialValue: [] as HistoryPoint[] }
  );

  trend = computed(() => {
    const points = this.history();
    if (points.length < 2) return 0;
    // Simple linear trend: last - first
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return 0;
    return last.value - first.value;
  });

  // Calculate coordinates for SVG path
  sparklinePath = computed(() => {
    const points = this.history();
    if (!points || points.length < 2) return 'M0,40 L100,40 Z';

    const width = 100;
    const height = 40;

    // Find range
    const values = points.map(p => p.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    // Padding dynamic
    const padding = (maxVal - minVal) * 0.1 || 1; 
    minVal -= padding;
    maxVal += padding;
    const range = maxVal - minVal;

    // Time window
    const now = Date.now();
    const windowMs = 12 * 60 * 60 * 1000;
    const startTime = now - windowMs;

    // Map points to SVG coords
    const coords = points.map(p => {
      // Clamp time to window
      const x = Math.max(0, Math.min(width, ((p.timestamp - startTime) / windowMs) * width));
      // Invert Y (SVG 0 is top)
      const normalizedVal = (p.value - minVal) / range;
      const y = height - (normalizedVal * height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Create area path (close loop)
    const lineStr = coords.length > 0 ? ('M ' + coords.join(' L ')) : 'M0,40';

    return `${lineStr} L ${width},${height} L 0,${height} Z`;
  });
}
