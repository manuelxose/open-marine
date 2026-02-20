import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, map, distinctUntilChanged, shareReplay, Observable } from 'rxjs';
import { SignalKClientService } from '../../data-access/signalk/signalk-client.service';
import { NetworkStatusService } from '../../core/services/network-status.service';

export type WsState = 'connecting' | 'open' | 'closed' | 'error';

export interface ConnectivityState {
  signalkUrl: string;
  wsState: WsState;
  reconnectAttempts: number;
  lastMessageAt: number | null;
  latencyMs: number | null;
  isOnline: boolean;
  isConnected: boolean;
}

// Default values are inlined in the combineLatest pipe below.

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly signalK = inject(SignalKClientService);
  private readonly networkStatus = inject(NetworkStatusService);

  private readonly _reconnectAttempts = new BehaviorSubject<number>(0);
  private readonly _latencyMs = new BehaviorSubject<number | null>(null);
  private readonly _lastMessageAt = new BehaviorSubject<number | null>(null);

  readonly state$: Observable<ConnectivityState> = combineLatest([
    this.signalK.connected$,
    this.networkStatus.online$,
    this._reconnectAttempts,
    this._latencyMs,
    this._lastMessageAt,
  ]).pipe(
    map(([connected, online, reconnectAttempts, latencyMs, lastMessageAt]) => ({
      signalkUrl: '',
      wsState: (connected ? 'open' : online ? 'closed' : 'error') as WsState,
      reconnectAttempts,
      lastMessageAt,
      latencyMs,
      isOnline: online,
      isConnected: connected,
    })),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly isConnected$ = this.signalK.connected$;
  readonly isOnline$ = this.networkStatus.online$;

  recordLatency(ms: number): void {
    this._latencyMs.next(ms);
  }

  recordMessage(): void {
    this._lastMessageAt.next(Date.now());
  }

  incrementReconnectAttempts(): void {
    this._reconnectAttempts.next(this._reconnectAttempts.value + 1);
  }

  resetReconnectAttempts(): void {
    this._reconnectAttempts.next(0);
  }
}
