import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { clearProgress, loadProgress, saveProgress } from './progress.js';

beforeEach(() => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
});

test('saves progress independently per pattern and size', () => {
  saveProgress('vest:1', { selectedId: 'body', notes: { 'body:0': 'size one' } });
  saveProgress('vest:2', { selectedId: 'lace', notes: { 'lace:0': 'size two' } });

  assert.equal(loadProgress('vest:1').selectedId, 'body');
  assert.equal(loadProgress('vest:2').notes['lace:0'], 'size two');
});

test('clearProgress removes only the requested progress blob', () => {
  saveProgress('vest:1', { done: { 'body:0': true } });
  saveProgress('vest:2', { done: { 'body:0': true } });

  clearProgress('vest:1');

  assert.deepEqual(loadProgress('vest:1'), {});
  assert.equal(loadProgress('vest:2').done['body:0'], true);
});

test('corrupt storage falls back to empty progress', () => {
  globalThis.localStorage.getItem = () => '{broken';
  assert.deepEqual(loadProgress('vest:1'), {});
});
