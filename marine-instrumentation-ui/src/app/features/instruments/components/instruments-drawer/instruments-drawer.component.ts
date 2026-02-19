import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppDrawerComponent } from '../../../../shared/components/app-drawer/app-drawer.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { AppInstrumentCardComponent } from '../../../../shared/components/app-instrument-card/app-instrument-card.component';
import { CompassWidgetComponent } from '../../../../ui/instruments/compass-widget/compass-widget.component';
import { SpeedometerWidgetComponent } from '../../../../ui/instruments/speedometer-widget/speedometer-widget.component';
import { DepthGaugeWidgetComponent } from '../../../../ui/instruments/depth-gauge-widget/depth-gauge-widget.component';
import { WindWidgetComponent } from '../../../../ui/instruments/wind-widget/wind-widget.component';
import { BatteryWidgetComponent } from '../../../../ui/instruments/battery-widget/battery-widget.component';
import { MeteoWidgetComponent } from '../../../../ui/instruments/meteo-widget/meteo-widget.component';
import type { InstrumentWidget } from '../../instruments-facade.service';

export interface InstrumentData {
  heading?: number | null;
  sog?: number | null;
  depth?: number | null;
  aws?: number | null;
  awa?: number | null;
  tws?: number | null;
  twa?: number | null;
  voltage?: number | null;
  current?: number | null;
  fixState?: 'no-fix' | 'fix' | 'stale';
  position?: { lat: number; lon: number } | null;
}

@Component({
  selector: 'app-instruments-drawer',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    AppDrawerComponent,
    AppIconComponent,
    AppInstrumentCardComponent,
    CompassWidgetComponent,
    SpeedometerWidgetComponent,
    DepthGaugeWidgetComponent,
    WindWidgetComponent,
    BatteryWidgetComponent,
    MeteoWidgetComponent,
  ],
  template: `
    <app-drawer
      [isOpen]="isOpen"
      [position]="position"
      [title]="title"
      (close)="close.emit()"
    >
      <div
        class="instruments-grid"
        cdkDropList
        [cdkDropListData]="visibleWidgets"
        (cdkDropListDropped)="handleReorder($event)"
      >
        <div class="instrument-item" *ngFor="let widget of visibleWidgets; trackBy: trackById" cdkDrag>
          <button class="drag-handle" type="button" cdkDragHandle aria-label="Reorder widget">
            <app-icon name="menu" size="16" />
          </button>

          <app-compass-widget *ngIf="widget.type === 'compass'"></app-compass-widget>
          <app-speedometer-widget *ngIf="widget.type === 'speed'"></app-speedometer-widget>
          <app-depth-gauge-widget
            *ngIf="widget.type === 'depth'"
            [unit]="depthUnit"
          ></app-depth-gauge-widget>
          <app-wind-widget *ngIf="widget.type === 'wind'"></app-wind-widget>
          <app-battery-widget *ngIf="widget.type === 'battery'"></app-battery-widget>
          <app-meteo-widget *ngIf="widget.type === 'meteo'"></app-meteo-widget>

          <app-instrument-card
            *ngIf="widget.type === 'gps'"
            label="GPS"
            [value]="data?.fixState ?? '--'"
          ></app-instrument-card>
          <app-instrument-card
            *ngIf="widget.type === 'clock'"
            label="UTC"
            [value]="utcLabel"
          ></app-instrument-card>
        </div>
      </div>

      <button class="configure-btn" type="button" (click)="configure.emit()">
        <app-icon name="settings" />
        Configure Instruments
      </button>
    </app-drawer>
  `,
  styleUrls: ['./instruments-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentsDrawerComponent {
  @Input() isOpen = false;
  @Input() position: 'left' | 'right' | 'bottom' = 'right';
  @Input() title = 'Instruments';
  @Input() widgets: InstrumentWidget[] = [];
  @Input() data: InstrumentData | null = null;
  @Input() speedUnit: 'kn' | 'm/s' | 'km/h' = 'kn';
  @Input() depthUnit: 'm' | 'ft' = 'm';
  @Input() shallowThreshold = 3;

  @Output() close = new EventEmitter<void>();
  @Output() configure = new EventEmitter<void>();
  @Output() reorder = new EventEmitter<{ previousIndex: number; currentIndex: number }>();

  get visibleWidgets(): InstrumentWidget[] {
    return this.widgets.filter((widget) => widget.visible);
  }

  get utcLabel(): string {
    return new Date().toISOString().slice(11, 19);
  }

  trackById(_index: number, widget: InstrumentWidget): string {
    return widget.id;
  }

  handleReorder(event: CdkDragDrop<InstrumentWidget[]>): void {
    this.reorder.emit({
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }
}
