import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, fromEvent, merge, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly onlineSubject = new BehaviorSubject<boolean>(true);
  readonly online$ = this.onlineSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    if (!isPlatformBrowser(platformId)) {
      this.onlineSubject.next(true);
      return;
    }

    this.onlineSubject.next(navigator.onLine);

    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false)),
    ).subscribe((online) => this.onlineSubject.next(online));
  }

  get snapshot(): boolean {
    return this.onlineSubject.value;
  }
}
