import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEntryPath, checkImmutability } from '../scripts/check-entry-immutability.js';

// --- isEntryPath ---

test('recognises ecosystem entries path', () => {
  assert.ok(isEntryPath('ecosystem/entries/ENTRY-ECO-001.json'));
});

test('recognises product entries path', () => {
  assert.ok(isEntryPath('products/chatvaultai/entries/ENTRY-PRD-001.json'));
});

test('recognises nested path with leading slash', () => {
  assert.ok(isEntryPath('/repo/ecosystem/entries/ENTRY-001.json'));
});

test('rejects PRODUCT_PROFILE.json', () => {
  assert.ok(!isEntryPath('products/chatvaultai/PRODUCT_PROFILE.json'));
});

test('rejects CURRENT_STATE.json', () => {
  assert.ok(!isEntryPath('ecosystem/CURRENT_STATE.json'));
});

test('rejects script files', () => {
  assert.ok(!isEntryPath('scripts/validate-record.js'));
});

test('rejects schema files', () => {
  assert.ok(!isEntryPath('schemas/record-entry.schema.json'));
});

test('rejects non-json in entries dir', () => {
  assert.ok(!isEntryPath('ecosystem/entries/.gitkeep'));
});

// --- checkImmutability ---

test('skips check when no base ref is provided', async () => {
  const result = await checkImmutability(undefined);
  assert.ok(result.skipped);
  assert.ok(result.ok);
});

test('skips check when empty string base ref is provided', async () => {
  const result = await checkImmutability('');
  assert.ok(result.skipped);
  assert.ok(result.ok);
});

test('returns ok:true and skipped:true when git is unavailable or ref is bad', async () => {
  const result = await checkImmutability('sha-that-does-not-exist-000000000000000000000');
  // Either skipped (no git repo) or the git call fails gracefully
  assert.ok(result.ok, `Expected ok but got errors: ${result.errors?.join(', ')}`);
});
