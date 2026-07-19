import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSupersession } from './check-supersession.js';
import { createEntryValidator, validateEntryData } from './validate-record.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// Authority precedence: higher index wins in active_state conflicts
const AUTHORITY_RANK = {
  working_context: 0,
  derived_summary: 1,
  source_evidence: 2,
  approved_canon: 3,
};

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(k => [k, sortObject(value[k])])
    );
  }
  return value;
}

function deriveTimestamp(entries) {
  if (entries.length === 0) return '1970-01-01T00:00:00.000Z';
  let max = entries[0].created_at;
  for (const e of entries) {
    if (e.created_at > max) max = e.created_at;
  }
  return max;
}

function assertNoSameAuthorityActiveStateCollisions(entries) {
  const ownersByClassAndKey = new Map();

  for (const entry of entries) {
    if (!entry.active_state || typeof entry.active_state !== 'object') continue;
    for (const key of Object.keys(entry.active_state).sort()) {
      const collisionKey = `${entry.authority_class}\u0000${key}`;
      const owners = ownersByClassAndKey.get(collisionKey) || [];
      owners.push(entry.entry_id);
      ownersByClassAndKey.set(collisionKey, owners);
    }
  }

  const collisions = [];
  for (const [collisionKey, owners] of ownersByClassAndKey) {
    if (owners.length < 2) continue;
    const [authorityClass, key] = collisionKey.split('\u0000');
    collisions.push({ authorityClass, key, owners: owners.sort() });
  }

  collisions.sort((a, b) =>
    a.authorityClass.localeCompare(b.authorityClass) || a.key.localeCompare(b.key)
  );

  if (collisions.length > 0) {
    const details = collisions.map(({ authorityClass, key, owners }) =>
      `active_state key "${key}" is claimed by multiple active ${authorityClass} entries: ${owners.join(', ')}`
    );
    throw new Error(
      `Active-state collisions prevent building state:\n${details.join('\n')}\n` +
      'Use namespaced keys or supersede the older same-authority entry.'
    );
  }
}

