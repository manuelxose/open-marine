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
        { id: 'seaTemperature', label: 'Sea temperature', unit: 'deg C', provider: 'Copernicus IBI', attribution: 'Copernicus Marine Service', state: 'forecast', available: true, renderKind: 'raster-temporal', validTimes: ['2026-07-22T12:00:00Z'] },
        { id: 'currents', label: 'Currents', unit: 'm/s', provider: 'Copernicus IBI', attribution: 'Copernicus Marine Service', state: 'forecast', available: true, renderKind: 'vector-temporal', validTimes: ['2026-07-22T12:00:00Z'] },
        { id: 'waves', label: 'Waves', unit: 'm', provider: 'Copernicus IBI', attribution: 'Copernicus Marine Service', state: 'forecast', available: true, renderKind: 'raster-temporal', validTimes: ['2026-07-22T12:00:00Z'] },
        { id: 'wind', label: 'Wind', unit: 'm/s', provider: 'OpenWeather', attribution: 'OpenWeather', state: 'forecast', available: false, renderKind: 'raster-temporal', validTimes: [], message: 'API key not configured' },
      ],
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
  await page.route('**/environment/**/*.geojson', (route) => route.fulfill({
    contentType: 'application/geo+json',
    json: { type: 'FeatureCollection', features: [] },
  }));
});

test('marine environment and Vigo tide panel remains readable without overlap', async ({ page }, testInfo) => {
  await page.goto('/chart');
  await expect(page.locator('.chart-page')).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Open marine environment and Vigo tides' }).click();

  const panel = page.getByRole('complementary', { name: 'Marine environment and tides' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Vigo tides')).toBeVisible();
  await expect(panel.getByText('Copernicus IBI').first()).toBeVisible();

  const seaTemperature = panel.getByRole('button', { name: /Sea temperature/ });
  const currents = panel.getByRole('button', { name: /Currents/ });
  const waves = panel.getByRole('button', { name: /Waves/ });
  const clickDuration = (locator: typeof seaTemperature) => locator.evaluate((element) => {
    const started = performance.now();
    (element as HTMLButtonElement).click();
    return performance.now() - started;
  });
  const interactionDurations = [await clickDuration(seaTemperature), await clickDuration(currents)];
  await expect(seaTemperature).toHaveClass(/layer-btn--active/);
  await expect(currents).toHaveClass(/layer-btn--active/);
  interactionDurations.push(await clickDuration(waves));
  await expect(waves).toHaveClass(/layer-btn--active/);
  await expect(currents).toHaveClass(/layer-btn--active/);
  await expect(seaTemperature).not.toHaveClass(/layer-btn--active/);

  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(panelBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewport!.height);

  const longestInteraction = Math.max(...interactionDurations);
  expect(longestInteraction).toBeLessThanOrEqual(50);

  await page.screenshot({ path: `test-results/chart-environment-${testInfo.project.name}.png`, fullPage: true });
});
