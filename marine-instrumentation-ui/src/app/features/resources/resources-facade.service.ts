import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WaypointStoreService } from '../../state/resources/waypoint-store.service';
import { RouteStoreService } from '../../state/resources/route-store.service';
import { TrackStoreService, Track } from '../../state/resources/track-store.service';
import { SignalKCourseService } from '../../data-access/signalk/course/signalk-course.service';
import { SignalKAutopilotService } from '../../data-access/signalk/autopilot/signalk-autopilot.service';
import { AutopilotStoreService, AUTOPILOT_PATHS } from '../../state/autopilot/autopilot-store.service';
import { AutopilotDecisionLogService } from '../autopilot/autopilot-decision-log.service';
import { AppToastService } from '../../shared/components/app-toast/app-toast.service';
import { WaypointFormValue } from './components/waypoint-form/waypoint-form.component';
import { GpxParseResult } from './utils/gpx-parser';

@Injectable({
  providedIn: 'root'
})
export class ResourcesFacadeService {
  private readonly waypointStore = inject(WaypointStoreService);
  private readonly routeStore = inject(RouteStoreService);
  private readonly trackStore = inject(TrackStoreService);
  private readonly courseService = inject(SignalKCourseService);
  private readonly autopilotService = inject(SignalKAutopilotService);
  private readonly autopilotStore = inject(AutopilotStoreService);
  private readonly decisionLog = inject(AutopilotDecisionLogService);
  private readonly router = inject(Router);
  private readonly toast = inject(AppToastService);

  readonly waypoints$ = this.waypointStore.waypoints$;
  readonly routes$ = this.routeStore.routes$;
  readonly isRecordingTrack$ = this.trackStore.recording$;
  readonly currentTrack$ = this.trackStore.currentTrack$;
  readonly tracks$ = this.trackStore.tracks$;

  // Waypoints
  createWaypoint(formValue: WaypointFormValue) {
      const payload = {
          name: formValue.name,
          position: { latitude: formValue.lat, longitude: formValue.lon },
      } as { name: string; position: { latitude: number; longitude: number }; description?: string };
      if (formValue.description) {
          payload.description = formValue.description;
      }
      this.waypointStore.createWaypoint(payload).subscribe({
        error: (err) => console.error('Failed to create waypoint', err),
      });
  }

  updateWaypoint(id: string, formValue: WaypointFormValue) {
      this.waypointStore.updateWaypoint(id, {
          name: formValue.name,
          description: formValue.description,
          position: { latitude: formValue.lat, longitude: formValue.lon }
      });
  }

  deleteWaypoint(id: string) {
      this.waypointStore.deleteWaypoint(id);
  }

  // Routes
  createRoute(name: string, waypoints: Array<{ lat: number; lon: number }>) {
      this.routeStore.createRoute({
          name,
          feature: {
              type: 'Feature',
              geometry: {
                  type: 'LineString',
                  coordinates: waypoints.map(wp => [wp.lon, wp.lat]),
              },
              properties: {},
          },
      });
  }

  updateRoute(id: string, name: string, waypoints: Array<{ lat: number; lon: number }>) {
      this.routeStore.updateRoute(id, {
          name,
          feature: {
              type: 'Feature',
              geometry: {
                  type: 'LineString',
                  coordinates: waypoints.map(wp => [wp.lon, wp.lat]),
              },
              properties: {},
          },
      });
  }

  deleteRoute(id: string) {
      this.routeStore.deleteRoute(id);
  }

  // Navigation (Signal K Course API)
  navigateToWaypoint(id: string) {
      this.courseService.setDestination(id).subscribe({
          next: () => this.engageRouteIfActive(),
          error: (err) => {
              console.error('Failed to set destination', err);
              this.decisionLog.record('warn', 'DESTINATION_FAILED', this.errorText(err));
              this.toast.show({ message: 'No se pudo fijar el destino', type: 'error' });
          },
      });
  }

  navigateToRoute(id: string) {
      this.courseService.activateRoute(id).subscribe({
          next: () => this.engageRouteIfActive(),
          error: (err) => {
              console.error('Failed to activate route', err);
              this.decisionLog.record('warn', 'DESTINATION_FAILED', this.errorText(err));
              this.toast.show({ message: 'No se pudo activar la ruta', type: 'error' });
          },
      });
  }

  clearNavigation() {
      this.courseService.clearCourse().subscribe({
          error: (err) => console.error('Failed to clear course', err),
      });
  }

  /**
   * Once a destination is set, follow it with the autopilot only if it is already
   * engaged (AUTO/WIND/ROUTE) — switch it to ROUTE so it tracks the waypoint. From
   * STANDBY we never auto-engage (safety: STANDBY by default); the explicit,
   * persistent confirmation lives on the autopilot page ("FOLLOW IN TRACK" banner),
   * so we route the operator there instead of engaging silently.
   */
  private engageRouteIfActive() {
      const state = this.autopilotStore.getSnapshot<string>(AUTOPILOT_PATHS.state) ?? 'standby';
      if (state === 'auto' || state === 'wind' || state === 'route') {
          this.autopilotService.engage('route').subscribe({
              next: () => this.toast.show({ message: 'Piloto en modo ROUTE: siguiendo al destino', type: 'success' }),
              error: () => this.toast.show({ message: 'No se pudo activar el modo ROUTE', type: 'error' }),
          });
      } else if (state === 'standby') {
          this.toast.show({
              message: 'Destino fijado. Abre el Piloto y pulsa SEGUIR EN TRACK.',
              type: 'info',
              action: {
                  label: 'Ir al Piloto',
                  callback: () => { void this.router.navigate(['/autopilot']); },
              },
          });
      } else {
          this.toast.show({ message: 'Piloto en FALLO: resuélvelo antes de navegar', type: 'warning' });
      }
  }

  private errorText(err: unknown): string {
      const e = err as { error?: { error?: string }; message?: string; status?: number };
      return e?.error?.error ?? e?.message ?? (typeof e?.status === 'number' ? `HTTP ${e.status}` : 'error');
  }

  // Tracks
  startTrackRecording() {
      this.trackStore.startRecording();
  }

  stopTrackRecording() {
      this.trackStore.stopRecording();
  }

  saveTrack(name: string) {
      this.trackStore.saveTrack(name);
  }

  discardTrack() {
      this.trackStore.discardTrack();
  }

  deleteTrack(id: Track['id']) {
      this.trackStore.deleteTrack(id);
  }

  // Import
  importGpx(data: GpxParseResult) {
      for (const wp of data.waypoints) {
          const payload = {
              name: wp.name || 'Imported Waypoint',
              position: { latitude: wp.lat, longitude: wp.lon },
          } as { name: string; position: { latitude: number; longitude: number }; description?: string };
          if (wp.desc) {
              payload.description = wp.desc;
          }
          this.waypointStore.createWaypoint(payload).subscribe({
            error: (err) => console.error('Failed to import waypoint', err),
          });
      }

      for (const route of data.routes) {
          if (route.points.length < 2) continue;
          this.routeStore.createRoute({
              name: route.name || 'Imported Route',
              ...(route.desc ? { description: route.desc } : {}),
              feature: {
                  type: 'Feature',
                  geometry: {
                      type: 'LineString',
                      coordinates: route.points.map(p => [p.lon, p.lat]),
                  },
                  properties: {},
              },
          });
      }
  }
}
