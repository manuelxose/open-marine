import { bearingDistanceNm, projectDestination } from './navigation';

describe('navigation calculations', () => {
  it('computes bearing and distance for a northbound leg', () => {
    const result = bearingDistanceNm({ lat: 0, lon: 0 }, { lat: 0.1, lon: 0 });

    expect(result.bearingDeg).toBeCloseTo(0, 0);
    expect(result.distanceNm).toBeCloseTo(6, 1);
  });

  it('computes bearing and distance for an eastbound leg', () => {
    const result = bearingDistanceNm({ lat: 0, lon: 0 }, { lat: 0, lon: 0.1 });

    expect(result.bearingDeg).toBeCloseTo(90, 0);
    expect(result.distanceNm).toBeCloseTo(6, 1);
  });

  it('projects a destination from a bearing and distance', () => {
    const result = projectDestination({ lat: 0, lon: 0 }, 90, 1852);

    expect(result.lat).toBeCloseTo(0, 3);
    expect(result.lon).toBeCloseTo(0.0167, 3);
  });
});
