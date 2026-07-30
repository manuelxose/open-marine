import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('omi-onboarded', 'true');
    localStorage.setItem('omi-onboarding-completed', 'true');
    localStorage.setItem('omi-theme', 'night');
  });
});

test('keeps chart controls and instruments inside a phone viewport', async ({ page }) => {
  await page.goto('/chart');
  await expect(page.locator('.chart-page')).toBeVisible();

  const layout = await page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.getBoundingClientRect().toJSON();
    const controls = document.querySelector<HTMLElement>('app-map-controls .map-controls');
    const topBar = document.querySelector<HTMLElement>('.chart-top-bar');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      page: rect('.chart-page'),
      controls: rect('.chart-zone--top-left'),
      instruments: rect('.chart-zone--bottom-right'),
      controlsDirection: controls ? getComputedStyle(controls).flexDirection : null,
      topBarOverflow: topBar ? topBar.scrollWidth - topBar.clientWidth : null,
    };
  });

  expect(layout.controlsDirection).toBe('row');
  expect(layout.page?.height).toBeCloseTo(layout.viewport.height, 0);
  expect(layout.controls?.left).toBeGreaterThanOrEqual(0);
  expect(layout.controls?.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.instruments?.left).toBeGreaterThanOrEqual(0);
  expect(layout.instruments?.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.topBarOverflow).toBeLessThanOrEqual(1);
});
