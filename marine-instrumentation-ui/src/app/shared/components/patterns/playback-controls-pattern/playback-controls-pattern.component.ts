import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export type PlaybackControlsStatus = 'idle' | 'playing' | 'paused';

@Component({
  selector: 'app-playback-controls-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="playback-controls-pattern" [class.playback-controls-pattern--playing]="status === 'playing'">
      <header class="playback-controls-pattern__header">
        <p class="playback-controls-pattern__title">Playback Controls</p>
        <span class="playback-controls-pattern__status">{{ status.toUpperCase() }}</span>
      </header>

      <div class="playback-controls-pattern__row">
        <button
          type="button"
          class="playback-controls-pattern__btn"
          [disabled]="disabled || status === 'playing'"
          aria-label="Play"
          (click)="onPlay.emit()"
        >
          <app-icon name="play" size="16"></app-icon>
        </button>

        <button
          type="button"
          class="playback-controls-pattern__btn"
          [disabled]="disabled || status !== 'playing'"
          aria-label="Pause"
          (click)="onPause.emit()"
        >
          <app-icon name="pause" size="16"></app-icon>
        </button>

        <button
          type="button"
          class="playback-controls-pattern__btn"
          [disabled]="disabled || status === 'idle'"
          aria-label="Stop"
          (click)="onStop.emit()"
        >
          <app-icon name="stop" size="16"></app-icon>
        </button>

        <select
          class="playback-controls-pattern__speed"
          [disabled]="disabled"
          [value]="speed"
          (change)="handleSpeedChange($event)"
          aria-label="Playback speed"
        >
          <option *ngFor="let option of speedOptions" [value]="option">
            {{ option }}x
          </option>
        </select>
      </div>
    </section>
  `,
  styleUrls: ['./playback-controls-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaybackControlsPatternComponent {
  @Input() status: PlaybackControlsStatus = 'idle';
  @Input() speed = 1;
  @Input() speedOptions: number[] = [0.5, 1, 2, 5, 10];
  @Input() disabled = false;

  @Output() onPlay = new EventEmitter<void>();
  @Output() onPause = new EventEmitter<void>();
  @Output() onStop = new EventEmitter<void>();
  @Output() onSpeed = new EventEmitter<number>();

  handleSpeedChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    const value = Number(target.value);
    if (!Number.isFinite(value)) {
      return;
    }
    this.onSpeed.emit(value);
  }
}

