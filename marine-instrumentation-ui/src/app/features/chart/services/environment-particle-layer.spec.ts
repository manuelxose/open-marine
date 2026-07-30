import { particleTargetFor } from './environment-particle-layer';

describe('Environment particle density', () => {
  it('uses a substantially denser current grid while respecting the frame cap', () => {
    const area = 1440 * 900;
    const wind = particleTargetFor('wind', area, 4);
    const currents = particleTargetFor('currents', area, 4);

    expect(currents).toBeGreaterThan(wind * 2);
    expect(currents).toBeLessThanOrEqual(2400);
  });

  it('keeps a useful current grid on low-memory bridge hardware', () => {
    expect(particleTargetFor('currents', 1024 * 768, 2)).toBeGreaterThanOrEqual(360);
  });
});
