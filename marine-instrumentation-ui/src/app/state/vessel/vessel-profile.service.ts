import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface VesselProfile {
  name: string;
  mmsi: string;
  callsign: string;
  vesselType: string;
  length: number;
  beam: number;
  draft: number;
  safetyColor: string;
}

const DEFAULT_VESSEL_PROFILE: VesselProfile = {
  name: '',
  mmsi: '',
  callsign: '',
  vesselType: 'sailboat',
  length: 0,
  beam: 0,
  draft: 0,
  safetyColor: '#00ff88',
};

const STORAGE_KEY = 'omi-vessel-profile';

@Injectable({ providedIn: 'root' })
export class VesselProfileService {
  private readonly _profile = new BehaviorSubject<VesselProfile>(DEFAULT_VESSEL_PROFILE);
  readonly profile$ = this._profile.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<VesselProfile>;
          this._profile.next({ ...DEFAULT_VESSEL_PROFILE, ...parsed });
        } catch {
          // ignore corrupt data
        }
      }

      this._profile.subscribe((profile) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      });
    }
  }

  get snapshot(): VesselProfile {
    return this._profile.value;
  }

  update(partial: Partial<VesselProfile>): void {
    this._profile.next({ ...this._profile.value, ...partial });
  }

  reset(): void {
    this._profile.next(DEFAULT_VESSEL_PROFILE);
  }
}
