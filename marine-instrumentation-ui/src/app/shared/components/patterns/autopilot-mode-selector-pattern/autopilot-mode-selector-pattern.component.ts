import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import { AutopilotControlMode } from '../autopilot-status-pattern/autopilot-status-pattern.component';

export type AutopilotModeSelectorMode = AutopilotControlMode;

@Component({
  selector: 'app-autopilot-mode-selector-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="autopilot-mode-selector-pattern">
      <header class="autopilot-mode-selector-pattern__header">
        <p class="autopilot-mode-selector-pattern__title">Mode Selector</p>
      </header>

      <div class="autopilot-mode-selector-pattern__options">
        <button
          *ngFor="let mode of resolvedModes(); trackBy: trackByMode"
          type="button"
          class="autopilot-mode-selector-pattern__option"
          [class.autopilot-mode-selector-pattern__option--active]="mode === currentMode"
          [disabled]="disabled"
          (click)="selectMode(mode)"
        >
          <app-icon [name]="iconFor(mode)" size="14"></app-icon>
          <span>{{ labelFor(mode) }}</span>
        </button>
      </div>
    </section>
  `,
  styleUrls: ['./autopilot-mode-selector-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutopilotModeSelectorPatternComponent {
  @Input() currentMode: AutopilotModeSelectorMode = 'standby';
  @Input() availableModes: AutopilotModeSelectorMode[] = ['auto', 'wind', 'route'];
  @Input() disabled = false;

  @Output() onSelect = new EventEmitter<AutopilotModeSelectorMode>();

  private readonly fallbackModes: AutopilotModeSelectorMode[] = ['auto', 'wind', 'route'];

  resolvedModes(): AutopilotModeSelectorMode[] {
    if (!Array.isArray(this.availableModes) || this.availableModes.length === 0) {
      return this.fallbackModes;
    }
    return this.availableModes;
  }

  labelFor(mode: AutopilotModeSelectorMode): string {
    switch (mode) {
      case 'standby':
        return 'STBY';
      case 'auto':
        return 'AUTO';
      case 'wind':
        return 'WIND';
      case 'route':
        return 'ROUTE';
      default:
        return 'MODE';
    }
  }

  iconFor(mode: AutopilotModeSelectorMode): IconName {
    switch (mode) {
      case 'standby':
        return 'helm';
      case 'auto':
        return 'compass';
      case 'wind':
        return 'wind-arrow';
      case 'route':
        return 'route';
      default:
        return 'settings';
    }
  }

  trackByMode(_: number, mode: AutopilotModeSelectorMode): string {
    return mode;
  }

  selectMode(mode: AutopilotModeSelectorMode): void {
    if (this.disabled || mode === this.currentMode) {
      return;
    }
    this.onSelect.emit(mode);
  }
}

