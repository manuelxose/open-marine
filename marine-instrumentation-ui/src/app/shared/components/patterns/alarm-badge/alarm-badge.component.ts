import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export type AlarmBadgeSeverity = 'none' | 'warning' | 'critical' | 'emergency';

@Component({
  selector: 'app-alarm-badge',
  standalone: true,
  imports: [CommonModule, AppTextComponent, AppIconComponent],
  template: `
    <div class="alarm-badge" [ngClass]="severityClass()">
      <div class="badge-content">
        <div class="icon-wrap">
          <app-icon name="alarm" size="sm"></app-icon>
          <span class="pulse-dot" *ngIf="pulse"></span>
        </div>
        <div class="badge-text">
          <app-text variant="overline">ALARMS</app-text>
          <app-text variant="value" size="xl">{{ displayCount() }}</app-text>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./alarm-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlarmBadgeComponent {
  @Input() count = 0;
  @Input() severity: AlarmBadgeSeverity = 'none';
  @Input() pulse = false;

  displayCount(): string {
    if (this.count <= 0) return '0';
    if (this.count > 99) return '99+';
    return this.count.toString();
  }

  severityClass(): string {
    return `severity-${this.severity}`;
  }
}
