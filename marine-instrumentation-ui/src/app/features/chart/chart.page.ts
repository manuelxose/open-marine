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
import { ChartFacadeService } from './services/chart-facade.service';
import { ChartCanvasComponent } from './components/chart-canvas/chart-canvas.component';
import { ChartControlsComponent } from './components/chart-controls/chart-controls.component';
import { MapControlsComponent } from './components/map-controls/map-controls.component';
import { ChartHudComponent } from './components/chart-hud/chart-hud.component';
import { ChartWaypointListComponent } from './components/chart-waypoint-list/chart-waypoint-list.component';
import { AutopilotConsoleComponent } from '../autopilot/components/autopilot-console/autopilot-console.component';
import { AisTargetDetailsComponent } from '../ais/components/ais-target-details/ais-target-details.component';
import { AlarmStatusWidgetComponent } from './components/alarm-status-widget/alarm-status-widget.component';
import { MapLibreEngineService } from './services/maplibre-engine.service';
import { PlaybackBarComponent } from '../playback/components/playback-bar/playback-bar.component';
import { InstrumentsDrawerComponent } from '../instruments/components/instruments-drawer/instruments-drawer.component';
import { AppFabComponent } from '../../shared/components/app-fab/app-fab.component';

import { AisStoreService } from '../../state/ais/ais-store.service';
import { PlaybackStoreService } from '../../state/playback/playback-store.service';
import { toSignal } from '@angular/core/rxjs-interop';
import type { RouteFeatureCollection, WaypointFeatureCollection } from './types/chart-geojson';
import type { MapOrientation } from './types/chart-vm';
import type { FeatureCollection, Point } from 'geojson';
import {
  PLAYBACK_POSITION_LAT_PATH,
  PLAYBACK_POSITION_LON_PATH,
  PlaybackState,
} from '../../state/playback/playback.models';
import { InstrumentsFacadeService, InstrumentWidget } from '../instruments/instruments-facade.service';

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
    ChartControlsComponent,
    MapControlsComponent,
    ChartHudComponent,
    ChartWaypointListComponent,
    AisTargetDetailsComponent,
    AlarmStatusWidgetComponent,
    AutopilotConsoleComponent,
    PlaybackBarComponent,
    InstrumentsDrawerComponent,
    AppFabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart.page.html',
  styleUrls: ['./chart.page.css'],
})
export class ChartPage implements AfterViewInit, OnDestroy {
  private readonly facade = inject(ChartFacadeService);
  private readonly aisStore = inject(AisStoreService);
  private readonly playbackStore = inject(PlaybackStoreService);
  private readonly instrumentsFacade = inject(InstrumentsFacadeService);
  private readonly router = inject(Router);
  private readonly engine = new MapLibreEngineService();

  @ViewChild(ChartCanvasComponent) canvasComponent?: ChartCanvasComponent;

  readonly canvasVm$ = this.facade.canvasVm$;
  readonly controlsVm$ = this.facade.controlsVm$;
  readonly hudVm$ = this.facade.hudVm$;
  readonly waypointVm$ = this.facade.waypointListVm$;
  private readonly baseSourceSignal = toSignal(this.facade.baseSource$);
  readonly orientationSignal = toSignal(this.facade.orientation$, { initialValue: 'north-up' as MapOrientation });

  protected readonly showAutopilot = signal<boolean>(false);
  protected readonly showInstruments = signal<boolean>(false);

  protected readonly selectedAisMmsi = signal<string | null>(null);
  protected readonly selectedAisTarget = computed(() => {
    const mmsi = this.selectedAisMmsi();
    return mmsi ? this.aisStore.targets().get(mmsi) : null;
  });

