import { Injectable } from '@angular/core';

export type DataQuality = 'good' | 'warn' | 'stale' | 'missing';

export interface QualityIndicator {
  quality: DataQuality;
  cssClass: string;
  displayValue: string | null;
}

@Injectable({ providedIn: 'root' })
export class DataQualityService {
  private readonly STALE_THRESHOLD_MS = 15000;
  private readonly WARN_THRESHOLD_MS = 8000;

  getQuality(timestamp: number | null | undefined): DataQuality {
    if (!timestamp) {
      return 'missing';
    }
    const age = Date.now() - timestamp;
    if (age > this.STALE_THRESHOLD_MS) {
      return 'stale';
    }
    if (age > this.WARN_THRESHOLD_MS) {
      return 'warn';
    }
    return 'good';
  }

  getIndicator(
    value: number | null,
    timestamp: number | null | undefined,
    formatter: (v: number) => string = String
  ): QualityIndicator {
    const quality = this.getQuality(timestamp);

    return {
      quality,
      cssClass: `gb-quality--${quality}`,
      displayValue:
        quality === 'stale' || quality === 'missing' ? '---' : value !== null ? formatter(value) : '---',
    };
  }
}
