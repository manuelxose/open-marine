import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppInstrumentCardComponent } from '../../shared/components/app-instrument-card/app-instrument-card.component';
import { CompassWidgetComponent } from '../../ui/instruments/compass-widget/compass-widget.component';
import { SogInstrumentComponent } from '../../ui/instruments/sog/sog-instrument.component';
import { DepthGaugeWidgetComponent } from '../../ui/instruments/depth-gauge-widget/depth-gauge-widget.component';
import { WindWidgetComponent } from '../../ui/instruments/wind-widget/wind-widget.component';
import { PowerCardComponent } from '../../ui/instruments/power-card/power-card.component';
import { InstrumentsFacadeService, type InstrumentWidget, type InstrumentWidgetSize } from '../../features/instruments/instruments-facade.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { LayoutService } from '../../core/services/layout.service';
import { WIDGET_DEFINITIONS, type WidgetDefinition } from '../../core/models/widget.models';

@Component({
  selector: 'app-widgets-page',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    TranslatePipe,
    AppIconComponent,
    AppButtonComponent,
    AppInstrumentCardComponent,
    CompassWidgetComponent,
    SogInstrumentComponent,
    DepthGaugeWidgetComponent,
    WindWidgetComponent,
    PowerCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="widgets-page">
      <header class="page-header">
        <h1>{{ 'widgets.title' | translate }}</h1>
        <p class="subtitle">{{ 'widgets.subtitle' | translate }}</p>
      </header>

      <section class="widgets-section">
        <div class="section-header">
          <div>
            <h2>{{ 'widgets.sections.instruments' | translate }}</h2>
            <p class="section-description">{{ 'widgets.instruments.desc' | translate }}</p>
          </div>
          <app-button
            variant="ghost"
            size="sm"
            (action)="resetInstrumentWidgets()"
          >
            {{ 'widgets.reset' | translate }}
          </app-button>
        </div>

        <div
          class="widget-list"
          cdkDropList
          [cdkDropListData]="instrumentWidgets()"
          (cdkDropListDropped)="reorderInstrumentWidgets($event)"
        >
          <div class="widget-row" *ngFor="let widget of instrumentWidgets(); trackBy: trackByInstrumentId" cdkDrag>
            <button class="drag-handle" type="button" cdkDragHandle aria-label="Reorder">
              <app-icon name="menu" size="16"></app-icon>
            </button>
            <div class="widget-info">
              <span class="widget-title">{{ widget.type | titlecase }}</span>
              <span class="widget-meta">ID: {{ widget.id }}</span>
            </div>
            <div class="widget-actions">
              <label class="toggle">
                <input type="checkbox" [checked]="widget.visible" (change)="toggleInstrumentVisibility(widget.id)" />
                <span>{{ widget.visible ? 'On' : 'Off' }}</span>
              </label>
              <select class="size-select" [value]="widget.size" (change)="changeInstrumentSize(widget.id, $event)">
                <option value="sm">SM</option>
                <option value="md">MD</option>
                <option value="lg">LG</option>
              </select>
            </div>
            <div
              class="widget-preview"
              *ngIf="widget.visible"
              [class.preview-selected]="isInstrumentSelected(widget.id)"
              (click)="toggleInstrumentSelection(widget.id)"
            >
              <span class="preview-badge">
                <app-icon name="check" size="14"></app-icon>
                Selected
              </span>
              <ng-container [ngSwitch]="widget.type">
                <app-compass-widget *ngSwitchCase="'compass'"></app-compass-widget>
                <app-sog-instrument *ngSwitchCase="'speed'"></app-sog-instrument>
                <app-depth-gauge-widget *ngSwitchCase="'depth'" unit="m"></app-depth-gauge-widget>
                <app-wind-widget *ngSwitchCase="'wind'"></app-wind-widget>
                <app-power-card *ngSwitchCase="'battery'"></app-power-card>
                <app-instrument-card *ngSwitchCase="'gps'" label="GPS" [value]="gpsStatus()"></app-instrument-card>
                <app-instrument-card *ngSwitchCase="'clock'" label="UTC" [value]="clockLabel()"></app-instrument-card>
              </ng-container>
            </div>
          </div>
        </div>
      </section>

      <section class="widgets-section">
        <div class="section-header">
          <div>
            <h2>{{ 'widgets.sections.dashboard' | translate }}</h2>
            <p class="section-description">{{ 'widgets.dashboard.desc' | translate }}</p>
          </div>
          <app-button
            variant="ghost"
            size="sm"
            (action)="resetDashboardWidgets()"
          >
            {{ 'widgets.reset' | translate }}
          </app-button>
        </div>

        <div
          class="widget-list"
          cdkDropList
          [cdkDropListData]="dashboardWidgets()"
          (cdkDropListDropped)="reorderDashboardWidgets($event)"
        >
          <div class="widget-row" *ngFor="let item of dashboardWidgets(); trackBy: trackByDashboardId" cdkDrag>
            <button class="drag-handle" type="button" cdkDragHandle aria-label="Reorder">
              <app-icon name="menu" size="16"></app-icon>
            </button>
            <div class="widget-info">
              <span class="widget-title">{{ (item.definition?.title || '') | translate }}</span>
              <span class="widget-meta">{{ item.definition?.category | titlecase }} · {{ item.definition?.size }}</span>
            </div>
            <div class="widget-actions">
              <label class="toggle">
                <input type="checkbox" [checked]="item.config.visible" (change)="toggleDashboardVisibility(item.config.id)" />
                <span>{{ item.config.visible ? 'On' : 'Off' }}</span>
              </label>
            </div>
            <div
              class="widget-preview"
              *ngIf="item.config.visible"
              [class.preview-selected]="isDashboardSelected(item.config.id)"
              (click)="toggleDashboardSelection(item.config.id)"
            >
              <span class="preview-badge">
                <app-icon name="check" size="14"></app-icon>
                Selected
              </span>
              <app-instrument-card
                [label]="(item.definition?.title || '') | translate"
                value="Preview"
                [icon]="dashboardIcon(item.definition)"
              ></app-instrument-card>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .widgets-page {
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
      background: var(--bg);
    }

    .page-header {
      max-width: 960px;
      margin: 0 auto 2rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      color: var(--text-1);
    }

    .subtitle {
      color: var(--text-2);
      font-size: 0.9rem;
    }

    .widgets-section {
      max-width: 960px;
      margin: 0 auto 2rem;
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: var(--shadow);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    h2 {
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-2);
      margin-bottom: 0.35rem;
    }

    .section-description {
      color: var(--text-3);
      font-size: 0.85rem;
    }

    .widget-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .widget-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-rows: auto auto;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface-2);
    }

    .drag-handle {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
    }

    .widget-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .widget-title {
      font-weight: 600;
      color: var(--text-1);
    }

    .widget-meta {
      font-size: 0.75rem;
      color: var(--text-3);
    }

    .widget-actions {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
    }

    .widget-preview {
      grid-column: 1 / -1;
      padding: 0.5rem;
      border-radius: 12px;
      background: var(--surface-1);
      border: 1px solid var(--border);
      position: relative;
      cursor: pointer;
    }

    .preview-selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px rgba(129, 161, 193, 0.45);
    }

    .preview-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.25rem 0.45rem;
      border-radius: 999px;
      background: rgba(94, 129, 172, 0.2);
      color: var(--text-2);
      opacity: 0;
      transition: opacity 120ms ease;
      pointer-events: none;
    }

    .preview-selected .preview-badge {
      opacity: 1;
    }

    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-2);
    }

    .toggle input {
      width: 18px;
      height: 18px;
    }

    .size-select {
      background: var(--surface-1);
      border: 1px solid var(--border);
      color: var(--text-1);
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    @media (max-width: 720px) {
      .widgets-page {
        padding: 1rem;
      }

      .widgets-section {
        padding: 1rem;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .widget-row {
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto;
      }

      .widget-actions {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }
  `],
})
export class WidgetsPage {
  private readonly instrumentsFacade = inject(InstrumentsFacadeService);
  private readonly layoutService = inject(LayoutService);
  private readonly store = inject(DatapointStoreService);

  private readonly instrumentsSignal = toSignal(this.instrumentsFacade.widgets$, {
    initialValue: this.instrumentsFacade.snapshot,
  });
  private readonly layoutSignal = toSignal(this.layoutService.layout$, {
    initialValue: this.layoutService.getSnapshot(),
  });
  private readonly clockTick = toSignal(timer(0, 1000), { initialValue: 0 });
  private readonly positionSignal = toSignal(
    this.store.observe<{ latitude: number; longitude: number }>(PATHS.navigation.position),
    { initialValue: null },
  );

  readonly instrumentWidgets = computed(() => this.instrumentsSignal());
  readonly dashboardWidgets = computed(() => {
    const layout = this.layoutSignal();
    return layout.widgets
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((config) => ({
        config,
        definition: WIDGET_DEFINITIONS.find((def) => def.id === config.id) as WidgetDefinition | undefined,
      }));
  });
  readonly gpsStatus = computed(() => {
    const point = this.positionSignal();
    if (!point) return 'NO FIX';
    const ageSeconds = (Date.now() - point.timestamp) / 1000;
    if (ageSeconds > 5) return 'STALE';
    return 'FIX';
  });
  readonly clockLabel = computed(() => {
    this.clockTick();
    return new Date().toISOString().slice(11, 19);
  });
  private readonly selectedInstrumentIds = new Set<string>();
  private readonly selectedDashboardIds = new Set<string>();

  trackByInstrumentId(index: number, widget: InstrumentWidget): string {
    return widget.id;
  }

  trackByDashboardId(index: number, item: { config: { id: string } }): string {
    return item.config.id;
  }

  toggleInstrumentVisibility(id: string): void {
    const widget = this.instrumentsFacade.snapshot.find((item) => item.id === id);
    if (!widget) return;
    this.instrumentsFacade.setVisibility(id, !widget.visible);
  }

  changeInstrumentSize(id: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.instrumentsFacade.setSize(id, target.value as InstrumentWidgetSize);
  }

  reorderInstrumentWidgets(event: CdkDragDrop<InstrumentWidget[]>): void {
    const updated = [...this.instrumentWidgets()];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.instrumentsFacade.setWidgets(updated);
  }

  resetInstrumentWidgets(): void {
    this.instrumentsFacade.resetDefaults();
  }

  toggleDashboardVisibility(id: string): void {
    this.layoutService.toggleWidget(id);
  }

  reorderDashboardWidgets(event: CdkDragDrop<any[]>): void {
    const ordered = this.dashboardWidgets().map((item) => item.config.id);
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);
    this.layoutService.reorderWidgets(ordered);
  }

  resetDashboardWidgets(): void {
    this.layoutService.reset();
  }

  dashboardIcon(definition: WidgetDefinition | undefined): any {
    switch (definition?.category) {
      case 'navigation':
        return 'compass';
      case 'environment':
        return 'wind';
      case 'electrical':
        return 'battery';
      case 'system':
        return 'settings';
      default:
        return 'activity';
    }
  }

  isInstrumentSelected(id: string): boolean {
    return this.selectedInstrumentIds.has(id);
  }

  toggleInstrumentSelection(id: string): void {
    if (this.selectedInstrumentIds.has(id)) {
      this.selectedInstrumentIds.delete(id);
    } else {
      this.selectedInstrumentIds.add(id);
    }
  }

  isDashboardSelected(id: string): boolean {
    return this.selectedDashboardIds.has(id);
  }

  toggleDashboardSelection(id: string): void {
    if (this.selectedDashboardIds.has(id)) {
      this.selectedDashboardIds.delete(id);
    } else {
      this.selectedDashboardIds.add(id);
    }
  }
}
