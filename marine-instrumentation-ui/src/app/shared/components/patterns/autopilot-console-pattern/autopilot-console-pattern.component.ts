import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import {
  AutopilotControlMode,
  AutopilotStatusPatternComponent,
  AutopilotStatusState
} from '../autopilot-status-pattern/autopilot-status-pattern.component';
import {
  AutopilotModeSelectorMode,
  AutopilotModeSelectorPatternComponent
} from '../autopilot-mode-selector-pattern/autopilot-mode-selector-pattern.component';
import { HeadingControlPatternComponent } from '../heading-control-pattern/heading-control-pattern.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export type AutopilotConsoleState = 'disconnected' | 'standby' | 'engaged';
export type AutopilotConsoleMode = AutopilotModeSelectorMode;

export interface AutopilotConsoleStatus {
  state: AutopilotConsoleState;
  mode: AutopilotConsoleMode;
  target: number | null;
  current: number | null;
  availableModes?: AutopilotConsoleMode[];
  error?: string | null;
}

@Component({
  selector: 'app-autopilot-console-pattern',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppIconComponent,
    AutopilotStatusPatternComponent,
    AutopilotModeSelectorPatternComponent,
    HeadingControlPatternComponent
  ],
  template: `
    <section class="autopilot-console-pattern" [class.autopilot-console-pattern--disconnected]="controlsDisabled()">
      <header class="autopilot-console-pattern__header">
        <div class="autopilot-console-pattern__title-wrap">
          <span class="autopilot-console-pattern__icon-wrap">
            <app-icon name="helm" size="18"></app-icon>
          </span>
          <div class="autopilot-console-pattern__title-content">
            <p class="autopilot-console-pattern__title">AUTOPILOT CONSOLE</p>
            <p class="autopilot-console-pattern__subtitle">{{ connectionLabel() }}</p>
          </div>
        </div>
        <span class="autopilot-console-pattern__state-pill" [class.autopilot-console-pattern__state-pill--online]="!controlsDisabled()">
          {{ status.state.toUpperCase() }}
        </span>
      </header>

      <app-autopilot-status-pattern
        [state]="resolvedStatusState()"
        [mode]="status.mode"
        [target]="status.target"
      />

      <app-autopilot-mode-selector-pattern
        [currentMode]="status.mode"
        [availableModes]="resolvedModes()"
        [disabled]="controlsDisabled()"
        (onSelect)="handleModeChange($event)"
      />

      <app-heading-control-pattern
        [target]="status.target"
        [current]="status.current"
        [disabled]="!canAdjust()"
        (onAdjust)="onAdjust.emit($event)"
      />

      <div class="autopilot-console-pattern__actions">
        <app-button
          *ngIf="status.state === 'standby'"
          variant="primary"
          size="sm"
          label="Engage"
          [disabled]="controlsDisabled()"
          (action)="onEngage.emit()"
        />

        <app-button
          *ngIf="status.state === 'engaged'"
          variant="danger"
          size="sm"
          label="Standby"
          [disabled]="controlsDisabled()"
          (action)="onDisengage.emit()"
        />

        <app-button
          *ngIf="status.state === 'disconnected'"
          variant="warning"
          size="sm"
          label="Disconnected"
          [disabled]="true"
        />
      </div>

      <p class="autopilot-console-pattern__error" *ngIf="status.error">
        {{ status.error }}
      </p>
    </section>
  `,
  styleUrls: ['./autopilot-console-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutopilotConsolePatternComponent {
  @Input() status: AutopilotConsoleStatus = {
    state: 'standby',
    mode: 'auto',
    target: 240,
    current: 236,
    availableModes: ['auto', 'wind', 'route'],
    error: null
  };

  @Output() onEngage = new EventEmitter<void>();
  @Output() onDisengage = new EventEmitter<void>();
  @Output() onModeChange = new EventEmitter<AutopilotConsoleMode>();
  @Output() onAdjust = new EventEmitter<number>();

  controlsDisabled(): boolean {
    return this.status.state === 'disconnected';
  }

  canAdjust(): boolean {
    if (this.controlsDisabled()) {
      return false;
    }
    return this.status.mode !== 'standby' && this.status.mode !== 'route';
  }

  resolvedModes(): AutopilotControlMode[] {
    if (Array.isArray(this.status.availableModes) && this.status.availableModes.length > 0) {
      return this.status.availableModes;
    }
    return ['auto', 'wind', 'route'];
  }

  resolvedStatusState(): AutopilotStatusState {
    if (this.status.state === 'disconnected') {
      return 'disconnected';
    }
    if (this.status.error) {
      return 'error';
    }
    return this.status.state;
  }

  connectionLabel(): string {
    switch (this.status.state) {
      case 'disconnected':
        return 'Link to pilot computer lost';
      case 'standby':
        return 'Pilot online, waiting for engage';
      case 'engaged':
        return 'Pilot actively controlling course';
      default:
        return 'Pilot state unavailable';
    }
  }

  handleModeChange(mode: AutopilotConsoleMode): void {
    this.onModeChange.emit(mode);
  }
}

