import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  NgZone,
  ViewChild,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
// Services
import { ChartFacadeService } from './services/chart-facade.service';
import { ChartFullscreenService } from './services/chart-fullscreen.service';
import { AnchorWatchService } from './services/anchor-watch.service';
import { MeasurementService } from './services/measurement.service';
import { GpxExportService } from './services/gpx-export.service';
import { ResourcesFacadeService } from '../resources/resources-facade.service';
import { InstrumentsFacadeService } from '../instruments/instruments-facade.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { AisStoreService } from '../../state/ais/ais-store.service';
import { PlaybackStoreService } from '../../state/playback/playback-store.service';
import { MapLibreEngineService } from './services/maplibre-engine.service';
import { createCoalescedMapEffect, createCoalescedConfigEffect } from './services/coalesced-map-effects';
import {
  ChartSettingsService,
  DEFAULT_VESSEL_TYPE_COLORS,
} from './services/chart-settings.service';

// Components
import { ChartCanvasComponent } from './components/chart-canvas/chart-canvas.component';
import { MapControlsComponent } from './components/map-controls/map-controls.component';

import { QuickInstrumentsComponent } from './components/quick-instruments/quick-instruments.component';
import { LeftPanelComponent } from './components/left-panel/left-panel.component';
import { ChartManagerComponent, type ManagerSection } from './components/chart-manager/chart-manager.component';
import type { AreaSelectionMode } from './components/chart-source-catalog/chart-source-catalog.component';
import type { AreaGeometry } from '../../data-access/chart/chart-remote-catalog.service';
import { APP_ENVIRONMENT } from '../../core/config/app-environment.token';
import { FullscreenToggleComponent } from './components/fullscreen-toggle/fullscreen-toggle.component';
import { AlarmStatusWidgetComponent } from './components/alarm-status-widget/alarm-status-widget.component';
import { ChartTopBarComponent } from './components/chart-top-bar/chart-top-bar.component';
import { AisTargetDetailsComponent } from '../ais/components/ais-target-details/ais-target-details.component';
import { PlaybackBarComponent } from '../playback/components/playback-bar/playback-bar.component';
import { InstrumentsDrawerComponent } from '../instruments/components/instruments-drawer/instruments-drawer.component';
import { ChartLegendComponent } from '../chart-legend/chart-legend.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { AutopilotChartControlComponent } from '../autopilot/components/autopilot-chart-control/autopilot-chart-control.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SimulationRunBannerComponent } from '../../ui/layout/simulation-run-banner/simulation-run-banner.component';
import { MeteoWidgetComponent } from '../../ui/instruments/meteo-widget/meteo-widget.component';

// Utils & Types
import {
  selectSog,
  selectCog,
  selectDepth,
  selectPosition,
  selectHeading,
  selectAws,
  selectAwa,
} from '../../state/datapoints/datapoint.selectors';
import {
  bearingDistanceNm,
  metersPerSecondToKnots,
  toDegrees,
} from '../../state/calculations/navigation';
import {
  ChartImportRequestVm,
  ChartLeftPanelTab,
  MapOrientation,
} from './types/chart-vm';
import { FeatureCollection, LineString, Point } from 'geojson';
import { RouteFeatureCollection, WaypointFeatureCollection } from './types/chart-geojson';
import {
  PLAYBACK_POSITION_LAT_PATH,
  PLAYBACK_POSITION_LON_PATH,
  PlaybackState,
} from '../../state/playback/playback.models';
import { AisTarget } from '../../core/models/ais.model';
import { DEFAULT_CHART_SOURCE_ID, IHM_WMS_CHART_SOURCE_ID } from '../../data-access/chart/chart-sources';
import { EncDepthAheadService } from '../alarms/services/enc-depth-ahead.service';
import { ChartEngineApiService } from '../../data-access/chart/chart-engine-api.service';
import { AlarmStoreService } from '../../state/alarms/alarm-store.service';

const INITIAL_PLAYBACK_STATE: PlaybackState = {
  status: 'idle',
  currentTime: 0,
  startTime: 0,
  endTime: 0,
  speed: 1,
  events: [],
};

