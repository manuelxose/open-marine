import { Injectable, inject } from '@angular/core';
import { WaypointStoreService } from '../../state/resources/waypoint-store.service';
import { RouteStoreService } from '../../state/resources/route-store.service';
import { TrackStoreService, Track } from '../../state/resources/track-store.service';
import { WaypointFormValue } from './components/waypoint-form/waypoint-form.component';
import { GpxParseResult } from './utils/gpx-parser';

@Injectable({
  providedIn: 'root'
})
export class ResourcesFacadeService {
  private readonly waypointStore = inject(WaypointStoreService);
  private readonly routeStore = inject(RouteStoreService);
  private readonly trackStore = inject(TrackStoreService);

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
  deleteRoute(id: string) {
      this.routeStore.deleteRoute(id);
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
      // Import Waypoints
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

      // Import Routes
      // Routes in GPX contain waypoints. 
      // Should we create waypoints for route points? Or just store them in the route?
      // Signal K routes usually reference waypoints by ID or have coordinates.
      // For simplicity here, we assume route points are inline coordinates or we create waypoints first.
      // Let's skipping route import details for MVP or implement simple inline.
      console.log('Routes import not fully implemented in facade logic yet');
  }
}
