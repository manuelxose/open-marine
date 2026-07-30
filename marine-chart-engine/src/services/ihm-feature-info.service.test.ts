import assert from 'node:assert/strict';
import test from 'node:test';
import { IhmFeatureInfoService, parseFeatureReport } from './ihm-feature-info.service.js';

test('builds a centered IHM GetFeatureInfo request and caches its structured response', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (input) => {
    calls += 1;
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('REQUEST'), 'GetFeatureInfo');
    assert.equal(url.searchParams.get('LAYERS'), 'ENC');
    assert.equal(url.searchParams.get('I'), '50');
    assert.equal(url.searchParams.get('J'), '50');
    return new Response(`
      <html><head><title>Feature Pick Report at x=50 y=50</title></head><body>
      <br><b>Data Quality (M_QUAL), ES504165</b><br>
        Category of zone of confidence in data (CATZOC): zone of confidence B (3)<br>
      <br><b>Sounding (SOUNDG), ES504165</b><br>
        Value of sounding (VALSOU): 2.4<br>
        Scale minimum (SCAMIN): 44999<br>
      <script>bad()</script></body></html>
    `);
  };
  const service = new IhmFeatureInfoService(fetcher, () => 1000);
  const first = await service.query(-8.8, 42.2, 14);
  const second = await service.query(-8.8, 42.2, 14);
  assert.equal(calls, 1);
  assert.equal(first.features[0]!.objectClass, 'SOUNDG');
  assert.equal(first.features[0]!.attributes[0]!.acronym, 'VALSOU');
  assert.equal(first.features[0]!.attributes[0]!.value, '2.4');
  assert.equal(first.features[1]!.kind, 'context');
  assert.doesNotMatch(first.features[0]!.details, /bad/);
  assert.doesNotMatch(first.features[0]!.details, /x=50/);
  assert.deepEqual(second, first);
});

test('deduplicates repeated objects and keeps navigational features ahead of chart context', () => {
  const features = parseFeatureReport(`
    <html><body>
    <br><b>Coverage (M_COVR), ES504165</b><br>
      Category of coverage (CATCOV): coverage (1)<br>
    <br><b>Pontoon (PONTON), ES504165</b><br>
      Scale minimum (SCAMIN): 21999<br>
    <br><b>Pontoon (PONTON), ES504165</b><br>
      Scale minimum (SCAMIN): 21999<br>
    <br><b>Depth Area (DEPARE), ES504165</b><br>
      Depth range value 1 (shoalest value) (DRVAL1): 5<br>
      Depth range value 2 (deepest value) (DRVAL2): 10<br>
    </body></html>
  `);

  assert.deepEqual(features.map((feature) => feature.objectClass), [
    'DEPARE',
    'PONTON',
    'M_COVR',
  ]);
  assert.equal(features[0]!.title, 'Área de profundidad');
  assert.equal(features[0]!.attributes[0]!.label, 'Profundidad mínima');
});
