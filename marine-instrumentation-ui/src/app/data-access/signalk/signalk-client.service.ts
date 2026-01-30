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
import { AisStoreService } from '../../state/ais/ais-store.service';
import { normalizeDelta } from './signalk-mapper';
import { NormalizedDataPoint, SignalKHelloMessage, SignalKMessage } from './signalk-message.types';

@Injectable({
  providedIn: 'root'
})
export class SignalKClientService implements OnDestroy {
  private socket$?: WebSocketSubject<SignalKMessage>;
  private connectionSubscription?: Subscription;
  private selfContext: string | null = null;

  // Connection State
  private _connected = new BehaviorSubject<boolean>(false);
  public connected$ = this._connected.asObservable();

  constructor(
    @Inject(APP_ENVIRONMENT) private env: AppEnvironment,
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private store: DatapointStoreService,
    private aisStore: AisStoreService
  ) {}

  public connect(): void {
    if (!isPlatformBrowser(this.platformId)) return; // Don't connect in SSR
    
    if (this.socket$) return; // Already connected logic could be here, but simple start

    console.log(`Connecting to Signal K WS at ${this.env.signalKWsUrl}`);

    this.socket$ = webSocket<SignalKMessage>({
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
      tap((msg) => this.captureSelfContext(msg)),
      retry({ delay: 3000 }), // Simple retry logic
      map((msg: SignalKMessage) => normalizeDelta(msg)),
      filter(points => points.length > 0),
      // Buffer updates to batch writes to store ~10 times a second
      bufferTime(100),
      filter(buffer => buffer.length > 0)
    ).subscribe({
      next: (bufferOfArrays: NormalizedDataPoint[][]) => {
        // Flatten
        const allPoints = bufferOfArrays.flat();
        
        const uniqueSelfUpdates = new Map<string, NormalizedDataPoint>();

        for (const p of allPoints) {
          // Self check
          if (this.isSelfContext(p.context)) {
             uniqueSelfUpdates.set(p.path, p);
          } 
          // AIS check
          else if (p.context && p.context.startsWith('vessels.')) {
            this.processAisUpdate(p);
          }
        }

        if (uniqueSelfUpdates.size > 0) {
          this.store.update(Array.from(uniqueSelfUpdates.values()));
        }
      },
      error: (err) => console.error('WS Error', err)
    });
  }

  private processAisUpdate(point: NormalizedDataPoint): void {
    if (!point.context) return;
    if (this.isSelfContext(point.context)) return;
    
    // Context formats: "vessels.urn:mrn:imo:mmsi:123456789" or "vessels.123456789"
    const parts = point.context.split(':');
    let mmsi = parts[parts.length - 1]; // Try last part of colon sep
    
    if (mmsi.startsWith('vessels.')) {
        mmsi = mmsi.replace('vessels.', '');
    }

    // Basic heuristic: MMSI is typically 9 digits
    if (mmsi.length < 9) return; 

    const data: any = {};
    const val = point.value as any;

    switch (point.path) {
      case 'navigation.position':
        if (val && typeof val.latitude === 'number' && typeof val.longitude === 'number') {
           data.latitude = val.latitude;
           data.longitude = val.longitude;
        }
        break;
      case 'navigation.speedOverGround':
        data.sog = typeof val === 'number' ? val : undefined;
        break;
      case 'navigation.courseOverGroundTrue':
        data.cog = typeof val === 'number' ? val : undefined;
        break;
      case 'navigation.headingTrue':
        data.heading = typeof val === 'number' ? val : undefined;
        break;
      case 'name':
         data.name = String(val);
         break;
      case 'communication.callsignVhf':
         data.callsign = String(val);
         break;
      case 'navigation.destination':
         data.destination = String(val);
         break;
    }

    if (Object.keys(data).length > 0) {
      this.aisStore.updateTarget(mmsi, data, point.timestamp);
    }
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

  private captureSelfContext(msg: SignalKMessage): void {
    if (!msg || typeof msg !== 'object') return;
    const hello = msg as SignalKHelloMessage;
    const self = hello.self ?? hello.contexts?.['self'];
    if (self && self !== this.selfContext) {
      this.selfContext = self;
      console.log(`[SignalK] self context: ${self}`);
    }
  }

  private isSelfContext(context?: string): boolean {
    if (!context || context === 'self' || context === 'vessels.self') {
      return true;
    }
    return !!this.selfContext && context === this.selfContext;
  }
}
