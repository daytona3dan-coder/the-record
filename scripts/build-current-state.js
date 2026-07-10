import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSupersession } from './check-supersession.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

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

async function loadEntriesFromDir(dir) {
  const entries = [];
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
  return entries;
}

export function buildStateFromEntries(entries) {
  const supersessionResult = checkSupersession(entries);
  if (!supersessionResult.ok) {
    throw new Error(
      `Supersession errors prevent building state:\n${supersessionResult.errors.join('\n')}`
    );
  }

  const { supersededBy } = supersessionResult;
  const activeEntries = entries.filter(e => !supersededBy.has(e.entry_id));

  const approvedCanon = activeEntries
    .filter(e => e.authority_class === 'approved_canon')
    .map(e => sortObject({ decisions: e.decisions || [], entry_id: e.entry_id, summary: e.summary }));

  const workingContext = activeEntries
    .filter(e => ['working_context', 'derived_summary', 'source_evidence'].includes(e.authority_class))
    .map(e => sortObject({ entry_id: e.entry_id, summary: e.summary }));

  const activeState = activeEntries.reduce(
    (acc, e) => Object.assign(acc, e.active_state || {}),
    {}
  );

  const openItems = activeEntries.flatMap(e => e.open_items || []);
  const sourceEntryIds = activeEntries.map(e => e.entry_id).filter(Boolean);

  return sortObject({
    active_state: activeState,
    approved_canon: approvedCanon,
    constitution_version: '1.0.0',
    generated_at: new Date().toISOString(),
    open_items: openItems,
    schema_version: '1.0.0',
    scope: activeEntries[0]?.scope ?? 'ecosystem',
    source_entry_ids: sourceEntryIds,
    working_context: workingContext,
  });
}

function renderCurrentStateMd(state) {
  const label = state.scope === 'ecosystem' ? 'Ecosystem' : state.scope;
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
  const stateKeys = Object.keys(state.active_state);
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

  let entriesDir, outputDir;
  if (scope === 'ecosystem') {
    entriesDir = join(root, 'ecosystem', 'entries');
    outputDir = join(root, 'ecosystem');
  } else if (scope === 'product' && productId) {
    entriesDir = join(root, 'products', productId, 'entries');
    outputDir = join(root, 'products', productId);
  } else {
    throw new Error('scope must be "ecosystem" or "product" with a productId');
  }

  const entries = await loadEntriesFromDir(entriesDir);
  const state = buildStateFromEntries(entries);

  // Override scope to correct value when entries dir is empty
  if (scope === 'ecosystem') state.scope = 'ecosystem';

  await writeFile(
    join(outputDir, 'CURRENT_STATE.json'),
    JSON.stringify(state, null, 2) + '\n',
    'utf8'
  );
  await writeFile(join(outputDir, 'CURRENT_STATE.md'), renderCurrentStateMd(state), 'utf8');

  return state;
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  const args = process.argv.slice(2);
  const productIndex = args.indexOf('--product');
  const productId = productIndex !== -1 ? args[productIndex + 1] : null;
  const scope = productId ? 'product' : 'ecosystem';

  buildCurrentState({ scope, productId }).then(() => {
    const label = productId ? `product: ${productId}` : 'ecosystem';
    console.log(`Current state built for ${label}.`);
    process.exit(0);
  }).catch(e => {
    console.error('Error building current state:', e.message);
    process.exit(1);
  });
}
