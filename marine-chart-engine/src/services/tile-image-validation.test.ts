import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidTileImage } from './tile-image-validation.js';

test('tile validation checks image signatures and rejects empty/HTML responses', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  assert.equal(isValidTileImage('image/png', png), true);
  assert.equal(isValidTileImage('image/png', Buffer.alloc(0)), false);
  assert.equal(isValidTileImage('image/png', Buffer.from('<html>rate limited</html>'.padEnd(40))), false);
  assert.equal(isValidTileImage('text/html', png), false);
});
