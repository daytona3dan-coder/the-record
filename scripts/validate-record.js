import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

async function loadSchema(root, name) {
  const raw = await readFile(join(root, 'schemas', name), 'utf8');
  return JSON.parse(raw);
}

export function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

export async function createEntryValidator(root = ROOT) {
  const ajv = buildAjv();
  const schema = await loadSchema(root, 'record-entry.schema.json');
  return ajv.compile(schema);
}

export async function createCurrentStateValidator(root = ROOT) {
  const ajv = buildAjv();
  const schema = await loadSchema(root, 'current-state.schema.json');
  return ajv.compile(schema);
}

export async function createProductProfileValidator(root = ROOT) {
  const ajv = buildAjv();
  const schema = await loadSchema(root, 'product-profile.schema.json');
  return ajv.compile(schema);
}

export async function createEcosystemStateValidator(root = ROOT) {
  const ajv = buildAjv();
  const csSchema = await loadSchema(root, 'current-state.schema.json');
  const ajv2 = buildAjv();
  ajv2.addSchema(csSchema);
  const ecoSchema = await loadSchema(root, 'ecosystem-state.schema.json');
  return ajv2.compile(csSchema);
}

function validateEvidenceSpans(entry) {
  const errors = [];
  if (!Array.isArray(entry.evidence)) return errors;
  for (const ev of entry.evidence) {
    if (!Array.isArray(ev.spans)) continue;
    for (const span of ev.spans) {
      if (typeof span.start === 'number' && typeof span.end === 'number' && span.end < span.start) {
        errors.push(`Entry ${entry.entry_id}: span end (${span.end}) must be >= start (${span.start})`);
      }
    }
  }
  return errors;
}

export function validateEntryData(data, ajvValidate) {
  const errors = [];
  if (!ajvValidate(data)) {
    for (const e of ajvValidate.errors) {
      errors.push(`${e.instancePath || '(root)'} ${e.message}`);
    }
  }
  errors.push(...validateEvidenceSpans(data));
  if (data.authority_class === 'approved_canon') {
    if (!data.approval) {
      errors.push('approved_canon entry missing approval object');
    } else if (data.approval.approved_by_type !== 'human') {
      errors.push(`approved_canon approval must have approved_by_type "human", got: ${data.approval.approved_by_type}`);
    }
  }
  return errors;
}

async function loadEntriesFromDir(dir) {
  const results = [];
  try {
    const files = (await readdir(dir)).sort();
    for (const file of files) {
      if (extname(file) !== '.json') continue;
      const raw = await readFile(join(dir, file), 'utf8');
      results.push({ path: join(dir, file), data: JSON.parse(raw) });
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  return results;
}

export async function validateRecord(options = {}) {
  const { root = ROOT } = options;
  const errors = [];
  const warnings = [];

  const entryValidator = await createEntryValidator(root);
  const currentStateValidator = await createCurrentStateValidator(root);
  const productProfileValidator = await createProductProfileValidator(root);
  const ecosystemStateValidator = await createEcosystemStateValidator(root);

  const allEntries = [];

  // Ecosystem entries
  const ecoEntries = await loadEntriesFromDir(join(root, 'ecosystem', 'entries'));
  allEntries.push(...ecoEntries);

  // Product entries + product profiles + product current states
  let productNames = [];
  try {
    const items = await readdir(join(root, 'products'));
    for (const item of items) {
      const s = await stat(join(root, 'products', item));
      if (s.isDirectory()) productNames.push(item);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  for (const productId of productNames) {
    const productDir = join(root, 'products', productId);

    const productEntries = await loadEntriesFromDir(join(productDir, 'entries'));
    allEntries.push(...productEntries);

    // Validate PRODUCT_PROFILE.json
    try {
      const raw = await readFile(join(productDir, 'PRODUCT_PROFILE.json'), 'utf8');
      const profile = JSON.parse(raw);
      if (!productProfileValidator(profile)) {
        for (const e of productProfileValidator.errors) {
          errors.push(`Product ${productId} profile: ${e.instancePath || '(root)'} ${e.message}`);
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') errors.push(`Product ${productId}: cannot read PRODUCT_PROFILE.json: ${e.message}`);
    }

    // Validate product CURRENT_STATE.json
    try {
      const raw = await readFile(join(productDir, 'CURRENT_STATE.json'), 'utf8');
      const cs = JSON.parse(raw);
      if (!currentStateValidator(cs)) {
        for (const e of currentStateValidator.errors) {
          errors.push(`Product ${productId} current state: ${e.instancePath || '(root)'} ${e.message}`);
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') errors.push(`Product ${productId}: cannot read CURRENT_STATE.json: ${e.message}`);
    }
  }

  // Validate each entry
  const seenIds = new Map();
  for (const { path, data } of allEntries) {
    const entryErrors = validateEntryData(data, entryValidator);
    for (const msg of entryErrors) errors.push(`${path}: ${msg}`);

    if (data.entry_id) {
      if (seenIds.has(data.entry_id)) {
        errors.push(`Duplicate entry_id "${data.entry_id}" in ${path} and ${seenIds.get(data.entry_id)}`);
      } else {
        seenIds.set(data.entry_id, path);
      }
    }
  }

  // Validate ecosystem CURRENT_STATE.json
  try {
    const raw = await readFile(join(root, 'ecosystem', 'CURRENT_STATE.json'), 'utf8');
    const cs = JSON.parse(raw);
    if (!ecosystemStateValidator(cs)) {
      for (const e of ecosystemStateValidator.errors) {
        errors.push(`Ecosystem current state: ${e.instancePath || '(root)'} ${e.message}`);
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') errors.push(`Cannot read ecosystem CURRENT_STATE.json: ${e.message}`);
  }

  return { ok: errors.length === 0, errors, warnings, entryCount: allEntries.length };
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  validateRecord().then(result => {
    if (result.warnings.length > 0) {
      for (const w of result.warnings) console.warn('WARN:', w);
    }
    if (result.ok) {
      console.log(`Validation passed. ${result.entryCount} entries checked.`);
      process.exit(0);
    } else {
      console.error(`Validation failed with ${result.errors.length} error(s):`);
      for (const e of result.errors) console.error('  -', e);
      process.exit(1);
    }
  }).catch(e => {
    console.error('Unexpected error during validation:', e);
    process.exit(1);
  });
}
