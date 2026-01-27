import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DataQuality = 'good' | 'warn' | 'bad';

@Component({
  selector: 'app-instrument-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './instrument-card.component.html',
  styleUrls: ['./instrument-card.component.css']
})
export class InstrumentCardComponent {
  @Input({ required: true }) title: string = '';
  @Input() value: string | null = '--';
  @Input() unit: string = '';
  @Input() quality: DataQuality = 'bad';
  @Input() ageSeconds: number | null = null;
  @Input() source: string = '';
  
  get qualityClass(): string {
    return `quality-${this.quality}`;
  }
}
