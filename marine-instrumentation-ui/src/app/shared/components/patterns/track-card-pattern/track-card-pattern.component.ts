import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export interface TrackCardData {
  id: string;
  name: string;
  pointCount: number;
  distanceNm: number;
  startTime?: string;
  endTime?: string;
}

@Component({
  selector: 'app-track-card-pattern',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent],
  template: `
    <article class="track-card-pattern">
      <header class="track-card-pattern__header">
        <div class="track-card-pattern__title-wrap">
          <span class="track-card-pattern__icon">
            <app-icon name="track" size="18"></app-icon>
          </span>
          <div class="track-card-pattern__title-content">
            <p class="track-card-pattern__title">{{ track.name }}</p>
            <p class="track-card-pattern__subtitle">{{ track.pointCount }} points</p>
          </div>
        </div>
      </header>

      <dl class="track-card-pattern__metrics">
        <div class="track-card-pattern__metric">
          <dt class="track-card-pattern__metric-label">Distance</dt>
          <dd class="track-card-pattern__metric-value">{{ track.distanceNm.toFixed(1) }} nm</dd>
        </div>
        <div class="track-card-pattern__metric">
          <dt class="track-card-pattern__metric-label">Start</dt>
          <dd class="track-card-pattern__metric-value">{{ track.startTime ?? '--' }}</dd>
        </div>
        <div class="track-card-pattern__metric">
          <dt class="track-card-pattern__metric-label">End</dt>
          <dd class="track-card-pattern__metric-value">{{ track.endTime ?? '--' }}</dd>
        </div>
      </dl>

      <footer class="track-card-pattern__actions">
        <app-button size="sm" variant="ghost" label="View" (action)="onView.emit(track.id)"></app-button>
        <app-button size="sm" variant="secondary" label="Export" (action)="onExport.emit(track.id)"></app-button>
        <app-button size="sm" variant="ghost" label="Delete" (action)="onDelete.emit(track.id)"></app-button>
      </footer>
    </article>
  `,
  styleUrls: ['./track-card-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrackCardPatternComponent {
  @Input({ required: true }) track!: TrackCardData;

  @Output() onView = new EventEmitter<string>();
  @Output() onExport = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();
}
