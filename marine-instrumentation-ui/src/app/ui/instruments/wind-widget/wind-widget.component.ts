import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

interface WindView {
  awa: number;
  aws: string;
  twa: number;
  tws: string;
  quality: DataQuality;
  age: number | null;
  source: string;
  
  // Rotaciones suavizadas (calculadas en computeds si se quiere lógica compleja, 
  // pero aquí usaremos rotación directa CSS transition)
  awaRotation: number;
  twaRotation: number;
}

@Component({
  selector: 'app-wind-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wind-widget.component.html',  
  styleUrls: ['./wind-widget.component.scss']
})
export class WindWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 200);

  // Ticks estáticos
  ticks = Array.from({ length: 36 }, (_, i) => {
    const angle = i * 10;
    return { angle, major: angle % 30 === 0 };
  });

  private awa$ = this.store.observe<number>(PATHS.environment.wind.angleApparent);
  private aws$ = this.store.observe<number>(PATHS.environment.wind.speedApparent);
  private twa$ = this.store.observe<number>(PATHS.environment.wind.angleTrueWater);
  private tws$ = this.store.observe<number>(PATHS.environment.wind.speedTrue);

  private vm$ = combineLatest([
    this.awa$.pipe(startWith(undefined)),
    this.aws$.pipe(startWith(undefined)),
    this.twa$.pipe(startWith(undefined)),
    this.tws$.pipe(startWith(undefined)),
    this.ticker$
  ]).pipe(
    map(([awa, aws, twa, tws]) => {
      // Prioridad de timestamp para calidad
      const lastUpdate = Math.max(awa?.timestamp || 0, aws?.timestamp || 0);
      const quality: DataQuality = (Date.now() - lastUpdate) < 5000 ? 'good' : 'warn';
      
      const awsKn = (aws?.value ?? 0) * 1.94384;
      const twsKn = (tws?.value ?? 0) * 1.94384;
      
      const awaDeg = awa ? this.radToDeg(awa.value) : 0;
      const twaDeg = twa ? this.radToDeg(twa.value) : 0;

      return {
        awa: awaDeg,
        aws: awsKn.toFixed(1),
        twa: twaDeg,
        tws: twsKn.toFixed(1),
        quality,
        age: (Date.now() - lastUpdate) / 1000,
        source: awa?.source || '',
        
        // Usamos la lógica de rotación más simple aquí, 
        // asumiendo que CSS transition handlea el giro suave en la mayoría de casos
        // Para "shortest path" perfecto se necesita el acumulador (ver widgets anteriores),
        // pero para simplificar este ejemplo usaremos el valor directo.
        awaRotation: awaDeg,
        twaRotation: twaDeg
      } as WindView;
    })
  );

  view = toSignal(this.vm$, { 
    initialValue: { 
      awa: 0, aws: '--', twa: 0, tws: '--', 
      quality: 'bad', age: null, source: '',
      awaRotation: 0, twaRotation: 0 
    } 
  });

  private radToDeg(rad: number): number {
    let deg = (rad * 180) / Math.PI;
    deg = deg % 360;
    if (deg < 0) deg += 360;
    return deg;
  }
}