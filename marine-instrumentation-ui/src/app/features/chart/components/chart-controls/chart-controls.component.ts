import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { ChartControlsVm } from '../../types/chart-vm';

@Component({
  selector: 'app-chart-controls',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-controls.component.html',
  styleUrls: ['./chart-controls.component.css'],
})
export class ChartControlsComponent implements OnChanges {
  @Input({ required: true }) vm!: ChartControlsVm;

  @Output() toggleTrack = new EventEmitter<void>();
  @Output() toggleVector = new EventEmitter<void>();
  @Output() toggleTrueWind = new EventEmitter<void>();
  @Output() toggleRangeRings = new EventEmitter<void>();
  @Output() changeRangeRingIntervals = new EventEmitter<number[]>();
  @Output() toggleAisTargets = new EventEmitter<void>();
  @Output() toggleAisLabels = new EventEmitter<void>();
  @Output() toggleCpaLines = new EventEmitter<void>();
  @Output() toggleOpenSeaMap = new EventEmitter<void>();

  intervalsText = '';
  error: string | null = null;
  private isEditingIntervals = false;
  private lastIntervalsSignature = '';

  onToggleTrack(): void {
    this.toggleTrack.emit();
  }

  onToggleVector(): void {
    this.toggleVector.emit();
  }

  onToggleTrueWind(): void {
    this.toggleTrueWind.emit();
  }

  onToggleRangeRings(): void {
    this.toggleRangeRings.emit();
  }

  onToggleAisTargets(): void {
    this.toggleAisTargets.emit();
  }

  onToggleAisLabels(): void {
    this.toggleAisLabels.emit();
  }

  onToggleCpaLines(): void {
    this.toggleCpaLines.emit();
  }

  onToggleOpenSeaMap(): void {
    this.toggleOpenSeaMap.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm'] && this.vm) {
      const signature = this.vm.rangeRingIntervals.join(', ');
      if (!this.isEditingIntervals && signature !== this.lastIntervalsSignature) {
        this.intervalsText = signature;
        this.lastIntervalsSignature = signature;
      }
    }
  }

  onIntervalsInput(raw: string): void {
    this.intervalsText = raw;
    this.error = null;
    this.isEditingIntervals = true;
  }

  applyIntervals(): void {
    const parsed = this.parseIntervals(this.intervalsText);
    if (!parsed || parsed.length === 0) {
      this.error = 'chart.controls.range_rings_error';
      return;
    }
    this.error = null;
    const signature = parsed.join(', ');
    this.intervalsText = signature;
    this.lastIntervalsSignature = signature;
    this.isEditingIntervals = false;
    this.changeRangeRingIntervals.emit(parsed);
  }

  applyPreset(values: number[]): void {
    this.intervalsText = values.join(', ');
    this.applyIntervals();
  }

  private parseIntervals(raw: string): number[] | null {
    const matches = raw.match(/\d+(?:[.,]\d+)?/g);
    if (!matches) {
      return null;
    }

    const numbers = matches
      .map((value) => Number.parseFloat(value.replace(',', '.')))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (numbers.length === 0) {
      return null;
    }

    // Remove duplicates and sort ascending
    const uniqueSorted = Array.from(new Set(numbers)).sort((a, b) => a - b);
    return uniqueSorted;
  }
}
