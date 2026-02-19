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
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
// Services
import { ChartFacadeService } from './services/chart-facade.service';
import { ChartFullscreenService } from './services/chart-fullscreen.service';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { AisStoreService } from '../../state/ais/ais-store.service';
import { PlaybackStoreService } from '../../state/playback/playback-store.service';
import { MapLibreEngineService } from './services/maplibre-engine.service';

// Components
import { ChartCanvasComponent } from './components/chart-canvas/chart-canvas.component';
import { ChartControlsComponent } from './components/chart-controls/chart-controls.component';
import { MapControlsComponent } from './components/map-controls/map-controls.component';
import { ChartHudComponent } from './components/chart-hud/chart-hud.component';
import { ChartWaypointListComponent } from './components/chart-waypoint-list/chart-waypoint-list.component';
import { QuickInstrumentsComponent } from './components/quick-instruments/quick-instruments.component';
import { ToolPanelComponent } from './components/tool-panel/tool-panel.component';
import { FullscreenToggleComponent } from './components/fullscreen-toggle/fullscreen-toggle.component';
import { AlarmStatusWidgetComponent } from './components/alarm-status-widget/alarm-status-widget.component';
import { AisTargetListComponent } from '../ais/components/ais-target-list/ais-target-list.component';
import { AisTargetDetailsComponent } from '../ais/components/ais-target-details/ais-target-details.component';
import { PlaybackBarComponent } from '../playback/components/playback-bar/playback-bar.component';
import { InstrumentsDrawerComponent } from '../instruments/components/instruments-drawer/instruments-drawer.component';

