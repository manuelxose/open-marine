import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, filter, map } from 'rxjs';
import { DatapointStoreService } from '../datapoints/datapoint-store.service';
import { DataPoint } from '../datapoints/datapoint.models';
import { SignalKResourcesService } from '../../data-access/signalk/resources/signalk-resources.service';
import { PATHS } from '@omi/marine-data-contract';
import { SKTrack } from '../../data-access/signalk/resources/resource.models';

export interface RecordedTrackPoint {
  lat: number;
  lon: number;
  ts: number;
}

export interface Track extends SKTrack {
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrackStoreService implements OnDestroy {
  private readonly maxTrackPoints = 10000;
  private _recording = new BehaviorSubject<boolean>(false);
  public readonly recording$ = this._recording.asObservable();

  private _currentTrack: RecordedTrackPoint[] = [];
  private _currentTrackSubject = new BehaviorSubject<RecordedTrackPoint[]>([]);
  public readonly currentTrack$ = this._currentTrackSubject.asObservable();

  private readonly _tracks = new BehaviorSubject<Map<string, Track>>(new Map());
  public readonly tracks$ = this._tracks.asObservable().pipe(
    map((mapValue) =>
      Array.from(mapValue.values()).sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      }),
    ),
  );

  private readonly _loading = new BehaviorSubject<boolean>(false);
  public readonly loading$ = this._loading.asObservable();

  private sub?: Subscription;

  constructor(
    private datapointStore: DatapointStoreService,
    private skResources: SignalKResourcesService
  ) {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.stopRecording();
  }

  public startRecording(): void {
    if (this._recording.value) return;

    this._currentTrack = [];
    this._currentTrackSubject.next([]);
    this._recording.next(true);

    this.sub = this.datapointStore.observe<{latitude: number, longitude: number}>(PATHS.navigation.position)
        .pipe(
          filter(
            (dp): dp is DataPoint<{ latitude: number; longitude: number }> =>
              !!dp &&
              typeof dp.value === 'object' &&
              dp.value !== null &&
              typeof dp.value.latitude === 'number' &&
              typeof dp.value.longitude === 'number'
          )
        )
        .subscribe((dp) => {
          const pt: RecordedTrackPoint = {
            lat: dp.value.latitude,
            lon: dp.value.longitude,
            ts: dp.timestamp,
          };
          this._currentTrack.push(pt);
          // Emit every 10 points or just push?
          // Creating a new array reference every time is needed for OnPush
          // But doing it every 1Hz might be heavy if track is long.
          // For now, simple emit.
          this._currentTrackSubject.next([...this._currentTrack]);
        });
  }

  public stopRecording(): void {
     if (!this._recording.value) return;
     
     this._recording.next(false);
     if (this.sub) {
         this.sub.unsubscribe();
         this.sub = undefined;
     }
  }

  public saveTrack(name: string): void {
      if (this._currentTrack.length < 2) return;

      // Convert to Signal K Track format
      // Usually GeoJSON MultiLineString or LineString
      // { feature: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[lon, lat], ...] } } }

      const nameValue = name?.trim() || `Track ${new Date().toISOString()}`;
      const coordinates = this.getTrackCoordinates(); // GeoJSON is Lon, Lat

      const trackData = {
          name: nameValue,
          feature: {
              type: 'Feature',
              geometry: {
                  type: 'LineString',
                  coordinates
              },
              properties: {
                  startTime: new Date(this._currentTrack[0].ts).toISOString(),
                  endTime: new Date(this._currentTrack[this._currentTrack.length-1].ts).toISOString(),
              }
          }
      };

      // We use 'routes' or 'tracks'? Signal K v1 usually puts tracks under resources/tracks if enabled, 
      // or resources/routes with special type. 
      // Let's assume resources/tracks exists.

      this.skResources.createResource<SKTrack>('tracks', trackData).subscribe({
          next: (res) => {
              const id = res.id;
              const savedTrack: Track = {
                ...trackData,
                id,
                timestamp: new Date().toISOString(),
              };
              const current = this._tracks.value;
              const next = new Map(current);
              next.set(id, savedTrack);
              this._tracks.next(next);
              console.log('Track saved successfully');
              this._currentTrack = [];
              this._currentTrackSubject.next([]);
          },
          error: err => console.error('Failed to save track', err)
      });
  }

  public discardTrack(): void {
      this._currentTrack = [];
      this._currentTrackSubject.next([]);
      if (this._recording.value) {
          this.stopRecording();
      }
  }

  public deleteTrack(id: string): void {
      const current = this._tracks.value;
      if (!current.has(id)) return;

      const next = new Map(current);
      const original = current.get(id);
      next.delete(id);
      this._tracks.next(next);

      this.skResources.deleteResource('tracks', id).subscribe({
          error: (err) => {
              console.error('Failed to delete track', err);
              if (original) {
                const reverted = new Map(this._tracks.value);
                reverted.set(id, original);
                this._tracks.next(reverted);
              }
          }
      });
  }

  private loadAll(): void {
    this._loading.next(true);
    this.skResources.getResources<SKTrack>('tracks').subscribe({
      next: (resourceMap) => {
        const mapValue = new Map<string, Track>();
        if (resourceMap) {
          for (const [id, track] of Object.entries(resourceMap)) {
            mapValue.set(id, { ...track, id });
          }
        }
        this._tracks.next(mapValue);
        this._loading.next(false);
      },
      error: (err) => {
        console.error('Failed to load tracks', err);
        this._loading.next(false);
      },
    });
  }

  private getTrackCoordinates(): [number, number][] {
    const points = this._currentTrack;
    if (points.length <= this.maxTrackPoints) {
      return points.map((pt) => [pt.lon, pt.lat]);
    }
    const step = Math.ceil(points.length / this.maxTrackPoints);
    const sampled: [number, number][] = [];
    for (let i = 0; i < points.length; i += step) {
      const pt = points[i];
      sampled.push([pt.lon, pt.lat]);
    }
    const last = points[points.length - 1];
    if (sampled[sampled.length - 1]?.[0] !== last.lon || sampled[sampled.length - 1]?.[1] !== last.lat) {
      sampled.push([last.lon, last.lat]);
    }
    return sampled;
  }
}