  private readonly vesselSignal = toSignal(this.facade.vesselUpdate$, {
    initialValue: {
      lngLat: null,
      rotationDeg: null,
      state: 'no-fix' as 'fix' | 'stale' | 'no-fix',
    },
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
  protected readonly playbackStateSignal = toSignal(this.playbackStore.state$, {
    initialValue: INITIAL_PLAYBACK_STATE,
  });
  protected readonly instrumentsWidgets = toSignal(this.instrumentsFacade.widgets$, {
    initialValue: this.instrumentsFacade.snapshot,
  });
  private readonly playbackLatSignal = toSignal(
    this.playbackStore.frameForPath(PLAYBACK_POSITION_LAT_PATH),
    { initialValue: null },
  );
  private readonly playbackLonSignal = toSignal(
    this.playbackStore.frameForPath(PLAYBACK_POSITION_LON_PATH),
    { initialValue: null },
  );
  protected readonly instrumentsData = computed(() => {
    const vessel = this.vesselSignal();
    const lngLat = vessel.lngLat;
    return {
      fixState: vessel.state,
      position: lngLat ? { lat: lngLat[1], lon: lngLat[0] } : null,
    };
  });
  protected readonly playbackActive = computed(() => {
    const status = this.playbackStateSignal().status;
    return status === 'ready' || status === 'playing' || status === 'paused';
  });
  private readonly playbackVesselSignal = computed(() => {
    if (!this.playbackActive()) return null;
    const lat = this.playbackLatSignal();
    const lon = this.playbackLonSignal();
    if (!lat || !lon) return null;
    return {
      lngLat: [lon.value, lat.value] as [number, number],
      rotationDeg: null,
      state: 'fix' as 'fix' | 'stale' | 'no-fix',
    };
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

  constructor() {
    effect(() => {
      const vessel = this.playbackVesselSignal() ?? this.vesselSignal();
      if (!vessel) return;
      this.engine.updateVesselPosition(vessel.lngLat, vessel.rotationDeg, vessel.state);
    });

    effect(() => {
      this.engine.updateTrack(this.trackSignal());
    });

    effect(() => {
      const vector = this.vectorSignal();
      this.engine.updateVector(vector.coords, vector.visible);
    });

    effect(() => {
      const wind = this.trueWindSignal();
      this.engine.updateTrueWind(wind.coords, wind.visible);
    });

    effect(() => {
      this.engine.updateWaypoints(this.waypointsSignal());
    });

    effect(() => {
      this.engine.updateRoute(this.routeSignal());
    });

    effect(() => {
      this.engine.updateView(this.centerSignal());
    });

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
      if (source) {
        this.engine.setBaseSource(source);
      }
    });

    effect(() => {
      this.engine.setOrientation(this.orientationSignal());
    });
    effect(() => {
      this.engine.updateAisTargets(this.aisTargetsSignal());
    });
    effect(() => {
      this.engine.updateCpaLines(this.cpaLinesSignal());
    });
  }

  handleToggleAutoCenter(): void {
    this.facade.toggleAutoCenter();
  }

  handleToggleTrack(): void {
    this.facade.toggleTrack();
  }

  handleZoomIn(): void {
    this.engine.zoomIn();
  }

  handleZoomOut(): void {
    this.engine.zoomOut();
  }

  handleToggleLayers(): void {
    this.facade.toggleLayer();
  }

  handleToggleOrientation(): void {
    this.facade.toggleOrientation();
  }

  handleToggleVector(): void {
    this.facade.toggleVector();
  }

  handleToggleTrueWind(): void {
    this.facade.toggleTrueWind();
  }

  handleToggleRangeRings(): void {
    this.facade.toggleRangeRings();
  }

  handleChangeRangeRings(intervals: number[]): void {
    this.facade.setRangeRingIntervals(intervals);
  }

  handleSelectWaypoint(id: string): void {
    this.facade.selectWaypoint(id);
  }

  handleRenameWaypoint(event: { id: string; name: string }): void {
    this.facade.renameWaypoint(event.id, event.name);
  }

  handleDeleteWaypoint(id: string): void {
    this.facade.deleteWaypoint(id);
  }

  handleClearActiveWaypoint(): void {
    this.facade.clearActiveWaypoint();
  }
  
  handleCloseAisDetails(): void {
    this.selectedAisMmsi.set(null);
  }

  handlePlaybackSeek(timestamp: number): void {
    this.playbackStore.seek(timestamp);
  }

  handlePlaybackSpeedChange(speed: number): void {
    this.playbackStore.setSpeed(speed);
  }

  handleToggleInstruments(): void {
    this.showInstruments.set(!this.showInstruments());
  }

  handleInstrumentsReorder(event: { previousIndex: number; currentIndex: number }): void {
    const widgets = [...this.instrumentsFacade.snapshot];
    const visible = widgets.filter((widget) => widget.visible);
    if (event.previousIndex < 0 || event.currentIndex < 0 || event.previousIndex >= visible.length || event.currentIndex >= visible.length) {
      return;
    }
    const [moved] = visible.splice(event.previousIndex, 1);
    visible.splice(event.currentIndex, 0, moved);

    let visibleIndex = 0;
    const updated = widgets.map((widget) => (widget.visible ? visible[visibleIndex++] : widget));
    this.instrumentsFacade.setWidgets(updated);
  }

  handleNavigateToAutopilot(): void {
    // this.router.navigate(['/autopilot']);
    this.showAutopilot.update(v => !v);
  }

  ngAfterViewInit(): void {
    const container = this.canvasComponent?.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    this.engine.setClickHandler((lngLat) => this.facade.addWaypointAt(lngLat));
    this.engine.setFeatureClickHandler((event) => {
        if (event.layerId === 'chart-ais-layer' && event.properties?.mmsi) {
            console.log('AIS Target selected:', event.properties.mmsi);
            this.selectedAisMmsi.set(event.properties.mmsi);
        }
    });

    this.engine.init(container, this.facade.initialView);
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
