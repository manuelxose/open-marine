import { bearingDistanceNm } from './navigation';

describe('navigation calculations', () => {
  it('computes bearing and distance for a northbound leg', () => {
    const result = bearingDistanceNm({ lat: 0, lon: 0 }, { lat: 0.1, lon: 0 });

    expect(result.bearingDeg).toBeCloseTo(0, 0);
    expect(result.distanceNm).toBeCloseTo(6, 1);
  });
});
