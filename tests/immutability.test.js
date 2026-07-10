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

// --- checkImmutability fail-closed behavior ---

test('FAILS CLOSED when no base ref is provided (undefined)', async () => {
  const result = await checkImmutability(undefined);
  assert.ok(!result.ok, 'Missing base ref must fail closed');
  assert.ok(result.errors.some(e => e.includes('No base ref')));
});

test('FAILS CLOSED when base ref is empty string', async () => {
  const result = await checkImmutability('');
  assert.ok(!result.ok, 'Empty base ref must fail closed');
});

test('FAILS CLOSED when base ref is whitespace only', async () => {
  const result = await checkImmutability('   ');
  assert.ok(!result.ok, 'Whitespace base ref must fail closed');
});

test('FAILS CLOSED when git repo is inaccessible or ref is invalid', async () => {
  const result = await checkImmutability('nonexistent-ref-000000');
  assert.ok(!result.ok, 'Invalid ref must fail closed');
  assert.ok(result.errors.some(e => e.includes('Git error')));
});
