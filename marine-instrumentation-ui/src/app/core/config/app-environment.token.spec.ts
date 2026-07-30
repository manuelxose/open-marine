import { buildEnvironment } from './app-environment.token';

describe('buildEnvironment', () => {
  it('keeps the chart engine beside the local UI when Signal K is remote', () => {
    const environment = buildEnvironment('192.168.1.43', '192.168.137.2');

    expect(environment.chartEngineApiUrl).toBe(`http://${window.location.hostname}:8088`);
    expect(environment.weatherApiUrl).toBe(`http://${window.location.hostname}:8088/weather/forecast`);
    expect(environment.testBenchApiUrl).toBe('http://192.168.137.2:4100');
  });
});
