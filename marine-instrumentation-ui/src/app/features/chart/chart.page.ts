import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartFacadeService } from './services/chart-facade.service';
import { ChartCanvasComponent } from './components/chart-canvas/chart-canvas.component';
import { ChartControlsComponent } from './components/chart-controls/chart-controls.component';
import { ChartHudComponent } from './components/chart-hud/chart-hud.component';
import { ChartWaypointListComponent } from './components/chart-waypoint-list/chart-waypoint-list.component';
import { MapLibreEngineService } from './services/maplibre-engine.service';
import { toSignal } from '@angular/core/rxjs-interop';
import type { RouteFeatureCollection, WaypointFeatureCollection } from './types/chart-geojson';

@Component({
  selector: 'app-chart-page',
  standalone: true,
  imports: [
    CommonModule,
    ChartCanvasComponent,
    ChartControlsComponent,
    ChartHudComponent,
    ChartWaypointListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart.page.html',
  styleUrls: ['./chart.page.css'],
})
export class ChartPage implements AfterViewInit, OnDestroy {
  private readonly facade = inject(ChartFacadeService);
  private readonly engine = new MapLibreEngineService();

  @ViewChild(ChartCanvasComponent) canvasComponent?: ChartCanvasComponent;

  readonly canvasVm$ = this.facade.canvasVm$;
  readonly controlsVm$ = this.facade.controlsVm$;
  readonly hudVm$ = this.facade.hudVm$;
  readonly waypointVm$ = this.facade.waypointListVm$;

  private readonly vesselSignal = toSignal(this.facade.vesselUpdate$, {
    initialValue: { lngLat: null as [number, number] | null, rotationDeg: null },
  });
  private readonly trackSignal = toSignal(this.facade.trackCoords$, {
    initialValue: [] as [number, number][],
  });
  private readonly vectorSignal = toSignal(this.facade.vectorUpdate$, {
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

  constructor() {
    effect(() => {
      const vessel = this.vesselSignal();
      this.engine.updateVesselPosition(vessel.lngLat, vessel.rotationDeg);
    });

    effect(() => {
      this.engine.updateTrack(this.trackSignal());
    });

    effect(() => {
      const vector = this.vectorSignal();
      this.engine.updateVector(vector.coords, vector.visible);
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
  }

  handleToggleAutoCenter(): void {
    this.facade.toggleAutoCenter();
  }

  handleToggleTrack(): void {
    this.facade.toggleTrack();
  }

  handleToggleVector(): void {
    this.facade.toggleVector();
  }

  handleCenterOnBoat(): void {
    this.facade.centerOnBoat();
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

  ngAfterViewInit(): void {
    const container = this.canvasComponent?.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    this.engine.setClickHandler((lngLat) => this.facade.addWaypointAt(lngLat));
    this.engine.setBaseSource(this.facade.baseSourceConfig);
    this.engine.init(container, this.facade.initialView);
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
