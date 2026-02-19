import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, scan, startWith, timer, filter } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { DatapointStoreService } from '../../../state/datapoints/datapoint-store.service';
import { InstrumentCardComponent, DataQuality } from '../../components/instrument-card/instrument-card.component';

interface DepthPoint {
  value: number;
  timestamp: number;
}

interface DepthView {
  currentValue: string;
  unit: string;
  quality: DataQuality;
  age: number | null;
  source: string;
  
  // Gráficos Separados
  graphFillPath: string;   // El área coloreada (Agua)
  graphLinePath: string;   // La línea sólida del fondo
  
  // Escalas
  scaleMax: number;        // El tope de la escala (ej. 20m)
  scaleTicks: number[];    // [5, 10, 15] para dibujar las líneas
  
  isShallow: boolean;      // Estado de alarma
}

@Component({
  selector: 'app-depth-widget',
  standalone: true,
  imports: [CommonModule, InstrumentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-instrument-card
      title="DEPTH / SONAR"
      [quality]="view().quality"
      [ageSeconds]="view().age"
      [source]="view().source"
      class="marine-card"
      [class.alarm-active]="view().isShallow" 
    >
      <div class="depth-container">
        
        <div class="sonar-wrapper">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="sonar-svg">
            <defs>
              <linearGradient id="gradWaterNormal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:var(--color-water-top); stop-opacity:0.5" />
                <stop offset="100%" style="stop-color:var(--color-water-bottom); stop-opacity:0.1" />
              </linearGradient>
              
              <linearGradient id="gradWaterAlarm" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:var(--color-alarm); stop-opacity:0.6" />
                <stop offset="100%" style="stop-color:var(--color-alarm-dim); stop-opacity:0.1" />
              </linearGradient>
              
              <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>
              </pattern>
            </defs>

            <rect x="0" y="0" width="100" height="100" fill="url(#gridPattern)" />

            <g class="grid-group">
              <ng-container *ngFor="let tick of view().scaleTicks">
                <line x1="0" [attr.y1]="(tick / view().scaleMax) * 100" 
                      x2="100" [attr.y2]="(tick / view().scaleMax) * 100" 
                      class="grid-line" />
                <text x="98" [attr.y]="(tick / view().scaleMax) * 100 - 2" 
                      class="grid-label" text-anchor="end">
                  {{ tick }}m
                </text>
              </ng-container>
            </g>

            <path [attr.d]="view().graphFillPath" 
                  [attr.fill]="view().isShallow ? 'url(#gradWaterAlarm)' : 'url(#gradWaterNormal)'" 
                  class="sonar-fill" />
            
            <path [attr.d]="view().graphLinePath" 
                  class="sonar-bottom-line"
                  [class.alarm-stroke]="view().isShallow" />

            <line x1="0" y1="0" x2="100" y2="0" class="surface-line" />
          </svg>
        </div>

        <div class="data-overlay">
          <div class="primary-readout" [class.danger]="view().isShallow">
            <span class="value">{{ view().currentValue }}</span>
            <span class="unit">m</span>
          </div>
          
          <div class="status-badges">
            <div class="badge scale-badge">
              RNG: {{ view().scaleMax }}m
            </div>
            <div *ngIf="view().isShallow" class="badge alarm-badge">
              SHALLOW
            </div>
          </div>
        </div>

      </div>
    </app-instrument-card>
  `,
  styleUrls: ['./depth-widget.component.scss'],
})
export class DepthWidgetComponent {
  private store = inject(DatapointStoreService);
  private ticker$ = timer(0, 200); // 5fps para suavidad en scroll

  private readonly HISTORY_POINTS = 50; 
  private readonly SHALLOW_THRESHOLD = 3.0;
  
  // Escalas estándar marítimas (evita saltos locos del gráfico)
  private readonly STANDARD_RANGES = [10, 20, 50, 100, 200, 500, 1000];

  private depth$ = this.store.observe<number>(PATHS.environment.depth.belowTransducer);

  private history$ = this.depth$.pipe(
    filter(p => !!p),
    scan((acc, curr) => {
      const newHist = [...acc, { value: curr.value, timestamp: curr.timestamp }];
      if (newHist.length > this.HISTORY_POINTS) newHist.shift();
      return newHist;
    }, [] as DepthPoint[])
  );

  private vm$ = combineLatest([
    this.depth$.pipe(startWith(undefined)),
    this.history$.pipe(startWith([])),
    this.ticker$,
  ]).pipe(
    map(([current, history]) => {
      if (!current) return this.getEmptyView();

      const now = Date.now();
      const age = (now - current.timestamp) / 1000;
      const isShallow = current.value <= this.SHALLOW_THRESHOLD;
      
      let quality: DataQuality = age < 2 ? 'good' : age < 5 ? 'warn' : 'bad';
      if (isShallow) quality = 'warn'; // La alarma visual domina

      // 1. Auto-Ranging Inteligente
      // Buscamos el valor más profundo en el historial reciente
      const maxHistValue = Math.max(...history.map(p => p.value), 0.1);
      // Seleccionamos la escala estándar inmediata superior (con un margen del 10%)
      const scaleMax = this.STANDARD_RANGES.find(r => r >= maxHistValue * 1.1) || Math.ceil(maxHistValue);
      
      // 2. Generar Ticks (Líneas de grid) - Ej: 25%, 50%, 75%
      const scaleTicks = [0.25, 0.5, 0.75].map(factor => Math.round(scaleMax * factor));

      // 3. Generar Paths SVG
      const stepX = 100 / (this.HISTORY_POINTS - 1);
      const scaleYFactor = 100 / scaleMax;

      // Puntos base "x,y" para la línea de fondo
      const linePoints = history.map((p, i) => {
        const x = (i * stepX).toFixed(1);
        const y = (p.value * scaleYFactor).toFixed(1);
        return `${x} ${y}`;
      });

      // Path de línea (solo los puntos del fondo)
      const graphLinePath = linePoints.length ? `M ${linePoints.join(' L ')}` : '';

      // Path de relleno (Línea + cerrar hacia arriba para crear el "agua")
      // Esto es crucial: Pintamos el AGUA, no la tierra.
      const graphFillPath = linePoints.length 
        ? `M ${linePoints.join(' L ')} L 100 0 L 0 0 Z` 
        : '';

      return {
        currentValue: current.value.toFixed(1),
        unit: 'm',
        quality,
        age,
        source: current.source,
        graphFillPath,
        graphLinePath,
        scaleMax,
        scaleTicks,
        isShallow
      } as DepthView;
    })
  );

  view = toSignal(this.vm$, { initialValue: this.getEmptyView() });

  private getEmptyView(): DepthView {
    return {
      currentValue: '--.-', unit: 'm', quality: 'bad', age: null, source: '',
      graphFillPath: '', graphLinePath: '', scaleMax: 10, scaleTicks: [], isShallow: false
    };
  }
}