async function loadEntriesFromDir(dir) {
  const entries = [];
  try {
    const files = (await readdir(dir)).sort();
    for (const file of files) {
      if (extname(file) !== '.json') continue;
      const raw = await readFile(join(dir, file), 'utf8');
      entries.push({ path: join(dir, file), data: JSON.parse(raw) });
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  return entries;
}

export function buildStateFromEntries(entries, scope) {
  const supersessionResult = checkSupersession(entries);
  if (!supersessionResult.ok) {
    throw new Error(
      `Supersession errors prevent building state:\n${supersessionResult.errors.join('\n')}`
    );
  }

  const { supersededBy } = supersessionResult;
  const activeEntries = entries.filter(e => !supersededBy.has(e.entry_id));

  // Same-authority collisions are ambiguous and must fail closed. Cross-authority
  // reuse remains intentional: higher authority continues to override lower authority.
  assertNoSameAuthorityActiveStateCollisions(activeEntries);

  // Separate by authority class
  const approvedCanon = activeEntries
    .filter(e => e.authority_class === 'approved_canon')
    .map(e => sortObject({ decisions: e.decisions || [], entry_id: e.entry_id, summary: e.summary }));

  const workingContext = activeEntries
    .filter(e => ['working_context', 'derived_summary', 'source_evidence'].includes(e.authority_class))
    .map(e => sortObject({ entry_id: e.entry_id, summary: e.summary }));

  // Authority-aware active_state merge: lower rank applied first, higher rank overwrites
  const rankedEntries = [...activeEntries]
    .filter(e => e.authority_class !== 'superseded')
    .sort((a, b) => (AUTHORITY_RANK[a.authority_class] ?? -1) - (AUTHORITY_RANK[b.authority_class] ?? -1));

  const activeState = {};
  for (const entry of rankedEntries) {
    if (entry.active_state && typeof entry.active_state === 'object') {
      Object.assign(activeState, entry.active_state);
    }
  }

  const openItems = activeEntries.flatMap(e => e.open_items || []);
  const sourceEntryIds = activeEntries.map(e => e.entry_id).filter(Boolean).sort();

  // Preserve next_chat_starting_context from active entries
  const nextChatContexts = activeEntries
    .filter(e => e.next_chat_starting_context)
    .map(e => ({ context: e.next_chat_starting_context, entry_id: e.entry_id }))
    .sort((a, b) => a.entry_id.localeCompare(b.entry_id));

  const generatedAt = deriveTimestamp(activeEntries.length > 0 ? activeEntries : entries);

  return sortObject({
    active_state: activeState,
    approved_canon: approvedCanon,
    constitution_version: '1.0.0',
    generated_at: generatedAt,
    next_chat_contexts: nextChatContexts,
    open_items: openItems,
    schema_version: '1.0.0',
    scope,
    source_entry_ids: sourceEntryIds,
    working_context: workingContext,
  });
}

function renderCurrentStateMd(state, label) {
  const lines = [
    `# Current State — ${label}`,
    '',
    `Generated: ${state.generated_at}`,
    `Constitution: v${state.constitution_version}`,
    `Scope: ${state.scope}`,
    '',
    '## Approved Canon',
  ];

  if (state.approved_canon.length === 0) {
    lines.push('_No approved canon entries._');
  } else {
    for (const e of state.approved_canon) {
      lines.push(`- **${e.entry_id}**: ${e.summary}`);
    }
  }

  lines.push('', '## Working Context');
  if (state.working_context.length === 0) {
    lines.push('_No working context entries._');
  } else {
    for (const e of state.working_context) {
      lines.push(`- **${e.entry_id}**: ${e.summary}`);
    }
  }

  lines.push('', '## Active State');
  const stateKeys = Object.keys(state.active_state).sort();
  if (stateKeys.length === 0) {
    lines.push('_No active state._');
  } else {
    for (const k of stateKeys) {
      lines.push(`- **${k}**: ${state.active_state[k]}`);
    }
  }

  lines.push('', '## Open Items');
  if (state.open_items.length === 0) {
    lines.push('_No open items._');
  } else {
    for (const item of state.open_items) {
      lines.push(`- ${item}`);
    }
  }

  lines.push('', '## Source Entry IDs');
  if (state.source_entry_ids.length === 0) {
    lines.push('_No entries._');
  } else {
    for (const id of state.source_entry_ids) {
      lines.push(`- ${id}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export async function buildCurrentState(options = {}) {
  const { scope = 'ecosystem', productId = null, root = ROOT } = options;

  let entriesDir, outputDir, label;
  if (scope === 'ecosystem') {
    entriesDir = join(root, 'ecosystem', 'entries');
    outputDir = join(root, 'ecosystem');
    label = 'Ecosystem';
  } else if (scope === 'product' && productId) {
    entriesDir = join(root, 'products', productId, 'entries');
    outputDir = join(root, 'products', productId);
    label = productId;
  } else {
    throw new Error('scope must be "ecosystem" or "product" with a productId');
  }

  // Load and validate entries
  const rawEntries = await loadEntriesFromDir(entriesDir);
  const entryValidator = await createEntryValidator(root);
  const validEntries = [];

  for (const { path, data } of rawEntries) {
    const errors = validateEntryData(data, entryValidator);
    if (errors.length > 0) {
      throw new Error(
        `Entry ${path} failed validation (cannot build state from invalid entries):\n  ${errors.join('\n  ')}`
      );
    }
    // Reject approved_canon without valid human approval
    if (data.authority_class === 'approved_canon') {
      if (!data.approval || data.approval.approved_by_type !== 'human') {
        throw new Error(
          `Entry ${path}: approved_canon without valid recorded human approval cannot enter derived state.`
        );
      }
    }
    validEntries.push(data);
  }

  const baseState = buildStateFromEntries(validEntries, scope);
  const state = sortObject(
    scope === 'product' ? { ...baseState, product_id: productId } : baseState
  );

  const jsonOutput = JSON.stringify(state, null, 2) + '\n';
  const mdOutput = renderCurrentStateMd(state, label);

  await writeFile(join(outputDir, 'CURRENT_STATE.json'), jsonOutput, 'utf8');
  await writeFile(join(outputDir, 'CURRENT_STATE.md'), mdOutput, 'utf8');

  return state;
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  const args = process.argv.slice(2);
  const productIndex = args.indexOf('--product');
  const productId = productIndex !== -1 ? args[productIndex + 1] : null;
  const scope = productId ? 'product' : 'ecosystem';

  buildCurrentState({ scope, productId }).then(() => {
    const lbl = productId ? `product: ${productId}` : 'ecosystem';
    console.log(`Current state built for ${lbl}.`);
    process.exit(0);
  }).catch(e => {
    console.error('Error building current state:', e.message);
    process.exit(1);
  });
}
