import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWmsCapabilities } from './wms-capabilities.js';

// WMS 1.3.0: bounds via EX_GeographicBoundingBox child elements, nested under a
// nameless root Layer (group layer).
const WMS_130 = `<?xml version="1.0"?>
<WMS_Capabilities version="1.3.0">
  <Capability>
    <Layer>
      <Title>EMODnet Bathymetry</Title>
      <Layer queryable="1">
        <Name>mean_multicolour</Name>
        <Title>Mean depth (multicolour)</Title>
        <Abstract>Harmonized European bathymetry.</Abstract>
        <EX_GeographicBoundingBox>
          <westBoundLongitude>-30.0</westBoundLongitude>
          <eastBoundLongitude>45.0</eastBoundLongitude>
          <southBoundLatitude>25.0</southBoundLatitude>
          <northBoundLatitude>72.0</northBoundLatitude>
        </EX_GeographicBoundingBox>
      </Layer>
      <Layer queryable="1">
        <Name>coastlines</Name>
        <Title>Coastlines</Title>
        <EX_GeographicBoundingBox>
          <westBoundLongitude>-10</westBoundLongitude>
          <eastBoundLongitude>10</eastBoundLongitude>
          <southBoundLatitude>40</southBoundLatitude>
          <northBoundLatitude>60</northBoundLatitude>
        </EX_GeographicBoundingBox>
      </Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>`;

// WMS 1.1.1: bounds via LatLonBoundingBox attributes.
const WMS_111 = `<?xml version="1.0"?>
<WMT_MS_Capabilities version="1.1.1">
  <Capability>
    <Layer>
      <Title>GEBCO</Title>
      <Layer queryable="1">
        <Name>GEBCO_Latest</Name>
        <Title>GEBCO Latest Grid</Title>
        <LatLonBoundingBox minx="-180" miny="-90" maxx="180" maxy="90"/>
      </Layer>
    </Layer>
  </Capability>
</WMT_MS_Capabilities>`;

test('parseWmsCapabilities maps WMS 1.3.0 named layers with EX_GeographicBoundingBox', () => {
  const entries = parseWmsCapabilities(WMS_130, {
    providerId: 'emodnet-bathymetry',
    baseUrl: 'https://ows.emodnet-bathymetry.eu/wms',
  });
  assert.equal(entries.length, 2);
  const mean = entries.find((e) => e.wmsLayer === 'mean_multicolour');
  assert.ok(mean);
  assert.equal(mean.id, 'emodnet-bathymetry-mean-multicolour');
  assert.equal(mean.providerId, 'emodnet-bathymetry');
  assert.equal(mean.format, 'wms-layer');
  assert.equal(mean.label, 'Mean depth (multicolour)');
  assert.equal(mean.downloadUrl, 'https://ows.emodnet-bathymetry.eu/wms');
  assert.deepEqual(mean.bounds, [-30.0, 25.0, 45.0, 72.0]);
});

test('parseWmsCapabilities skips the nameless group layer', () => {
  const entries = parseWmsCapabilities(WMS_130, {
    providerId: 'emodnet-bathymetry',
    baseUrl: 'https://ows.emodnet-bathymetry.eu/wms',
  });
  assert.ok(!entries.some((e) => e.label === 'EMODnet Bathymetry' && !e.wmsLayer));
});

test('parseWmsCapabilities maps WMS 1.1.1 LatLonBoundingBox attributes', () => {
  const entries = parseWmsCapabilities(WMS_111, {
    providerId: 'gebco',
    baseUrl: 'https://www.gebco.net/mapserv',
    version: '1.1.1',
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.wmsLayer, 'GEBCO_Latest');
  assert.deepEqual(entries[0]!.bounds, [-180, -90, 180, 90]);
});
