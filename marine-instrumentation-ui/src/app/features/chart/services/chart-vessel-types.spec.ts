import { describe, expect, it } from 'vitest';
import {
  mapAisTargetToVesselTypeFilter,
  mapAisVesselTypeToFilter,
} from './chart-vessel-types';

describe('AIS vessel type mapping', () => {
  it('maps AIS ship type 36 to sailing', () => {
    expect(mapAisVesselTypeToFilter('36')).toBe('sailing');
    expect(mapAisVesselTypeToFilter('Sailing')).toBe('sailing');
  });

  it('uses sailing navigation state while static ship type is unavailable', () => {
    expect(mapAisTargetToVesselTypeFilter(undefined, 8)).toBe('sailing');
  });

  it('keeps an explicit static ship type ahead of navigation-state fallback', () => {
    expect(mapAisTargetToVesselTypeFilter('Cargo', 8)).toBe('cargo');
  });
});
