import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { PATHS } from '@omi/marine-data-contract';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AppIconComponent, IconName } from '../../shared/components/app-icon/app-icon.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppInstrumentCardComponent } from '../../shared/components/app-instrument-card/app-instrument-card.component';
import { CompassWidgetComponent } from '../../ui/instruments/compass-widget/compass-widget.component';
import { SpeedometerWidgetComponent } from '../../ui/instruments/speedometer-widget/speedometer-widget.component';
import { DepthGaugeWidgetComponent } from '../../ui/instruments/depth-gauge-widget/depth-gauge-widget.component';
import { DepthWidgetComponent } from '../../ui/instruments/depth-widget/depth-widget.component';
import { WindWidgetComponent } from '../../ui/instruments/wind-widget/wind-widget.component';
import { RudderWidgetComponent } from '../../ui/instruments/rudder-widget/rudder-widget.component';
import { EngineRpmWidgetComponent } from '../../ui/instruments/engine-rpm-widget/engine-rpm-widget.component';
import { TankWidgetComponent } from '../../ui/instruments/tank-widget/tank-widget.component';
import { BatteryWidgetComponent } from '../../ui/instruments/battery-widget/battery-widget.component';
import { MeteoWidgetComponent } from '../../ui/instruments/meteo-widget/meteo-widget.component';
import { NavigationWidgetComponent } from '../../ui/instruments/navigation-card/navigation-card.component';
import { InstrumentsFacadeService, type InstrumentWidget, type InstrumentWidgetSize } from '../../features/instruments/instruments-facade.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { LayoutService } from '../../core/services/layout.service';
import { WIDGET_DEFINITIONS, type WidgetDefinition, type WidgetConfig } from '../../core/models/widget.models';

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
    SpeedometerWidgetComponent,
    DepthGaugeWidgetComponent,
    DepthWidgetComponent,
    WindWidgetComponent,
    RudderWidgetComponent,
    EngineRpmWidgetComponent,
    TankWidgetComponent,
    BatteryWidgetComponent,
    MeteoWidgetComponent,
    NavigationWidgetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './widgets.page.html',
  styleUrl: './widgets.page.scss',
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

  trackByInstrumentId(_index: number, widget: InstrumentWidget): string {
    return widget.id;
  }

  trackByDashboardId(_index: number, item: { config: { id: string } }): string {
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

  reorderDashboardWidgets(event: CdkDragDrop<{ config: WidgetConfig; definition: WidgetDefinition | undefined }[]>): void {
    const ordered = this.dashboardWidgets().map((item) => item.config.id);
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);
    this.layoutService.reorderWidgets(ordered);
  }

  resetDashboardWidgets(): void {
    this.layoutService.reset();
  }

  dashboardIcon(definition: WidgetDefinition | undefined): IconName {
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

  getDashboardPreviewValue(definition: WidgetDefinition | undefined): string {
    if (!definition) return '--';
    
    // Return sample values based on widget ID or category
    switch (definition.id) {
      case 'navigation-panel': return '42°N';
      case 'wind-panel': return '15kn';
      case 'depth-panel': return '12.4m';
      case 'system-panel': return 'OK';
      case 'power-panel': return '12.8V';
      default: 
        // Fallback by category
        switch (definition.category) {
           case 'navigation': return 'POS';
           case 'environment': return 'DATA';
           case 'electrical': return 'PWR';
           default: return '---';
        }
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
