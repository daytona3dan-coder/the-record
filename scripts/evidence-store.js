import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

export const EVIDENCE_INTAKE_CONTRACT = 'THE-RECORD-EVIDENCE-INTAKE-1';
export const EVIDENCE_VERIFY_CONTRACT = 'THE-RECORD-EVIDENCE-VERIFY-1';
export const EVIDENCE_REFERENCE_CHECK_CONTRACT = 'THE-RECORD-EVIDENCE-REFERENCE-CHECK-1';
export const EVIDENCE_REFERENCE_SCHEMA_VERSION = '1.0.0';
export const EVIDENCE_STORE_ENV = 'THE_RECORD_EVIDENCE_STORE';

const ARTIFACT_PATTERN = /^sha256:([0-9a-f]{64})$/;
const SOURCE_TYPE_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

function stableSortObject(value) {
  if (Array.isArray(value)) return value.map(stableSortObject);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, stableSortObject(value[key])])
    );
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stableSortObject(value), null, 2)}\n`;
}

function pathIsWithin(parentPath, candidatePath) {
  const rel = relative(parentPath, candidatePath);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function parseArtifact(artifact) {
  const match = ARTIFACT_PATTERN.exec(artifact || '');
  if (!match) {
    throw new Error('artifact must use the form sha256:<64 lowercase hexadecimal characters>.');
  }
  return match[1];
}

export function resolveEvidenceStore({ storePath, root = ROOT, env = process.env } = {}) {
  const configured = storePath || env[EVIDENCE_STORE_ENV];
  if (!configured || configured.trim() === '') {
    throw new Error(
      `Evidence store is required. Pass --store <path> or set ${EVIDENCE_STORE_ENV}.`
    );
  }

  const resolvedRoot = resolve(root);
  const resolvedStore = resolve(configured);
  if (pathIsWithin(resolvedRoot, resolvedStore)) {
    throw new Error(
      `Evidence store must be outside The Record repository. Refused path: ${resolvedStore}`
    );
  }
  return resolvedStore;
}

function validateSourceMetadata(sourceType, label) {
  if (!sourceType || !SOURCE_TYPE_PATTERN.test(sourceType)) {
    throw new Error(
      'source type must be lowercase alphanumeric with optional period, underscore, or hyphen characters.'
    );
  }
  if (!label || label.trim() === '') {
    throw new Error('label is required and must not be empty.');
  }
}

export function evidenceObjectRelativePath(hash) {
  return `objects/sha256/${hash}`;
}

export function evidenceReferenceRelativePath(hash) {
  return `evidence/references/${hash}.json`;
}

export function buildEvidenceReference({ artifact, byteSize, sourceType, label }) {
  const hash = parseArtifact(artifact);
  validateSourceMetadata(sourceType, label);
  if (!Number.isInteger(byteSize) || byteSize < 0) {
    throw new Error('byte size must be a non-negative integer.');
  }

  return stableSortObject({
    artifact,
    byte_size: byteSize,
    label: label.trim(),
    object_path: evidenceObjectRelativePath(hash),
    schema_version: EVIDENCE_REFERENCE_SCHEMA_VERSION,
    source_type: sourceType,
  });
}

export function validateEvidenceReferenceData(data) {
  const errors = [];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return ['reference must be a JSON object'];
  }

  const expectedKeys = [
    'artifact',
    'byte_size',
    'label',
    'object_path',
    'schema_version',
    'source_type',
  ];
  const actualKeys = Object.keys(data).sort();
  const missing = expectedKeys.filter(key => !actualKeys.includes(key));
  const extra = actualKeys.filter(key => !expectedKeys.includes(key));
  for (const key of missing) errors.push(`missing required field: ${key}`);
  for (const key of extra) errors.push(`unexpected field: ${key}`);

  if (data.schema_version !== EVIDENCE_REFERENCE_SCHEMA_VERSION) {
    errors.push(
      `schema_version must be "${EVIDENCE_REFERENCE_SCHEMA_VERSION}", got: ${JSON.stringify(data.schema_version)}`
    );
  }

  let hash = null;
  try {
    hash = parseArtifact(data.artifact);
  } catch (error) {
    errors.push(error.message);
  }

  if (!Number.isInteger(data.byte_size) || data.byte_size < 0) {
    errors.push('byte_size must be a non-negative integer');
  }
  if (typeof data.label !== 'string' || data.label.trim() === '') {
    errors.push('label must be a non-empty string');
  }
  if (typeof data.source_type !== 'string' || !SOURCE_TYPE_PATTERN.test(data.source_type)) {
    errors.push(
      'source_type must be lowercase alphanumeric with optional period, underscore, or hyphen characters'
    );
  }
  if (hash && data.object_path !== evidenceObjectRelativePath(hash)) {
    errors.push(
      `object_path must be "${evidenceObjectRelativePath(hash)}" for artifact ${data.artifact}`
    );
  }

  return errors;
}

async function inspectObject(objectPath, expectedHash) {
  if (!(await exists(objectPath))) return { exists: false, valid: false };
  const bytes = await readFile(objectPath);
  const actualHash = sha256Bytes(bytes);
  if (actualHash !== expectedHash) {
    throw new Error(
      `Existing evidence object does not match its content-addressed path: ${objectPath}. ` +
      `Expected ${expectedHash}, found ${actualHash}.`
    );
  }
  return { exists: true, valid: true, byteSize: bytes.length };
}

async function storeObjectExact({ objectPath, bytes, expectedHash, dryRun }) {
  const existing = await inspectObject(objectPath, expectedHash);
  if (existing.exists) return 'reused';
  if (dryRun) return 'would-create';

  await mkdir(dirname(objectPath), { recursive: true });
  const tempPath = `${objectPath}.tmp-${process.pid}`;
  await rm(tempPath, { force: true });

  try {
    await writeFile(tempPath, bytes, { flag: 'wx' });
    const tempBytes = await readFile(tempPath);
    const tempHash = sha256Bytes(tempBytes);
    if (tempHash !== expectedHash) {
      throw new Error(
        `Temporary evidence object hash mismatch. Expected ${expectedHash}, found ${tempHash}.`
      );
    }

    try {
      await copyFile(tempPath, objectPath, fsConstants.COPYFILE_EXCL);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      await inspectObject(objectPath, expectedHash);
      return 'reused';
    }

    const stored = await inspectObject(objectPath, expectedHash);
    if (!stored.valid || stored.byteSize !== bytes.length) {
      throw new Error(`Stored evidence object failed verification: ${objectPath}`);
    }
    return 'created';
  } finally {
    await rm(tempPath, { force: true });
  }
}

async function storeReferenceExact({ referencePath, referenceBytes, dryRun }) {
  if (await exists(referencePath)) {
    const current = await readFile(referencePath, 'utf8');
    if (current !== referenceBytes) {
      throw new Error(
        `Evidence reference already exists with different metadata: ${referencePath}. ` +
        'Do not silently replace it.'
      );
    }
    return 'reused';
  }
  if (dryRun) return 'would-create';

  await mkdir(dirname(referencePath), { recursive: true });
  try {
    await writeFile(referencePath, referenceBytes, { encoding: 'utf8', flag: 'wx' });
    return 'created';
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const current = await readFile(referencePath, 'utf8');
    if (current !== referenceBytes) {
      throw new Error(
        `Evidence reference appeared with different metadata during intake: ${referencePath}`
      );
    }
    return 'reused';
  }
}

export async function intakeEvidence(options = {}) {
  const {
    filePath,
    sourceType,
    label,
    storePath,
    root = ROOT,
    env = process.env,
    dryRun = false,
  } = options;

  if (!filePath) throw new Error('source file is required. Pass --file <path>.');
  validateSourceMetadata(sourceType, label);

  const resolvedSource = resolve(filePath);
  const sourceStat = await stat(resolvedSource).catch(error => {
    throw new Error(`Source file could not be read: ${resolvedSource}: ${error.message}`);
  });
  if (!sourceStat.isFile()) {
    throw new Error(`Source path is not a file: ${resolvedSource}`);
  }

  const resolvedRoot = resolve(root);
  const storeRoot = resolveEvidenceStore({ storePath, root: resolvedRoot, env });
  const sourceBytes = await readFile(resolvedSource);
  const hash = sha256Bytes(sourceBytes);
  const artifact = `sha256:${hash}`;
  const objectPath = join(storeRoot, 'objects', 'sha256', hash);
  const referencePath = join(resolvedRoot, 'evidence', 'references', `${hash}.json`);
  const reference = buildEvidenceReference({
    artifact,
    byteSize: sourceBytes.length,
    sourceType,
    label,
  });
  const referenceBytes = stableJson(reference);

  const objectAction = await storeObjectExact({
    objectPath,
    bytes: sourceBytes,
    expectedHash: hash,
    dryRun,
  });
  const referenceAction = await storeReferenceExact({
    referencePath,
    referenceBytes,
    dryRun,
  });

  const afterBytes = await readFile(resolvedSource);
  const afterHash = sha256Bytes(afterBytes);
  if (afterHash !== hash || afterBytes.length !== sourceBytes.length) {
    throw new Error(
      `Source file changed during intake. Expected ${artifact}, found sha256:${afterHash}.`
    );
  }

  return stableSortObject({
    artifact,
    byte_size: sourceBytes.length,
    contract: EVIDENCE_INTAKE_CONTRACT,
    dry_run: Boolean(dryRun),
    label: label.trim(),
    object_action: objectAction,
    object_path: objectPath,
    reference_action: referenceAction,
    reference_path: referencePath,
    source_path: resolvedSource,
    source_type: sourceType,
    status: dryRun ? 'dry-run' : 'stored',
    store_root: storeRoot,
  });
}

export async function verifyEvidence(options = {}) {
  const { artifact, storePath, root = ROOT, env = process.env } = options;
  const hash = parseArtifact(artifact);
  const resolvedRoot = resolve(root);
  const storeRoot = resolveEvidenceStore({ storePath, root: resolvedRoot, env });
  const objectPath = join(storeRoot, 'objects', 'sha256', hash);
  const referencePath = join(resolvedRoot, 'evidence', 'references', `${hash}.json`);

  if (!(await exists(objectPath))) {
    throw new Error(`Evidence object is missing: ${objectPath}`);
  }
  const objectBytes = await readFile(objectPath);
  const actualHash = sha256Bytes(objectBytes);
  if (actualHash !== hash) {
    throw new Error(
      `Evidence object hash mismatch. Expected ${hash}, found ${actualHash}: ${objectPath}`
    );
  }

  if (!(await exists(referencePath))) {
    throw new Error(`Evidence reference is missing: ${referencePath}`);
  }
  let reference;
  try {
    reference = JSON.parse(await readFile(referencePath, 'utf8'));
  } catch (error) {
    throw new Error(`Evidence reference is not valid JSON: ${referencePath}: ${error.message}`);
  }
  const referenceErrors = validateEvidenceReferenceData(reference);
  if (referenceErrors.length > 0) {
    throw new Error(
      `Evidence reference is invalid: ${referencePath}:\n  ${referenceErrors.join('\n  ')}`
    );
  }
  if (reference.artifact !== artifact) {
    throw new Error(
      `Evidence reference artifact mismatch. Expected ${artifact}, found ${reference.artifact}.`
    );
  }
  if (reference.byte_size !== objectBytes.length) {
    throw new Error(
      `Evidence reference byte_size mismatch. Expected ${reference.byte_size}, found ${objectBytes.length}.`
    );
  }

  return stableSortObject({
    artifact,
    byte_size: objectBytes.length,
    contract: EVIDENCE_VERIFY_CONTRACT,
    label: reference.label,
    object_path: objectPath,
    reference_path: referencePath,
    source_type: reference.source_type,
    status: 'verified',
    store_root: storeRoot,
  });
}

export async function checkEvidenceReferences(options = {}) {
  const { root = ROOT } = options;
  const resolvedRoot = resolve(root);
  const referencesDir = join(resolvedRoot, 'evidence', 'references');
  const errors = [];
  const artifacts = new Map();
  let files = [];

  try {
    files = (await readdir(referencesDir)).filter(file => extname(file) === '.json').sort();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  for (const file of files) {
    const path = join(referencesDir, file);
    let reference;
    try {
      reference = JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      errors.push(`${path}: invalid JSON: ${error.message}`);
      continue;
    }

    for (const error of validateEvidenceReferenceData(reference)) {
      errors.push(`${path}: ${error}`);
    }

    let hash = null;
    try {
      hash = parseArtifact(reference.artifact);
    } catch {
      continue;
    }

    const expectedFilename = `${hash}.json`;
    if (basename(path) !== expectedFilename) {
      errors.push(`${path}: filename must be ${expectedFilename}`);
    }
    if (artifacts.has(reference.artifact)) {
      errors.push(
        `${path}: duplicate artifact reference ${reference.artifact}; first seen in ${artifacts.get(reference.artifact)}`
      );
    } else {
      artifacts.set(reference.artifact, path);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Evidence reference check failed with ${errors.length} error(s):\n  ${errors.join('\n  ')}`
    );
  }

  return stableSortObject({
    contract: EVIDENCE_REFERENCE_CHECK_CONTRACT,
    reference_count: files.length,
    status: 'verified',
  });
}

