import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../app-icon/app-icon.component';

export type SettingsPanelFieldType = 'toggle' | 'select' | 'number';

export interface SettingsPanelOption {
  label: string;
  value: string;
}

export interface SettingsPanelItem {
  id: string;
  label: string;
  description?: string;
  type: SettingsPanelFieldType;
  value: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: SettingsPanelOption[];
}

export interface SettingsPanelChange {
  id: string;
  value: string | number | boolean;
}

@Component({
  selector: 'app-settings-panel-widget',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <section class="settings-panel-widget">
      <header class="settings-panel-widget__header">
        <p class="settings-panel-widget__title">Settings Panel</p>
      </header>

      <div class="settings-panel-widget__empty" *ngIf="settings.length === 0">
        <app-icon name="settings" size="18"></app-icon>
        <span>No settings available</span>
      </div>

      <ul class="settings-panel-widget__list" *ngIf="settings.length > 0">
        <li class="settings-panel-widget__item" *ngFor="let setting of settings; trackBy: trackById">
          <div class="settings-panel-widget__meta">
            <p class="settings-panel-widget__label">{{ setting.label }}</p>
            <p class="settings-panel-widget__description" *ngIf="setting.description">{{ setting.description }}</p>
          </div>

          <div class="settings-panel-widget__control">
            <label class="settings-panel-widget__toggle" *ngIf="setting.type === 'toggle'">
              <input
                type="checkbox"
                [checked]="toBoolean(setting.value)"
                (change)="emitToggle(setting.id, $event)"
              />
              <span>{{ toBoolean(setting.value) ? 'On' : 'Off' }}</span>
            </label>

            <select
              *ngIf="setting.type === 'select'"
              class="settings-panel-widget__select"
              [value]="toString(setting.value)"
              (change)="emitSelect(setting.id, $event)"
            >
              <option *ngFor="let option of setting.options ?? []" [value]="option.value">
                {{ option.label }}
              </option>
            </select>

            <input
              *ngIf="setting.type === 'number'"
              type="number"
              class="settings-panel-widget__number"
              [value]="toNumber(setting.value)"
              [min]="setting.min ?? null"
              [max]="setting.max ?? null"
              [step]="setting.step ?? null"
              (change)="emitNumber(setting.id, $event)"
            />
          </div>
        </li>
      </ul>
    </section>
  `,
  styleUrls: ['./settings-panel-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPanelWidgetComponent {
  @Input() settings: SettingsPanelItem[] = [];

  @Output() onChange = new EventEmitter<SettingsPanelChange>();

  trackById(_: number, item: SettingsPanelItem): string {
    return item.id;
  }

  toBoolean(value: string | number | boolean): boolean {
    return Boolean(value);
  }

  toNumber(value: string | number | boolean): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  toString(value: string | number | boolean): string {
    return String(value);
  }

  emitToggle(id: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }
    this.onChange.emit({ id, value: target.checked });
  }

  emitSelect(id: string, event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    this.onChange.emit({ id, value: target.value });
  }

  emitNumber(id: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }
    const numeric = Number(target.value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    this.onChange.emit({ id, value: numeric });
  }
}

