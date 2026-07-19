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
  const ajv = new Ajv2020({ allErrors: true, strict: false });
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

export async function createEcosystemStateValidator(root = ROOT) {
  const ajv = buildAjv();
  const schema = await loadSchema(root, 'ecosystem-state.schema.json');
  return ajv.compile(schema);
}

export async function createProductStateValidator(root = ROOT) {
  const ajv = buildAjv();
  const schema = await loadSchema(root, 'product-state.schema.json');
  return ajv.compile(schema);
}

export async function createProductProfileValidator(root = ROOT) {
  const ajv = buildAjv();
  const schema = await loadSchema(root, 'product-profile.schema.json');
  return ajv.compile(schema);
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

  // Programmatic check: approved_canon requires valid human approval
  if (data.authority_class === 'approved_canon') {
    if (!data.approval) {
      errors.push('approved_canon entry missing approval object');
    } else {
      if (data.approval.approved_by_type !== 'human') {
        errors.push(`approved_canon approval must have approved_by_type "human", got: "${data.approval.approved_by_type}"`);
      }
      if (!data.approval.approved_by_name || data.approval.approved_by_name.trim() === '') {
        errors.push('approved_canon approval must have a non-empty approved_by_name');
      }
      // Constitution principle 5: approval identifies the individual human by
      // name AND account, not a team name, brand, or AI persona.
      if (!data.approval.approved_by_account || data.approval.approved_by_account.trim() === '') {
        errors.push('approved_canon approval must have a non-empty approved_by_account (Constitution principle 5)');
      }
      if (!data.approval.approved_at) {
        errors.push('approved_canon approval must have approved_at timestamp');
      }
    }
  }

  // Programmatic check: product scope requires product_id
  if (data.scope === 'product' && !data.product_id) {
    errors.push('product-scoped entry must include product_id');
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

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function validateRecord(options = {}) {
  const { root = ROOT } = options;
  const errors = [];

  const entryValidator = await createEntryValidator(root);
  const ecosystemStateValidator = await createEcosystemStateValidator(root);
  const productStateValidator = await createProductStateValidator(root);
  const productProfileValidator = await createProductProfileValidator(root);

  const allEntries = [];

  // --- Ecosystem validation ---
  const ecoStateFile = join(root, 'ecosystem', 'CURRENT_STATE.json');
  if (!(await fileExists(ecoStateFile))) {
    errors.push('Missing required file: ecosystem/CURRENT_STATE.json');
  } else {
    try {
      const raw = await readFile(ecoStateFile, 'utf8');
      const cs = JSON.parse(raw);
      if (!ecosystemStateValidator(cs)) {
        for (const e of ecosystemStateValidator.errors) {
          errors.push(`Ecosystem CURRENT_STATE.json: ${e.instancePath || '(root)'} ${e.message}`);
        }
      }
    } catch (e) {
      errors.push(`Ecosystem CURRENT_STATE.json parse error: ${e.message}`);
    }
  }

  // Ecosystem entries
  const ecoEntries = await loadEntriesFromDir(join(root, 'ecosystem', 'entries'));
  allEntries.push(...ecoEntries);

  // --- Product validation ---
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

    // PRODUCT_PROFILE.json is required
    const profilePath = join(productDir, 'PRODUCT_PROFILE.json');
    if (!(await fileExists(profilePath))) {
      errors.push(`Missing required file: products/${productId}/PRODUCT_PROFILE.json`);
    } else {
      try {
        const raw = await readFile(profilePath, 'utf8');
        const profile = JSON.parse(raw);
        if (!productProfileValidator(profile)) {
          for (const e of productProfileValidator.errors) {
            errors.push(`Product ${productId} profile: ${e.instancePath || '(root)'} ${e.message}`);
          }
        }
        if (profile.product_id !== productId) {
          errors.push(
            `Product ${productId} profile: product_id "${profile.product_id}" does not match directory product id "${productId}"`
          );
        }
      } catch (e) {
        errors.push(`Product ${productId} profile parse error: ${e.message}`);
      }
    }

    // CURRENT_STATE.json is required with scope "product"
    const csPath = join(productDir, 'CURRENT_STATE.json');
    if (!(await fileExists(csPath))) {
      errors.push(`Missing required file: products/${productId}/CURRENT_STATE.json`);
    } else {
      try {
        const raw = await readFile(csPath, 'utf8');
        const cs = JSON.parse(raw);
        if (!productStateValidator(cs)) {
          for (const e of productStateValidator.errors) {
            errors.push(`Product ${productId} CURRENT_STATE.json: ${e.instancePath || '(root)'} ${e.message}`);
          }
        }
        if (cs.product_id !== productId) {
          errors.push(
            `Product ${productId} CURRENT_STATE.json: product_id "${cs.product_id}" does not match directory product id "${productId}"`
          );
        }
      } catch (e) {
        errors.push(`Product ${productId} CURRENT_STATE.json parse error: ${e.message}`);
      }
    }

    // Product entries
    const productEntries = await loadEntriesFromDir(join(productDir, 'entries'));
    allEntries.push(...productEntries);
  }

  // --- Entry validation ---
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

  return { ok: errors.length === 0, errors, entryCount: allEntries.length };
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  validateRecord().then(result => {
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
