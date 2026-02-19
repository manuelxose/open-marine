import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export type MapControlOrientation = 'north-up' | 'course-up';

@Component({
  selector: 'app-map-controls-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="map-controls-pattern">
      <header class="map-controls-pattern__header">
        <p class="map-controls-pattern__title">Map Controls</p>
        <span class="map-controls-pattern__zoom">Zoom {{ zoom }}</span>
      </header>

      <div class="map-controls-pattern__grid">
        <button
          type="button"
          class="map-controls-pattern__btn"
          aria-label="Zoom in"
          (click)="onZoom.emit(1)"
        >
          <app-icon name="plus" size="18"></app-icon>
        </button>
        <button
          type="button"
          class="map-controls-pattern__btn"
          aria-label="Zoom out"
          (click)="onZoom.emit(-1)"
        >
          <app-icon name="minus" size="18"></app-icon>
        </button>
        <button
          type="button"
          class="map-controls-pattern__btn"
          [class.map-controls-pattern__btn--active]="orientation === 'course-up'"
          [attr.aria-label]="orientation === 'north-up' ? 'Switch to course-up' : 'Switch to north-up'"
          (click)="onOrientationToggle.emit()"
        >
          <app-icon [name]="orientation === 'north-up' ? 'compass' : 'navigation'" size="18"></app-icon>
        </button>
        <button
          type="button"
          class="map-controls-pattern__btn"
          [disabled]="!canCenter"
          aria-label="Center on vessel"
          (click)="onCenter.emit()"
        >
          <app-icon name="crosshair" size="18"></app-icon>
        </button>
      </div>
    </section>
  `,
  styleUrls: ['./map-controls-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapControlsPatternComponent {
  @Input() zoom = 12;
  @Input() orientation: MapControlOrientation = 'north-up';
  @Input() canCenter = true;

  @Output() onZoom = new EventEmitter<number>();
  @Output() onOrientationToggle = new EventEmitter<void>();
  @Output() onCenter = new EventEmitter<void>();
}

