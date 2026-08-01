#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CONTRACT = 'record_method_keep_receipt';
const SCHEMA_VERSION = '1.0.0';
const KEEP_FORMAT_VERSION = '1.0.0';
const ZERO_HASH = null;

function fail(message) {
  const error = new Error(message);
  error.name = 'KeepError';
  throw error;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith('--')) fail(`Unexpected argument: ${key}`);
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${key}`);
    options[key.slice(2)] = value;
    index += 1;
  }
  return { command, options };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const fields = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${fields.join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256Bytes(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filePath);
    input.on('error', reject);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('end', () => resolve(`sha256:${hash.digest('hex')}`));
  });
}

function requireOption(options, name) {
  const value = options[name];
  if (!value) fail(`--${name} is required`);
  return path.resolve(value);
}

function keepPaths(root) {
  return {
    root,
    marker: path.join(root, 'KEEP.json'),
    objects: path.join(root, 'objects', 'sha256'),
    receipts: path.join(root, 'receipts'),
    lock: path.join(root, '.keep.lock'),
  };
}

function writeJsonAtomic(target, value) {
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(temporary, bytes, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporary, target);
}

function readJson(target, label) {
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    fail(`${label} is not readable JSON: ${error.message}`);
  }
}

function readMarker(paths) {
  if (!fs.existsSync(paths.marker)) fail(`Not a Record Method Keep: ${paths.root}`);
  const marker = readJson(paths.marker, 'KEEP.json');
  if (marker.keep_format_version !== KEEP_FORMAT_VERSION) {
    fail(`Unsupported Keep format: ${marker.keep_format_version ?? 'missing'}`);
  }
  return marker;
}

function receiptFiles(paths) {
  if (!fs.existsSync(paths.receipts)) return [];
  return fs.readdirSync(paths.receipts)
    .filter((name) => /^\d{12}-[0-9a-f]{16}\.json$/.test(name))
    .sort();
}

function receiptHash(receipt) {
  return sha256Bytes(Buffer.from(stableStringify({ ...receipt, receipt_sha256: null }), 'utf8'));
}

function objectPath(paths, sha256) {
  const digest = sha256.replace(/^sha256:/, '');
  if (!/^[0-9a-f]{64}$/.test(digest)) fail(`Malformed object SHA-256: ${sha256}`);
  return path.join(paths.objects, digest);
}

function acquireLock(paths) {
  let descriptor;
  try {
    descriptor = fs.openSync(paths.lock, 'wx');
    fs.writeFileSync(descriptor, `${process.pid}\n`, 'utf8');
  } catch {
    fail(`Keep is locked by another write: ${paths.root}`);
  }
  return () => {
    try { fs.closeSync(descriptor); } catch { /* already closed */ }
    try { fs.unlinkSync(paths.lock); } catch { /* preserve original error */ }
  };
}

export function initializeKeep(rootPath, now = new Date()) {
  const paths = keepPaths(path.resolve(rootPath));
  fs.mkdirSync(paths.objects, { recursive: true });
  fs.mkdirSync(paths.receipts, { recursive: true });
  if (fs.existsSync(paths.marker)) return readMarker(paths);
  const marker = {
    keep_format_version: KEEP_FORMAT_VERSION,
    created_at: now.toISOString(),
    receipt_count: 0,
    receipt_head_sha256: ZERO_HASH,
  };
  writeJsonAtomic(paths.marker, marker);
  return marker;
}

export async function verifyKeep(rootPath) {
  const paths = keepPaths(path.resolve(rootPath));
  const marker = readMarker(paths);
  const names = receiptFiles(paths);
  let previous = ZERO_HASH;
  const objects = new Set();

  for (let index = 0; index < names.length; index += 1) {
    const receipt = readJson(path.join(paths.receipts, names[index]), names[index]);
    const expectedSequence = index + 1;
    if (receipt.contract !== CONTRACT || receipt.schema_version !== SCHEMA_VERSION) {
      fail(`Receipt ${expectedSequence} has an unsupported contract`);
    }
    if (receipt.sequence_number !== expectedSequence) {
      fail(`Receipt sequence is not contiguous at ${names[index]}`);
    }
    if (receipt.previous_receipt_sha256 !== previous) {
      fail(`Receipt chain link failed at sequence ${expectedSequence}`);
    }
    const computedReceiptHash = receiptHash(receipt);
    if (receipt.receipt_sha256 !== computedReceiptHash) {
      fail(`Receipt hash failed at sequence ${expectedSequence}`);
    }
    const source = receipt.source;
    if (!source || source.hash_algorithm !== 'sha256' || source.custody_mode !== 'copied_to_keep') {
      fail(`Receipt ${expectedSequence} has invalid custody metadata`);
    }
    const storedObject = objectPath(paths, source.sha256);
    if (!fs.existsSync(storedObject) || !fs.statSync(storedObject).isFile()) {
      fail(`Object missing for receipt ${expectedSequence}`);
    }
    const storedSize = fs.statSync(storedObject).size;
    if (storedSize !== source.size_bytes) {
      fail(`Object size failed for receipt ${expectedSequence}`);
    }
    const storedHash = await sha256File(storedObject);
    if (storedHash !== source.sha256) {
      fail(`Object hash failed for receipt ${expectedSequence}`);
    }
    objects.add(source.sha256);
    previous = receipt.receipt_sha256;
  }

  if (marker.receipt_count !== names.length) fail('KEEP.json receipt count does not match the ledger');
  if (marker.receipt_head_sha256 !== previous) fail('KEEP.json head does not match the ledger');

  return {
    status: 'verified',
    keep_format_version: marker.keep_format_version,
    receipt_count: names.length,
    object_count: objects.size,
    receipt_head_sha256: previous,
  };
}

export async function intakeFile(rootPath, sourcePath, options = {}) {
  const paths = keepPaths(path.resolve(rootPath));
  const source = path.resolve(sourcePath);
  readMarker(paths);
  const sourceStat = fs.lstatSync(source, { throwIfNoEntry: false });
  if (!sourceStat) fail(`Source file not found: ${source}`);
  if (sourceStat.isSymbolicLink()) fail('Symbolic links are not accepted as Keep sources');
  if (!sourceStat.isFile()) fail('Record Method Keep accepts regular files only');

  const releaseLock = acquireLock(paths);
  try {
    const before = await verifyKeep(paths.root);
    const sourceSha = await sha256File(source);
    const existingReceipts = receiptFiles(paths).map((name) =>
      readJson(path.join(paths.receipts, name), name));
    const duplicate = existingReceipts.find((receipt) => receipt.source?.sha256 === sourceSha);
    if (duplicate) {
      return { status: 'duplicate', receipt: duplicate, keep: before };
    }

    const storedObject = objectPath(paths, sourceSha);
    if (!fs.existsSync(storedObject)) {
      fs.copyFileSync(source, storedObject, fs.constants.COPYFILE_EXCL);
    }
    const copiedSha = await sha256File(storedObject);
    if (copiedSha !== sourceSha || fs.statSync(storedObject).size !== sourceStat.size) {
      fail('Vault copy does not match the source artifact');
    }

    const sequence = before.receipt_count + 1;
    const importedAt = (options.now ?? new Date()).toISOString();
    const receipt = {
      contract: CONTRACT,
      schema_version: SCHEMA_VERSION,
      sequence_number: sequence,
      action: 'INTAKE',
      imported_at: importedAt,
      previous_receipt_sha256: before.receipt_head_sha256,
      receipt_sha256: null,
      source: {
        original_filename: path.basename(source),
        size_bytes: sourceStat.size,
        sha256: sourceSha,
        hash_algorithm: 'sha256',
        object_path: `objects/sha256/${sourceSha.slice(7)}`,
        custody_mode: 'copied_to_keep',
        authority_tier: 'source_evidence',
      },
      disposition: {
        status: 'unassigned',
        governance_effect: 'none',
        human_action_required: true,
      },
    };
    receipt.receipt_sha256 = receiptHash(receipt);
    const receiptName = `${String(sequence).padStart(12, '0')}-${receipt.receipt_sha256.slice(7, 23)}.json`;
    fs.writeFileSync(
      path.join(paths.receipts, receiptName),
      `${JSON.stringify(receipt, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );

    const marker = readMarker(paths);
    marker.receipt_count = sequence;
    marker.receipt_head_sha256 = receipt.receipt_sha256;
    writeJsonAtomic(paths.marker, marker);
    const verified = await verifyKeep(paths.root);
    return { status: 'captured', receipt, keep: verified };
  } finally {
    releaseLock();
  }
}

export function listReceipts(rootPath) {
  const paths = keepPaths(path.resolve(rootPath));
  readMarker(paths);
  return receiptFiles(paths).map((name) => readJson(path.join(paths.receipts, name), name));
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command || command === 'help') {
    console.log('Usage: record-method-keep <init|intake|verify|list> --keep <folder> [--file <path>] [--json true]');
    return;
  }
  const root = requireOption(options, 'keep');
  let result;
  if (command === 'init') result = initializeKeep(root);
  else if (command === 'intake') result = await intakeFile(root, requireOption(options, 'file'));
  else if (command === 'verify') result = await verifyKeep(root);
  else if (command === 'list') result = listReceipts(root);
  else fail(`Unknown command: ${command}`);

  if (options.json === 'true') console.log(JSON.stringify(result, null, 2));
  else if (command === 'verify') console.log(`Record Method Keep VERIFIED — ${result.receipt_count} receipt(s), ${result.object_count} object(s)`);
  else if (command === 'intake') console.log(`${result.status.toUpperCase()} — ${result.receipt.source.original_filename} — ${result.receipt.source.sha256}`);
  else console.log(JSON.stringify(result, null, 2));
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`Record Method Keep failed: ${error.message}`);
    process.exitCode = 1;
  });
}
