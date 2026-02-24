import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppIconComponent } from '../../app-icon/app-icon.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AlarmItemComponent, AlarmItemData, AlarmItemSeverity } from '../alarm-item/alarm-item.component';

interface AlarmListGroup {
  key: 'emergency' | 'critical' | 'warning' | 'other';
  label: string;
  alarms: AlarmItemData[];
}

@Component({
  selector: 'app-alarm-list',
  standalone: true,
  imports: [
    CommonModule,
    AppBoxComponent,
    AppIconComponent,
    AppStackComponent,
    AppTextComponent,
    AlarmItemComponent
  ],
  template: `
    <app-box class="alarm-list" padding="4">
      <app-stack spacing="md">
        <div class="list-header">
          <div>
            <app-text variant="overline">ALARM LIST</app-text>
            <app-text variant="caption" class="text-muted">{{ headerSubtitle() }}</app-text>
          </div>
          <span class="count-pill" *ngIf="sortedAlarms.length > 0">{{ sortedAlarms.length }}</span>
        </div>

        <ng-container *ngIf="sortedAlarms.length > 0; else emptyState">
          <ng-container *ngIf="grouped; else flatList">
            <div class="group-block" *ngFor="let group of groupedAlarms">
              <div class="group-header">
                <app-text variant="caption" weight="bold">{{ group.label }}</app-text>
                <span class="group-count">{{ group.alarms.length }}</span>
              </div>
              <div class="group-items">
                <app-alarm-item
                  *ngFor="let alarm of group.alarms; trackBy: trackByAlarm"
                  [alarm]="alarm"
                  [showActions]="showActions"
                  (onAcknowledge)="handleAcknowledge($event)"
                  (onSilence)="handleSilence($event)"
                />
              </div>
            </div>
          </ng-container>

          <ng-template #flatList>
            <div class="flat-items">
              <app-alarm-item
                *ngFor="let alarm of sortedAlarms; trackBy: trackByAlarm"
                [alarm]="alarm"
                [showActions]="showActions"
                (onAcknowledge)="handleAcknowledge($event)"
                (onSilence)="handleSilence($event)"
              />
            </div>
          </ng-template>
        </ng-container>

        <ng-template #emptyState>
          <div class="empty-state">
            <app-icon name="info" size="20"></app-icon>
            <app-text variant="caption" class="text-muted">No active alarms.</app-text>
          </div>
        </ng-template>
      </app-stack>
    </app-box>
  `,
  styleUrls: ['./alarm-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlarmListComponent {
  @Input() alarms: AlarmItemData[] = [];
  @Input() grouped = false;
  @Input() showActions = true;

  @Output() onAcknowledge = new EventEmitter<AlarmItemData>();
  @Output() onSilence = new EventEmitter<AlarmItemData>();

  get sortedAlarms(): AlarmItemData[] {
    return [...this.alarms].sort((a, b) => {
      const severityDelta = this.severityRank(a.severity) - this.severityRank(b.severity);
      if (severityDelta !== 0) {
        return severityDelta;
      }
      return this.toEpoch(b.timestamp) - this.toEpoch(a.timestamp);
    });
  }

  get groupedAlarms(): AlarmListGroup[] {
    const groups: AlarmListGroup[] = [
      { key: 'emergency', label: 'Emergency', alarms: [] },
      { key: 'critical', label: 'Critical', alarms: [] },
      { key: 'warning', label: 'Warning', alarms: [] },
      { key: 'other', label: 'Other', alarms: [] }
    ];

    for (const alarm of this.sortedAlarms) {
      const key = this.groupKey(alarm.severity);
      const group = groups.find((item) => item.key === key);
      if (group) {
        group.alarms.push(alarm);
      }
    }

    return groups.filter((group) => group.alarms.length > 0);
  }

  trackByAlarm = (_index: number, alarm: AlarmItemData): string => alarm.id;

  headerSubtitle(): string {
    if (this.sortedAlarms.length === 0) {
      return 'Empty state';
    }
    if (this.grouped) {
      return 'Grouped by severity';
    }
    return 'Sorted by severity and recency';
  }

  handleAcknowledge(alarm?: AlarmItemData): void {
    if (alarm) {
      this.onAcknowledge.emit(alarm);
    }
  }

  handleSilence(alarm?: AlarmItemData): void {
    if (alarm) {
      this.onSilence.emit(alarm);
    }
  }

  private severityRank(severity: AlarmItemSeverity): number {
    switch (severity) {
      case 'emergency':
        return 0;
      case 'critical':
        return 1;
      case 'warning':
        return 2;
      default:
        return 3;
    }
  }

  private groupKey(severity: AlarmItemSeverity): AlarmListGroup['key'] {
    if (severity === 'emergency') {
      return 'emergency';
    }
    if (severity === 'critical') {
      return 'critical';
    }
    if (severity === 'warning') {
      return 'warning';
    }
    return 'other';
  }

  private toEpoch(value: AlarmItemData['timestamp']): number {
    if (typeof value === 'number') {
      return value;
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}
