import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript(({ theme }) => {
    localStorage.setItem('omi-onboarded', 'true');
    localStorage.setItem('omi-onboarding-completed', 'true');
    localStorage.setItem('omi-theme', theme);
  }, { theme: testInfo.project.name.includes('day') ? 'day' : 'night' });

  await page.route('**/environment/catalog', (route) => route.fulfill({
    json: {
      layers: [
        { id: 'bathymetry', label: 'Bathymetry', unit: 'm', provider: 'EMODnet', attribution: 'EMODnet Bathymetry Consortium', state: 'cached', available: true, renderKind: 'raster', validTimes: [] },
        { id: 'seaTemperature', label: 'Sea temperature', unit: 'deg C', provider: 'Copernicus IBI', attribution: 'Copernicus Marine Service', state: 'forecast', available: true, renderKind: 'vector', validTimes: ['2026-07-22T12:00:00Z'] },
        { id: 'currents', label: 'Currents', unit: 'kn', provider: 'Copernicus IBI', attribution: 'Copernicus Marine Service', state: 'forecast', available: true, renderKind: 'vector', validTimes: ['2026-07-22T12:00:00Z', '2026-07-22T13:00:00Z'] },
        { id: 'waves', label: 'Waves', unit: 'm', provider: 'Copernicus IBI', attribution: 'Copernicus Marine Service', state: 'forecast', available: true, renderKind: 'vector', validTimes: ['2026-07-22T12:00:00Z', '2026-07-22T13:00:00Z'] },
        { id: 'wind', label: 'Wind', unit: 'm/s', provider: 'Open-Meteo', attribution: 'Open-Meteo', state: 'forecast', available: true, renderKind: 'raster-temporal', validTimes: ['2026-07-22T12:00:00Z', '2026-07-22T13:00:00Z'] },
      ],
    },
  }));
  await page.route('**/charts', (route) => route.fulfill({
    json: {
      charts: [
        {
          id: 'emodnet-bathymetry', label: 'EMODnet Bathymetry', kind: 'bathymetry',
          available: true, minZoom: 0, maxZoom: 18,
          tileUrl: 'http://127.0.0.1:8088/proxy/wms/emodnet-bathymetry/{z}/{x}/{y}.png',
        },
        {
          id: 'ria-vigo-bathymetry', label: 'Ria de Vigo bathymetry', kind: 'raster',
          available: true, minZoom: 6, maxZoom: 14,
          tileUrl: 'http://127.0.0.1:8088/charts/ria-vigo-bathymetry/raster/{z}/{x}/{y}.png',
          metadata: { bounds: '-9.05,42.05,-8.4,42.4', minzoom: '6', maxzoom: '14' },
        },
      ],
    },
  }));
  await page.route('**/catalog/packages', (route) => route.fulfill({
    json: route.request().method() === 'GET'
      ? { packages: [], presets: [] }
      : {},
  }));
  await page.route('**/catalog/installation', (route) => route.fulfill({
    json: {
      tools: [
        { id: 'ogr2ogr', available: true, purpose: 'S-57 feature conversion', requiredFor: ['S-57'] },
        { id: 'tippecanoe', available: true, purpose: 'Vector MBTiles generation', requiredFor: ['S-57'] },
      ],
      storage: { path: 'C:/charts', totalBytes: 10000000000, availableBytes: 8000000000, writable: true, recommendedMedium: 'SSD' },
      s63: {
        installationId: 'test-install', hardwareId: 'ABCDE', userPermit: null, mode: 'pending-oem',
        ready: false, blockers: ['S-63 OEM/distributor registration is pending.'],
      },
    },
  }));
  await page.route('**/catalog/sources', (route) => route.fulfill({
    json: {
      sources: [
        { id: 'ihm-s63', name: 'IHM licensed ENC', description: 'Official ENC', region: 'spain', kind: 'enc-s63', availability: 'subscription', attribution: 'IHM', enabled: false },
        { id: 'emodnet-bathymetry', name: 'EMODnet', description: 'European bathymetry', region: 'europe', kind: 'wms', availability: 'offline-capable', attribution: 'EMODnet', enabled: true },
      ],
    },
  }));
  await page.route('**/catalog/package-plans', async (route) => {
    const request = route.request().postDataJSON();
    await route.fulfill({
      json: {
        id: 'plan-vigo',
        name: request.name,
        geometry: request.geometry,
        bounds: [-9.05, 42.05, -8.4, 42.4],
        profile: 'recommended',
        layers: [
          {
            id: 'ihm-official-enc', providerId: 'ihm-s63', label: 'IHM official ENC (S-63/S-57)',
            role: 'official-enc', official: true, required: true, acquisition: 'licensed-import',
            state: 'required', reason: 'Legal exchange set required.', bounds: [-9.05, 42.05, -8.4, 42.4],
            attribution: 'IHM', license: 'Licensed', navigationUse: 'official-source',
          },
          {
            id: 'emodnet-bathymetry', providerId: 'emodnet-bathymetry', label: 'EMODnet bathymetry',
            role: 'bathymetry', official: false, required: false, acquisition: 'automatic',
            state: 'pending', bounds: [-9.05, 42.05, -8.4, 42.4], minZoom: 6, maxZoom: 14,
            estimatedBytes: 14000000, attribution: 'EMODnet', license: 'CC BY 4.0', navigationUse: 'supplementary',
          },
        ],
        licenses: [{
          id: 'ihm', label: 'Licensed IHM ENC', status: 'external-action',
          message: 'Purchase externally and import the exchange set.', url: 'https://example.invalid/ihm',
        }],
        estimatedBytes: 14000000,
        storageBudgetBytes: 5368709120,
        availableBytes: 8000000000,
        minimumFreeBytes: 2000000000,
        canCreate: true,
        blockers: [],
        warnings: ['Licensed IHM ENC exchange sets and permits are required.'],
        createdAt: '2026-07-29T08:00:00Z',
      },
    });
  });
  await page.route('**/weather/forecast?*', (route) => route.fulfill({
    json: {
      state: 'cached', fetchedAt: '2026-07-28T10:00:00Z', ageSeconds: 120,
      location: { latitude: 42.24, longitude: -8.72 },
      data: {
        latitude: 42.24, longitude: -8.72,
        current: {
          time: '2026-07-28T12:00', temperature_2m: 22, apparent_temperature: 22,
          relative_humidity_2m: 70, pressure_msl: 1016, cloud_cover: 25,
          weather_code: 1, is_day: 1, wind_speed_10m: 9, wind_direction_10m: 280,
          wind_gusts_10m: 14,
        },
        hourly: {
          time: ['2026-07-28T12:00'], temperature_2m: [22], pressure_msl: [1016],
          precipitation_probability: [5], weather_code: [1], is_day: [1],
        },
        daily: {
          time: ['2026-07-28'], weather_code: [1], temperature_2m_max: [24],
          temperature_2m_min: [17], precipitation_probability_max: [10],
          wind_speed_10m_max: [16],
        },
      },
    },
  }));
  await page.route('**/weather/wind-field.geojson?*', (route) => route.fulfill({
    contentType: 'application/geo+json',
    json: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-8.72, 42.245] },
          properties: {
            featureType: 'windDirection',
            speedKnots: 14,
            gustKnots: 20,
            directionDeg: 270,
            flowDirectionDeg: 90,
          },
        },
      ],
      properties: {
        state: 'fresh',
        fetchedAt: '2026-07-28T12:00:00Z',
        attribution: 'Open-Meteo weather forecast',
        bounds: [-9.05, 42.05, -8.4, 42.4],
        grid: { columns: 18, rows: 10, pointCount: 180, approximateSpacingKm: 4.3 },
      },
    },
  }));
  await page.route('**/api/marine/coastal-mask.geojson', (route) => route.fulfill({
    contentType: 'application/geo+json',
    json: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-9.05, 42.05], [-8.4, 42.05], [-8.4, 42.4], [-9.05, 42.4], [-9.05, 42.05]]],
        },
        properties: { source: 'test marine mask' },
      }],
    },
  }));
  await page.route(/\/api\/marine\/(wind|currents)\?/, (route) => route.fulfill({
    json: {
      field: {
        variable: route.request().url().includes('/wind?') ? 'wind' : 'currents',
        metadata: { boundingBox: [-9.05, 42.05, -8.4, 42.4] },
        dataGrid: {
          kind: 'points',
          nodeCount: 4,
          longitude: [-8.9, -8.55, -8.9, -8.55],
          latitude: [42.1, 42.1, 42.35, 42.35],
          components: { u: [4, 5, 3, 4], v: [1, 1, 2, 2] },
        },
        renderGrid: null,
      },
      decision: { selected: 'test', candidates: [], reasons: [] },
    },
  }));
  await page.route('**/tides/vigo?*', (route) => route.fulfill({
    json: {
      portId: 29, portName: 'Vigo', date: '2026-07-22', timeZone: 'Europe/Madrid', datum: 'chart datum',
      state: 'forecast', fetchedAt: '2026-07-22T08:00:00Z', attribution: 'Instituto Hidrografico de la Marina (IHM)',
      events: [
        { type: 'high', time: '05:04', heightMeters: 3.21 }, { type: 'low', time: '11:17', heightMeters: 0.72 },
        { type: 'high', time: '17:29', heightMeters: 3.36 }, { type: 'low', time: '23:51', heightMeters: 0.65 },
      ],
    },
  }));
  await page.route(
    /\/(?:environment\/.*\.geojson|api\/marine\/(?:waves|sea-temperature)\.geojson)/,
    (route) => route.fulfill({
    contentType: 'application/geo+json',
    json: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-8.75, 42.22], [-8.70, 42.22], [-8.70, 42.27], [-8.75, 42.27], [-8.75, 42.22]]],
          },
          properties: {
            featureType: 'cell',
            value: 18.4,
            speedKnots: 0.7,
            heightMeters: 0.8,
            directionDeg: 308.5,
            periodSeconds: 7.9,
            maximumHeight: 1.4,
            primarySwellHeight: 0.6,
            interpolated: true,
            sourceDistanceKm: 2.3,
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-8.80, 42.25],
          },
          properties: {
            featureType: 'waveSymbol',
            directionDeg: 270,
            speedKnots: 0.7,
            heightMeters: 0.8,
            periodSeconds: 7.9,
          },
        },
      ],
    },
    }),
  );
});

