import { Injectable, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { 
  Observable, 
  Subject, 
  BehaviorSubject, 
  timer, 
  retry, 
  tap, 
  catchError, 
  EMPTY, 
  bufferTime, 
  map,
  filter,
  Subscription
} from 'rxjs';
import { APP_ENVIRONMENT, AppEnvironment } from '../../core/config/app-environment.token';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { normalizeDelta } from './signalk-mapper';
import { SignalKDeltaMessage, NormalizedDataPoint } from './signalk-message.types';

@Injectable({
  providedIn: 'root'
})
export class SignalKClientService implements OnDestroy {
  private socket$?: WebSocketSubject<SignalKDeltaMessage>;
  private connectionSubscription?: Subscription;

  // Connection State
  private _connected = new BehaviorSubject<boolean>(false);
  public connected$ = this._connected.asObservable();

  constructor(
    @Inject(APP_ENVIRONMENT) private env: AppEnvironment,
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private store: DatapointStoreService
  ) {}

  public connect(): void {
    if (!isPlatformBrowser(this.platformId)) return; // Don't connect in SSR
    
    if (this.socket$) return; // Already connected logic could be here, but simple start

    console.log(`Connecting to Signal K WS at ${this.env.signalKWsUrl}`);

    this.socket$ = webSocket<SignalKDeltaMessage>({
      url: this.env.signalKWsUrl,
      openObserver: {
        next: () => {
          console.log('Signal K WS Connected');
          this._connected.next(true);
        }
      },
      closeObserver: {
        next: () => {
          console.log('Signal K WS Closed');
          this._connected.next(false);
          this.socket$ = undefined; // Allow reconnect
        }
      }
    });

    // Main subscription
    this.connectionSubscription = this.socket$.pipe(
      retry({ delay: 3000 }), // Simple retry logic
      map((msg: SignalKDeltaMessage) => normalizeDelta(msg)),
      filter(points => points.length > 0),
      // Buffer updates to batch writes to store ~10 times a second
      bufferTime(100),
      filter(buffer => buffer.length > 0)
    ).subscribe({
      next: (bufferOfArrays: NormalizedDataPoint[][]) => {
        // Flatten
        const allPoints = bufferOfArrays.flat();
        
        // Deduplicate: Last one for a given path wins in this batch
        const uniqueUpdates = new Map<string, NormalizedDataPoint>();
        for (const p of allPoints) {
          // We could compare timestamps here to be strictly correct, 
          // but usually stream order is reliable enough for this basic dedupe.
          uniqueUpdates.set(p.path, p);
        }

        this.store.update(Array.from(uniqueUpdates.values()));
      },
      error: (err) => console.error('WS Error', err)
    });
  }

  public disconnect(): void {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = undefined;
    }
    this._connected.next(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
