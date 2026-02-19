import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../app-button/app-button.component';
import { AppIconComponent, IconName } from '../../app-icon/app-icon.component';
import {
  AppInstrumentCardComponent,
  InstrumentStatus
} from '../../app-instrument-card/app-instrument-card.component';

export type InstrumentPanelLayout = 'grid' | 'list';

export interface InstrumentPanelItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  icon?: IconName;
  status?: InstrumentStatus;
}

@Component({
  selector: 'app-instrument-panel-widget',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppIconComponent, AppInstrumentCardComponent],
  template: `
    <section class="instrument-panel-widget" [class.instrument-panel-widget--edit]="editMode">
      <header class="instrument-panel-widget__header">
        <div>
          <p class="instrument-panel-widget__title">Instrument Panel</p>
          <p class="instrument-panel-widget__subtitle">{{ instruments.length }} instruments</p>
        </div>
        <app-button
          *ngIf="editable"
          size="sm"
          variant="ghost"
          [label]="editMode ? 'Done' : 'Edit'"
          iconLeft="settings"
          (action)="toggleEdit()"
        />
      </header>

      <div class="instrument-panel-widget__empty" *ngIf="instruments.length === 0">
        <app-icon name="info" size="18"></app-icon>
        <span>No instruments configured</span>
      </div>

      <div
        class="instrument-panel-widget__items"
        [class.instrument-panel-widget__items--list]="layout === 'list'"
        *ngIf="instruments.length > 0"
      >
        <button
          type="button"
          class="instrument-panel-widget__item"
          *ngFor="let item of instruments; trackBy: trackById"
          (click)="onSelect.emit(item.id)"
          [attr.aria-label]="'Open instrument ' + item.label"
        >
          <app-instrument-card
            [label]="item.label"
            [value]="item.value"
            [unit]="item.unit ?? ''"
            [icon]="item.icon ?? 'activity'"
            [status]="item.status ?? 'neutral'"
          />
          <span class="instrument-panel-widget__drag" *ngIf="editMode">
            <app-icon name="menu" size="14"></app-icon>
          </span>
        </button>
      </div>
    </section>
  `,
  styleUrls: ['./instrument-panel-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstrumentPanelWidgetComponent {
  @Input() instruments: InstrumentPanelItem[] = [];
  @Input() layout: InstrumentPanelLayout = 'grid';
  @Input() editable = false;

  @Output() onEditToggle = new EventEmitter<boolean>();
  @Output() onSelect = new EventEmitter<string>();

  editMode = false;

  trackById(_: number, item: InstrumentPanelItem): string {
    return item.id;
  }

  toggleEdit(): void {
    this.editMode = !this.editMode;
    this.onEditToggle.emit(this.editMode);
  }
}
