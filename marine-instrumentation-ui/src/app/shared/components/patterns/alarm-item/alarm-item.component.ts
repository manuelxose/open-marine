import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppBoxComponent } from '../../app-box/app-box.component';
import { AppStackComponent } from '../../app-stack/app-stack.component';
import { AppTextComponent } from '../../app-text/app-text.component';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { TimeAgoPipe } from '../../../pipes/time-ago.pipe';

export type AlarmItemSeverity = 'warning' | 'critical' | 'emergency';
export type AlarmItemState = 'active' | 'acknowledged' | 'silenced';

export interface AlarmItemData {
  id: string;
  title: string;
  message: string;
  severity: AlarmItemSeverity;
  state: AlarmItemState;
  timestamp?: number | string | Date;
  source?: string;
}

@Component({
  selector: 'app-alarm-item',
  standalone: true,
  imports: [
    CommonModule,
    AppBoxComponent,
    AppStackComponent,
    AppTextComponent,
    AppIconComponent,
    AppButtonComponent,
    TimeAgoPipe
  ],
  template: `
    <app-box class="alarm-item" padding="3" [ngClass]="severityClass()">
      <app-stack spacing="sm">
        <div class="alarm-header">
          <div class="alarm-title">
            <div class="alarm-icon" [ngClass]="severityClass()">
              <app-icon [name]="severityIcon()" size="sm"></app-icon>
            </div>
            <div class="title-text">
              <app-text variant="body" weight="bold">{{ alarm?.title || 'Alarm' }}</app-text>
              <app-text variant="caption" class="text-muted">{{ alarm?.message || '--' }}</app-text>
            </div>
          </div>
          <span class="state-pill" [ngClass]="stateClass()">
            <app-text variant="overline">{{ stateLabel() }}</app-text>
          </span>
        </div>

        <div class="alarm-meta">
          <app-text variant="caption" class="text-muted">
            {{ alarm?.timestamp ? (alarm?.timestamp | timeAgo) : '--' }}
          </app-text>
          <app-text variant="caption" class="text-muted" *ngIf="alarm?.source">
            · {{ alarm?.source }}
          </app-text>
        </div>

        <div class="alarm-actions" *ngIf="showActions">
          <app-button
            size="sm"
            [variant]="alarm?.severity === 'warning' ? 'warning' : 'danger'"
            label="Acknowledge"
            (action)="acknowledge()"
            [disabled]="!canAcknowledge()">
          </app-button>
          <app-button
            size="sm"
            variant="ghost"
            label="Silence"
            (action)="silence()"
            [disabled]="!canSilence()">
          </app-button>
        </div>
      </app-stack>
    </app-box>
  `,
  styleUrls: ['./alarm-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlarmItemComponent {
  @Input() alarm?: AlarmItemData;
  @Input() showActions = true;

  @Output() onAcknowledge = new EventEmitter<AlarmItemData | undefined>();
  @Output() onSilence = new EventEmitter<AlarmItemData | undefined>();

  acknowledge(): void {
    this.onAcknowledge.emit(this.alarm);
  }

  silence(): void {
    this.onSilence.emit(this.alarm);
  }

  canAcknowledge(): boolean {
    return this.alarm?.state === 'active';
  }

  canSilence(): boolean {
    return this.alarm?.state !== 'silenced';
  }

  severityClass(): string {
    return `severity-${this.alarm?.severity || 'warning'}`;
  }

  stateClass(): string {
    return `state-${this.alarm?.state || 'active'}`;
  }

  stateLabel(): string {
    switch (this.alarm?.state) {
      case 'acknowledged':
        return 'Acknowledged';
      case 'silenced':
        return 'Silenced';
      default:
        return 'Active';
    }
  }

  severityIcon(): IconName {
    switch (this.alarm?.severity) {
      case 'emergency':
        return 'alarm';
      case 'critical':
        return 'error';
      default:
        return 'warning';
    }
  }
}
