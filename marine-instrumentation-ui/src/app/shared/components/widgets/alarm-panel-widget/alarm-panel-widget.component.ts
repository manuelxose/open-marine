import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AlarmItemData } from '../../patterns/alarm-item/alarm-item.component';
import { AlarmListComponent } from '../../patterns/alarm-list/alarm-list.component';

export type AlarmPanelVisualState = 'empty' | 'normal' | 'warning' | 'critical';

@Component({
  selector: 'app-alarm-panel-widget',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent, AlarmListComponent],
  template: `
    <section class="alarm-panel-widget" [class]="'alarm-panel-widget--' + visualState()">
      <header class="alarm-panel-widget__header">
        <div class="alarm-panel-widget__title-wrap">
          <p class="alarm-panel-widget__title">Alarm Panel</p>
          <span class="alarm-panel-widget__state">{{ visualState().toUpperCase() }}</span>
        </div>
        <app-button
          size="sm"
          variant="ghost"
          label="Configure"
          iconLeft="settings"
          (action)="onConfigure.emit()"
        />
      </header>

      <div class="alarm-panel-widget__empty" *ngIf="alarms.length === 0">
        <app-icon name="info" size="18"></app-icon>
        <span>No active alarms</span>
      </div>

      <app-alarm-list
        *ngIf="alarms.length > 0"
        [alarms]="alarms"
        [grouped]="true"
        [showActions]="true"
        (onAcknowledge)="onAcknowledge.emit($event)"
        (onSilence)="onSilence.emit($event)"
      />
    </section>
  `,
  styleUrls: ['./alarm-panel-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlarmPanelWidgetComponent {
  @Input() alarms: AlarmItemData[] = [];

  @Output() onAcknowledge = new EventEmitter<AlarmItemData>();
  @Output() onSilence = new EventEmitter<AlarmItemData>();
  @Output() onConfigure = new EventEmitter<void>();

  visualState(): AlarmPanelVisualState {
    if (this.alarms.length === 0) {
      return 'empty';
    }

    const severities = this.alarms.map((alarm) => alarm.severity);
    if (severities.some((severity) => severity === 'critical' || severity === 'emergency')) {
      return 'critical';
    }
    if (severities.some((severity) => severity === 'warning')) {
      return 'warning';
    }
    return 'normal';
  }
}
