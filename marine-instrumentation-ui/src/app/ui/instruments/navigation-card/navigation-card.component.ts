import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, scan, startWith, timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

interface NavView {
  latStr: string;
  lonStr: string;
  sog: string;
  cog: string;
  hdg: string;
  
  // Gráfico de Deriva (Drift)
  driftAngle: number; // Diferencia entre HDG y COG
  hasDrift: boolean;
  
  // Gráfico Histórico SOG (Sparkline)
  sogHistoryPath: string;
  
  quality: DataQuality;
  age: number | null;
  source: string;
}

@Component({
  selector: 'app-navigation-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './navigation-card.component.html',
  styleUrls: ['./navigation-card.component.scss']
})
export class NavigationWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 1000);

  // Paths
  private pos$ = this.store.observe<{latitude: number, longitude: number}>(PATHS.navigation.position);
  private sog$ = this.store.observe<number>(PATHS.navigation.speedOverGround);
  private cog$ = this.store.observe<number>(PATHS.navigation.courseOverGroundTrue);
  private hdg$ = this.store.observe<number>(PATHS.navigation.headingTrue);

  // Histórico para Sparkline (asumiendo que store tiene método observeHistory o similar, simulamos buffer)
  // En una app real, usarías this.store.observeHistory(...)
  // Aquí usamos un scan simple sobre SOG para generar el gráfico
  private sogHistory$ = this.sog$.pipe(
    map(v => v?.value ?? 0),
    scan((acc: number[], curr: number) => {
       const newArr = [...acc, curr];
       return newArr.slice(-50); // Últimos 50 puntos
    }, [] as number[])
  );

  private vm$ = combineLatest([
    this.pos$.pipe(startWith(undefined)),
    this.sog$.pipe(startWith(undefined)),
    this.cog$.pipe(startWith(undefined)),
    this.hdg$.pipe(startWith(undefined)),
    this.sogHistory$.pipe(startWith([] as number[])),
    this.ticker$
  ]).pipe(
    map(([pos, sog, cog, hdg, history]) => {
      
      const quality: DataQuality = pos ? 'good' : 'bad';
      const age = pos ? (Date.now() - pos.timestamp) / 1000 : null;

      // 1. Formatear Coordenadas (DM format: 42° 25.534' N)
      const formatCoord = (val: number, type: 'lat' | 'lon') => {
        const absVal = Math.abs(val);
        const deg = Math.floor(absVal);
        const min = (absVal - deg) * 60;
        const dir = type === 'lat' 
           ? (val >= 0 ? 'N' : 'S') 
           : (val >= 0 ? 'E' : 'W');
        // Pad start para alineación visual
        const degStr = deg.toString().padStart(type === 'lat' ? 2 : 3, '0');
        const minStr = min.toFixed(3).padStart(6, '0');
        return `${degStr}° ${minStr}' ${dir}`;
      };

      const latStr = pos?.value ? formatCoord(pos.value.latitude, 'lat') : '--° --.---';
      const lonStr = pos?.value ? formatCoord(pos.value.longitude, 'lon') : '--° --.---';

      // 2. Valores Numéricos
      const sogKn = (sog?.value ?? 0) * 1.94384;
      const cogDeg = cog ? this.radToDeg(cog.value) : 0;
      const hdgDeg = hdg ? this.radToDeg(hdg.value) : 0;

      // 3. Cálculo de Deriva (Drift)
      // Si el barco apunta al Norte (0) y se mueve al Noreste (45), drift = 45.
      // Visualmente: Barco fijo arriba. Vector COG rotado (COG - HDG).
      let drift = cogDeg - hdgDeg;
      if (drift < -180) drift += 360;
      if (drift > 180) drift -= 360;
      
      const hasDrift = Math.abs(drift) > 2; // Mostrar solo si hay deriva significativa

      // 4. Generar Sparkline Path SVG
      // Mapeamos 50 puntos a 200px ancho x 50px alto (parte baja del scope)
      // Normalizamos el historial entre min y max para que se vea bien
      let path = '';
      if (history.length > 1) {
         const maxSog = Math.max(...history, 0.1); // Evitar div por 0
         const stepX = 200 / (history.length - 1);
         const points = history.map((val, i) => {
            const x = i * stepX;
            // Escalar Y: 0 es abajo (120), max es arriba (80 en el SVG coordinate system del scope)
            // Vamos a usar la parte inferior del SVG para el sparkline
            const y = 120 - ((val / maxSog) * 40); 
            return `${x.toFixed(1)},${y.toFixed(1)}`;
         });
         path = `M ${points.join(' L ')}`;
         // Cerrar área para gradiente
         path += ` L 200,120 L 0,120 Z`;
      }

      return {
        latStr, lonStr,
        sog: sogKn.toFixed(1),
        cog: cogDeg.toFixed(0).padStart(3, '0'),
        hdg: hdgDeg.toFixed(0).padStart(3, '0'),
        driftAngle: drift,
        hasDrift,
        sogHistoryPath: path,
        quality,
        age,
        source: pos?.source || ''
      } as NavView;
    })
  );

  view = toSignal(this.vm$, {
    initialValue: { 
       latStr: '--', lonStr: '--', sog: '--', cog: '--', hdg: '--',
       driftAngle: 0, hasDrift: false, sogHistoryPath: '',
       quality: 'bad', age: null, source: '' 
    }
  });

  private radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }
}