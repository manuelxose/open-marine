import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNoaaCatalog } from './noaa-catalog.js';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<EnvelopExtractDesc>
  <cell>
    <name>US5EXAMPLE</name>
    <lname>Example Harbor</lname>
    <cscale>20000</cscale>
    <status>Active</status>
    <zipfile_location>https://www.charts.noaa.gov/ENCs/US5EXAMPLE.zip</zipfile_location>
    <zipfile_size>123456</zipfile_size>
    <zipfile_datetime_iso8601>2026-01-02T03:04:05Z</zipfile_datetime_iso8601>
    <edtn>5</edtn>
    <uadt>2026-01-01</uadt>
    <cov>
      <panel>
        <panel_no>1</panel_no>
        <vertex><lat>42.0</lat><long>-9.0</long></vertex>
        <vertex><lat>42.5</lat><long>-8.0</long></vertex>
      </panel>
    </cov>
  </cell>
  <cell>
    <name>US9CANCEL</name>
    <lname>Cancelled Cell</lname>
    <status>Cancelled</status>
    <cov><panel><vertex><lat>1</lat><long>1</long></vertex></panel></cov>
  </cell>
  <cell>
    <name>US9NOBOUNDS</name>
    <status>Active</status>
  </cell>
</EnvelopExtractDesc>`;

test('parseNoaaCatalog maps an active cell with bounds, scale, size and download url', () => {
  const entries = parseNoaaCatalog(SAMPLE);
  const entry = entries.find((e) => e.id === 'noaa-us5example');
  assert.ok(entry, 'expected the active cell to be mapped');
  assert.equal(entry.providerId, 'noaa-enc');
  assert.equal(entry.format, 's57');
  assert.equal(entry.scale, 20000);
  assert.equal(entry.sizeBytes, 123456);
  assert.equal(entry.downloadUrl, 'https://www.charts.noaa.gov/ENCs/US5EXAMPLE.zip');
  assert.equal(entry.lastUpdated, '2026-01-02T03:04:05Z');
  assert.deepEqual(entry.bounds, [-9.0, 42.0, -8.0, 42.5]);
});

test('parseNoaaCatalog skips cancelled cells and cells without bounds', () => {
  const entries = parseNoaaCatalog(SAMPLE);
  assert.equal(entries.length, 1);
  assert.ok(!entries.some((e) => e.id === 'noaa-us9cancel'));
  assert.ok(!entries.some((e) => e.id === 'noaa-us9nobounds'));
});
