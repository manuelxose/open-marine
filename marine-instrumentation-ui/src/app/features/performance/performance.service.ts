import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, combineLatest, map, shareReplay, Observable, distinctUntilChanged } from 'rxjs';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { PATHS } from '@omi/marine-data-contract';
import {
  PolarDiagram,
  interpolatePolar,
  getOptimalTwa,
} from './utils/polar-parser';

// ── Types ─────────────────────────────────────────────────────────────

export interface PerformanceState {
  hasPolar: boolean;
  vmgUpwind: number | null;
  vmgDownwind: number | null;
  currentVmg: number | null;
  targetTwa: number | null;
  polarTarget: number | null; // target SOW from polar
  polarRatio: number | null;  // % of polar achieved
  recommendation: string | null; // "Bear away 5°", etc.
}

const POLAR_STORAGE_KEY = 'omi-polar-diagram';

// ── Service ───────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly store = inject(DatapointStoreService);
  private readonly _polar = new BehaviorSubject<PolarDiagram | null>(null);

  readonly polar$ = this._polar.asObservable();
  readonly hasPolar$ = this._polar.pipe(map((p) => p !== null));

  private readonly sow$ = this.store.observe<number>(PATHS.navigation.speedThroughWater);
  private readonly twa$ = this.store.observe<number>(PATHS.environment.wind.angleTrueWater);
  private readonly tws$ = this.store.observe<number>(PATHS.environment.wind.speedTrue);

  readonly performance$: Observable<PerformanceState> = combineLatest([
    this.sow$,
    this.twa$,
    this.tws$,
    this._polar,
  ]).pipe(
    map(([sowDp, twaDp, twsDp, polar]) => {
      const sow = this.numVal(sowDp?.value);
      const twa = this.numVal(twaDp?.value);
      const tws = this.numVal(twsDp?.value);

      // Basic VMG calculation (no polar needed)
      const currentVmg =
        sow !== null && twa !== null
          ? sow * Math.cos((twa * Math.PI) / 180)
          : null;

      if (!polar || tws === null || twa === null) {
        return {
          hasPolar: polar !== null,
          vmgUpwind: null,
          vmgDownwind: null,
          currentVmg,
          targetTwa: null,
          polarTarget: null,
          polarRatio: null,
          recommendation: null,
        };
      }

      // Polar-based calculations
      const polarTarget = interpolatePolar(polar, tws, twa);
      const polarRatio =
        sow !== null && polarTarget > 0
          ? (sow / polarTarget) * 100
          : null;

      const isUpwind = Math.abs(twa) < 90;
      const optimalTwa = getOptimalTwa(
        polar,
        tws,
        isUpwind ? 'upwind' : 'downwind',
      );
      const optimalSpeed = interpolatePolar(polar, tws, optimalTwa);
      const vmgUpwind = optimalSpeed * Math.cos((getOptimalTwa(polar, tws, 'upwind') * Math.PI) / 180);
      const vmgDownwind = optimalSpeed * Math.cos((getOptimalTwa(polar, tws, 'downwind') * Math.PI) / 180);

      // Recommendation
      let recommendation: string | null = null;
      if (twa !== null) {
        const diff = optimalTwa - Math.abs(twa);
        if (Math.abs(diff) > 2) {
          recommendation =
            diff > 0
              ? `Bear away ${Math.round(diff)}°`
              : `Head up ${Math.round(Math.abs(diff))}°`;
        }
      }

      return {
        hasPolar: true,
        vmgUpwind: Math.abs(vmgUpwind),
        vmgDownwind: Math.abs(vmgDownwind),
        currentVmg,
        targetTwa: optimalTwa,
        polarTarget,
        polarRatio,
        recommendation,
      };
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.restorePolar();
    }
  }

  get snapshot(): PolarDiagram | null {
    return this._polar.value;
  }

  setPolar(polar: PolarDiagram): void {
    this._polar.next(polar);
    this.persistPolar(polar);
  }

  clearPolar(): void {
    this._polar.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(POLAR_STORAGE_KEY);
    }
  }

  private restorePolar(): void {
    try {
      const raw = localStorage.getItem(POLAR_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PolarDiagram;
      if (parsed && Array.isArray(parsed.twaValues) && Array.isArray(parsed.twsValues)) {
        this._polar.next(parsed);
      }
    } catch {
      /* ignore */
    }
  }

  private persistPolar(polar: PolarDiagram): void {
    try {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(POLAR_STORAGE_KEY, JSON.stringify(polar));
      }
    } catch {
      /* ignore */
    }
  }

  private numVal(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
