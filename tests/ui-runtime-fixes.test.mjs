import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('runtime UI fixes contain Profile replacement and Home Compare recovery', async () => {
  const source = await readFile(new URL('../src/app/client/07-ui-fixes.js', import.meta.url), 'utf8');
  assert.match(source, /kulpio\\s\+toolkit/i);
  assert.match(source, /Feedback & insights/);
  assert.match(source, /data-kulpio-compare/);
  assert.match(source, /openProductComparePicker/);
  assert.match(source, /label === 'all'/);
});

test('runtime UI fixes retry after lazy tab rendering', async () => {
  const source = await readFile(new URL('../src/app/client/07-ui-fixes.js', import.meta.url), 'utf8');
  assert.match(source, /MutationObserver/);
  assert.match(source, /retryUntil/);
  assert.match(source, /setTimeout\(retry, 250\)/);
});
