import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  initializeKeep,
  intakeFile,
  listReceipts,
  verifyKeep,
} from '../scripts/record-method-keep.js';

const receiptSchema = JSON.parse(fs.readFileSync(
  new URL('../schemas/record-method-keep-receipt.schema.json', import.meta.url),
  'utf8',
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateReceipt = ajv.compile(receiptSchema);

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'record-method-keep-'));
  const keep = path.join(root, 'keep');
  const source = path.join(root, 'conversation.chatvault.json');
  fs.writeFileSync(source, '{"exact":"source bytes"}\n', 'utf8');
  return { root, keep, source };
}

test('initializes an empty, locally owned Keep', async () => {
  const { root, keep } = fixture();
  try {
    const marker = initializeKeep(keep, new Date('2026-08-01T12:00:00.000Z'));
    assert.equal(marker.receipt_count, 0);
    assert.equal((await verifyKeep(keep)).status, 'verified');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('copies exact bytes and creates one chained intake receipt', async () => {
  const { root, keep, source } = fixture();
  try {
    initializeKeep(keep);
    const result = await intakeFile(keep, source, { now: new Date('2026-08-01T12:01:00.000Z') });
    assert.equal(result.status, 'captured');
    assert.equal(result.receipt.disposition.status, 'unassigned');
    assert.equal(result.receipt.disposition.governance_effect, 'none');
    assert.equal(result.receipt.previous_receipt_sha256, null);
    assert.match(result.receipt.receipt_sha256, /^sha256:[0-9a-f]{64}$/);
    assert.equal(validateReceipt(result.receipt), true, JSON.stringify(validateReceipt.errors));
    assert.equal((await verifyKeep(keep)).receipt_count, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('duplicate bytes do not create a second custody event', async () => {
  const { root, keep, source } = fixture();
  try {
    initializeKeep(keep);
    await intakeFile(keep, source);
    const duplicate = await intakeFile(keep, source);
    assert.equal(duplicate.status, 'duplicate');
    assert.equal(listReceipts(keep).length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed when preserved source bytes change', async () => {
  const { root, keep, source } = fixture();
  try {
    initializeKeep(keep);
    const result = await intakeFile(keep, source);
    const object = path.join(keep, result.receipt.source.object_path);
    fs.appendFileSync(object, 'tamper', 'utf8');
    await assert.rejects(verifyKeep(keep), /Object size failed|Object hash failed/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed when a receipt or its chain link changes', async () => {
  const { root, keep, source } = fixture();
  try {
    initializeKeep(keep);
    await intakeFile(keep, source);
    const receiptPath = path.join(keep, 'receipts', fs.readdirSync(path.join(keep, 'receipts'))[0]);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    receipt.disposition.status = 'assigned';
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    await assert.rejects(verifyKeep(keep), /Receipt hash failed/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed on an undeclared receipt ledger entry', async () => {
  const { root, keep } = fixture();
  try {
    initializeKeep(keep);
    fs.writeFileSync(path.join(keep, 'receipts', 'not-a-receipt.txt'), 'undeclared', 'utf8');
    await assert.rejects(verifyKeep(keep), /Unexpected receipt ledger entry/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed on an unreceipted object', async () => {
  const { root, keep } = fixture();
  try {
    initializeKeep(keep);
    fs.writeFileSync(path.join(keep, 'objects', 'sha256', 'a'.repeat(64)), 'undeclared', 'utf8');
    await assert.rejects(verifyKeep(keep), /Unexpected or unreceipted Keep object/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('rejects symbolic-link intake', async (t) => {
  const { root, keep, source } = fixture();
  const link = path.join(root, 'linked.chatvault.json');
  try {
    initializeKeep(keep);
    try {
      fs.symlinkSync(source, link);
    } catch {
      t.skip('symbolic links are unavailable on this host');
      return;
    }
    await assert.rejects(intakeFile(keep, link), /Symbolic links are not accepted/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
