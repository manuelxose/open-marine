import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TimelineEventType = 'alarm' | 'waypoint' | 'note';

export interface TimelineEventItem {
  time: number;
  type: TimelineEventType;
  label: string;
}

@Component({
  selector: 'app-timeline-pattern',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="timeline-pattern" [class.timeline-pattern--disabled]="disabled">
      <header class="timeline-pattern__header">
        <p class="timeline-pattern__title">Timeline</p>
        <span class="timeline-pattern__current">{{ timeLabel(current) }}</span>
      </header>

      <div class="timeline-pattern__track" (click)="onTrackClick($event)">
        <span class="timeline-pattern__progress" [style.width.%]="progressPercent()"></span>

        <span
          class="timeline-pattern__event"
          *ngFor="let event of events; trackBy: trackByEvent"
          [class]="'timeline-pattern__event timeline-pattern__event--' + event.type"
          [style.left.%]="positionPercent(event.time)"
          [title]="event.label"
        ></span>

        <span class="timeline-pattern__cursor" [style.left.%]="progressPercent()"></span>
      </div>

      <div class="timeline-pattern__labels">
        <span>{{ timeLabel(start) }}</span>
        <span>{{ timeLabel(end) }}</span>
      </div>
    </section>
  `,
  styleUrls: ['./timeline-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelinePatternComponent {
  @Input() start = 0;
  @Input() end = 0;
  @Input() current = 0;
  @Input() events: TimelineEventItem[] = [];
  @Input() disabled = false;

  @Output() onSeek = new EventEmitter<number>();

  progressPercent(): number {
    return this.positionPercent(this.current);
  }

  positionPercent(timestamp: number): number {
    const range = this.end - this.start;
    if (range <= 0) {
      return 0;
    }
    return this.clamp(((timestamp - this.start) / range) * 100, 0, 100);
  }

  timeLabel(timestamp: number): string {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return '--:--';
    }
    const date = new Date(timestamp);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  trackByEvent(index: number, event: TimelineEventItem): string {
    return `${event.type}-${event.time}-${index}`;
  }

  onTrackClick(event: MouseEvent): void {
    if (this.disabled || this.end <= this.start) {
      return;
    }
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }
    const rect = target.getBoundingClientRect();
    const offset = this.clamp(event.clientX - rect.left, 0, rect.width);
    const ratio = rect.width <= 0 ? 0 : offset / rect.width;
    const timestamp = this.start + ratio * (this.end - this.start);
    this.onSeek.emit(timestamp);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

