import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEntryValidator, validateEntryData, validateRecord } from '../scripts/validate-record.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const VALID_DIR = join(ROOT, 'fixtures', 'valid');
const INVALID_DIR = join(ROOT, 'fixtures', 'invalid');

async function loadFixture(dir, name) {
  const raw = await readFile(join(dir, name), 'utf8');
  return JSON.parse(raw);
}

test('valid fixture passes schema validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const data = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const errors = validateEntryData(data, validate);
  assert.deepEqual(errors, [], `Expected no errors, got: ${JSON.stringify(errors)}`);
});

test('valid fixture evidence hash matches expected pattern', async () => {
  const data = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const artifact = data.evidence[0].artifact;
  assert.match(artifact, /^sha256:[0-9a-f]{64}$/);
  assert.equal(artifact, 'sha256:a39c69bcf85007726dac8d3a3e2ccc3708669fbbb428cc3eb78c71209914bcb1');
});

test('missing-required-field fixture fails validation (missing summary)', async () => {
  const validate = await createEntryValidator(ROOT);
  const data = await loadFixture(INVALID_DIR, 'missing-required-field.json');
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Expected validation errors');
  assert.ok(errors.some(e => e.includes('summary') || e.includes('required')));
});

test('broken-evidence-hash fixture fails schema validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const data = await loadFixture(INVALID_DIR, 'broken-evidence-hash.json');
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Expected validation errors');
  assert.ok(errors.some(e => e.includes('pattern') || e.includes('artifact')));
});

test('approved_canon entry without approval object fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = { ...base, entry_id: 'ENTRY-TEST-AC-001', authority_class: 'approved_canon' };
  delete data.approval;
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.includes('approval')));
});

test('approved_canon entry with ai approver fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = {
    ...base,
    entry_id: 'ENTRY-TEST-AC-002',
    authority_class: 'approved_canon',
    approval: { approved_by_type: 'ai', approved_by_name: 'Bolt', approved_at: '2026-07-10T00:00:00.000Z' },
  };
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.includes('human') || e.includes('approved_by_type')));
});

test('approved_canon with empty approved_by_name fails', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = {
    ...base,
    entry_id: 'ENTRY-TEST-AC-003',
    authority_class: 'approved_canon',
    approval: { approved_by_type: 'human', approved_by_name: '', approved_at: '2026-07-10T00:00:00.000Z' },
  };
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Empty approved_by_name should fail');
});

test('approved_canon with complete human approval (name and account) passes', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = {
    ...base,
    entry_id: 'ENTRY-TEST-AC-004',
    authority_class: 'approved_canon',
    approval: {
      approved_by_type: 'human',
      approved_by_name: 'Dan',
      approved_by_account: 'daytona3dan-coder',
      approved_at: '2026-07-10T00:00:00.000Z',
    },
  };
  const errors = validateEntryData(data, validate);
  assert.deepEqual(errors, [], `Expected no errors, got: ${JSON.stringify(errors)}`);
});

test('approved_canon missing approved_by_account fails (Constitution principle 5)', async () => {
  const validate = await createEntryValidator(ROOT);
  const data = await loadFixture(INVALID_DIR, 'missing-approval-account.json');
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Missing approved_by_account must fail');
  assert.ok(errors.some(e => e.includes('approved_by_account')));
});

test('approved_canon with empty approved_by_account fails', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = {
    ...base,
    entry_id: 'ENTRY-TEST-AC-005',
    authority_class: 'approved_canon',
    approval: {
      approved_by_type: 'human',
      approved_by_name: 'Dan',
      approved_by_account: '   ',
      approved_at: '2026-07-10T00:00:00.000Z',
    },
  };
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Whitespace-only approved_by_account must fail');
});

test('span with end < start fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = {
    ...base,
    entry_id: 'ENTRY-TEST-SPAN-001',
    evidence: [{
      artifact: 'sha256:a39c69bcf85007726dac8d3a3e2ccc3708669fbbb428cc3eb78c71209914bcb1',
      spans: [{ unit: 'line', start: 10, end: 5 }],
    }],
  };
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.includes('span end')));
});

test('product-scoped entry without product_id fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = { ...base, entry_id: 'ENTRY-TEST-PROD-001', scope: 'product' };
  delete data.product_id;
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.includes('product_id')));
});

test('repository validation passes with correct initial data', async () => {
  const result = await validateRecord({ root: ROOT });
  assert.ok(result.ok, `Expected validation to pass, errors: ${result.errors.join('; ')}`);
});
