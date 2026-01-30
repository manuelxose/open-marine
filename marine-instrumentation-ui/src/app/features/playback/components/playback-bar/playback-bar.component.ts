import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { PlaybackEvent, PlaybackState } from '../../../../state/playback/playback.models';

const EMPTY_STATE: PlaybackState = {
  status: 'idle',
  currentTime: 0,
  startTime: 0,
  endTime: 0,
  speed: 1,
  events: [],
};

@Component({
  selector: 'app-playback-bar',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './playback-bar.component.html',
  styleUrls: ['./playback-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaybackBarComponent {
  @Input() state: PlaybackState = { ...EMPTY_STATE };

  @Output() togglePlay = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() seek = new EventEmitter<number>();
  @Output() speedChange = new EventEmitter<number>();
  @Output() skipForward = new EventEmitter<void>();
  @Output() skipBackward = new EventEmitter<void>();

  get progressPercent(): number {
    const { startTime, endTime, currentTime } = this.state;
    const range = endTime - startTime;
    if (!range) return 0;
    return this.clamp(((currentTime - startTime) / range) * 100, 0, 100);
  }

  get isInteractive(): boolean {
    return this.state.status === 'ready' || this.state.status === 'playing' || this.state.status === 'paused';
  }

  onTimelineClick(event: MouseEvent): void {
    if (!this.isInteractive) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const percent = this.clamp(offset / rect.width, 0, 1);
    const timestamp = this.state.startTime + percent * (this.state.endTime - this.state.startTime);
    this.seek.emit(timestamp);
  }

  onSpeedChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;
    const value = Number(target.value);
    if (Number.isNaN(value)) return;
    this.speedChange.emit(value);
  }

  getEventPosition(event: PlaybackEvent): number {
    const range = this.state.endTime - this.state.startTime;
    if (!range) return 0;
    return this.clamp(((event.time - this.state.startTime) / range) * 100, 0, 100);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
