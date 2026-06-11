import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { type DataQuality } from '../../services/data-quality.service';

@Component({
  selector: 'omi-gb-bezel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="gb-bezel-wrapper"
      [class.gb-bezel--compact]="compact"
      [class.gb-bezel--interactive]="interactive"
      [ngClass]="qualityCssClass"
    >
      <header class="gb-bezel-header" *ngIf="label">
        <span class="gb-instrument-label">{{ label }}</span>
        <span class="gb-quality-dot" [ngClass]="qualityDotClass"></span>
      </header>

      <div class="gb-bezel-content">
        <ng-content></ng-content>
      </div>

      <footer class="gb-bezel-footer" *ngIf="subLabel">
        <span class="gb-display-unit">{{ subLabel }}</span>
      </footer>
    </div>
  `,
  styleUrls: ['./gb-instrument-bezel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GbInstrumentBezelComponent {
  @Input() label?: string;
  @Input() subLabel?: string;
  @Input() compact = false;
  @Input() interactive = false;
  @Input() quality: DataQuality = 'good';

  get qualityCssClass(): string {
    return `gb-bezel--quality-${this.quality}`;
  }

  get qualityDotClass(): string {
    return `gb-quality-dot--${this.quality}`;
  }
}
