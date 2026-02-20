import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
// Services
import { ChartFacadeService } from './services/chart-facade.service';
import { ChartFullscreenService } from './services/chart-fullscreen.service';
import { AnchorWatchService } from './services/anchor-watch.service';
import { MeasurementService } from './services/measurement.service';
import { GpxExportService } from './services/gpx-export.service';
import { InstrumentsFacadeService } from '../instruments/instruments-facade.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { AisStoreService } from '../../state/ais/ais-store.service';
import { PlaybackStoreService } from '../../state/playback/playback-store.service';
import { MapLibreEngineService } from './services/maplibre-engine.service';

// Components
import { ChartCanvasComponent } from './components/chart-canvas/chart-canvas.component';
import { MapControlsComponent } from './components/map-controls/map-controls.component';

import { QuickInstrumentsComponent } from './components/quick-instruments/quick-instruments.component';
import { LeftPanelComponent } from './components/left-panel/left-panel.component';
import { FullscreenToggleComponent } from './components/fullscreen-toggle/fullscreen-toggle.component';
import { AlarmStatusWidgetComponent } from './components/alarm-status-widget/alarm-status-widget.component';
import { ChartTopBarComponent } from './components/chart-top-bar/chart-top-bar.component';
import { AisTargetDetailsComponent } from '../ais/components/ais-target-details/ais-target-details.component';
import { PlaybackBarComponent } from '../playback/components/playback-bar/playback-bar.component';
import { InstrumentsDrawerComponent } from '../instruments/components/instruments-drawer/instruments-drawer.component';
import { MapSettingsPanelComponent } from './components/map-settings-panel/map-settings-panel.component';

