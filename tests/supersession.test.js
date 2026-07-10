import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSupersession } from '../scripts/check-supersession.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const INVALID_DIR = join(ROOT, 'fixtures', 'invalid');
const VALID_DIR = join(ROOT, 'fixtures', 'valid');

async function loadFixture(dir, name) {
  const raw = await readFile(join(dir, name), 'utf8');
  return JSON.parse(raw);
}

test('valid single entry passes supersession check', async () => {
  const entry = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const result = checkSupersession([entry]);
  assert.ok(result.ok, `Expected ok, errors: ${result.errors.join(', ')}`);
});

test('empty entry list passes supersession check', () => {
  const result = checkSupersession([]);
  assert.ok(result.ok);
});

test('detects duplicate entry IDs', async () => {
  const a = await loadFixture(INVALID_DIR, 'duplicate-entry-id-a.json');
  const b = await loadFixture(INVALID_DIR, 'duplicate-entry-id-b.json');
  const result = checkSupersession([a, b]);
  assert.ok(!result.ok);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('duplicate')));
});

test('detects supersession cycles', async () => {
  const a = await loadFixture(INVALID_DIR, 'supersession-cycle-a.json');
  const b = await loadFixture(INVALID_DIR, 'supersession-cycle-b.json');
  const result = checkSupersession([a, b]);
  assert.ok(!result.ok);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('cycle')));
});

test('detects self-supersession', () => {
  const entry = { entry_id: 'ENTRY-SELF-001', scope: 'ecosystem', supersedes: ['ENTRY-SELF-001'] };
  const result = checkSupersession([entry]);
  assert.ok(!result.ok);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('self')));
});

test('detects missing superseded entry ID', () => {
  const entry = { entry_id: 'ENTRY-MISSING-001', scope: 'ecosystem', supersedes: ['ENTRY-DOES-NOT-EXIST'] };
  const result = checkSupersession([entry]);
  assert.ok(!result.ok);
  assert.ok(result.errors.some(e => e.includes('ENTRY-DOES-NOT-EXIST')));
});

test('detects incompatible scope references', () => {
  const eco = { entry_id: 'ENTRY-ECO-S-001', scope: 'ecosystem', supersedes: [] };
  const prod = { entry_id: 'ENTRY-PROD-S-001', scope: 'product', product_id: 'foo', supersedes: ['ENTRY-ECO-S-001'] };
  const result = checkSupersession([eco, prod]);
  assert.ok(!result.ok);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('scope') || e.toLowerCase().includes('incompatible')));
});

test('detects cross-product supersession', () => {
  const a = { entry_id: 'ENTRY-PRODA-001', scope: 'product', product_id: 'alpha', supersedes: [] };
  const b = { entry_id: 'ENTRY-PRODB-001', scope: 'product', product_id: 'beta', supersedes: ['ENTRY-PRODA-001'] };
  const result = checkSupersession([a, b]);
  assert.ok(!result.ok);
  assert.ok(result.errors.some(e => e.toLowerCase().includes('cross-product')));
});

test('allows same-product supersession', () => {
  const a = { entry_id: 'ENTRY-SAME-001', scope: 'product', product_id: 'alpha', supersedes: [] };
  const b = { entry_id: 'ENTRY-SAME-002', scope: 'product', product_id: 'alpha', supersedes: ['ENTRY-SAME-001'] };
  const result = checkSupersession([a, b]);
  assert.ok(result.ok, `Expected ok, errors: ${result.errors.join(', ')}`);
});

test('derives superseded_by map correctly', () => {
  const older = { entry_id: 'ENTRY-OLD-001', scope: 'ecosystem', supersedes: [] };
  const newer = { entry_id: 'ENTRY-NEW-001', scope: 'ecosystem', supersedes: ['ENTRY-OLD-001'] };
  const result = checkSupersession([older, newer]);
  assert.ok(result.ok);
  assert.ok(result.supersededBy.has('ENTRY-OLD-001'));
  assert.deepEqual(result.supersededBy.get('ENTRY-OLD-001'), ['ENTRY-NEW-001']);
});
