import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RemoteWmsTileError, WmsProxyService } from './wms-proxy.service.js';
import type { TileCacheService } from './tile-cache.service.js';

class MemoryCache {
  setCalls = 0;

  async get(): Promise<null> {
    return null;
  }

  async set(): Promise<void> {
    this.setCalls += 1;
  }
}

test('WmsProxyService rejects OGC XML responses and does not cache them', async () => {
  const originalFetch = globalThis.fetch;
  const cache = new MemoryCache();
  globalThis.fetch = async () => new Response(
    '<?xml version="1.0"?><ServiceExceptionReport><ServiceException>LayerNotDefined</ServiceException></ServiceExceptionReport>',
    { status: 200, headers: { 'content-type': 'application/vnd.ogc.se_xml; charset=UTF-8' } },
  );

  try {
    const service = new WmsProxyService(cache as unknown as TileCacheService);
    service.registerProvider({
      id: 'ihm-enc-p4',
      baseUrl: 'https://ideihm.covam.es/wms/cartaENCp4',
      layers: 'ENC_ES4',
      version: '1.3.0',
      srs: 'EPSG:3857',
      expectedContentTypes: ['image/png'],
    });

    await assert.rejects(
      () => service.fetchTile('ihm-enc-p4', 15, 15591, 12133),
      (error) => error instanceof RemoteWmsTileError && error.contentType?.includes('application/vnd.ogc.se_xml') === true,
    );
    assert.equal(cache.setCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('WmsProxyService uses CRS for WMS 1.3.0 requests', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(32).fill(0)]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    });
  };

  try {
    const service = new WmsProxyService(new MemoryCache() as unknown as TileCacheService);
    service.registerProvider({
      id: 'ihm-enc-p5',
      baseUrl: 'https://ideihm.covam.es/wms/cartaENCp5',
      layers: 'ENC_ES5',
      version: '1.3.0',
      srs: 'EPSG:3857',
    });

    const tile = await service.fetchTile('ihm-enc-p5', 15, 15591, 12133);
    assert.ok(tile);
    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get('CRS'), 'EPSG:3857');
    assert.equal(url.searchParams.get('SRS'), null);
    assert.equal(url.searchParams.get('LAYERS'), 'ENC_ES5');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('WmsProxyService coalesces duplicate IHM requests and preserves transparent chart gaps', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    calls += 1;
    requestedUrl = String(input);
    await Promise.resolve();
    return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(32).fill(0)]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    });
  };

  try {
    const cache = new MemoryCache();
    const service = new WmsProxyService(cache as unknown as TileCacheService);
    service.registerProvider({
      id: 'ihm-enc-p5',
      baseUrl: 'https://ideihm.covam.es/wms/cartaENCp5',
      layers: 'ENC_ES5',
      version: '1.3.0',
      srs: 'EPSG:3857',
      transparent: true,
      cacheVersion: 'transparent-stack-v3',
    });

    const [first, second] = await Promise.all([
      service.fetchTile('ihm-enc-p5', 14, 7795, 6067),
      service.fetchTile('ihm-enc-p5', 14, 7795, 6067),
    ]);

    assert.ok(first);
    assert.ok(second);
    assert.equal(calls, 1);
    assert.equal(cache.setCalls, 1);
    assert.equal(new URL(requestedUrl).searchParams.get('TRANSPARENT'), 'true');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('WmsProxyService opens a short circuit after an upstream failure', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('upstream timeout');
  };

  try {
    const service = new WmsProxyService(new MemoryCache() as unknown as TileCacheService);
    service.registerProvider({
      id: 'ihm-enc-p5',
      baseUrl: 'https://ideihm.covam.es/wms/cartaENCp5',
      layers: 'ENC_ES5',
    });

    await assert.rejects(
      () => service.fetchTile('ihm-enc-p5', 16, 31167, 24265),
      (error) => error instanceof RemoteWmsTileError && error.statusCode === 504,
    );
    await assert.rejects(
      () => service.fetchTile('ihm-enc-p5', 16, 31166, 24265),
      (error) => error instanceof RemoteWmsTileError && error.statusCode === 503,
    );
    assert.equal(calls, 1);
    assert.equal(service.diagnostics()[0]?.consecutiveFailures, 1);
    assert.ok(service.diagnostics()[0]?.circuitOpenUntil);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
