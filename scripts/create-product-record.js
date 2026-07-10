/**
 * Creates a new product record directory from templates.
 *
 * Usage:
 *   npm run record:create-product -- <product_id> "<Display Name>"
 *   node scripts/create-product-record.js chatvaultai "ChatVaultAI"
 *
 * product_id must match: ^[a-z0-9][a-z0-9-]*[a-z0-9]$
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const PRODUCT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

export async function createProductRecord(productId, displayName, options = {}) {
  const { root = ROOT } = options;

  if (!productId) throw new Error('product_id is required.');
  if (!displayName) throw new Error('Display name is required.');
  if (!PRODUCT_ID_PATTERN.test(productId)) {
    throw new Error(
      `Invalid product_id "${productId}". Must be lowercase alphanumeric with optional internal hyphens.`
    );
  }

  const productDir = join(root, 'products', productId);

  // Reject if product already exists
  try {
    await access(productDir);
    throw new Error(`Product "${productId}" already exists at ${productDir}.`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  const now = new Date().toISOString();

  const profile = {
    schema_version: '1.0.0',
    product_id: productId,
    display_name: displayName,
    created_at: now,
  };

  const currentState = {
    schema_version: '1.0.0',
    generated_at: now,
    scope: 'product',
    constitution_version: '1.0.0',
    approved_canon: [],
    working_context: [],
    active_state: {},
    open_items: [],
    source_entry_ids: [],
  };

  const currentStateMd = [
    `# Current State — ${displayName}`,
    '',
    `Generated: ${now}`,
    `Constitution: v1.0.0`,
    `Scope: product`,
    '',
    '## Approved Canon',
    '_No approved canon entries._',
    '',
    '## Working Context',
    '_No working context entries._',
    '',
    '## Active State',
    '_No active state._',
    '',
    '## Open Items',
    '_No open items._',
    '',
    '## Source Entry IDs',
    '_No entries._',
    '',
  ].join('\n');

  const nextChatMd = [
    `# Next Chat Start — ${displayName}`,
    '',
    '> This document governs the opening context of the next conversation for this product.',
    '> It is generated deterministically from `CURRENT_STATE.json` and must not be edited by hand.',
    '> It governs unless explicitly superseded by a new Record Entry.',
    '',
    '---',
    '',
    '**Constitution version:** 1.0.0',
    `**Generated from:** \`products/${productId}/CURRENT_STATE.json\``,
    `**Generated at:** ${now}`,
    '',
    '---',
    '',
    '## Approved Canon',
    '',
    '_No Approved Canon entries. Nothing is yet governing canon for this product._',
    '',
    '---',
    '',
    '## Working Context',
    '',
    '_No Working Context entries._',
    '',
    '---',
    '',
    '## Active State',
    '',
    '_No active state recorded._',
    '',
    '---',
    '',
    '## Open Items',
    '',
    '_No open items._',
    '',
    '---',
    '',
    '## Source Record Entry IDs',
    '',
    '_No active entries._',
    '',
    '---',
    '',
    '_End of Next Chat Start context._',
    '',
  ].join('\n');

  await mkdir(join(productDir, 'entries'), { recursive: true });
  await writeFile(join(productDir, 'PRODUCT_PROFILE.json'), JSON.stringify(profile, null, 2) + '\n', 'utf8');
  await writeFile(join(productDir, 'CURRENT_STATE.json'), JSON.stringify(currentState, null, 2) + '\n', 'utf8');
  await writeFile(join(productDir, 'CURRENT_STATE.md'), currentStateMd, 'utf8');
  await writeFile(join(productDir, 'NEXT_CHAT_START.md'), nextChatMd, 'utf8');
  await writeFile(join(productDir, 'entries', '.gitkeep'), '', 'utf8');

  return productDir;
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  const args = process.argv.slice(2);
  const productId = args[0];
  const displayName = args[1];

  if (!productId || !displayName) {
    console.error('Usage: node scripts/create-product-record.js <product_id> "<Display Name>"');
    process.exit(1);
  }

  createProductRecord(productId, displayName).then(dir => {
    console.log(`Product record created: ${dir}`);
    process.exit(0);
  }).catch(e => {
    console.error('Error creating product record:', e.message);
    process.exit(1);
  });
}
