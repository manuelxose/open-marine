import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';

export type TideState = 'rising' | 'falling' | 'slack';

export interface TideEvent {
    time: Date;
    height: number;
}

@Component({
  selector: 'app-tide-display',
  standalone: true,
  imports: [CommonModule, AppTextComponent, AppIconComponent, AppBoxComponent, AppStackComponent],
  providers: [DatePipe],
  template: `
    <app-box class="tide-container" padding="4">
      <app-stack spacing="md">
        
        <!-- Header / Current State -->
        <div class="tide-header">
           <app-text variant="caption" class="label text-muted">TIDE LEVEL</app-text>
           <app-text variant="caption" [class]="stateColorClass()">{{ stateLabel() }}</app-text>
        </div>

        <!-- Main Value -->
        <div class="main-display">
             <div class="trend-icon" [ngClass]="stateClass()">
                 <app-icon [name]="stateIcon()" size="lg" [class]="stateColorClass()"></app-icon>
             </div>
             <div class="value-group">
                 <app-text variant="value" size="2xl" class="value">{{ formattedHeight() }}</app-text>
                 <app-text variant="caption" size="sm" class="unit text-muted">m</app-text>
             </div>
        </div>

        <div class="divider"></div>

        <!-- Next Events -->
        <div class="events-row">
            <div class="event" *ngIf="_nextHigh()">
                <div class="event-header">
                    <app-icon name="arrow-up" size="xs" class="text-success"></app-icon>
                    <app-text variant="caption" class="text-muted">NEXT HIGH</app-text>
                </div>
                <app-text variant="body" weight="bold">{{ formatTime(_nextHigh()!.time) }}</app-text>
                <app-text variant="caption" class="text-muted">{{ formatHeight(_nextHigh()!.height) }}m</app-text>
            </div>

            <div class="event text-right" *ngIf="_nextLow()">
                <div class="event-header justify-end">
                    <app-text variant="caption" class="text-muted">NEXT LOW</app-text>
                    <app-icon name="arrow-down" size="xs" class="text-warn"></app-icon>
                </div>
                <app-text variant="body" weight="bold">{{ formatTime(_nextLow()!.time) }}</app-text>
                <app-text variant="caption" class="text-muted">{{ formatHeight(_nextLow()!.height) }}m</app-text>
            </div>
        </div>

      </app-stack>
    </app-box>
  `,
  styleUrls: ['./tide-display.component.scss']
})
export class TideDisplayComponent {
  // Inputs as signals
  protected _height = signal<number>(0);
  protected _state = signal<TideState>('slack');
  protected _nextHigh = signal<TideEvent | null>(null);
  protected _nextLow = signal<TideEvent | null>(null);

  @Input() set height(val: number) { this._height.set(val); }
  @Input() set state(val: TideState) { this._state.set(val); }
  @Input() set nextHigh(val: TideEvent | null) { this._nextHigh.set(val); }
  @Input() set nextLow(val: TideEvent | null) { this._nextLow.set(val); }

  constructor(private datePipe: DatePipe) {}

  formattedHeight = computed(() => this._height().toFixed(1));

  stateLabel = computed(() => {
      switch(this._state()) {
          case 'rising': return 'RISING';
          case 'falling': return 'FALLING';
          default: return 'SLACK';
      }
  });

  stateIcon = computed(() => {
      switch(this._state()) {
          case 'rising': return 'arrow-up';
          case 'falling': return 'arrow-down';
          default: return 'minus';
      }
  });

  stateColorClass = computed(() => {
      switch(this._state()) {
          case 'rising': return 'text-success';
          case 'falling': return 'text-warn';
          default: return 'text-muted';
      }
  });
  
  stateClass = computed(() => `state-${this._state()}`);

  formatTime(d: Date): string {
      return this.datePipe.transform(d, 'HH:mm') || '--:--';
  }

  formatHeight(h: number): string {
      return h.toFixed(1);
  }
}
