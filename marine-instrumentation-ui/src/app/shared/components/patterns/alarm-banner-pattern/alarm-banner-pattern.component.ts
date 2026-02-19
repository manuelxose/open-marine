import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import { AlarmItemData } from '../alarm-item/alarm-item.component';

@Component({
  selector: 'app-alarm-banner-pattern',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent],
  template: `
    <section
      class="alarm-banner-pattern"
      [ngClass]="[severityClass(), stateClass()]"
    >
      <ng-container *ngIf="alarm; else emptyState">
        <div class="alarm-banner-pattern__content">
          <div class="alarm-banner-pattern__main">
            <div class="alarm-banner-pattern__icon" [ngClass]="severityClass()">
              <app-icon [name]="severityIcon()" size="18"></app-icon>
            </div>

            <div class="alarm-banner-pattern__text">
              <div class="alarm-banner-pattern__title-row">
                <p class="alarm-banner-pattern__title">{{ alarm.title }}</p>
                <span class="alarm-banner-pattern__state-pill">{{ stateLabel() }}</span>
              </div>
              <p class="alarm-banner-pattern__message">{{ alarm.message }}</p>
              <p class="alarm-banner-pattern__source" *ngIf="alarm.source">Source: {{ alarm.source }}</p>
            </div>
          </div>

          <div class="alarm-banner-pattern__actions">
            <app-button
              *ngIf="canAcknowledge()"
              size="sm"
              [variant]="alarm.severity === 'warning' ? 'warning' : 'danger'"
              label="Acknowledge"
              (action)="acknowledge()"
            />
            <app-button
              *ngIf="showDetails"
              size="sm"
              variant="ghost"
              label="Details"
              (action)="openDetails()"
            />
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="alarm-banner-pattern__empty">
          <app-icon name="info" size="16"></app-icon>
          <span>No alarm selected</span>
        </div>
      </ng-template>
    </section>
  `,
  styleUrls: ['./alarm-banner-pattern.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlarmBannerPatternComponent {
  @Input() alarm: AlarmItemData | null = null;
  @Input() showDetails = true;

  @Output() onAcknowledge = new EventEmitter<AlarmItemData>();
  @Output() onDetails = new EventEmitter<AlarmItemData>();

  acknowledge(): void {
    if (this.alarm) {
      this.onAcknowledge.emit(this.alarm);
    }
  }

  openDetails(): void {
    if (this.alarm) {
      this.onDetails.emit(this.alarm);
    }
  }

  canAcknowledge(): boolean {
    return this.alarm?.state === 'active';
  }

  severityClass(): string {
    return `severity-${this.alarm?.severity || 'warning'}`;
  }

  stateClass(): string {
    return `state-${this.alarm?.state || 'active'}`;
  }

  stateLabel(): string {
    if (this.alarm?.state === 'acknowledged') {
      return 'Acknowledged';
    }
    if (this.alarm?.state === 'silenced') {
      return 'Silenced';
    }
    return 'Active';
  }

  severityIcon(): IconName {
    if (this.alarm?.severity === 'emergency') {
      return 'alarm';
    }
    if (this.alarm?.severity === 'critical') {
      return 'error';
    }
    return 'warning';
  }
}
