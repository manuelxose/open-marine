import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

interface CompassView {
  heading: number;
  headingStr: string;
  cog: number | null;
  cogStr: string;
  quality: DataQuality;
  age: number | null;
  source: string;
}

@Component({
  selector: 'app-compass-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compass-widget.component.html',
  styleUrls: ['./compass-widget.component.scss']
})
export class CompassWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 100); // Actualización rápida para fluidez (10fps)

  // --- Generación de Gráficos Estáticos ---
  ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = i * 5;
    return { angle, major: angle % 10 === 0 };
  });

  numbers = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30;
    // No mostramos números en los cardinales (0, 90, 180, 270)
    if (angle % 90 === 0) return null;
    return { angle, label: angle / 10 }; // Mostramos "3" en vez de "30" (estilo marine clásico)
  }).filter(Boolean) as { angle: number, label: number }[];


  // --- Observables de Datos ---
  private heading$ = this.store.observe<number>(PATHS.navigation.headingTrue);
  private cog$ = this.store.observe<number>(PATHS.navigation.courseOverGroundTrue); // O Magnetic según prefieras

  private vm$ = combineLatest([
    this.heading$.pipe(startWith(undefined)),
    this.cog$.pipe(startWith(undefined)),
    this.ticker$
  ]).pipe(
    map(([hdg, cog]) => {
      // Heading es mandatorio para pintar el compás
      if (!hdg) {
         return {
           heading: 0, headingStr: '---',
           cog: null, cogStr: '---',
           quality: 'bad', age: null, source: ''
         } as CompassView;
      }

      const now = Date.now();
      const age = (now - hdg.timestamp) / 1000;
      const quality: DataQuality = age < 2 ? 'good' : 'warn';

      const hdgDeg = this.radToDeg(hdg.value);
      const cogDeg = cog ? this.radToDeg(cog.value) : null;

      return {
        heading: hdgDeg,
        headingStr: Math.round(hdgDeg).toString().padStart(3, '0'),
        cog: cogDeg,
        cogStr: cogDeg ? Math.round(cogDeg).toString().padStart(3, '0') : '---',
        quality,
        age,
        source: hdg.source
      } as CompassView;
    })
  );

  view = toSignal(this.vm$, {
    initialValue: { heading: 0, headingStr: '---', cog: null, cogStr: '---', quality: 'bad', age: null, source: '' }
  });

  // --- Lógica de Rotación Continua (Shortest Path) ---
  // Acumulador de rotación para evitar el salto 359->0
  private rotationAccumulator = 0;

  smoothHeading = computed(() => {
    const target = this.view().heading;
    
    // Normalizar el acumulador actual a 0-360
    const currentMod = ((this.rotationAccumulator % 360) + 360) % 360;
    
    // Calcular la diferencia más corta
    let diff = target - currentMod;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;

    // Actualizar acumulador
    this.rotationAccumulator += diff;
    return this.rotationAccumulator;
  });

  private radToDeg(rad: number): number {
    let deg = (rad * 180) / Math.PI;
    deg = deg % 360;
    if (deg < 0) deg += 360;
    return deg;
  }
}
