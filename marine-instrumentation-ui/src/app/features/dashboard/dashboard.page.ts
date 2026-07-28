import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { DashboardFacadeService } from './dashboard-facade.service';
import { LayoutService } from '../../core/services/layout.service';
import {
  WIDGET_DEFINITIONS,
  DEFAULT_LAYOUT,
  type WidgetConfig,
  type WidgetDefinition,
} from '../../core/models/widget.models';
import { CriticalStripComponent } from './components/critical-strip/critical-strip.component';
import { NavigationPanelComponent } from './components/panels/navigation-panel/navigation-panel.component';
import { WindPanelComponent } from './components/panels/wind-panel/wind-panel.component';
import { DepthPanelComponent } from './components/panels/depth-panel/depth-panel.component';
import { PowerPanelComponent } from './components/panels/power-panel/power-panel.component';
import { SystemPanelComponent } from './components/panels/system-panel/system-panel.component';
import { EnginePanelComponent } from './components/panels/engine-panel/engine-panel.component';
import { EnvironmentPanelComponent } from './components/panels/environment-panel/environment-panel.component';
import { MeteoWidgetComponent } from '../../ui/instruments/meteo-widget/meteo-widget.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { InstrumentTileComponent } from './components/instrument-tile/instrument-tile.component';
import { WidgetLibraryComponent } from './components/widget-library/widget-library.component';
import { AutopilotCompassComponent } from '../autopilot/components/autopilot-compass/autopilot-compass.component';
import { getInstrumentById, type InstrumentDefinition } from '../instruments/data/instrument-catalog';
import type { LibraryItem } from './data/widget-library';
import type { DashboardMetricVm } from './types/dashboard-vm';

interface DashboardWidgetCardVm {
  config: WidgetConfig;
  definition: WidgetDefinition | undefined;
  instrument: InstrumentDefinition | undefined;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    DragDropModule,
    AppIconComponent,
    CriticalStripComponent,
    NavigationPanelComponent,
    WindPanelComponent,
    DepthPanelComponent,
    PowerPanelComponent,
    SystemPanelComponent,
    EnginePanelComponent,
    EnvironmentPanelComponent,
    MeteoWidgetComponent,
    InstrumentTileComponent,
    WidgetLibraryComponent,
    AutopilotCompassComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
})
export class DashboardPage {
  private readonly facade = inject(DashboardFacadeService);
  private readonly layoutService = inject(LayoutService);
  private readonly definitionById = new Map<string, WidgetDefinition>(
    WIDGET_DEFINITIONS.map((d) => [d.id, d]),
  );

  /* ── Observables → Signals ── */
  readonly layout = toSignal(this.layoutService.layout$, { initialValue: DEFAULT_LAYOUT });
  readonly criticalVm = toSignal(this.facade.criticalStripVm$);
  readonly navigationVm = toSignal(this.facade.navigationVm$);
  readonly windVm = toSignal(this.facade.windVm$);
  readonly depthVm = toSignal(this.facade.depthVm$);
  readonly powerVm = toSignal(this.facade.powerVm$);
  readonly systemVm = toSignal(this.facade.systemVm$);
  readonly engineVm = toSignal(this.facade.engineVm$);
  readonly environmentVm = toSignal(this.facade.environmentVm$);
  readonly statusVm = toSignal(this.facade.statusVm$);
  readonly errorMessage = toSignal(this.facade.errorMessage$);

  /* ── Local UI state ── */
  readonly editMode = signal(false);
  readonly showPalette = signal(false);
  readonly degreeUnit = '\u00B0';

  /* ── Computed ── */
  readonly visibleCards = computed<DashboardWidgetCardVm[]>(() => {
    const widgets = this.layout()?.widgets ?? [];
    return [...widgets]
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order)
      .map((config) => ({
        config,
        definition: config.kind === 'panel' ? this.definitionById.get(config.refId) : undefined,
        instrument: config.kind === 'instrument' ? getInstrumentById(config.refId) : undefined,
      }));
  });

  /** refIds of panels currently visible (drives the library "active" state). */
  readonly activePanelIds = computed(() =>
    (this.layout()?.widgets ?? [])
      .filter((w) => w.kind === 'panel' && w.visible)
      .map((w) => w.refId),
  );

  /* ── Actions ── */
  toggleEditMode(): void {
    const next = !this.editMode();
    this.editMode.set(next);
    this.showPalette.set(next);
  }

  togglePalette(): void {
    this.showPalette.update((v) => !v);
  }

  dismissError(): void {
    this.facade.clearError();
  }

  resetLayout(): void {
    this.layoutService.reset();
  }

  /** Add from the library: panels toggle visibility, instruments are appended. */
  onLibrarySelect(item: LibraryItem): void {
    if (item.kind === 'panel' && this.activePanelIds().includes(item.refId)) {
      this.layoutService.setWidgetVisibility(item.refId, false);
      return;
    }
    this.layoutService.addWidget(item.kind, item.refId, item.size);
  }

  /** Remove a tile: panels are hidden, instruments are removed outright. */
  removeCard(card: DashboardWidgetCardVm): void {
    if (card.config.kind === 'instrument') {
      this.layoutService.removeWidget(card.config.id);
    } else {
      this.layoutService.setWidgetVisibility(card.config.refId, false);
    }
  }

  cardTitle(card: DashboardWidgetCardVm): string {
    if (card.config.kind === 'instrument') {
      return card.instrument?.label ?? card.config.refId;
    }
    return this.widgetTitle(card.definition, card.config.refId);
  }

  onWidgetDrop(event: CdkDragDrop<DashboardWidgetCardVm[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const cards = [...this.visibleCards()];
    moveItemInArray(cards, event.previousIndex, event.currentIndex);
    const orderedVisibleIds = cards.map((c) => c.config.id);
    const widgets = this.layout()?.widgets ?? [];
    const hiddenIds = widgets
      .filter((w) => !w.visible)
      .sort((a, b) => a.order - b.order)
      .map((w) => w.id);
    this.layoutService.reorderWidgets([...orderedVisibleIds, ...hiddenIds]);
  }

  metricValue(metrics: DashboardMetricVm[] | undefined, labelKey: string, fallback = '--'): string {
    return metrics?.find((m) => m.label === labelKey)?.value ?? fallback;
  }

  metricUnit(metrics: DashboardMetricVm[] | undefined, labelKey: string, fallback = ''): string {
    return metrics?.find((m) => m.label === labelKey)?.unit ?? fallback;
  }

  widgetTitle(definition: WidgetDefinition | undefined, fallbackId: string): string {
    if (definition?.title && !definition.title.startsWith('dashboard.')) {
      return definition.title;
    }
    switch (fallbackId) {
      case 'navigation-card':
        return 'Navigation';
      case 'wind-card':
        return 'Wind';
      case 'depth-card':
        return 'Depth';
      case 'power-card':
        return 'Power';
      case 'system-card':
        return 'System';
      case 'engine-card':
        return 'Engine';
      case 'environment-card':
        return 'Environment';
      case 'weather-card':
        return 'Live Weather';
      case 'sog-simple':
        return 'Speed Over Ground';
      case 'heading-simple':
        return 'Heading';
      case 'depth-simple':
        return 'Depth';
      default:
        return fallbackId;
    }
  }
}
