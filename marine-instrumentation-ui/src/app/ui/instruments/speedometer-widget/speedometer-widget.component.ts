import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

interface SpeedView {
  sog: number;
  sogStr: string;
  stw: number;
  stwStr: string;
  quality: DataQuality;
  age: number | null;
  source: string;
  // Gráficos
  sogRotation: number; // Grados para rotar la aguja
  stwRotation: number;
  sogArcDash: string; // Para el gráfico de barra circular
}

@Component({
  selector: 'app-speedometer-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './speedometer-widget.component.html',
  styleUrls: ['./speedometer-widget.component.scss']
})
export class SpeedometerWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 200);

  // Configuración de escala
  private readonly MAX_SPEED = 15; // Nudos
  private readonly RADIUS = 80;
  private readonly CENTER = { x: 100, y: 100 };
  private readonly ARC_LENGTH = Math.PI * this.RADIUS; // Longitud total del arco (PI * r para semicirculo)

  // Generar Ticks estáticos (0 a 15)
  ticks = Array.from({ length: 16 }, (_, i) => {
    const value = i;
    const isMajor = value % 5 === 0; // 0, 5, 10, 15
    // Angulo: 0=180deg (Left), 15=0deg (Right) -> 180 a 360 en SVG rotate logic?
    // Mapeo visual: Min = 180deg, Max = 360deg (o 0deg). 
    // Vamos a usar rotación estándar CSS: 0deg = derecha (3h).
    // Entonces nuestro arco va de 180deg (9h) a 360deg (3h).
    const pct = value / this.MAX_SPEED;
    const angleRad = Math.PI * (1 - pct); // PI a 0

    // Coordenadas para líneas
    const rInner = this.RADIUS - (isMajor ? 15 : 10); // Ticks dentro del arco
    const rOuter = this.RADIUS - 5; 
    
    // Convertir polar a cartesiano (recordar Y invertida en SVG a veces, pero aquí usamos cos/sin normal y restamos Y)
    const x1 = this.CENTER.x + rInner * Math.cos(angleRad);
    const y1 = this.CENTER.y - rInner * Math.sin(angleRad);
    const x2 = this.CENTER.x + rOuter * Math.cos(angleRad);
    const y2 = this.CENTER.y - rOuter * Math.sin(angleRad);

    // Texto
    const rText = this.RADIUS - 28;
    const tx = this.CENTER.x + rText * Math.cos(angleRad);
    const ty = this.CENTER.y - rText * Math.sin(angleRad);

    return { value, x1, y1, x2, y2, tx, ty, isMajor };
  });

  private sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround);
  private stw$ = this.store.observe<number>(PATHS.navigation.speedThroughWater); // Ajustar path si es necesario

  private vm$ = combineLatest([
    this.sog$.pipe(startWith(undefined)),
    this.stw$.pipe(startWith(undefined)),
    this.ticker$
  ]).pipe(
    map(([sogData, stwData]) => {
      // Priorizar datos
      const sogVal = (sogData?.value ?? 0) * 1.94384; // m/s to knots
      const stwVal = (stwData?.value ?? 0) * 1.94384;
      
      const quality: DataQuality = !sogData ? 'bad' : 
        (Date.now() - sogData.timestamp) < 2000 ? 'good' : 'warn';

      // Cálculos de Rotación
      // 0kn = 180deg, 15kn = 360deg (0deg). 
      // La aguja horizontal izquierda es 180deg.
      const calcRotation = (val: number) => {
        const clamped = Math.min(Math.max(val, 0), this.MAX_SPEED);
        return 180 + (clamped / this.MAX_SPEED) * 180;
      };

      // Cálculo dasharray para el arco de progreso
      // Total Length = PI * 80 ~= 251.
      // Dash = [Lleno, Vacio]
      const clampedSog = Math.min(Math.max(sogVal, 0), this.MAX_SPEED);
      const fillLen = (clampedSog / this.MAX_SPEED) * this.ARC_LENGTH;
      const emptyLen = this.ARC_LENGTH - fillLen;
      const sogArcDash = `${fillLen.toFixed(1)} ${emptyLen.toFixed(1)}`;

      return {
        sog: sogVal,
        sogStr: sogVal.toFixed(1),
        stw: stwVal,
        stwStr: stwVal.toFixed(1),
        quality,
        age: sogData ? (Date.now() - sogData.timestamp) / 1000 : null,
        source: sogData?.source || '',
        sogRotation: calcRotation(sogVal),
        stwRotation: calcRotation(stwVal),
        sogArcDash
      } as SpeedView;
    })
  );

  view = toSignal(this.vm$, {
    initialValue: { 
      sog: 0, sogStr: '0.0', stw: 0, stwStr: '0.0', 
      quality: 'bad', age: null, source: '',
      sogRotation: 180, stwRotation: 180, sogArcDash: '0 251'
    } as SpeedView
  });
}