function setFlag(target, key, value, flag) {
  if (Object.prototype.hasOwnProperty.call(target, key)) {
    throw new Error(`Duplicate argument: ${flag}`);
  }
  target[key] = value;
}

export function parseEvidenceArgs(args) {
  const command = args[0];
  if (!['intake', 'verify', 'check-references'].includes(command)) {
    throw new Error('First argument must be "intake", "verify", or "check-references".');
  }

  const parsed = { command, dryRun: false, json: false };
  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--dry-run') {
      if (parsed.dryRun) throw new Error('Duplicate argument: --dry-run');
      parsed.dryRun = true;
      continue;
    }
    if (flag === '--json') {
      if (parsed.json) throw new Error('Duplicate argument: --json');
      parsed.json = true;
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${flag} requires a value.`);
    }
    index += 1;

    if (flag === '--file') setFlag(parsed, 'filePath', value, flag);
    else if (flag === '--source') setFlag(parsed, 'sourceType', value, flag);
    else if (flag === '--label') setFlag(parsed, 'label', value, flag);
    else if (flag === '--store') setFlag(parsed, 'storePath', value, flag);
    else if (flag === '--artifact') setFlag(parsed, 'artifact', value, flag);
    else throw new Error(`Unknown argument: ${flag}`);
  }

  if (command === 'intake') {
    if (!parsed.filePath) throw new Error('intake requires --file <path>.');
    if (!parsed.sourceType) throw new Error('intake requires --source <type>.');
    if (!parsed.label) throw new Error('intake requires --label <label>.');
    if (parsed.artifact) throw new Error('intake does not accept --artifact.');
  } else if (command === 'verify') {
    if (!parsed.artifact) throw new Error('verify requires --artifact sha256:<hash>.');
    if (parsed.filePath || parsed.sourceType || parsed.label || parsed.dryRun) {
      throw new Error('verify accepts only --artifact, --store, and --json.');
    }
  } else if (
    parsed.filePath || parsed.sourceType || parsed.label || parsed.storePath ||
    parsed.artifact || parsed.dryRun
  ) {
    throw new Error('check-references accepts only --json.');
  }

  return parsed;
}

function renderHumanReceipt(receipt) {
  const lines = [
    receipt.contract === EVIDENCE_REFERENCE_CHECK_CONTRACT
      ? `Evidence references verified: ${receipt.reference_count}.`
      : receipt.status === 'verified'
        ? 'Evidence verified.'
        : receipt.dry_run
          ? 'Evidence intake dry run complete. No files were written.'
          : 'Evidence intake stored.',
    ...(receipt.artifact ? [
      `Artifact: ${receipt.artifact}`,
      `Bytes: ${receipt.byte_size}`,
      `Object: ${receipt.object_path}`,
      `Reference: ${receipt.reference_path}`,
    ] : []),
  ];
  if (receipt.object_action) lines.push(`Object action: ${receipt.object_action}`);
  if (receipt.reference_action) lines.push(`Reference action: ${receipt.reference_action}`);
  return `${lines.join('\n')}\n`;
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  try {
    const parsed = parseEvidenceArgs(process.argv.slice(2));
    const receipt = parsed.command === 'intake'
      ? await intakeEvidence(parsed)
      : parsed.command === 'verify'
        ? await verifyEvidence(parsed)
        : await checkEvidenceReferences();
    process.stdout.write(parsed.json ? stableJson(receipt) : renderHumanReceipt(receipt));
  } catch (error) {
    console.error('Evidence operation refused:', error.message);
    process.exitCode = 1;
  }
}
