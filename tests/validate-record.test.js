import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEntryValidator, validateEntryData } from '../scripts/validate-record.js';

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
  assert.equal(
    artifact,
    'sha256:a39c69bcf85007726dac8d3a3e2ccc3708669fbbb428cc3eb78c71209914bcb1'
  );
});

test('missing-required-field fixture fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const data = await loadFixture(INVALID_DIR, 'missing-required-field.json');
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Expected validation errors for missing required field');
  const joined = errors.join(' ');
  assert.ok(
    joined.includes('summary') || joined.includes('required'),
    `Expected error referencing "summary" or "required", got: ${joined}`
  );
});

test('broken-evidence-hash fixture fails schema validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const data = await loadFixture(INVALID_DIR, 'broken-evidence-hash.json');
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Expected validation errors for broken evidence hash');
  const joined = errors.join(' ');
  assert.ok(
    joined.includes('pattern') || joined.includes('artifact'),
    `Expected error referencing "pattern" or "artifact", got: ${joined}`
  );
});

test('approved_canon entry without approval object fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = { ...base, entry_id: 'ENTRY-TEST-AC-001', authority_class: 'approved_canon' };
  delete data.approval;
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Expected error for missing approval on approved_canon');
});

test('approved_canon entry with ai approver fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = {
    ...base,
    entry_id: 'ENTRY-TEST-AC-002',
    authority_class: 'approved_canon',
    approval: {
      approved_by_type: 'ai',
      approved_by_name: 'Bolt',
      approved_at: '2026-07-10T00:00:00.000Z',
    },
  };
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Expected error for AI approver on approved_canon');
});

test('span with end < start fails validation', async () => {
  const validate = await createEntryValidator(ROOT);
  const base = await loadFixture(VALID_DIR, 'valid-record-entry.json');
  const data = {
    ...base,
    entry_id: 'ENTRY-TEST-SPAN-001',
    evidence: [
      {
        artifact: 'sha256:a39c69bcf85007726dac8d3a3e2ccc3708669fbbb428cc3eb78c71209914bcb1',
        spans: [{ unit: 'line', start: 10, end: 5 }],
      },
    ],
  };
  const errors = validateEntryData(data, validate);
  assert.ok(errors.length > 0, 'Expected span end < start error');
  assert.ok(errors.some(e => e.includes('span end') || e.includes('end')));
});
