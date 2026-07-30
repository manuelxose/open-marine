import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ChartSettingsService } from './chart-settings.service';

describe('ChartSettingsService', () => {
  beforeEach(() => {
    localStorage.removeItem('omi-chart-settings');
    TestBed.configureTestingModule({
      providers: [
        ChartSettingsService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  it('keeps a single thematic environmental layer while allowing currents separately', () => {
    const service = TestBed.inject(ChartSettingsService);

    service.selectEnvironmentalLayer('wind');
    service.toggleCurrents();
    service.selectEnvironmentalLayer('pressure');

    expect(service.snapshot.showWindSpeed).toBe(false);
    expect(service.snapshot.showPressure).toBe(true);
    expect(service.snapshot.showCurrents).toBe(true);
  });

  it('clears a thematic layer without clearing currents', () => {
    const service = TestBed.inject(ChartSettingsService);

    service.selectEnvironmentalLayer('waves');
    service.toggleCurrents();
    service.clearThematicEnvironmentalLayer();

    expect(service.snapshot.showWaves).toBe(false);
    expect(service.snapshot.showCurrents).toBe(true);
  });

  it('hydrates legacy multiple weather selections into one deterministic layer', () => {
    localStorage.setItem('omi-chart-settings', JSON.stringify({
      showWindSpeed: true,
      showPressure: true,
      weatherOpacity: 4,
    }));

    const service = TestBed.inject(ChartSettingsService);

    expect(service.snapshot.showWindSpeed).toBe(true);
    expect(service.snapshot.showPressure).toBe(false);
    expect(service.snapshot.weatherOpacity).toBe(1);
  });

  it('persists a valid selected weather area and rejects oversized regions', () => {
    const service = TestBed.inject(ChartSettingsService);

    service.setWeatherBounds([-9.4, 43.1, -8.9, 43.45]);
    expect(service.snapshot.weatherBounds).toEqual([-9.4, 43.1, -8.9, 43.45]);

    service.setWeatherBounds([-20, 30, 5, 50]);
    expect(service.snapshot.weatherBounds).toEqual([-9.4, 43.1, -8.9, 43.45]);
    expect(JSON.parse(localStorage.getItem('omi-chart-settings') ?? '{}').weatherBounds)
      .toEqual([-9.4, 43.1, -8.9, 43.45]);
  });

  it('saves, activates, renames and removes polygon weather zones', () => {
    const service = TestBed.inject(ChartSettingsService);
    service.saveWeatherZone('Arousa', 'polygon', {
      type: 'Polygon',
      coordinates: [[[-9, 42.4], [-8.7, 42.4], [-8.7, 42.65], [-9, 42.4]]],
    });

    const created = service.snapshot.weatherZones.at(-1)!;
    expect(created.name).toBe('Arousa');
    expect(service.snapshot.activeWeatherZoneId).toBe(created.id);
    service.renameWeatherZone(created.id, 'Ría de Arousa');
    expect(service.snapshot.weatherZones.at(-1)?.name).toBe('Ría de Arousa');

    service.activateWeatherZone(service.snapshot.weatherZones[0]!.id);
    service.deleteWeatherZone(created.id);
    expect(service.snapshot.weatherZones.some((zone) => zone.id === created.id)).toBe(false);
  });

  it('migrates legacy weatherBounds into a saved area', () => {
    localStorage.setItem('omi-chart-settings', JSON.stringify({
      weatherBounds: [-9.4, 43.1, -8.9, 43.45],
    }));

    const service = TestBed.inject(ChartSettingsService);

    expect(service.snapshot.weatherZones.length).toBe(1);
    expect(service.snapshot.weatherZones[0]?.bounds).toEqual([-9.4, 43.1, -8.9, 43.45]);
  });
});
