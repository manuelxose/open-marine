import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PlaybackControlsPatternComponent,
  PlaybackControlsStatus
} from '../playback-controls-pattern/playback-controls-pattern.component';
import { TimelineEventItem, TimelinePatternComponent } from '../timeline-pattern/timeline-pattern.component';

export type PlaybackBarPatternStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused';
export type PlaybackBarPatternControl = 'play' | 'pause' | 'stop';

export interface PlaybackBarPatternState {
  status: PlaybackBarPatternStatus;
  start: number;
  end: number;
  current: number;
  speed: number;
  events: TimelineEventItem[];
}

const DEFAULT_STATE: PlaybackBarPatternState = {
  status: 'idle',
  start: 0,
  end: 0,
  current: 0,
  speed: 1,
  events: []
};

@Component({
  selector: 'app-playback-bar-pattern',
  standalone: true,
  imports: [CommonModule, TimelinePatternComponent, PlaybackControlsPatternComponent],
  template: `
    <section class="playback-bar-pattern" [class.playback-bar-pattern--active]="isActive()">
      <header class="playback-bar-pattern__header">
        <p class="playback-bar-pattern__title">Playback Bar</p>
        <span class="playback-bar-pattern__status">{{ state.status.toUpperCase() }}</span>
      </header>

      <app-timeline-pattern
        [start]="state.start"
        [end]="state.end"
        [current]="state.current"
        [events]="state.events"
        [disabled]="!isInteractive()"
        (onSeek)="onSeek.emit($event)"
      />

      <app-playback-controls-pattern
        [status]="controlStatus()"
        [speed]="state.speed"
        [disabled]="!isInteractive()"
        (onPlay)="onControl.emit('play')"
        (onPause)="onControl.emit('pause')"
        (onStop)="onControl.emit('stop')"
        (onSpeed)="onSpeedChange.emit($event)"
      />
    </section>
  `,
  styleUrls: ['./playback-bar-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaybackBarPatternComponent {
  @Input() state: PlaybackBarPatternState = DEFAULT_STATE;

  @Output() onControl = new EventEmitter<PlaybackBarPatternControl>();
  @Output() onSeek = new EventEmitter<number>();
  @Output() onSpeedChange = new EventEmitter<number>();

  isActive(): boolean {
    return this.state.status !== 'idle';
  }

  isInteractive(): boolean {
    return this.state.status === 'ready' || this.state.status === 'playing' || this.state.status === 'paused';
  }

  controlStatus(): PlaybackControlsStatus {
    if (this.state.status === 'playing') {
      return 'playing';
    }
    if (this.state.status === 'paused' || this.state.status === 'ready') {
      return 'paused';
    }
    return 'idle';
  }
}

