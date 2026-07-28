import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { assertSafeEntry } from './safe-archive-extractor.js';

const root = path.resolve('/tmp/extract-root');

test('assertSafeEntry allows normal nested paths', () => {
  assert.doesNotThrow(() => assertSafeEntry('ENC_ROOT/US5EXAMPLE/US5EXAMPLE.000', root));
});

test('assertSafeEntry rejects parent traversal', () => {
  assert.throws(() => assertSafeEntry('../evil.000', root), /path traversal|escapes/i);
});

test('assertSafeEntry rejects absolute paths', () => {
  assert.throws(() => assertSafeEntry('/etc/passwd', root), /absolute path/i);
});

test('assertSafeEntry rejects windows-style drive paths', () => {
  assert.throws(() => assertSafeEntry('C:\\windows\\system32', root), /absolute path/i);
});