@Component({
  selector: 'app-chart-page',
  standalone: true,
  imports: [
    CommonModule,
    ChartCanvasComponent,
    MapControlsComponent,
    QuickInstrumentsComponent,
    LeftPanelComponent,
    ChartManagerComponent,
    FullscreenToggleComponent,
    AlarmStatusWidgetComponent,
    ChartTopBarComponent,
    AisTargetDetailsComponent,
    PlaybackBarComponent,
    InstrumentsDrawerComponent,
    ChartLegendComponent,
    AppIconComponent,
    AutopilotChartControlComponent,
    TranslatePipe,
    SimulationRunBannerComponent,
    MeteoWidgetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="chart-page"
      [class.fullscreen]="isFullscreen()"
      [class.left-panel-open]="leftPanelOpen()"
    >
      <!-- Map Canvas -->
      <app-chart-canvas *ngIf="canvasVm$ | async as vm" class="chart-map" [vm]="vm" />

      <app-chart-top-bar *ngIf="topBarVm$ | async as vm" class="chart-top-bar-host" [vm]="vm" />

      <!-- ZONA: Top Left - Map Controls -->
      <div class="chart-zone chart-zone--top-left">
        <app-map-controls
          [orientation]="orientation()"
          [canCenter]="(controlsVm$ | async)?.canCenter ?? false"
          [autoCenter]="(controlsVm$ | async)?.autoCenter ?? false"
          [mapSourceId]="(controlsVm$ | async)?.sourceId ?? 'osm-raster'"
          [anchorWatchActive]="anchorWatchActive()"
          [showOpenSeaMap]="(controlsVm$ | async)?.showOpenSeaMap ?? false"
          [showAisTracks]="showAisTracksSignal()"
          [measureActive]="measurementActive()"
          [addWaypointModeActive]="addWaypointMode()"
          [hasActiveWaypoint]="hasActiveWaypoint()"
          [panelOpen]="leftPanelOpen()"
          [settingsPanelOpen]="chartManagerOpen()"
          [environmentPanelActive]="chartManagerOpen() && chartManagerStartSection() === 'environment'"
          (zoomIn)="handleZoomIn()"
          (zoomOut)="handleZoomOut()"
          (centerOnVessel)="handleCenterAndFollow()"
          (toggleOrientation)="handleToggleOrientation()"
          (addWaypoint)="handleAddWaypoint()"
          (toggleBaseLayer)="handleToggleBaseLayer()"
          (toggleOpenSeaMap)="handleToggleOpenSeaMap()"
          (toggleAisTracks)="handleToggleAisTracks()"
          (toggleMeasure)="handleToggleMeasure()"
          (deleteActiveWaypoint)="handleDeleteActiveWaypoint()"
          (toggleAnchorWatch)="handleToggleAnchorWatch()"
          (togglePanel)="handleToggleLeftPanel()"
          (toggleSettingsPanel)="handleToggleSettingsPanel()"
          (openEnvironmentPanel)="handleOpenEnvironmentPanel()"
        />
      </div>

      <!-- ZONA: Top Right - Alarm Badge + simulation run indicator -->
      <div class="chart-zone chart-zone--top-right">
        <app-alarm-status-widget />
        <app-simulation-run-banner variant="chip" />
      </div>

      <!-- ZONA: Top Center - Autopilot control overlay -->
      <div class="chart-zone chart-zone--autopilot">
        <app-autopilot-chart-control />
      </div>

      <!-- ZONA: Left Panel (M2) -->
      <div class="chart-zone chart-zone--left-panel">
        <app-left-panel
          [isOpen]="leftPanelOpen()"
          [activeTab]="leftPanelTab()"
          [waypointVm]="(waypointVm$ | async) ?? null"
          [routesVm]="(routesVm$ | async) ?? null"
          [aisTargets]="aisTargets()"
          [selectedAisMmsi]="selectedAisMmsi()"
          [aisSortBy]="aisSortBy()"
          (toggleOpen)="handleToggleLeftPanel()"
          (tabChange)="handleLeftPanelTabChange($event)"
          (selectAisTarget)="handleSelectAisTarget($event)"
          (aisSortByChange)="handleAisSortChange($event)"
          (selectWaypoint)="handleSelectWaypoint($event)"
          (renameWaypoint)="handleRenameWaypoint($event)"
          (deleteWaypoint)="handleDeleteWaypoint($event)"
          (navigateWaypoint)="handleNavigateToWaypoint($event)"
          (clearActiveWaypoint)="handleClearActiveWaypoint()"
          (exportWaypointsGpx)="handleExportWaypointsGpx()"
          (exportRouteGpx)="handleExportRouteGpx()"
          (followTarget)="handleFollowAisTarget($event)"
        />
      </div>

      <!-- ZONA: Bottom Right - Quick Instruments -->
      <div class="chart-zone chart-zone--bottom-right">
        <app-quick-instruments
          [sog]="sog() ?? null"
          [cog]="cog() ?? null"
          [hdg]="hdg() ?? null"
          [depth]="depth() ?? null"
          [aws]="aws() ?? null"
          [awa]="awa() ?? null"
          [depthUnit]="depthUnit()"
          [speedUnit]="speedUnit()"
          (openDrawer)="handleOpenInstruments()"
        />
      </div>

      <!-- ZONA: Bottom Center - Playback (M8) -->
      <div class="chart-zone chart-zone--bottom-center" *ngIf="isPlaybackActive()">
        <app-playback-bar
          [state]="playbackState()"
          (togglePlay)="handlePlaybackToggle()"
          (stop)="handlePlaybackStop()"
          (seek)="handlePlaybackSeek($event)"
          (speedChange)="handlePlaybackSpeed($event)"
          (skipForward)="handlePlaybackSkipForward()"
          (skipBackward)="handlePlaybackSkipBackward()"
        />
      </div>

      <!-- Fullscreen Toggle (FAB) -->
      <app-fullscreen-toggle
        class="fullscreen-fab"
        [isFullscreen]="isFullscreen()"
        (toggle)="handleToggleFullscreen()"
      />

      <!-- Instruments Drawer (M6) -->
      <app-instruments-drawer
        [isOpen]="showInstruments()"
        [widgets]="instrumentWidgets()"
        [data]="instrumentData()"
        [depthUnit]="depthUnit()"
        (close)="showInstruments.set(false)"
        (reorder)="handleInstrumentReorder($event)"
        (configure)="handleInstrumentConfigure()"
      />

      <!-- AIS Details Modal -->
      <div
        *ngIf="selectedAisTarget()"
        class="ais-details-overlay"
        (click)="handleCloseAisDetails()"
      >
        <app-ais-target-details
          [target]="selectedAisTarget()!"
          (close)="handleCloseAisDetails()"
          class="ais-details-modal"
          (click)="$event.stopPropagation()"
        />
      </div>

      <button
        class="weather-btn"
        [class.weather-btn--active]="showWeather()"
        [attr.aria-expanded]="showWeather()"
        (click)="toggleWeather()"
        aria-label="Open quick weather forecast"
        title="Weather"
      >
        <app-icon name="sun" [size]="20" />
      </button>

      @if (showWeather()) {
        <section class="weather-panel" aria-label="Quick weather forecast">
          <button type="button" class="weather-panel__close" aria-label="Close weather" (click)="showWeather.set(false)">
            <app-icon name="close" [size]="18" />
          </button>
          <app-meteo-widget variant="map" />
        </section>
      }

      <app-chart-manager
        [open]="chartManagerOpen()"
        [startSection]="chartManagerStartSection()"
        [vm]="(controlsVm$ | async) ?? null"
        [selectedPackageGeometry]="selectedPackageGeometry()"
        (close)="chartManagerOpen.set(false)"
        (selectSource)="handleSelectChartSource($event)"
        (importChart)="handleImportChart($event)"
        (deleteChart)="handleDeleteChart($event)"
        (refreshCatalog)="handleRefreshCatalog()"
        (viewCoverage)="handleViewCoverage($event)"
        (previewArea)="handlePreviewArea($event)"
        (safetyDepthChange)="handleSafetyDepthChange($event)"
        (requestAreaSelection)="handleAreaSelectionRequest($event)"
        (requestWeatherAreaSelection)="handleWeatherAreaSelectionRequest($event)"
        (selectPackage)="handleSelectPackage($event)"
      />

      @if (areaSelectionMode(); as selectionMode) {
        <div class="area-selection-help" role="status">
          <div>
            <strong>{{ selectionMode === 'rectangle' ? 'Select two corners' : 'Tap vertices on the map' }}</strong>
            <small>
              @if (areaSelectionPurpose() === 'weather') {
                The weather layer will reload with an adaptive high-density grid.
              } @else {
                {{ selectionMode === 'polygon' ? 'Use Finish after at least three points.' : 'The package assistant reopens automatically.' }}
              }
            </small>
          </div>
          @if (selectionMode === 'polygon') {
            <button type="button" (click)="finishAreaSelection()">Finish</button>
          }
          <button type="button" (click)="cancelAreaSelection()">Cancel</button>
        </div>
      }

      <!-- Chart Legend: "?" button + fullscreen modal -->
      <button
        class="legend-btn"
        (click)="showLegend.set(!showLegend())"
        [attr.aria-label]="'legend.open_button' | translate"
        [attr.aria-expanded]="showLegend()"
        title="Chart Legend"
      >
        <app-icon name="info" [size]="22" class="legend-btn-icon" />
      </button>

      <app-chart-legend [isOpen]="showLegend()" (close)="showLegend.set(false)" />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }

      .chart-page {
        --chart-top-bar-height: 48px;
        --chart-top-controls-offset: calc(
          var(--chart-top-bar-height) + (var(--chart-edge-gap) * 0.25)
        );
        --chart-left-panel-anchor: 48px;
        --chart-left-panel-width: 340px;

        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--gb-bg-canvas);

        &.fullscreen {
          position: fixed;
          inset: 0;
          z-index: var(--z-fullscreen, 100);
        }
      }

      .chart-map {
        position: absolute;
        inset: 0;
        z-index: var(--z-map);
      }

      .chart-top-bar-host {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: calc(var(--z-map-controls) + 1);
        animation: chart-zone-enter-slide-down 0.35s var(--ease-out) both;
      }

      // ═══════════════════════════════════════════════
      // FLOATING ZONES
      // ═══════════════════════════════════════════════

      .chart-zone {
        position: absolute;
        z-index: var(--z-map-controls);
        pointer-events: none;

        > * {
          pointer-events: auto;
        }
      }

      // TOP LEFT: Map Controls
      .chart-zone--top-left {
        top: var(--chart-top-controls-offset);
        left: var(--chart-edge-gap);
        z-index: var(--z-chart-panels);
        animation: chart-zone-enter 0.4s var(--ease-out) both;
        animation-delay: 0.1s;
      }

      // TOP RIGHT: Alarm badge (next to fullscreen FAB)
      .chart-zone--top-right {
        top: var(--chart-top-controls-offset);
        right: calc(var(--chart-edge-gap) + 52px);
        z-index: calc(var(--z-chart-panels) + 2);
        animation: chart-zone-enter-right 0.35s var(--ease-out) both;
        animation-delay: 0.15s;
      }

      // TOP CENTER: Autopilot control overlay
      .chart-zone--autopilot {
        top: var(--chart-top-controls-offset);
        left: 50%;
        transform: translateX(-50%);
        z-index: calc(var(--z-chart-panels) + 2);
        animation: chart-zone-enter 0.4s var(--ease-out) both;
        animation-delay: 0.18s;
      }

      @media (max-width: 768px) {
        .chart-zone--autopilot {
          left: auto;
          right: var(--chart-edge-gap);
          top: calc(var(--chart-top-controls-offset) + 44px);
          transform: none;
        }
      }

      // LEFT PANEL: Floating tabs panel
      .chart-zone--left-panel {
        top: var(--chart-top-controls-offset);
        bottom: var(--chart-edge-gap);
        left: calc(var(--chart-edge-gap) + var(--chart-left-panel-anchor));
        z-index: var(--z-chart-panels);
        animation: chart-zone-enter 0.4s var(--ease-out) both;
        animation-delay: 0.2s;
        display: flex;
        flex-direction: column;
      }

      .chart-zone--left-panel > app-left-panel {
        display: block;
        flex: 1 1 auto;
        min-height: 0;
      }

      // BOTTOM RIGHT: Quick Instruments
      .chart-zone--bottom-right {
        bottom: var(--chart-edge-gap);
        right: var(--chart-edge-gap);
        z-index: var(--z-chart-panels);
        animation: chart-zone-enter-bottom 0.5s var(--ease-out) both;
        animation-delay: 0.3s;
      }

      // BOTTOM CENTER: Playback Bar
      .chart-zone--bottom-center {
        bottom: var(--chart-edge-gap);
        left: 50%;
        transform: translateX(-50%);
        width: min(720px, calc(100% - 400px));
        z-index: var(--z-chart-panels);
        animation: chart-zone-enter-bottom 0.4s var(--ease-out) both;
      }

      // SETTINGS PANEL: Below map controls on the left
      .chart-zone--settings-panel {
        top: var(--chart-top-controls-offset);
        left: calc(var(--chart-edge-gap) + 48px);
        bottom: var(--chart-edge-gap);
        z-index: calc(var(--z-chart-panels) + 1);
        animation: chart-zone-enter 0.3s var(--ease-out) both;
        pointer-events: auto;
      }

      // ═══════════════════════════════════════════════
      // FULLSCREEN FAB
      // ═══════════════════════════════════════════════

      .fullscreen-fab {
        position: absolute;
        top: var(--chart-top-controls-offset);
        right: var(--chart-edge-gap);
        z-index: var(--z-chart-panels);
        transition: all var(--duration-normal) var(--ease-out);
        animation: chart-zone-enter 0.3s var(--ease-out) both;
        animation-delay: 0.35s;

        @media (max-width: 768px) {
          right: var(--chart-edge-gap);
          top: auto;
          bottom: calc(var(--chart-edge-gap) + 200px);
        }
      }

      // ═══════════════════════════════════════════════
      // AIS DETAILS MODAL
      // ═══════════════════════════════════════════════

      .ais-details-modal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: var(--z-chart-modals);
        max-width: 420px;
        width: 90%;
        max-height: min(80vh, 600px);
        border-radius: 14px;
        border: 1px solid var(--chart-overlay-border);
        background: var(--chart-overlay-bg);
        backdrop-filter: var(--chart-overlay-blur);
        box-shadow: var(--chart-overlay-shadow);
        overflow: hidden;
        animation: modal-enter 0.3s var(--ease-out) both;
      }

      .ais-details-overlay {
        position: absolute;
        inset: 0;
        z-index: var(--z-chart-modals);
        background: color-mix(in srgb, #000 28%, transparent);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        pointer-events: auto;
      }

      // ═══════════════════════════════════════════════
      // ENTRANCE ANIMATIONS
      // ═══════════════════════════════════════════════

      @keyframes chart-zone-enter {
        from {
          opacity: 0;
          transform: translateX(-12px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes chart-zone-enter-slide-down {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes chart-zone-enter-top {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      @keyframes chart-zone-enter-right {
        from {
          opacity: 0;
          transform: translateX(12px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes chart-zone-enter-bottom {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes modal-enter {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.92);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      // ═══════════════════════════════════════════════
      // LEGEND BUTTON
      // ═══════════════════════════════════════════════

      .legend-btn {
        position: absolute;
        bottom: var(--chart-edge-gap);
        left: var(--chart-edge-gap);
        z-index: var(--z-chart-panels);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid var(--chart-overlay-border, rgba(255, 255, 255, 0.12));
        background: var(--chart-overlay-bg, rgba(46, 52, 64, 0.85));
        backdrop-filter: var(--chart-overlay-blur, blur(12px));
        color: var(--gb-text-value);
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--chart-overlay-shadow, 0 2px 8px rgba(0, 0, 0, 0.3));
        transition: all 0.2s ease;
        pointer-events: auto;
        animation: chart-zone-enter-bottom 0.5s var(--ease-out) both;
        animation-delay: 0.4s;

        &:hover {
          background: color-mix(
            in srgb,
            var(--chart-overlay-bg, rgba(46, 52, 64, 0.85)) 80%,
            white
          );
          transform: scale(1.1);
          border-color: rgba(74, 144, 217, 0.5);
        }
      }

      .legend-btn-icon {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        line-height: 1;
      }

      .weather-btn {
        position: absolute;
        bottom: var(--chart-edge-gap);
        left: calc(var(--chart-edge-gap) + 48px);
        z-index: var(--z-chart-panels);
        width: 44px;
        height: 44px;
        border-radius: var(--radius-full);
        border: 1px solid var(--chart-overlay-border);
        background: var(--chart-overlay-bg);
        backdrop-filter: var(--chart-overlay-blur);
        color: var(--gb-text-value);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--chart-overlay-shadow);
        pointer-events: auto;
        transition: all var(--duration-fast) var(--ease-out);

        &:hover,
        &.weather-btn--active {
          color: var(--gb-data-warn);
          border-color: var(--gb-border-active);
          background: color-mix(in srgb, var(--chart-overlay-bg) 82%, var(--gb-data-warn));
        }
      }

      .environment-btn {
        position: absolute;
        bottom: calc(var(--chart-edge-gap) + 144px);
        left: var(--chart-edge-gap);
        z-index: var(--z-chart-panels);
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border: 1px solid var(--chart-overlay-border);
        border-radius: var(--radius-full);
        color: var(--gb-text-value);
        background: var(--chart-overlay-bg);
        box-shadow: var(--chart-overlay-shadow);
        backdrop-filter: var(--chart-overlay-blur);
        cursor: pointer;

        &:hover,
        &.environment-btn--active {
          color: var(--gb-tick-reference);
          border-color: var(--gb-border-active);
          background: var(--gb-bg-glass-active);
        }
      }

      .environment-panel-host {
        position: absolute;
        top: calc(var(--chart-top-bar-height) + var(--chart-edge-gap) + 44px);
        right: var(--chart-edge-gap);
        height: calc(100vh - var(--chart-top-bar-height) - var(--chart-edge-gap) - 214px);
        z-index: calc(var(--z-chart-panels) + 4);
        pointer-events: auto;
      }

      .weather-panel {
        position: absolute;
        top: calc(var(--chart-top-bar-height) + var(--chart-edge-gap));
        left: 50%;
        transform: translateX(-50%);
        z-index: calc(var(--z-chart-panels) + 3);
        width: min(1040px, calc(100% - (var(--chart-edge-gap) * 2)));
        height: min(420px, calc(100% - var(--chart-top-bar-height) - (var(--chart-edge-gap) * 2)));
        max-height: calc(100% - var(--chart-top-bar-height) - (var(--chart-edge-gap) * 2));
        overflow: auto;
        border: 1px solid var(--chart-overlay-border);
        border-radius: var(--radius-lg);
        background: var(--chart-overlay-bg);
        backdrop-filter: var(--chart-overlay-blur);
        box-shadow: var(--chart-overlay-shadow);
        pointer-events: auto;
        animation: chart-zone-enter-right .25s var(--ease-out) both;
      }

      .weather-panel__close {
        position: absolute;
        top: var(--space-2);
        right: var(--space-2);
        z-index: 2;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border: 1px solid var(--gb-border-panel);
        border-radius: var(--radius-full);
        color: var(--gb-text-value);
        background: var(--gb-bg-glass);
        cursor: pointer;
      }

      .area-selection-help {
        position: absolute;
        top: calc(var(--chart-top-bar-height) + var(--chart-edge-gap));
        left: 50%;
        transform: translateX(-50%);
        z-index: var(--z-chart-modals);
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2);
        width: min(560px, calc(100% - (var(--chart-edge-gap) * 2)));
        box-sizing: border-box;
        color: var(--gb-text-value);
        background: var(--chart-overlay-bg);
        border: 1px solid var(--chart-overlay-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--chart-overlay-shadow);
        backdrop-filter: var(--chart-overlay-blur);
      }
      .area-selection-help > div { flex: 1; display: flex; flex-direction: column; }
      .area-selection-help small { color: var(--gb-text-muted); font-size: .72rem; }
      .area-selection-help button {
        min-width: 72px; min-height: 44px; padding: 0 var(--space-2);
        color: var(--gb-text-value); background: var(--gb-bg-glass);
        border: 1px solid var(--gb-border-panel); border-radius: var(--radius-sm); cursor: pointer;
      }

      // ═══════════════════════════════════════════════
      // RESPONSIVE
      // ═══════════════════════════════════════════════

      @media (max-width: 768px) {
        .chart-page {
          --chart-edge-gap: var(--space-2);
          height: 100dvh;
        }

        .chart-zone--top-left {
          right: var(--chart-edge-gap);
          width: auto;
        }

        .weather-panel {
          top: calc(var(--chart-top-bar-height) + var(--space-1));
          width: calc(100% - (var(--chart-edge-gap) * 2));
          height: min(62vh, calc(100% - var(--chart-top-bar-height) - var(--space-2)));
          overflow: auto;
        }
        .environment-panel-host {
          top: auto;
          left: var(--chart-edge-gap);
          right: var(--chart-edge-gap);
          bottom: calc(var(--chart-edge-gap) + 52px);
          height: 62vh;
        }
        .chart-zone--top-right {
          top: calc(var(--chart-top-controls-offset) + 52px);
          right: var(--chart-edge-gap);
        }

        .chart-zone--left-panel {
          top: auto;
          left: var(--chart-edge-gap);
          right: var(--chart-edge-gap);
          bottom: calc(var(--chart-edge-gap) + 88px);
        }

        .chart-zone--bottom-center {
          width: calc(100% - 2 * var(--chart-edge-gap));
          bottom: calc(var(--chart-edge-gap) + 140px);
        }

        .chart-zone--bottom-right {
          left: var(--chart-edge-gap);
          right: var(--chart-edge-gap);
          width: auto;
        }

        .fullscreen-fab,
        .legend-btn,
        .weather-btn {
          bottom: calc(var(--chart-edge-gap) + 64px);
        }

        .fullscreen-fab {
          top: auto;
        }

        .weather-panel {
          top: calc(var(--chart-top-bar-height) + var(--space-1));
          height: auto;
          max-height: calc(100% - var(--chart-top-bar-height) - var(--space-2));
        }
      }
    `,
  ],
})
export class ChartPage implements AfterViewInit, OnDestroy {
  private readonly facade = inject(ChartFacadeService);
  private readonly chartSettings = inject(ChartSettingsService);
  private readonly environment = inject(APP_ENVIRONMENT);
  private readonly fullscreenService = inject(ChartFullscreenService);
  private readonly anchorWatchService = inject(AnchorWatchService);
  private readonly measurementService = inject(MeasurementService);
  private readonly gpxExportService = inject(GpxExportService);
  private readonly resourcesFacade = inject(ResourcesFacadeService);
  private readonly instrumentsFacade = inject(InstrumentsFacadeService);
  private readonly datapointStore = inject(DatapointStoreService);
  private readonly aisStore = inject(AisStoreService);
  private readonly playbackStore = inject(PlaybackStoreService);
  private readonly encDepthAhead = inject(EncDepthAheadService);
  private readonly chartEngineApi = inject(ChartEngineApiService);
  private readonly alarmStore = inject(AlarmStoreService);
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);

  private readonly engine = new MapLibreEngineService(); // Engine logic maintained
  private baseFailureWindow: { sourceId: string; count: number; startedAt: number } | null = null;
  private canvasComponent: ChartCanvasComponent | undefined;
  private mapInitialized = false;

  @ViewChild(ChartCanvasComponent)
  set canvasComponentRef(component: ChartCanvasComponent | undefined) {
    this.canvasComponent = component;
    this.tryInitMap();
  }

  // View Models (from Facade)
  readonly canvasVm$ = this.facade.canvasVm$;
  readonly controlsVm$ = this.facade.controlsVm$;
  readonly topBarVm$ = this.facade.topBarVm$;
  readonly waypointVm$ = this.facade.waypointListVm$;
  readonly routesVm$ = this.facade.routesPanelVm$;

  // UI State
  readonly isFullscreen = this.fullscreenService.isFullscreen;
  readonly showInstruments = signal(false);
  readonly showLegend = signal(false);
  readonly chartManagerOpen = signal(false);
  readonly chartManagerStartSection = signal<ManagerSection>('active');
  readonly selectedPackageGeometry = signal<AreaGeometry | null>(null);
  readonly areaSelectionMode = signal<Exclude<AreaSelectionMode, 'viewport'> | null>(null);
  readonly areaSelectionPurpose = signal<'package' | 'weather'>('package');
  readonly showWeather = signal(false);
  readonly leftPanelOpen = signal(true);
  readonly leftPanelTab = signal<ChartLeftPanelTab>('ais');
  readonly aisSortBy = signal<'distance' | 'cpa' | 'name'>('distance');
  readonly addWaypointMode = signal(false);

  // Anchor Watch State (wired to service in M4)
  private readonly anchorWatchState = toSignal(this.anchorWatchService.state$, {
    initialValue: this.anchorWatchService.snapshot,
  });
  readonly anchorWatchActive = computed(() => this.anchorWatchState().active);

  // Measurement State
  private readonly measurementStateSignal = toSignal(this.measurementService.state$, {
    initialValue: this.measurementService.snapshot,
  });
  readonly measurementActive = computed(() => this.measurementStateSignal().active);

  // Instruments State (M6)
  readonly instrumentWidgets = toSignal(this.instrumentsFacade.widgets$, {
    initialValue: this.instrumentsFacade.snapshot,
  });
  readonly instrumentData = computed(() => {
    const pos = this.ownPositionSignal();
    return {
      fixState: (pos?.value ? 'fix' : 'no-fix') as 'fix' | 'stale' | 'no-fix',
      position: pos?.value ? { lat: pos.value.latitude, lon: pos.value.longitude } : null,
    };
  });

  // AIS State
  private readonly ownPositionSignal = toSignal(selectPosition(this.datapointStore), {
    initialValue: null,
  });
  readonly aisTargets = computed(() =>
    this.sortAisTargets(
      Array.from(this.aisStore.targets().values()),
      this.aisSortBy(),
      this.ownPositionSignal()?.value?.latitude ?? null,
      this.ownPositionSignal()?.value?.longitude ?? null,
    ),
  );
  readonly selectedAisMmsi = signal<string | null>(null);
  readonly selectedAisTarget = computed(() => {
    const mmsi = this.selectedAisMmsi();
    return mmsi ? this.aisStore.targets().get(mmsi) : null;
  });

  // Derived Data for Quick Instruments
  private readonly rawSog = toSignal(selectSog(this.datapointStore), { initialValue: null });
  private readonly rawCog = toSignal(selectCog(this.datapointStore), { initialValue: null });
  private readonly rawDepth = toSignal(selectDepth(this.datapointStore), { initialValue: null });
  private readonly rawHdg = toSignal(selectHeading(this.datapointStore), { initialValue: null });
  private readonly rawAws = toSignal(selectAws(this.datapointStore), { initialValue: null });
  private readonly rawAwa = toSignal(selectAwa(this.datapointStore), { initialValue: null });

  readonly sog = computed(() => {
    const val = this.rawSog();
    return val?.value !== undefined && val.value !== null
      ? metersPerSecondToKnots(val.value)
      : null;
  });

  readonly cog = computed(() => {
    const val = this.rawCog();
    return val?.value !== undefined && val.value !== null ? toDegrees(val.value) : null;
  });

  readonly depth = computed(() => {
    const val = this.rawDepth();
    return val?.value;
  });

  readonly hdg = computed(() => {
    const val = this.rawHdg();
    return val?.value !== undefined && val.value !== null ? toDegrees(val.value) : null;
  });

  readonly aws = computed(() => {
    const val = this.rawAws();
    return val?.value !== undefined && val.value !== null
      ? metersPerSecondToKnots(val.value)
      : null;
  });

  readonly awa = computed(() => {
    const val = this.rawAwa();
    return val?.value !== undefined && val.value !== null ? toDegrees(val.value) : null;
  });

  // Units (Mocked for now, should come from preferences)
  readonly speedUnit = signal<'kn'>('kn');
  readonly depthUnit = signal<'m'>('m');

  // Map & Playback State Logic (Legacy Integration)
  private readonly baseSourceSignal = toSignal(this.facade.baseSource$);
  private readonly controlsVmSignal = toSignal(this.facade.controlsVm$, { initialValue: null });
  private readonly openSeaMapSignal = toSignal(this.facade.openSeaMapVisible$, {
    initialValue: false,
  });
  private readonly weatherTempSignal = toSignal(this.facade.weatherTemperatureVisible$, {
    initialValue: false,
  });
  private readonly weatherAirTempSignal = toSignal(this.facade.weatherAirTemperatureVisible$, {
    initialValue: false,
  });
  private readonly weatherWindSignal = toSignal(this.facade.weatherWindVisible$, {
    initialValue: false,
  });
  private readonly weatherPrecipSignal = toSignal(this.facade.weatherPrecipitationVisible$, {
    initialValue: false,
  });
  private readonly weatherCloudsSignal = toSignal(this.facade.weatherCloudsVisible$, {
    initialValue: false,
  });
  private readonly weatherPressureSignal = toSignal(this.facade.weatherPressureVisible$, {
    initialValue: false,
  });
  private readonly weatherWavesSignal = toSignal(this.facade.weatherWavesVisible$, {
    initialValue: false,
  });
  private readonly environmentCurrentsSignal = toSignal(this.facade.environmentCurrentsVisible$, {
    initialValue: false,
  });
  private readonly environmentTimeSignal = toSignal(this.facade.environmentTime$, {
    initialValue: 'latest',
  });
  private readonly chartSettingsSignal = toSignal(this.chartSettings.settings$, {
    initialValue: this.chartSettings.snapshot,
  });
  private readonly marineSourceGridSignal = computed(() => this.chartSettingsSignal().showMarineSourceGrid);
  private readonly marineDebugVariableSignal = computed(() => this.chartSettingsSignal().marineDebugVariable);
  private readonly encDepthVisibleSignal = computed(() => {
    const layers = this.chartSettingsSignal().encLayers;
    return layers.showDepthAreas || layers.showDepthContours || layers.showHazards;
  });
  private readonly marineMaskVisibleSignal = computed(() =>
    this.weatherWindSignal()
    || this.environmentCurrentsSignal()
    || this.weatherWavesSignal()
    || this.weatherTempSignal());
  private readonly weatherBoundsSignal = toSignal(this.facade.weatherBounds$, {
    initialValue: [-9.05, 42.05, -8.4, 42.4] as [number, number, number, number],
  });
  private readonly weatherGeometrySignal = computed(() => {
    const settings = this.chartSettingsSignal();
    return settings.weatherZones.find((zone) => zone.id === settings.activeWeatherZoneId)?.geometry ?? null;
  });
  private readonly weatherOpacitySignal = toSignal(this.facade.weatherOpacity$, {
    initialValue: 0.6,
  });
  readonly showAisTracksSignal = toSignal(this.facade.showAisTracks$, { initialValue: true });
  private readonly showAisTargetsSignal = toSignal(this.facade.showAisTargets$, {
    initialValue: true,
  });
  private readonly showAisLabelsSignal = toSignal(this.facade.showAisLabels$, {
    initialValue: true,
  });
  private readonly showCpaLinesSignal = toSignal(this.facade.showCpaLines$, { initialValue: true });
  private readonly aisVesselTypeColorsSignal = toSignal(this.facade.vesselTypeColors$, {
    initialValue: { ...DEFAULT_VESSEL_TYPE_COLORS },
  });
  private readonly ownVesselIconScaleSignal = toSignal(this.facade.ownVesselIconScale$, {
    initialValue: 1.15,
  });
  private readonly aisTargetIconScaleSignal = toSignal(this.facade.aisTargetIconScale$, {
    initialValue: 0.8,
  });
  private readonly windTrackMinZoomSignal = toSignal(this.facade.windTrackMinZoom$, {
    initialValue: 0,
  });
  private readonly rangeRingsMinZoomSignal = toSignal(this.facade.rangeRingsMinZoom$, {
    initialValue: 8,
  });
  readonly orientation = toSignal(this.facade.orientation$, {
    initialValue: 'north-up' as MapOrientation,
  });
  readonly isTracking = computed(() => this.controlsVmSignal()?.autoCenter ?? false);
  private readonly waypointListVmSignal = toSignal(this.waypointVm$, {
    initialValue: { waypoints: [], activeId: null },
  });
  readonly hasActiveWaypoint = computed(() => !!this.waypointListVmSignal().activeId);
  readonly activeWaypointId = computed(() => this.waypointListVmSignal().activeId);

  private readonly vesselSignal = toSignal(this.facade.vesselUpdate$, {
    initialValue: {
      lngLat: [-8.7207, 42.2406] as [number, number],
      rotationDeg: null,
      state: 'no-fix' as 'fix' | 'stale' | 'no-fix',
    },
  });
  private readonly trackSignal = toSignal(this.facade.trackCoords$, {
    initialValue: [] as [number, number][],
  });
  private readonly vectorSignal = toSignal(this.facade.vectorUpdate$, {
    initialValue: {
      coords: [] as [number, number][],
      visible: false,
      label: null as { cogDeg: number; sogKnots: number } | null,
      timeTicks: [] as { label: string; coords: [number, number] }[],
    },
  });
  private readonly headingLineSignal = toSignal(this.facade.headingLineUpdate$, {
    initialValue: {
      coords: [] as [number, number][],
      visible: false,
      headingDeg: null as number | null,
    },
  });
  private readonly autopilotTargetSignal = toSignal(this.facade.autopilotTargetUpdate$, {
    initialValue: { coords: [] as [number, number][], visible: false },
  });
  private readonly laylinesSignal = toSignal(this.facade.laylinesUpdate$, {
    initialValue: { lines: [] as [number, number][][], visible: false },
  });
  private readonly trueWindSignal = toSignal(this.facade.trueWindUpdate$, {
    initialValue: {
      coords: [] as [number, number][],
      visible: false,
      directionDeg: 0,
      speedMps: 0,
      gustMps: null as number | null,
      source: 'true' as 'true' | 'apparent',
    },
  });
  private readonly apparentWindSignal = toSignal(this.facade.apparentWindUpdate$, {
    initialValue: {
      coords: [] as [number, number][],
      visible: false,
      directionDeg: 0,
      speedMps: 0,
      gustMps: null as number | null,
      source: 'apparent' as 'true' | 'apparent',
    },
  });
  private readonly rangeRingsSignal = toSignal(this.facade.rangeRingsUpdate$, {
    initialValue: { center: null as [number, number] | null, intervals: [] as number[] },
  });
  private readonly bearingLineSignal = toSignal(this.facade.bearingLineUpdate$, {
    initialValue: { coords: [] as [number, number][], visible: false },
  });
  private readonly centerSignal = toSignal(this.facade.mapCenter$, {
    initialValue: this.facade.initialView.center,
  });
  private readonly waypointsSignal = toSignal(this.facade.waypointsGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as WaypointFeatureCollection,
  });
  private readonly routeSignal = toSignal(this.facade.routeGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as RouteFeatureCollection,
  });
  private readonly savedTracksSignal = toSignal(this.facade.savedTracksGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>,
  });
  private readonly benchRouteSignal = toSignal(this.facade.benchRouteUpdate$, {
    initialValue: {
      line: { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>,
      points: { type: 'FeatureCollection', features: [] } as FeatureCollection<Point>,
    },
  });
  private readonly aisTargetsSignal = toSignal(this.facade.aisTargetsGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<Point>,
  });
  private readonly aisTracksSignal = toSignal(this.facade.aisTracksGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>,
  });
  private readonly aisPredictionsSignal = toSignal(this.facade.aisPredictionsGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>,
  });
  private readonly cpaLinesSignal = toSignal(this.facade.cpaLinesGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<LineString>,
  });
  private readonly encDepthAheadSignal = toSignal(this.encDepthAhead.state$, {
    initialValue: { status: 'idle', response: null, message: 'Waiting for navigation data' } as const,
  });
  private readonly activeAlarmsSignal = toSignal(this.alarmStore.activeAlarms$, { initialValue: [] });

  // Playback Logic
  readonly playbackState = toSignal(this.playbackStore.state$, {
    initialValue: INITIAL_PLAYBACK_STATE,
  });
  readonly isPlaybackActive = computed(() => {
    const status = this.playbackState().status;
    return status === 'ready' || status === 'playing' || status === 'paused';
  });
  private readonly playbackLatSignal = toSignal(
    this.playbackStore.frameForPath(PLAYBACK_POSITION_LAT_PATH),
    { initialValue: null },
  );
  private readonly playbackLonSignal = toSignal(
    this.playbackStore.frameForPath(PLAYBACK_POSITION_LON_PATH),
    { initialValue: null },
  );
  private readonly playbackVesselSignal = computed(() => {
    if (!this.isPlaybackActive()) return null;
    const lat = this.playbackLatSignal();
    const lon = this.playbackLonSignal();
    if (!lat || !lon) return null;
    return {
      lngLat: [lon.value, lat.value] as [number, number],
      rotationDeg: null,
      state: 'fix' as 'fix' | 'stale' | 'no-fix',
    };
  });
  // Waypoints count derived from features
  readonly waypointCount = computed(() => this.waypointsSignal().features.length);

  constructor() {
    if (this.route.snapshot.queryParamMap.get('manager') === 'maps') {
      this.handleOpenChartManager();
    }

    effect(() => {
      const state = this.encDepthAheadSignal();
      const response = state.response;
      this.runMapUpdate(() => this.engine.updateEncDepthAdvisory(
        response?.sector ?? null,
        response?.hazards ?? null,
        state.status === 'danger',
      ));
    });
    effect(() => {
      const shallowActive = this.activeAlarmsSignal().some((alarm) => alarm.id === 'shallow-water');
      this.runMapUpdate(() => this.engine.setShallowWaterAlarmActive(shallowActive));
    });

    // ---- Coalesced Map Engine Effects ----
    // Replaces ~40 individual effects with 2 coalesced effects:
    // 1. Navigation data (high frequency): vessel, track, vector, AIS, etc.
    // 2. Configuration (low frequency): orientation, scales, weather, visibility.
    // This reduces Angular's effect scheduling overhead from ~40 RAF callbacks to 2.
    createCoalescedMapEffect(
      {
        playbackVesselSignal: () => this.playbackVesselSignal(),
        vesselSignal: () => this.vesselSignal(),
        trackSignal: () => this.trackSignal(),
        vectorSignal: () => this.vectorSignal(),
        headingLineSignal: () => this.headingLineSignal(),
        autopilotTargetSignal: () => this.autopilotTargetSignal(),
        laylinesSignal: () => this.laylinesSignal(),
        trueWindSignal: () => this.trueWindSignal(),
        apparentWindSignal: () => this.apparentWindSignal(),
        waypointsSignal: () => this.waypointsSignal(),
        routeSignal: () => this.routeSignal(),
        savedTracksSignal: () => this.savedTracksSignal(),
        benchRouteSignal: () => this.benchRouteSignal(),
        centerSignal: () => this.centerSignal(),
        rangeRingsSignal: () => this.rangeRingsSignal(),
        bearingLineSignal: () => this.bearingLineSignal(),
        aisTargetsSignal: () => this.aisTargetsSignal(),
        aisTracksSignal: () => this.aisTracksSignal(),
        aisPredictionsSignal: () => this.aisPredictionsSignal(),
        cpaLinesSignal: () => this.cpaLinesSignal(),
        measurementStateSignal: () => this.measurementStateSignal(),
        anchorWatchState: () => this.anchorWatchState(),
        ownPositionSignal: () => this.ownPositionSignal(),
      },
      this.engine,
      (update) => this.runMapUpdate(update),
      this.anchorWatchService,
    );

    createCoalescedConfigEffect(
      {
        baseSourceSignal: () => this.baseSourceSignal(),
        orientation: () => this.orientation(),
        aisVesselTypeColorsSignal: () => this.aisVesselTypeColorsSignal(),
        ownVesselIconScaleSignal: () => this.ownVesselIconScaleSignal(),
        aisTargetIconScaleSignal: () => this.aisTargetIconScaleSignal(),
        windTrackMinZoomSignal: () => this.windTrackMinZoomSignal(),
        rangeRingsMinZoomSignal: () => this.rangeRingsMinZoomSignal(),
        openSeaMapSignal: () => this.openSeaMapSignal(),
        weatherTempSignal: () => this.weatherTempSignal(),
        weatherAirTempSignal: () => this.weatherAirTempSignal(),
        weatherWindSignal: () => this.weatherWindSignal(),
        weatherPrecipSignal: () => this.weatherPrecipSignal(),
        weatherCloudsSignal: () => this.weatherCloudsSignal(),
        weatherPressureSignal: () => this.weatherPressureSignal(),
        weatherWavesSignal: () => this.weatherWavesSignal(),
        environmentCurrentsSignal: () => this.environmentCurrentsSignal(),
        environmentTimeSignal: () => this.environmentTimeSignal(),
        weatherBoundsSignal: () => this.weatherBoundsSignal(),
        weatherGeometrySignal: () => this.weatherGeometrySignal(),
        marineSourceGridSignal: () => this.marineSourceGridSignal(),
        marineDebugVariableSignal: () => this.marineDebugVariableSignal(),
        encDepthVisibleSignal: () => this.encDepthVisibleSignal(),
        marineMaskVisibleSignal: () => this.marineMaskVisibleSignal(),
        weatherOpacitySignal: () => this.weatherOpacitySignal(),
        showAisTargetsSignal: () => this.showAisTargetsSignal(),
        showAisLabelsSignal: () => this.showAisLabelsSignal(),
        showCpaLinesSignal: () => this.showCpaLinesSignal(),
      },
      this.engine,
      (layer) => this.weatherTileUrl(layer),
      (layer) => this.environmentVectorUrl(layer),
      (layer) => this.environmentFieldUrl(layer),
    );
  }

  ngAfterViewInit(): void {
    this.tryInitMap();
  }

  private tryInitMap(): void {
    if (this.mapInitialized) {
      return;
    }

    const container = this.canvasComponent?.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    this.engine.setClickHandler((lngLat) =>
      this.zone.run(() => {
        if (this.measurementActive()) {
          this.measurementService.addPoint(lngLat);
          return;
        }
        if (this.addWaypointMode()) {
          this.facade.addWaypointAt(lngLat);
          return;
        }
        if (this.baseSourceSignal()?.id === IHM_WMS_CHART_SOURCE_ID) {
          this.chartEngineApi.ihmFeatureInfo(lngLat[0], lngLat[1], this.engine.currentZoom())
            .subscribe((info) => {
              this.runMapUpdate(() => this.engine.showChartInformation(
                lngLat,
                info.features,
                info.disclaimer,
              ));
            });
        }
      }),
    );
    this.engine.setFeatureClickHandler((event) => {
      this.zone.run(() => {
        if (event.layerId === 'chart-waypoints-layer') {
          const waypointId =
            typeof event.properties?.id === 'string' && event.properties.id.trim().length > 0
              ? event.properties.id
              : null;
          if (waypointId) {
            this.facade.selectWaypoint(waypointId);
          }
          return;
        }
        if (event.layerId === 'chart-ais-layer' && event.properties?.mmsi) {
          this.selectedAisMmsi.set(event.properties.mmsi);
        }
      });
    });
    this.engine.setErrorHandler((message, sourceId, baseSourceId) => {
      this.zone.run(() => {
        this.facade.recordMapError(message, sourceId);
        this.handleBaseSourceFailure(message, sourceId, baseSourceId);
      });
    });
    // Feed the live map zoom into the view-model so zoom-aware overlays (min-length
    // COG/heading/wind vectors) stay visible when zoomed out.
    this.engine.setZoomHandler((zoom) => this.facade.setViewportZoom(zoom));

    this.zone.runOutsideAngular(() => {
      this.engine.init(container, this.facade.initialView);
    });
    this.mapInitialized = true;
  }

  private runMapUpdate(update: () => void): void {
    this.zone.runOutsideAngular(update);
  }

  ngOnDestroy(): void {
    this.engine.destroy();
    this.mapInitialized = false;
  }

  // ---- Event Handlers ----

  handleZoomIn() {
    this.engine.zoomIn();
  } // Using engine directly for standard zoom
  handleZoomOut() {
    this.engine.zoomOut();
  }

  handleCenter() {
    this.facade.centerOnVessel();
  }

  handleCenterAndFollow() {
    // Single button behavior:
    // - If tracking is active: disable it.
    // - If tracking is inactive: center and enable it.
    if (this.isTracking()) {
      this.facade.toggleAutoCenter();
      return;
    }

    this.facade.centerOnVessel();
  }

  handleToggleOrientation() {
    this.facade.toggleOrientation();
  }

  handleToggleAutoCenter() {
    this.facade.toggleAutoCenter();
  }

  handleToggleBaseLayer() {
    void this.facade.selectNextAvailableChartSource();
  }

  handleToggleOpenSeaMap() {
    this.facade.toggleOpenSeaMap();
  }

  handleToggleAisTracks() {
    this.facade.toggleAisTracks();
  }

  handleToggleMeasure() {
    // Keep measure and add-waypoint modes mutually exclusive.
    if (!this.measurementActive() && this.addWaypointMode()) {
      this.addWaypointMode.set(false);
    }
    this.measurementService.toggle();
  }

  handleAddWaypoint() {
    const next = !this.addWaypointMode();
    this.addWaypointMode.set(next);
    // Keep measure and add-waypoint modes mutually exclusive.
    if (next && this.measurementActive()) {
      this.measurementService.toggle();
    }
  }

  handleToggleTrack() {
    this.facade.toggleTrack();
  }

  handleToggleVector() {
    this.facade.toggleVector();
  }

  handleToggleTrueWind() {
    this.facade.toggleTrueWind();
  }

  handleToggleRangeRings() {
    this.facade.toggleRangeRings();
  }

  handleChangeRangeRings(intervals: number[]) {
    this.facade.setRangeRingIntervals(intervals);
  }

  handleToggleAisTargets() {
    this.facade.toggleAisTargets();
  }

  handleToggleAisLabels() {
    this.facade.toggleAisLabels();
  }

  handleToggleCpaLines() {
    this.facade.toggleCpaLines();
  }

  handleToggleLeftPanel() {
    this.leftPanelOpen.set(!this.leftPanelOpen());
  }

  handleLeftPanelTabChange(tab: ChartLeftPanelTab) {
    this.leftPanelTab.set(tab);
  }

  handleSelectChartSource(sourceId: string) {
    void this.facade.selectChartSource(sourceId);
  }

  handleImportChart(request: ChartImportRequestVm) {
    this.facade.importChart(request);
  }

  handleDeleteChart(chartId: string) {
    this.facade.deleteChart(chartId);
  }

  handleRefreshCatalog() {
    this.facade.refreshChartCatalog();
  }

  private handleBaseSourceFailure(message: string, sourceId?: string, baseSourceId?: string): void {
    if (!baseSourceId || baseSourceId === DEFAULT_CHART_SOURCE_ID) return;
    if (sourceId && /^(weather-|environment-|openseamap)/.test(sourceId)) return;

    const now = Date.now();
    if (
      !this.baseFailureWindow ||
      this.baseFailureWindow.sourceId !== baseSourceId ||
      now - this.baseFailureWindow.startedAt > 10_000
    ) {
      this.baseFailureWindow = { sourceId: baseSourceId, count: 1, startedAt: now };
      return;
    }

    this.baseFailureWindow.count += 1;
    if (this.baseFailureWindow.count >= 3) {
      this.baseFailureWindow = null;
      this.facade.fallbackToDefaultSource(message);
    }
  }

  handleViewCoverage(bounds: [number, number, number, number]): void {
    this.chartManagerOpen.set(false);
    this.zone.runOutsideAngular(() => this.engine.fitBounds(bounds));
  }

  handlePreviewArea(bounds: [number, number, number, number]): void {
    this.zone.runOutsideAngular(() => this.engine.fitBounds(bounds));
  }

  handleSafetyDepthChange(depth: number): void {
    this.facade.setSafetyDepth(depth);
  }

  handleAreaSelectionRequest(mode: AreaSelectionMode): void {
    this.areaSelectionPurpose.set('package');
    if (mode === 'viewport') {
      const geometry = this.engine.getViewportGeometry();
      if (geometry) this.selectedPackageGeometry.set(geometry);
      return;
    }
    this.chartManagerOpen.set(false);
    this.areaSelectionMode.set(mode);
    this.zone.runOutsideAngular(() => {
      this.engine.beginAreaSelection(mode, (geometry) => {
        this.zone.run(() => {
          this.selectedPackageGeometry.set(geometry);
          this.areaSelectionMode.set(null);
          this.chartManagerStartSection.set('offline');
          this.chartManagerOpen.set(true);
        });
      });
    });
  }

  handleWeatherAreaSelectionRequest(mode: 'viewport' | 'rectangle' | 'polygon'): void {
    this.areaSelectionPurpose.set('weather');
    if (mode === 'viewport') {
      const geometry = this.engine.getViewportGeometry();
      if (geometry) {
        this.chartSettings.saveWeatherZone(
          this.nextWeatherZoneName(),
          'viewport',
          geometry,
        );
      }
      return;
    }
    this.chartManagerOpen.set(false);
    this.areaSelectionMode.set(mode);
    this.zone.runOutsideAngular(() => {
      this.engine.beginAreaSelection(mode, (geometry) => {
        this.zone.run(() => {
          this.chartSettings.saveWeatherZone(
            this.nextWeatherZoneName(),
            mode,
            geometry,
          );
          this.areaSelectionMode.set(null);
          this.chartManagerStartSection.set('environment');
          this.chartManagerOpen.set(true);
        });
      });
    });
  }

  private nextWeatherZoneName(): string {
    return `Zone ${this.chartSettings.snapshot.weatherZones.length + 1}`;
  }

  handleSelectPackage(manifest: import('../../data-access/chart/chart-remote-catalog.service').PackageManifest): void {
    void this.facade.selectChartPackage(manifest);
    this.chartManagerOpen.set(false);
  }

  finishAreaSelection(): void {
    this.zone.runOutsideAngular(() => this.engine.finishAreaSelection());
  }

  cancelAreaSelection(): void {
    this.zone.runOutsideAngular(() => this.engine.cancelAreaSelection());
    this.areaSelectionMode.set(null);
    this.chartManagerStartSection.set(this.areaSelectionPurpose() === 'weather' ? 'environment' : 'offline');
    this.chartManagerOpen.set(true);
  }

  private weatherTileUrl(providerId: string): string | null {
    const base = this.environment.chartEngineApiUrl.replace(/\/$/, '');
    const layerId: Record<string, string> = {
      'sea-temperature': 'seaTemperature',
      'air-temperature': 'airTemperature',
      'wind-speed': 'wind',
      precipitation: 'precipitation',
      clouds: 'clouds',
      pressure: 'pressure',
      waves: 'waves',
    };
    const layer = layerId[providerId];
    return layer ? `${base}/environment/${layer}/${encodeURIComponent(this.environmentTimeSignal())}/{z}/{x}/{y}.png` : null;
  }

  private environmentVectorUrl(layerId: string): string | null {
    const base = this.environment.chartEngineApiUrl.replace(/\/$/, '');
    if (layerId === 'marineMask') {
      const params = new URLSearchParams({
        bbox: this.weatherBoundsSignal().join(','),
        area: JSON.stringify(this.weatherGeometrySignal()),
      });
      return `${base}/catalog/enc/marine-mask.geojson?${params.toString()}`;
    }
    if (layerId === 'encDepth') {
      const settings = this.chartSettingsSignal();
      const layers = [
        ...(settings.encLayers.showDepthAreas ? ['depth_areas'] : []),
        ...(settings.encLayers.showDepthContours ? ['depth_contours', 'soundings'] : []),
        ...(settings.encLayers.showHazards ? ['hazards'] : []),
      ];
      const params = new URLSearchParams({
        bbox: this.weatherBoundsSignal().join(','),
        area: JSON.stringify(this.weatherGeometrySignal()),
        safetyDepthM: String(settings.safetyDepth),
        layers: layers.join(','),
      });
      return `${base}/catalog/enc/depth-overlay.geojson?${params.toString()}`;
    }
    if (layerId === 'sourceGrid') {
      const params = new URLSearchParams({
        variable: this.marineDebugVariableSignal(),
        bbox: this.weatherBoundsSignal().join(','),
        time: this.environmentTimeSignal() === 'latest' ? new Date().toISOString() : this.environmentTimeSignal(),
        source: 'auto',
      });
      return `${base}/api/marine/debug/source-grid.geojson?${params.toString()}`;
    }
    if (layerId === 'wind') {
      const params = new URLSearchParams({
        bbox: this.weatherBoundsSignal().join(','),
        area: JSON.stringify(this.weatherGeometrySignal()),
      });
      return `${base}/weather/wind-field.geojson?${params.toString()}`;
    }
    if (layerId === 'waves' || layerId === 'seaTemperature') {
      const selectedTime = this.environmentTimeSignal();
      const params = new URLSearchParams({
        bbox: this.weatherBoundsSignal().join(','),
        time: selectedTime === 'latest' ? new Date().toISOString() : selectedTime,
        area: JSON.stringify(this.weatherGeometrySignal()),
      });
      const endpoint = layerId === 'waves' ? 'waves.geojson' : 'sea-temperature.geojson';
      return `${base}/api/marine/${endpoint}?${params.toString()}`;
    }
    const time = this.environmentTimeSignal();
    if (time === 'latest') return null;
    const params = new URLSearchParams({
      area: JSON.stringify(this.weatherGeometrySignal()),
      bbox: this.weatherBoundsSignal().join(','),
    });
    return `${base}/environment/${encodeURIComponent(layerId)}/${encodeURIComponent(time)}.geojson?${params.toString()}`;
  }

  private environmentFieldUrl(layerId: 'wind' | 'currents' | 'mask'): string {
    const base = `${this.environment.chartEngineApiUrl.replace(/\/$/, '')}/api/marine`;
    const [west, south, east, north] = this.weatherBoundsSignal();
    if (layerId === 'mask') {
      const params = new URLSearchParams({
        bbox: [west, south, east, north].join(','),
        area: JSON.stringify(this.weatherGeometrySignal()),
      });
      return `${this.environment.chartEngineApiUrl.replace(/\/$/, '')}/catalog/enc/marine-mask.geojson?${params.toString()}`;
    }
    const selectedTime = this.environmentTimeSignal();
    const params = new URLSearchParams({
      west: String(west),
      south: String(south),
      east: String(east),
      north: String(north),
      time: selectedTime === 'latest' ? new Date().toISOString() : selectedTime,
      source: 'auto',
    });
    return `${base}/${layerId}?${params.toString()}`;
  }

  handleAisSortChange(sortBy: 'distance' | 'cpa' | 'name') {
    this.aisSortBy.set(sortBy);
  }

  handleToggleFullscreen() {
    this.fullscreenService.toggle();
  }

  handleToggleSettingsPanel() {
    this.chartManagerOpen.update((open) => !open);
    if (this.chartManagerOpen()) {
      this.chartManagerStartSection.set('active');
      this.showWeather.set(false);
      this.leftPanelOpen.set(false);
      this.facade.refreshChartCatalog();
    }
  }

  handleOpenEnvironmentPanel(): void {
    const alreadyOpen = this.chartManagerOpen() && this.chartManagerStartSection() === 'environment';
    this.chartManagerOpen.set(!alreadyOpen);
    if (!alreadyOpen) {
      this.chartManagerStartSection.set('environment');
      this.showWeather.set(false);
      this.leftPanelOpen.set(false);
    }
  }

  private handleOpenChartManager(): void {
    this.chartManagerOpen.set(true);
    this.showWeather.set(false);
    this.facade.refreshChartCatalog();
  }

  toggleWeather(): void {
    this.showWeather.update((open) => !open);
    if (this.showWeather()) {
      this.chartManagerOpen.set(false);
    }
  }

  handleNavigateTo(coords: { lng: number; lat: number; zoom?: number }) {
    this.engine.flyTo([coords.lng, coords.lat], coords.zoom ?? 10);
    this.chartManagerOpen.set(false);
  }

  handleOpenInstruments() {
    this.showInstruments.set(true);
  }

  handleInstrumentReorder(event: { previousIndex: number; currentIndex: number }) {
    const widgets = this.instrumentsFacade.snapshot;
    const visible = widgets.filter((w) => w.visible);
    const widget = visible[event.previousIndex];
    if (!widget) return;
    // Map visible index to absolute index in the full array
    const allIndex = widgets.findIndex((w) => w.id === widget.id);
    if (allIndex === -1) return;
    const targetWidget = visible[event.currentIndex];
    const targetIndex = targetWidget
      ? widgets.findIndex((w) => w.id === targetWidget.id)
      : widgets.length - 1;
    this.instrumentsFacade.moveWidget(widget.id, targetIndex);
  }

  private readonly router = inject(Router);

  handleInstrumentConfigure() {
    this.router.navigate(['/instruments']);
  }

  handleSelectAisTarget(mmsi: string) {
    this.selectedAisMmsi.set(mmsi);
  }

  handleFollowAisTarget(mmsi: string) {
    const target = this.aisTargets().find((t) => t.mmsi === mmsi);
    if (target) {
      this.engine.flyTo([target.longitude, target.latitude], 14);
    }
  }

  handleCloseAisDetails() {
    this.selectedAisMmsi.set(null);
  }

  handleSelectWaypoint(id: string) {
    this.facade.selectWaypoint(id);
  }

  handleRenameWaypoint(event: { id: string; name: string }) {
    this.facade.renameWaypoint(event.id, event.name);
  }

  handleDeleteWaypoint(id: string) {
    this.facade.deleteWaypoint(id);
  }

  handleNavigateToWaypoint(id: string) {
    // Sets the destination and, if the autopilot is already engaged, switches it to ROUTE.
    this.resourcesFacade.navigateToWaypoint(id);
  }

  handleDeleteActiveWaypoint() {
    const activeId = this.activeWaypointId();
    if (!activeId) {
      return;
    }
    this.facade.deleteWaypoint(activeId);
  }

  handleClearActiveWaypoint() {
    this.facade.clearActiveWaypoint();
  }

  handleExportWaypointsGpx() {
    this.gpxExportService.exportWaypoints();
  }

  handleExportRouteGpx() {
    this.gpxExportService.exportRoute();
  }

  handleToggleAnchorWatch() {
    const pos = this.ownPositionSignal();
    const vesselPos: [number, number] | null =
      pos?.value?.longitude != null && pos?.value?.latitude != null
        ? [pos.value.longitude, pos.value.latitude]
        : null;
    this.anchorWatchService.toggle(vesselPos);
  }

  // ---- Playback Handlers (M8) ----

  handlePlaybackToggle() {
    const status = this.playbackState().status;
    if (status === 'playing') {
      this.playbackStore.pause();
    } else {
      this.playbackStore.play();
    }
  }

  handlePlaybackStop() {
    this.playbackStore.stop();
  }

  handlePlaybackSeek(timestamp: number) {
    this.playbackStore.seek(timestamp);
  }

  handlePlaybackSpeed(speed: number) {
    this.playbackStore.setSpeed(speed);
  }

  handlePlaybackSkipForward() {
    const state = this.playbackState();
    this.playbackStore.seek(state.currentTime + 30_000); // +30 seconds
  }

  handlePlaybackSkipBackward() {
    const state = this.playbackState();
    this.playbackStore.seek(state.currentTime - 30_000); // -30 seconds
  }

  private sortAisTargets(
    targets: AisTarget[],
    sortBy: 'distance' | 'cpa' | 'name',
    ownLat: number | null,
    ownLon: number | null,
  ): AisTarget[] {
    const distance = (target: AisTarget): number => {
      if (ownLat === null || ownLon === null) {
        return Number.POSITIVE_INFINITY;
      }
      return bearingDistanceNm(
        { lat: ownLat, lon: ownLon },
        { lat: target.latitude, lon: target.longitude },
      ).distanceNm;
    };

    const cpa = (target: AisTarget): number =>
      typeof target.cpa === 'number' ? target.cpa : Number.POSITIVE_INFINITY;

    return [...targets]
      .sort((left, right) => {
        const leftDanger = left.isDangerous ? 1 : 0;
        const rightDanger = right.isDangerous ? 1 : 0;
        if (leftDanger !== rightDanger) {
          return rightDanger - leftDanger;
        }

        if (sortBy === 'name') {
          return (left.name ?? left.mmsi).localeCompare(right.name ?? right.mmsi);
        }

        if (sortBy === 'cpa') {
          return cpa(left) - cpa(right);
        }

        return distance(left) - distance(right);
      })
      .slice(0, 50);
  }
}
