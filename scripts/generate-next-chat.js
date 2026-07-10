import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCurrentStateValidator, createEcosystemStateValidator, createProductStateValidator } from './validate-record.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

export function generateNextChatFromState(state, label) {
  const scopeLabel = label || (state.scope === 'ecosystem' ? 'Ecosystem' : 'Product');

  const lines = [
    `# Next Chat Start — ${scopeLabel}`,
    '',
    '> This document governs the opening context of the next conversation for this scope.',
    '> It is generated deterministically from `CURRENT_STATE.json` and must not be edited by hand.',
    '> It governs unless explicitly superseded by a new Record Entry.',
    '',
    '---',
    '',
    `**Constitution version:** ${state.constitution_version}`,
    `**Generated from:** \`CURRENT_STATE.json\` (scope: ${state.scope})`,
    `**Generated at:** ${state.generated_at}`,
    '',
    '---',
    '',
    '## Approved Canon',
    '',
  ];

  if (state.approved_canon.length === 0) {
    lines.push('_No Approved Canon entries. Nothing is yet governing canon for this scope._');
  } else {
    lines.push('The following decisions are Approved Canon and govern this scope:', '');
    for (const entry of state.approved_canon) {
      lines.push(`### ${entry.entry_id}`);
      lines.push('');
      lines.push(entry.summary);
      if (entry.decisions && entry.decisions.length > 0) {
        lines.push('');
        lines.push('**Decisions:**');
        for (const d of entry.decisions) {
          lines.push(`- ${d}`);
        }
      }
      lines.push('');
    }
  }

  lines.push('', '---', '', '## Working Context', '');
  lines.push('_Working Context informs but does not govern. It may be superseded without a new canon approval._', '');

  if (state.working_context.length === 0) {
    lines.push('_No Working Context entries._');
  } else {
    for (const entry of state.working_context) {
      lines.push(`- **${entry.entry_id}**: ${entry.summary}`);
    }
  }

  lines.push('', '---', '', '## Active State', '');
  const stateKeys = Object.keys(state.active_state).sort();
  if (stateKeys.length === 0) {
    lines.push('_No active state recorded._');
  } else {
    for (const k of stateKeys) {
      lines.push(`- **${k}**: ${state.active_state[k]}`);
    }
  }

  lines.push('', '---', '', '## Open Items', '');
  if (state.open_items.length === 0) {
    lines.push('_No open items._');
  } else {
    for (const item of state.open_items) {
      lines.push(`- ${item}`);
    }
  }

  // Include preserved next_chat_starting_context from entries
  if (state.next_chat_contexts && state.next_chat_contexts.length > 0) {
    lines.push('', '---', '', '## Carried Context', '');
    for (const ctx of state.next_chat_contexts) {
      lines.push(`### From ${ctx.entry_id}`, '');
      lines.push(ctx.context, '');
    }
  }

  lines.push('', '---', '', '## Source Record Entry IDs', '');
  if (state.source_entry_ids.length === 0) {
    lines.push('_No active entries._');
  } else {
    for (const id of state.source_entry_ids) {
      lines.push(`- ${id}`);
    }
  }

  lines.push('', '---', '', '_End of Next Chat Start context._', '');
  return lines.join('\n');
}

export async function generateNextChat(options = {}) {
  const { scope = 'ecosystem', productId = null, root = ROOT } = options;

  let stateFile, outputFile, label;
  if (scope === 'ecosystem') {
    stateFile = join(root, 'ecosystem', 'CURRENT_STATE.json');
    outputFile = join(root, 'ecosystem', 'NEXT_CHAT_START.md');
    label = 'Ecosystem';
  } else if (scope === 'product' && productId) {
    stateFile = join(root, 'products', productId, 'CURRENT_STATE.json');
    outputFile = join(root, 'products', productId, 'NEXT_CHAT_START.md');
    label = productId;
  } else {
    throw new Error('scope must be "ecosystem" or "product" with a productId');
  }

  // Read state
  const raw = await readFile(stateFile, 'utf8');
  const state = JSON.parse(raw);

  // Validate state BEFORE producing output (fail closed)
  let validator;
  if (scope === 'ecosystem') {
    validator = await createEcosystemStateValidator(root);
  } else {
    validator = await createProductStateValidator(root);
  }

  if (!validator(state)) {
    const msgs = validator.errors.map(e => `${e.instancePath || '(root)'} ${e.message}`);
    throw new Error(
      `CURRENT_STATE.json failed validation — refusing to generate NEXT_CHAT_START.md:\n  ${msgs.join('\n  ')}`
    );
  }

  const md = generateNextChatFromState(state, label);
  await writeFile(outputFile, md, 'utf8');
  return md;
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  const args = process.argv.slice(2);
  const productIndex = args.indexOf('--product');
  const productId = productIndex !== -1 ? args[productIndex + 1] : null;
  const scope = productId ? 'product' : 'ecosystem';

  generateNextChat({ scope, productId }).then(() => {
    const lbl = productId ? `product: ${productId}` : 'ecosystem';
    console.log(`NEXT_CHAT_START.md generated for ${lbl}.`);
    process.exit(0);
  }).catch(e => {
    console.error('Error generating next-chat context:', e.message);
    process.exit(1);
  });
}