// Utils & Types
import { selectSog, selectCog, selectDepth } from '../../state/datapoints/datapoint.selectors';
import { metersPerSecondToKnots, toDegrees } from '../../state/calculations/navigation';
import { MapOrientation } from './types/chart-vm';
import { FeatureCollection, Point } from 'geojson';
import { RouteFeatureCollection, WaypointFeatureCollection } from './types/chart-geojson';
import { PLAYBACK_POSITION_LAT_PATH, PLAYBACK_POSITION_LON_PATH, PlaybackState } from '../../state/playback/playback.models';

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
    ChartHudComponent,
    QuickInstrumentsComponent,
    ToolPanelComponent,
    FullscreenToggleComponent,
    ChartControlsComponent,
    ChartWaypointListComponent,
    AlarmStatusWidgetComponent,
    AisTargetListComponent,
    AisTargetDetailsComponent,
    PlaybackBarComponent,
    InstrumentsDrawerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="chart-page" 
      [class.fullscreen]="isFullscreen()"
      [class.panels-collapsed]="allPanelsCollapsed()"
    >
      <!-- Map Canvas -->
      <app-chart-canvas 
        *ngIf="canvasVm$ | async as vm"
        class="chart-map" 
        [vm]="vm" 
      />
      
      <!-- ZONA: Top Left - Map Controls -->
      <div class="chart-zone chart-zone--top-left">
        <app-map-controls
          [orientation]="orientation()"
          [canCenter]="(controlsVm$ | async)?.canCenter ?? false"
          [isTracking]="isTracking()"
          [sourceId]="(controlsVm$ | async)?.sourceId ?? 'osm-raster'"
          (zoomIn)="handleZoomIn()"
          (zoomOut)="handleZoomOut()"
          (centerOnVessel)="handleCenter()"
          (toggleOrientation)="handleToggleOrientation()"
          (toggleBaseLayer)="handleToggleBaseLayer()"
        />
      </div>
      
      <!-- ZONA: Top Center - Alarm Strip -->
      <div class="chart-zone chart-zone--top-center">
        <app-alarm-status-widget />
      </div>
      
      <!-- ZONA: Top Right - Tool Panels -->
      <div class="chart-zone chart-zone--top-right">
        <app-tool-panel 
          icon="ais" 
          label="AIS" 
          [badge]="aisCount()"
          [badgeVariant]="'neutral'"
          [expanded]="aisExpanded()"
          (toggle)="aisExpanded.set(!aisExpanded())"
        >
          <app-ais-target-list 
            [targets]="aisTargets()" 
            (selectTarget)="handleSelectAisTarget($event)" 
          />
        </app-tool-panel>
        
        <app-tool-panel 
          icon="waypoint" 
          label="Waypoints"
          [badge]="waypointCount()"
          [expanded]="waypointsExpanded()"
          (toggle)="waypointsExpanded.set(!waypointsExpanded())"
        >
          <app-chart-waypoint-list 
            *ngIf="waypointVm$ | async as vm"
            [vm]="vm" 
          />
        </app-tool-panel>
        
        <app-tool-panel 
          icon="layers" 
          label="Layers"
          [expanded]="layersExpanded()"
          (toggle)="layersExpanded.set(!layersExpanded())"
        >
          <app-chart-controls 
            *ngIf="controlsVm$ | async as vm"
            [vm]="vm" 
            (toggleTrack)="handleToggleTrack()"
            (toggleVector)="handleToggleVector()"
            (toggleTrueWind)="handleToggleTrueWind()"
            (toggleRangeRings)="handleToggleRangeRings()"
            (changeRangeRingIntervals)="handleChangeRangeRings($event)"
          />
        </app-tool-panel>
      </div>
      
      <!-- ZONA: Bottom Left - HUD -->
      <div class="chart-zone chart-zone--bottom-left">
        <app-chart-hud 
          *ngIf="hudVm$ | async as vm"
          [vm]="vm"
          [compact]="isCompactMode()"
          (toggleAutopilot)="toggleAutopilot()"
        />
      </div>
      
      <!-- ZONA: Bottom Right - Quick Instruments -->
      <div class="chart-zone chart-zone--bottom-right">
        <app-quick-instruments 
          [sog]="sog() ?? null"
          [cog]="cog() ?? null"
          [depth]="depth() ?? null"
          [depthUnit]="depthUnit()"
          [speedUnit]="speedUnit()"
          (openDrawer)="handleOpenInstruments()"
        />
      </div>
      
      <!-- ZONA: Bottom Center - Playback -->
      <div class="chart-zone chart-zone--bottom-center" *ngIf="isPlaybackActive()">
        <app-playback-bar [state]="playbackState()" />
      </div>
      
      <!-- Fullscreen Toggle (FAB) -->
      <app-fullscreen-toggle 
        class="fullscreen-fab"
        [isFullscreen]="isFullscreen()"
        (toggle)="handleToggleFullscreen()"
      />
      
      <!-- Instruments Drawer -->
      <app-instruments-drawer 
        [isOpen]="showInstruments()"
        (close)="showInstruments.set(false)"
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
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg-app);
      
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
      top: var(--chart-edge-gap);
      left: var(--chart-edge-gap);
      animation: chart-zone-enter 0.4s var(--ease-out) both;
      animation-delay: 0.1s;
    }

    // TOP CENTER: Alarm Strip
    .chart-zone--top-center {
      top: var(--chart-edge-gap);
      left: 50%;
      transform: translateX(-50%);
      max-width: 90%;
      animation: chart-zone-enter-top 0.4s var(--ease-out) both;
      animation-delay: 0.15s;
    }

    // TOP RIGHT: Tool Panels (vertical stack)
    .chart-zone--top-right {
      top: var(--chart-edge-gap);
      right: var(--chart-edge-gap);
      display: flex;
      flex-direction: column;
      gap: var(--chart-element-gap);
      max-height: calc(100% - 2 * var(--chart-edge-gap));
      overflow-y: auto;
      overflow-x: hidden;
      animation: chart-zone-enter-right 0.4s var(--ease-out) both;
      animation-delay: 0.2s;
      
      // Sleek scrollbar
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, var(--border-strong) 50%, transparent) transparent;
      
      &::-webkit-scrollbar {
        width: 3px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--border-strong) 50%, transparent);
        border-radius: 2px;
        
        &:hover {
          background: var(--border-strong);
        }
      }
    }

    // BOTTOM LEFT: HUD
    .chart-zone--bottom-left {
      bottom: var(--chart-edge-gap);
      left: var(--chart-edge-gap);
      animation: chart-zone-enter-bottom 0.5s var(--ease-out) both;
      animation-delay: 0.25s;
    }

    // BOTTOM RIGHT: Quick Instruments
    .chart-zone--bottom-right {
      bottom: var(--chart-edge-gap);
      right: var(--chart-edge-gap);
      animation: chart-zone-enter-bottom 0.5s var(--ease-out) both;
      animation-delay: 0.3s;
    }

    // BOTTOM CENTER: Playback Bar
    .chart-zone--bottom-center {
      bottom: var(--chart-edge-gap);
      left: 50%;
      transform: translateX(-50%);
      width: min(720px, calc(100% - 400px));
      animation: chart-zone-enter-bottom 0.4s var(--ease-out) both;
    }

    // ═══════════════════════════════════════════════
    // FULLSCREEN FAB
    // ═══════════════════════════════════════════════

    .fullscreen-fab {
      position: absolute;
      top: var(--chart-edge-gap);
      right: calc(var(--chart-edge-gap) + 320px);
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
      .chart-zone--top-right {
        flex-direction: row;
        top: auto;
        bottom: calc(var(--chart-edge-gap) + 80px);
        right: var(--chart-edge-gap);
        max-height: none;
        gap: var(--space-2);
        flex-wrap: wrap-reverse;
        justify-content: flex-end;
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
  private readonly datapointStore = inject(DatapointStoreService);
  private readonly aisStore = inject(AisStoreService);
  private readonly playbackStore = inject(PlaybackStoreService);
  
  private readonly router = inject(Router);
  private readonly engine = new MapLibreEngineService(); // Engine logic maintained

  @ViewChild(ChartCanvasComponent) canvasComponent?: ChartCanvasComponent;

  // View Models (from Facade)
  readonly canvasVm$ = this.facade.canvasVm$;
  readonly controlsVm$ = this.facade.controlsVm$;
  readonly hudVm$ = this.facade.hudVm$;
  readonly waypointVm$ = this.facade.waypointListVm$;
  
  // UI State
  readonly isFullscreen = this.fullscreenService.isFullscreen;
  readonly showInstruments = signal(false);
  readonly aisExpanded = signal(false);
  readonly waypointsExpanded = signal(false);
  readonly layersExpanded = signal(false);
  
  // AIS State
  readonly aisTargets = computed(() => Array.from(this.aisStore.targets().values()));
  readonly aisCount = computed(() => this.aisStore.targetCount());
  readonly selectedAisMmsi = signal<string | null>(null);
  readonly selectedAisTarget = computed(() => {
    const mmsi = this.selectedAisMmsi();
    return mmsi ? this.aisStore.targets().get(mmsi) : null;
  });

  // Derived Data for Quick Instruments
  private readonly rawSog = toSignal(selectSog(this.datapointStore), { initialValue: null });
  private readonly rawCog = toSignal(selectCog(this.datapointStore), { initialValue: null });
  private readonly rawDepth = toSignal(selectDepth(this.datapointStore), { initialValue: null });

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

  // Units (Mocked for now, should come from preferences)
  readonly speedUnit = signal<'kn'>('kn');
  readonly depthUnit = signal<'m'>('m');

  // Map & Playback State Logic (Legacy Integration)
  private readonly baseSourceSignal = toSignal(this.facade.baseSource$);
  readonly orientation = toSignal(this.facade.orientation$, { initialValue: 'north-up' as MapOrientation });
  readonly isTracking = signal(true); 

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
  }

  ngAfterViewInit(): void {
    const container = this.canvasComponent?.mapContainer?.nativeElement;
    if (!container) return;

    this.engine.setClickHandler((lngLat) => this.facade.addWaypointAt(lngLat));
    this.engine.setFeatureClickHandler((event) => {
        if (event.layerId === 'chart-ais-layer' && event.properties?.mmsi) {
            this.selectedAisMmsi.set(event.properties.mmsi);
        }
    });

    this.engine.init(container, this.facade.initialView);
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
  
  // ---- Event Handlers ----
  
  handleZoomIn() { this.engine.zoomIn(); } // Using engine directly for standard zoom
  handleZoomOut() { this.engine.zoomOut(); }
  
  handleCenter() {
    this.facade.centerOnVessel();
    this.isTracking.set(true);
  }
  
  handleToggleOrientation() { this.facade.toggleOrientation(); }
  
  handleToggleBaseLayer() {
     this.facade.toggleLayer();
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

  handleToggleFullscreen() {
    this.fullscreenService.toggle();
  }

  handleOpenInstruments() {
    this.showInstruments.set(true);
  }
  
  handleSelectAisTarget(mmsi: string) {
     this.selectedAisMmsi.set(mmsi);
  }

  handleCloseAisDetails() {
    this.selectedAisMmsi.set(null);
  }
    
  toggleAutopilot() {
      // Just toggle the route for now or open console
      this.router.navigate(['/autopilot']);
  }
  
  allPanelsCollapsed(): boolean {
      return !this.aisExpanded() && !this.waypointsExpanded() && !this.layersExpanded();
  }
  
  isCompactMode(): boolean {
      return window.innerWidth < 768; // simple check, ideally resize observer or breakpoint observer
  }
}
