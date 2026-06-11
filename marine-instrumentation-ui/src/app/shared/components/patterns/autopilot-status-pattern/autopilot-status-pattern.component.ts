import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';

export type AutopilotStatusState = 'disconnected' | 'standby' | 'engaged' | 'error';
export type AutopilotControlMode = 'standby' | 'auto' | 'wind' | 'route';

@Component({
  selector: 'app-autopilot-status-pattern',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="autopilot-status-pattern" [ngClass]="stateClass()">
      <header class="autopilot-status-pattern__header">
        <div class="autopilot-status-pattern__title-wrap">
          <span class="autopilot-status-pattern__icon-wrap">
            <app-icon [name]="iconName()" size="18"></app-icon>
          </span>
          <div class="autopilot-status-pattern__title-content">
            <p class="autopilot-status-pattern__title">AUTOPILOT STATUS</p>
            <p class="autopilot-status-pattern__subtitle">{{ stateDescription() }}</p>
          </div>
        </div>
        <span class="autopilot-status-pattern__pill">{{ stateLabel() }}</span>
      </header>

      <dl class="autopilot-status-pattern__metrics">
        <div class="autopilot-status-pattern__metric">
          <dt class="autopilot-status-pattern__metric-label">Mode</dt>
          <dd class="autopilot-status-pattern__metric-value">{{ modeLabel() }}</dd>
        </div>
        <div class="autopilot-status-pattern__metric">
          <dt class="autopilot-status-pattern__metric-label">Target</dt>
          <dd class="autopilot-status-pattern__metric-value">{{ targetLabel() }}</dd>
        </div>
      </dl>
    </section>
  `,
  styleUrls: ['./autopilot-status-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutopilotStatusPatternComponent {
  @Input() state: AutopilotStatusState = 'standby';
  @Input() mode: AutopilotControlMode = 'standby';
  @Input() target: number | null = null;

  stateClass(): string {
    return `autopilot-status-pattern--${this.state}`;
  }

  iconName(): IconName {
    switch (this.state) {
      case 'disconnected':
        return 'warning';
      case 'error':
        return 'alert-octagon';
      case 'engaged':
        return 'helm';
      default:
        return 'compass';
    }
  }

  stateLabel(): string {
    switch (this.state) {
      case 'disconnected':
        return 'DISCONNECTED';
      case 'standby':
        return 'STANDBY';
      case 'engaged':
        return 'ENGAGED';
      case 'error':
        return 'ERROR';
      default:
        return 'UNKNOWN';
    }
  }

  stateDescription(): string {
    switch (this.state) {
      case 'disconnected':
        return 'Controller link unavailable';
      case 'standby':
        return 'Manual steering';
      case 'engaged':
        return 'Pilot holding selected target';
      case 'error':
        return 'Pilot fault requires attention';
      default:
        return 'Pilot state unavailable';
    }
  }

  modeLabel(): string {
    switch (this.mode) {
      case 'standby':
        return 'STANDBY';
      case 'auto':
        return 'AUTO';
      case 'wind':
        return 'WIND';
      case 'route':
        return 'ROUTE';
      default:
        return 'UNKNOWN';
    }
  }

  targetLabel(): string {
    if (this.target === null || this.target === undefined || !Number.isFinite(this.target)) {
      return '--';
    }

    const normalized = this.normalizeHeading(this.target);
    if (this.mode === 'wind') {
      return `${normalized}deg AWA`;
    }
    return `${normalized.toString().padStart(3, '0')}deg`;
  }

  private normalizeHeading(value: number): number {
    return ((Math.round(value) % 360) + 360) % 360;
  }
}

