import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  getRotateTransform,
  initNeedleState,
  type NeedleRotationState,
  updateNeedleAngle,
} from '../../../utils/needle-rotation.utils';
import { DataQualityDirective } from '../../../directives/data-quality.directive';
import { DataQualityService, type DataQuality } from '../../../services/data-quality.service';

interface CompassTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DegreeLabel {
  x: number;
  y: number;
  value: string;
  rotate: string;
}

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [CommonModule, DataQualityDirective],
  templateUrl: './compass.component.html',
  styleUrls: ['./compass.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompassComponent implements OnInit, OnChanges {
  // --- Instrument configuration ---
  @Input() value = 0;
  @Input() heading?: number;
  @Input() size = 240;
  @Input() timestamp = 0;
  @Input() unit = '\u00B0 TRUE';

  // Kept for compatibility with current callsites (unused in this phase anatomy)
  @Input() cog?: number;
  @Input() bearingTo?: number;
  @Input() interactive = false;

  private _rotationState: NeedleRotationState = initNeedleState(0);
  private _rotationInitialized = false;
  private readonly _instanceId = `gb-compass-${Math.random().toString(36).slice(2, 10)}`;
  private readonly qualityService = inject(DataQualityService);

  constructor(@Inject(DOCUMENT) private readonly doc: Document) {}

  ngOnInit(): void {
    if (!this._rotationInitialized) {
      this._rotationState = initNeedleState(this._inputAngle());
      this._rotationInitialized = true;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['heading']) {
      const angle = this._inputAngle();
      if (!this._rotationInitialized) {
        this._rotationState = initNeedleState(angle);
        this._rotationInitialized = true;
      } else {
        this._rotationState = updateNeedleAngle(this._rotationState, angle);
      }
    }
  }

  // --- Geometry ---
  get cx(): number {
    return this.size / 2;
  }

  get cy(): number {
    return this.size / 2;
  }

  get outerRadius(): number {
    return this.size / 2 - 2;
  }

  get faceRadius(): number {
    return this.size / 2 - 8;
  }

  get cardinalOffset(): number {
    return Math.round(this.size * 0.09);
  }

  get displayFontSize(): number {
    return Math.round(this.size * 0.13);
  }

  // --- ARIA / formatting ---
  get formattedValue(): string {
    const indicator = this.qualityService.getIndicator(
      this._rotationState.logicalAngle,
      this.timestamp,
      (v) => String(Math.round(v) % 360).padStart(3, '0')
    );
    return indicator.displayValue ?? '---';
  }

  get quality(): DataQuality {
    return this.qualityService.getQuality(this.timestamp);
  }

  get isStale(): boolean {
    return this.quality === 'stale';
  }

  // --- SVG defs IDs (avoid collisions when rendering multiple components) ---
  get faceGradientId(): string {
    return `${this._instanceId}-face-gradient`;
  }

  get needleGradientId(): string {
    return `${this._instanceId}-needle-gradient`;
  }

  get neonGlowId(): string {
    return `${this._instanceId}-neon-glow`;
  }

  get instrumentClipId(): string {
    return `${this._instanceId}-instrument-clip`;
  }

  // --- Needle ---
  get needleFilter(): string {
    const theme = this.doc.documentElement.getAttribute('data-theme') ?? 'night';
    return theme === 'night' && !this.isStale ? `url(#${this.neonGlowId})` : 'none';
  }

  get needlePoints(): string {
    const cx = this.cx;
    const cy = this.cy;
    const tipY = cy - this.faceRadius * 0.72;
    const baseY = cy + this.faceRadius * 0.15;
    const halfW = this.size * 0.025;
    return `${cx},${tipY} ${cx - halfW},${baseY} ${cx + halfW},${baseY}`;
  }

  get needleCounterweightPoints(): string {
    const cx = this.cx;
    const cy = this.cy;
    const tailY = cy + this.faceRadius * 0.35;
    const baseY = cy + this.faceRadius * 0.15;
    const halfW = this.size * 0.018;
    return `${cx},${tailY} ${cx - halfW},${baseY} ${cx + halfW},${baseY}`;
  }

  get needleTransform(): string {
    return getRotateTransform(this._rotationState, this.cx, this.cy);
  }

  // --- Dial marks ---
  get majorTicks(): CompassTick[] {
    return this._generateTicks(10, 12, 18);
  }

  get minorTicks(): CompassTick[] {
    return this._generateTicks(5, 6, 8, 10);
  }

  get degreeLabels(): DegreeLabel[] {
    const labels: DegreeLabel[] = [];
    const radius = this.faceRadius - Math.round(this.size * 0.16);
    for (let angle = 0; angle < 360; angle += 30) {
      if (angle % 90 === 0) {
        continue;
      }
      const rad = ((angle - 90) * Math.PI) / 180;
      const x = this.cx + radius * Math.cos(rad);
      const y = this.cy + radius * Math.sin(rad);
      labels.push({
        x,
        y,
        value: String(angle / 10).padStart(2, '0'),
        rotate: `rotate(${angle}, ${x}, ${y})`,
      });
    }
    return labels;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private _inputAngle(): number {
    return this.heading ?? this.value;
  }

  private _generateTicks(
    step: number,
    outerGap: number,
    innerGap: number,
    excludeEvery?: number
  ): CompassTick[] {
    const ticks: CompassTick[] = [];
    for (let angle = 0; angle < 360; angle += step) {
      if (excludeEvery && angle % excludeEvery === 0) {
        continue;
      }
      const rad = ((angle - 90) * Math.PI) / 180;
      const outer = this.faceRadius - outerGap;
      const inner = this.faceRadius - innerGap;
      ticks.push({
        x1: this.cx + outer * Math.cos(rad),
        y1: this.cy + outer * Math.sin(rad),
        x2: this.cx + inner * Math.cos(rad),
        y2: this.cy + inner * Math.sin(rad),
      });
    }
    return ticks;
  }
}