// Utils & Types
import { selectSog, selectCog, selectDepth, selectPosition, selectHeading, selectAws, selectAwa } from '../../state/datapoints/datapoint.selectors';
import { bearingDistanceNm, metersPerSecondToKnots, toDegrees } from '../../state/calculations/navigation';
import { ChartLeftPanelTab, MapOrientation } from './types/chart-vm';
import { FeatureCollection, Point } from 'geojson';
import { RouteFeatureCollection, WaypointFeatureCollection } from './types/chart-geojson';
import { PLAYBACK_POSITION_LAT_PATH, PLAYBACK_POSITION_LON_PATH, PlaybackState } from '../../state/playback/playback.models';
import { AisTarget } from '../../core/models/ais.model';

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
    FullscreenToggleComponent,
    AlarmStatusWidgetComponent,
    ChartTopBarComponent,
    AisTargetDetailsComponent,
    PlaybackBarComponent,
    InstrumentsDrawerComponent,
    MapSettingsPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="chart-page" 
      [class.fullscreen]="isFullscreen()"
      [class.left-panel-open]="leftPanelOpen()"
    >
      <!-- Map Canvas -->
      <app-chart-canvas 
        *ngIf="canvasVm$ | async as vm"
        class="chart-map" 
        [vm]="vm" 
      />

      <app-chart-top-bar
        *ngIf="topBarVm$ | async as vm"
        class="chart-top-bar-host"
        [vm]="vm"
      />
      
      <!-- ZONA: Top Left - Map Controls -->
      <div class="chart-zone chart-zone--top-left">
        <app-map-controls
          [orientation]="orientation()"
          [canCenter]="(controlsVm$ | async)?.canCenter ?? false"
          [autoCenter]="(controlsVm$ | async)?.autoCenter ?? false"
          [sourceId]="(controlsVm$ | async)?.sourceId ?? 'osm-raster'"
          [anchorWatchActive]="anchorWatchActive()"
          [showOpenSeaMap]="(controlsVm$ | async)?.showOpenSeaMap ?? false"
          [measureActive]="measurementActive()"
          [panelOpen]="leftPanelOpen()"
          [settingsPanelOpen]="settingsPanelOpen()"
          (zoomIn)="handleZoomIn()"
          (zoomOut)="handleZoomOut()"
          (centerOnVessel)="handleCenterAndFollow()"
          (toggleOrientation)="handleToggleOrientation()"
          (addWaypoint)="handleAddWaypoint()"
          (toggleBaseLayer)="handleToggleBaseLayer()"
          (toggleOpenSeaMap)="handleToggleOpenSeaMap()"
          (toggleMeasure)="handleToggleMeasure()"
          (toggleAnchorWatch)="handleToggleAnchorWatch()"
          (togglePanel)="handleToggleLeftPanel()"
          (toggleSettingsPanel)="handleToggleSettingsPanel()"
        />
      </div>
      
      <!-- ZONA: Top Center - Alarm Strip -->
      <div class="chart-zone chart-zone--top-center">
        <app-alarm-status-widget />
      </div>
      
      <!-- ZONA: Left Panel (M2) -->
      <div class="chart-zone chart-zone--left-panel">
        <app-left-panel
          [isOpen]="leftPanelOpen()"
          [activeTab]="leftPanelTab()"
          [controlsVm]="(controlsVm$ | async) ?? null"
          [waypointVm]="(waypointVm$ | async) ?? null"
          [routesVm]="(routesVm$ | async) ?? null"
          [aisTargets]="aisTargets()"
          [selectedAisMmsi]="selectedAisMmsi()"
          [aisSortBy]="aisSortBy()"
          (toggleOpen)="handleToggleLeftPanel()"
          (tabChange)="handleLeftPanelTabChange($event)"
          (selectAisTarget)="handleSelectAisTarget($event)"
          (aisSortByChange)="handleAisSortChange($event)"
          (toggleTrack)="handleToggleTrack()"
          (toggleVector)="handleToggleVector()"
          (toggleTrueWind)="handleToggleTrueWind()"
          (toggleRangeRings)="handleToggleRangeRings()"
          (changeRangeRingIntervals)="handleChangeRangeRings($event)"
          (toggleAisTargets)="handleToggleAisTargets()"
          (toggleAisLabels)="handleToggleAisLabels()"
          (toggleCpaLines)="handleToggleCpaLines()"
          (toggleOpenSeaMap)="handleToggleOpenSeaMap()"
          (selectWaypoint)="handleSelectWaypoint($event)"
          (renameWaypoint)="handleRenameWaypoint($event)"
          (deleteWaypoint)="handleDeleteWaypoint($event)"
          (clearActiveWaypoint)="handleClearActiveWaypoint()"
          (exportWaypointsGpx)="handleExportWaypointsGpx()"
          (exportRouteGpx)="handleExportRouteGpx()"
          (followTarget)="handleFollowAisTarget($event)" />
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

      <!-- Map Settings Panel -->
      <app-map-settings-panel
        *ngIf="settingsPanelOpen()"
        class="chart-zone chart-zone--settings-panel"
        (navigateTo)="handleNavigateTo($event)"
        (closePanel)="settingsPanelOpen.set(false)"
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
      <app-ais-target-details 
        *ngIf="selectedAisTarget()"
        [target]="selectedAisTarget()!"
        (close)="handleCloseAisDetails()"
        class="ais-details-modal"
      />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .chart-page {
      --chart-top-bar-height: 48px;
      --chart-alarm-strip-height: 56px;
      --chart-top-controls-offset: calc(var(--chart-top-bar-height) + (var(--chart-edge-gap) * 0.25));
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

    // TOP CENTER: Alarm Strip
    .chart-zone--top-center {
      top: calc(var(--chart-top-bar-height) + var(--chart-edge-gap));
      left: 50%;
      transform: translateX(-50%);
      max-width: 90%;
      z-index: var(--z-chart-panels);
      animation: chart-zone-enter-top 0.4s var(--ease-out) both;
      animation-delay: 0.15s;
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
      
      @media(max-width: 768px) {
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
    // RESPONSIVE
    // ═══════════════════════════════════════════════

    @media (max-width: 768px) {
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
    }
  `]
})
export class ChartPage implements AfterViewInit, OnDestroy {
  private readonly facade = inject(ChartFacadeService);
  private readonly fullscreenService = inject(ChartFullscreenService);
  private readonly anchorWatchService = inject(AnchorWatchService);
  private readonly measurementService = inject(MeasurementService);
  private readonly gpxExportService = inject(GpxExportService);
  private readonly instrumentsFacade = inject(InstrumentsFacadeService);
  private readonly datapointStore = inject(DatapointStoreService);
  private readonly aisStore = inject(AisStoreService);
  private readonly playbackStore = inject(PlaybackStoreService);
  
  private readonly engine = new MapLibreEngineService(); // Engine logic maintained
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
  readonly leftPanelOpen = signal(true);
  readonly leftPanelTab = signal<ChartLeftPanelTab>('layers');
  readonly aisSortBy = signal<'distance' | 'cpa' | 'name'>('distance');
  readonly settingsPanelOpen = signal(false);

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
  private readonly ownPositionSignal = toSignal(selectPosition(this.datapointStore), { initialValue: null });
  readonly aisTargets = computed(() => this.sortAisTargets(
    Array.from(this.aisStore.targets().values()),
    this.aisSortBy(),
    this.ownPositionSignal()?.value?.latitude ?? null,
    this.ownPositionSignal()?.value?.longitude ?? null,
  ));
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
    return val?.value !== undefined && val.value !== null ? metersPerSecondToKnots(val.value) : null;
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
    return val?.value !== undefined && val.value !== null ? metersPerSecondToKnots(val.value) : null;
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
  private readonly openSeaMapSignal = toSignal(this.facade.openSeaMapVisible$, { initialValue: false });
  private readonly showAisTargetsSignal = toSignal(this.facade.showAisTargets$, { initialValue: true });
  private readonly showAisLabelsSignal = toSignal(this.facade.showAisLabels$, { initialValue: true });
  private readonly showCpaLinesSignal = toSignal(this.facade.showCpaLines$, { initialValue: true });
  readonly orientation = toSignal(this.facade.orientation$, { initialValue: 'north-up' as MapOrientation });
  readonly isTracking = computed(() => this.controlsVmSignal()?.autoCenter ?? false);

  private readonly vesselSignal = toSignal(this.facade.vesselUpdate$, {
    initialValue: { lngLat: null, rotationDeg: null, state: 'no-fix' as 'fix' | 'stale' | 'no-fix' },
  });
  private readonly trackSignal = toSignal(this.facade.trackCoords$, {
    initialValue: [] as [number, number][],
  });
  private readonly vectorSignal = toSignal(this.facade.vectorUpdate$, {
    initialValue: { coords: [] as [number, number][], visible: false },
  });
  private readonly trueWindSignal = toSignal(this.facade.trueWindUpdate$, {
    initialValue: { coords: [] as [number, number][], visible: false },
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
  private readonly aisTargetsSignal = toSignal(this.facade.aisTargetsGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<Point>,
  });
  private readonly cpaLinesSignal = toSignal(this.facade.cpaLinesGeoJson$, {
    initialValue: { type: 'FeatureCollection', features: [] } as FeatureCollection<any>,
  });

  // Playback Logic
  readonly playbackState = toSignal(this.playbackStore.state$, { initialValue: INITIAL_PLAYBACK_STATE });
  readonly isPlaybackActive = computed(() => {
    const status = this.playbackState().status;
    return status === 'ready' || status === 'playing' || status === 'paused';
  });
  private readonly playbackLatSignal = toSignal(
    this.playbackStore.frameForPath(PLAYBACK_POSITION_LAT_PATH), { initialValue: null }
  );
  private readonly playbackLonSignal = toSignal(
    this.playbackStore.frameForPath(PLAYBACK_POSITION_LON_PATH), { initialValue: null }
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
    // ---- Map Engine Effects (Maintained from original) ----
    effect(() => {
      const vessel = this.playbackVesselSignal() ?? this.vesselSignal();
      if (!vessel) return;
      this.engine.updateVesselPosition(vessel.lngLat, vessel.rotationDeg, vessel.state);
    });

    effect(() => { this.engine.updateTrack(this.trackSignal()); });
    effect(() => { 
      const vector = this.vectorSignal(); 
      this.engine.updateVector(vector.coords, vector.visible); 
    });
    effect(() => {
      const wind = this.trueWindSignal();
      this.engine.updateTrueWind(wind.coords, wind.visible);
    });
    effect(() => { this.engine.updateWaypoints(this.waypointsSignal()); });
    effect(() => { this.engine.updateRoute(this.routeSignal()); });
    effect(() => { this.engine.updateView(this.centerSignal()); });
    effect(() => {
      const rings = this.rangeRingsSignal();
      if (rings && rings.center) {
        this.engine.updateRangeRings(rings.center, rings.intervals);
      } else {
        this.engine.clearRangeRings();
      }
    });
    effect(() => {
      const line = this.bearingLineSignal();
      this.engine.updateBearingLine(line.coords, line.visible);
    });
    effect(() => {
      const source = this.baseSourceSignal();
      if (source) this.engine.setBaseSource(source);
    });
    effect(() => { this.engine.setOrientation(this.orientation()); });
    effect(() => { this.engine.updateAisTargets(this.aisTargetsSignal()); });
    effect(() => { this.engine.updateCpaLines(this.cpaLinesSignal()); });
    effect(() => { this.engine.setOpenSeaMapVisible(this.openSeaMapSignal()); });
    effect(() => { this.engine.setAisTargetsVisible(this.showAisTargetsSignal()); });
    effect(() => { this.engine.setAisLabelsVisible(this.showAisLabelsSignal()); });
    effect(() => { this.engine.setCpaLinesVisible(this.showCpaLinesSignal()); });

    // Measurement tool — sync to map engine
    effect(() => {
      const ms = this.measurementStateSignal();
      if (ms.active) {
        this.engine.updateMeasurement(ms.pointA, ms.pointB, ms.bearingDeg, ms.distanceNm);
      } else {
        this.engine.clearMeasurement();
      }
    });

    // Anchor Watch — feed vessel position to service
    effect(() => {
      const pos = this.ownPositionSignal();
      if (pos?.value?.longitude != null && pos?.value?.latitude != null) {
        this.anchorWatchService.updateVesselPosition(pos.value.longitude, pos.value.latitude);
      }
    });

    // Anchor Watch — sync layer on map
    effect(() => {
      const state = this.anchorWatchState();
      if (state.active && state.config) {
        this.engine.updateAnchorWatch(
          state.config.anchorPosition,
          state.config.radiusMeters,
          state.alarmActive,
        );
      } else {
        this.engine.clearAnchorWatch();
      }
    });
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

    this.engine.setClickHandler((lngLat) => {
      // When measurement mode is active, route clicks to measurement service
      if (this.measurementActive()) {
        this.measurementService.addPoint(lngLat);
        return;
      }
      this.facade.addWaypointAt(lngLat);
    });
    this.engine.setFeatureClickHandler((event) => {
        if (event.layerId === 'chart-ais-layer' && event.properties?.mmsi) {
            this.selectedAisMmsi.set(event.properties.mmsi);
        }
    });

    this.engine.init(container, this.facade.initialView);
    this.mapInitialized = true;
  }

  ngOnDestroy(): void {
    this.engine.destroy();
    this.mapInitialized = false;
  }
  
  // ---- Event Handlers ----
  
  handleZoomIn() { this.engine.zoomIn(); } // Using engine directly for standard zoom
  handleZoomOut() { this.engine.zoomOut(); }
  
  handleCenter() {
    this.facade.centerOnVessel();
  }
  
  handleCenterAndFollow() {
    // Single button: center on vessel and enable auto-follow
    this.facade.centerOnVessel();
    if (!this.isTracking()) {
      this.facade.toggleAutoCenter();
    }
  }
  
  handleToggleOrientation() { this.facade.toggleOrientation(); }

  handleToggleAutoCenter() {
    this.facade.toggleAutoCenter();
  }
  
  handleToggleBaseLayer() {
     this.facade.toggleLayer();
  }

  handleToggleOpenSeaMap() {
    this.facade.toggleOpenSeaMap();
  }

  handleToggleMeasure() {
    this.measurementService.toggle();
  }

  async handleAddWaypoint() {
    await this.facade.addWaypointAtCenter();
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

  handleAisSortChange(sortBy: 'distance' | 'cpa' | 'name') {
    this.aisSortBy.set(sortBy);
  }

  handleToggleFullscreen() {
    this.fullscreenService.toggle();
  }

  handleToggleSettingsPanel() {
    this.settingsPanelOpen.set(!this.settingsPanelOpen());
    // Close left panel if settings panel opens to avoid overlap
    if (this.settingsPanelOpen()) {
      this.leftPanelOpen.set(false);
    }
  }

  handleNavigateTo(coords: { lng: number; lat: number; zoom?: number }) {
    this.engine.flyTo([coords.lng, coords.lat], coords.zoom ?? 10);
    this.settingsPanelOpen.set(false);
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
    const targetIndex = targetWidget ? widgets.findIndex((w) => w.id === targetWidget.id) : widgets.length - 1;
    this.instrumentsFacade.moveWidget(widget.id, targetIndex);
  }

  handleInstrumentConfigure() {
    // Future: open an instruments configuration modal
    // For now, simply toggle the instruments panel open
    this.showInstruments.set(true);
  }
  
  handleSelectAisTarget(mmsi: string) {
     this.selectedAisMmsi.set(mmsi);
  }

  handleFollowAisTarget(mmsi: string) {
    const target = this.aisTargets().find(t => t.mmsi === mmsi);
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
