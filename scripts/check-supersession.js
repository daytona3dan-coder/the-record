import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function detectCycles(idMap) {
  const errors = [];
  const permanent = new Set();
  const temporary = new Set();

  function visit(id, path) {
    if (permanent.has(id)) return;
    if (temporary.has(id)) {
      const cycleStart = path.indexOf(id);
      const cycle = [...path.slice(cycleStart), id].join(' -> ');
      errors.push(`Supersession cycle detected: ${cycle}`);
      return;
    }
    temporary.add(id);
    const entry = idMap.get(id);
    if (entry && Array.isArray(entry.supersedes)) {
      for (const supersededId of entry.supersedes) {
        if (idMap.has(supersededId)) {
          visit(supersededId, [...path, id]);
        }
      }
    }
    temporary.delete(id);
    permanent.add(id);
  }

  for (const id of idMap.keys()) {
    visit(id, []);
  }
  return errors;
}

export function checkSupersession(entries) {
  const errors = [];
  const idMap = new Map();

  // Duplicate entry IDs
  for (const entry of entries) {
    if (!entry.entry_id) continue;
    if (idMap.has(entry.entry_id)) {
      errors.push(`Duplicate entry_id: "${entry.entry_id}"`);
    } else {
      idMap.set(entry.entry_id, entry);
    }
  }

  for (const entry of entries) {
    if (!entry.entry_id || !Array.isArray(entry.supersedes)) continue;

    // Self-supersession
    if (entry.supersedes.includes(entry.entry_id)) {
      errors.push(`Self-supersession: "${entry.entry_id}" lists itself in supersedes`);
    }

    for (const targetId of entry.supersedes) {
      if (targetId === entry.entry_id) continue;

      // Missing superseded entry
      if (!idMap.has(targetId)) {
        errors.push(`Entry "${entry.entry_id}" supersedes unknown entry: "${targetId}"`);
        continue;
      }

      const target = idMap.get(targetId);

      // Incompatible scope
      if (target.scope !== entry.scope) {
        errors.push(
          `Incompatible scope: "${entry.entry_id}" (${entry.scope}) cannot supersede "${targetId}" (${target.scope})`
        );
      }

      // Cross-product supersession: product entries must share the same product_id
      if (entry.scope === 'product' && target.scope === 'product') {
        if (entry.product_id && target.product_id && entry.product_id !== target.product_id) {
          errors.push(
            `Cross-product supersession: "${entry.entry_id}" (product: ${entry.product_id}) cannot supersede "${targetId}" (product: ${target.product_id})`
          );
        }
      }
    }
  }

  // Cycle detection
  errors.push(...detectCycles(idMap));

  // Derive reverse superseded_by map
  const supersededBy = new Map();
  for (const entry of entries) {
    if (!Array.isArray(entry.supersedes)) continue;
    for (const targetId of entry.supersedes) {
      if (!supersededBy.has(targetId)) supersededBy.set(targetId, []);
      supersededBy.get(targetId).push(entry.entry_id);
    }
  }

  return { ok: errors.length === 0, errors, supersededBy };
}

async function loadAllEntries(root) {
  const entries = [];

  async function loadDir(dir) {
    try {
      const files = (await readdir(dir)).sort();
      for (const file of files) {
        if (extname(file) !== '.json') continue;
        const raw = await readFile(join(dir, file), 'utf8');
        entries.push(JSON.parse(raw));
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }

  await loadDir(join(root, 'ecosystem', 'entries'));

  try {
    const products = await readdir(join(root, 'products'));
    for (const product of products) {
      await loadDir(join(root, 'products', product, 'entries'));
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  return entries;
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  loadAllEntries(ROOT).then(entries => {
    const result = checkSupersession(entries);
    if (result.ok) {
      console.log(`Supersession check passed. ${entries.length} entries checked.`);
      process.exit(0);
    } else {
      console.error(`Supersession check failed with ${result.errors.length} error(s):`);
      for (const e of result.errors) console.error('  -', e);
      process.exit(1);
    }
  }).catch(e => {
    console.error('Unexpected error during supersession check:', e);
    process.exit(1);
  });
}
