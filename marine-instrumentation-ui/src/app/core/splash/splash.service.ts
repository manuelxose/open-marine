import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SplashService {
  private readonly _visible = new BehaviorSubject<boolean>(true);
  private readonly _status = new BehaviorSubject<string>('Initializing...');

  readonly visible$ = this._visible.asObservable();
  readonly status$ = this._status.asObservable();

  private readonly MIN_DISPLAY_TIME = 2500; // ms
  private startTime = Date.now();

  updateStatus(message: string): void {
    this._status.next(message);
  }

  async hideSplash(): Promise<void> {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.MIN_DISPLAY_TIME - elapsed);

    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    this._visible.next(false);
  }
}
