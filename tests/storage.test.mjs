import test from 'node:test';
import assert from 'node:assert/strict';
import { readBest, recordBest, getPreference, setPreference } from '../public/assets/storage.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('personal best survives reloads and a worse score cannot replace it', () => {
  const storage = memoryStorage();
  assert.equal(readBest(storage, 'daily:2026-10-29'), 0);
  assert.equal(recordBest(storage, 'daily:2026-10-29', 800), 800);
  assert.equal(recordBest(storage, 'daily:2026-10-29', 100), 800);
  assert.equal(readBest(storage, 'daily:2026-10-29'), 800);
  assert.equal(readBest(storage, 'daily:2026-10-30'), 0);
});

test('unavailable browser storage never prevents a round or result', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.equal(readBest(storage, 'practice'), 0);
  assert.equal(recordBest(storage, 'practice', 500), 500);
  assert.equal(getPreference(storage, 'language', 'en'), 'en');
  assert.doesNotThrow(() => setPreference(storage, 'language', 'zh-Hant'));
  assert.equal(readBest(null, 'practice'), 0);
});

test('corrupted and unsafe stored values are ignored', () => {
  const storage = memoryStorage();
  for (const value of ['<script>', '-100', 'null', '1e99', '{}', 'NaN']) {
    storage.setItem('traychaos:best:practice', value);
    assert.equal(readBest(storage, 'practice'), 0);
  }
  assert.equal(recordBest(storage, 'practice', NaN), 0);
});