test('map popover, weather widget and rapid style changes remain stable', async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /Style is not done loading|addSource|addLayer/.test(message.text())) {
      runtimeErrors.push(message.text());
    }
  });
  await page.goto('/chart');
  await expect(page.locator('.chart-page')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const component = window.ng?.getComponent?.(document.querySelector('app-chart-page'));
    const engine = component?.engine;
    const map = engine?.map;
    return {
      mapReady: engine?.mapReady,
      vessel: Boolean(map?.getLayer?.('chart-vessel-layer')),
      ais: Boolean(map?.getLayer?.('chart-ais-layer')),
    };
  })).toEqual({ mapReady: true, vessel: true, ais: true });

  await page.getByRole('button', { name: 'Open quick weather forecast' }).click();
  const weather = page.getByRole('region', { name: /in GPS position|in Vigo/ });
  await expect(weather).toBeVisible();
  await expect(weather.getByText(/cached · 2m old/)).toBeVisible();
  await page.getByRole('button', { name: 'Close weather' }).click();

  const quickMapButton = page.getByRole('button', { name: 'Switch to next available base map' });
  await quickMapButton.click();
  await expect(quickMapButton).toHaveAttribute('title', /Current: satellite/);

  await page.getByRole('button', { name: 'Open weather and sea layers' }).click();
  const manager = page.getByRole('dialog', { name: 'Chart manager' });
  await expect(manager).toBeVisible();
  await expect(manager.getByRole('tab', { name: 'Weather & sea' })).toHaveAttribute('aria-selected', 'true');
  await expect(manager.getByText('Weather area')).toBeVisible();
  await expect(manager.getByText(/adaptive grid/)).toBeVisible();
  await page.getByRole('button', { name: 'Open weather and sea layers' }).click();
  await expect(manager).toBeHidden();

  await page.getByRole('button', { name: 'Map settings and layers' }).click();
  await expect(manager).toBeVisible();
  await expect(manager.getByText('Ria de Vigo bathymetry')).toBeVisible();
  await expect(manager.getByText(/zoom 6–14/)).toBeVisible();
  await expect(manager.getByText('ENC', { exact: true })).toHaveCount(0);
  await expect(manager.getByText('Local Raster', { exact: true })).toHaveCount(0);

  const mapButton = manager.getByRole('button', { name: /OpenStreetMap \(OSM\) Online/ });
  const satelliteButton = manager.getByRole('button', { name: /Satellite Online/ });
  for (let index = 0; index < 20; index++) {
    await (index % 2 === 0 ? satelliteButton : mapButton).click();
  }
  await page.waitForTimeout(800);

  await manager.getByRole('tab', { name: 'Weather & sea' }).click();
  const panel = manager.locator('app-environment-panel');
  await expect(panel.getByText('Vigo tides')).toBeVisible();
  await panel.getByRole('button', { name: 'Current view' }).click();
  await expect(panel.getByLabel('Active weather zone name')).toHaveValue('Zone 2');
  await panel.getByRole('button', { name: 'Information about safety depth' }).click();
  await expect(
    panel.getByText(/Applied to the independent ENC depth overlay/),
  ).toBeVisible();
  await expect(panel.locator('#safety-depth')).toBeEnabled();
  const wind = panel.getByRole('button', { name: 'Wind', exact: true });
  await wind.click();
  await expect.poll(() => page.evaluate(() => {
    const component = window.ng?.getComponent?.(document.querySelector('app-chart-page'));
    const map = component?.engine?.map;
    return {
      heatmap: map?.getLayer?.('weather-wind-speed-layer')?.type,
      vectors: map?.getLayer?.('environment-wind-layer')?.type,
      barbIconsReady: [0, 5, 10, 15, 50, 100]
        .map((speed) => `chart-weather-wind-barb-${speed}`)
        .every((id) => map?.hasImage?.(id)),
      particles: map?.getLayer?.('environment-wind-particles')?.type,
    };
  })).toEqual({
    heatmap: 'raster',
    vectors: 'symbol',
    barbIconsReady: true,
    particles: 'custom',
  });
  await expect.poll(() => page.evaluate(() => {
    const component = window.ng?.getComponent?.(document.querySelector('app-chart-page'));
    return component?.engine?.getEnvironmentParticleMetrics?.().wind?.particles ?? 0;
  })).toBeGreaterThan(100);
  const particleBenchmark = await page.evaluate(() => {
    const component = window.ng?.getComponent?.(document.querySelector('app-chart-page'));
    return component?.engine?.getEnvironmentParticleMetrics?.().wind;
  });
  console.log(`wind-particle-benchmark ${JSON.stringify(particleBenchmark)}`);
  await testInfo.attach('wind-particle-benchmark.json', {
    body: JSON.stringify(particleBenchmark, null, 2),
    contentType: 'application/json',
  });
  // Tracing and screenshots force GPU readbacks, so global cadence is only a
  // smoke floor. The layer's own CPU budget is the stable performance gate.
  expect(particleBenchmark?.fps).toBeGreaterThan(4);
  expect(particleBenchmark?.cpuFrameMs).toBeLessThan(16.7);
  await panel.getByRole('button', { name: 'Play' }).click();
  await expect(panel.getByRole('button', { name: 'Pause' })).toBeVisible();
  await panel.getByRole('button', { name: 'Pause' }).click();
  await panel.getByRole('button', { name: 'Information about Wind' }).click();
  await expect(panel.getByText(/Half barb 5 kn/)).toBeVisible();
  await page.screenshot({ path: `test-results/chart-wind-direction-${testInfo.project.name}.png`, fullPage: true });
  await manager.getByTitle('Close').click();
  await expect(manager).toBeHidden();
  await page.screenshot({ path: `test-results/chart-wind-barbs-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Open weather and sea layers' }).click();
  await expect(manager).toBeVisible();
  const seaTemperature = panel.getByRole('button', { name: 'Sea temperature', exact: true });
  const currents = panel.getByRole('button', { name: 'Currents', exact: true });
  const waves = panel.getByRole('button', { name: 'Waves', exact: true });
  const temperatureRequestPromise = page.waitForRequest((request) =>
    request.url().includes('/api/marine/sea-temperature.geojson?'));
  await seaTemperature.click();
  const temperatureRequest = new URL((await temperatureRequestPromise).url());
  expect(temperatureRequest.searchParams.get('bbox')).toBeTruthy();
  expect(temperatureRequest.searchParams.get('area')).toContain('"Polygon"');
  await expect(seaTemperature).toHaveAttribute('aria-pressed', 'true');
  await seaTemperature.click();
  await expect(seaTemperature).toHaveAttribute('aria-pressed', 'false');
  await panel.getByRole('button', { name: 'Information about Sea temperature' }).click();
  await expect(panel.getByText('Copernicus IBI', { exact: true })).toBeVisible();
  await seaTemperature.click();
  const currentsRequestPromise = page.waitForRequest((request) =>
    request.url().includes('/api/marine/currents?'));
  await currents.click();
  const currentsRequest = new URL((await currentsRequestPromise).url());
  expect(currentsRequest.searchParams.get('west')).toBeTruthy();
  expect(currentsRequest.searchParams.get('north')).toBeTruthy();
  await seaTemperature.click();
  await expect(seaTemperature).toHaveAttribute('aria-pressed', 'false');
  await expect(currents).toHaveAttribute('aria-pressed', 'true');
  await seaTemperature.click();
  await expect.poll(() => page.evaluate(() => {
    const component = window.ng?.getComponent?.(document.querySelector('app-chart-page'));
    const map = component?.engine?.map;
    return {
      temperature: map?.getLayer?.('environment-seaTemperature-layer')?.type,
      currents: map?.getLayer?.('environment-currents-layer')?.type,
      currentDirection: map?.getLayer?.('environment-currents-layer-direction')?.type,
      currentValues: map?.getLayer?.('environment-currents-layer-values')?.type,
    };
  })).toEqual({
    temperature: 'fill',
    currents: 'fill',
    currentDirection: 'line',
    currentValues: 'symbol',
  });
  const wavesRequestPromise = page.waitForRequest((request) =>
    request.url().includes('/api/marine/waves.geojson?'));
  await waves.click();
  const wavesRequest = new URL((await wavesRequestPromise).url());
  expect(wavesRequest.searchParams.get('bbox')).toBeTruthy();
  expect(wavesRequest.searchParams.get('area')).toContain('"Polygon"');
  await expect.poll(() => page.evaluate(() => {
    const component = window.ng?.getComponent?.(document.querySelector('app-chart-page'));
    const map = component?.engine?.map;
    return {
      waves: map?.getLayer?.('environment-waves-layer')?.type,
      waveSymbols: map?.getLayer?.('environment-waves-layer-direction')?.type,
      waveIconCount: ['chart-wave-low', 'chart-wave-moderate', 'chart-wave-high']
        .filter((id) => map?.hasImage?.(id)).length,
      waveDirectionsReady: (map?.querySourceFeatures?.('environment-waves')
        ?.filter((feature: { properties?: Record<string, unknown> }) => feature.properties?.['featureType'] === 'waveSymbol')
        .length ?? 0) > 0,
      temperatureRemoved: !map?.getLayer?.('environment-seaTemperature-layer'),
    };
  })).toEqual({
    waves: 'fill',
    waveSymbols: 'symbol',
    waveIconCount: 3,
    waveDirectionsReady: true,
    temperatureRemoved: true,
  });

  const panelBox = await manager.boundingBox();
  const viewport = page.viewportSize();
  expect(panelBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewport!.height);

  expect(runtimeErrors).toEqual([]);

  await manager.getByTitle('Close').click();
  await expect(manager).toBeHidden();
  const wavePoint = await page.evaluate(() => {
    const component = window.ng?.getComponent?.(document.querySelector('app-chart-page'));
    const map = component?.engine?.map;
    const projected = map?.project?.([-8.725, 42.245]);
    const canvas = map?.getCanvas?.();
    const rect = canvas?.getBoundingClientRect?.();
    return projected && rect
      ? { x: rect.left + projected.x, y: rect.top + projected.y }
      : null;
  });
  expect(wavePoint).not.toBeNull();
  await page.mouse.click(wavePoint!.x, wavePoint!.y);
  const popup = page.locator('.environment-feature-popup');
  await expect(popup).toBeVisible();
  await expect(popup.getByText('Oleaje', { exact: true })).toBeVisible();
  await expect(popup.getByText('0.8', { exact: true })).toBeVisible();
  await expect(popup.locator('.environment-feature-popup__metric strong', { hasText: 'NO · 309°' })).toBeVisible();
  await expect(popup.getByText('7.9 s', { exact: true })).toBeVisible();
  await expect(popup.getByText('Interpolado · nodo a 2.3 km', { exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/chart-wave-symbols-${testInfo.project.name}.png`, fullPage: true });
});

test('offline assistant plans the Ria de Vigo package on desktop and tablet', async ({ page }) => {
  await page.goto('/chart');
  await page.getByRole('button', { name: 'Map settings and layers' }).click();
  const manager = page.getByRole('dialog', { name: 'Chart manager' });
  await manager.getByRole('tab', { name: 'Offline charts' }).click();
  await manager.getByRole('button', { name: 'Use Ría de Vigo preset' }).click();
  await expect(manager.getByText('Ría de Vigo and approaches')).toBeVisible();
  await manager.getByRole('button', { name: 'Review package' }).click();
  await expect(manager.getByText('IHM official ENC (S-63/S-57)')).toBeVisible();
  await expect(manager.getByText('EMODnet bathymetry')).toBeVisible();
  await expect(manager.getByText('Official', { exact: true })).toBeVisible();
  await expect(manager.getByText(/Licensed IHM ENC exchange sets/)).toBeVisible();
  await expect(manager.getByRole('button', { name: 'Create and download permitted data' })).toBeEnabled();

  const box = await manager.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
});
