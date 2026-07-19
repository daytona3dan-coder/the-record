import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  buildAgentBootstrap,
  normalizeProductIds,
  parseArgs,
} from '../scripts/agent-bootstrap.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

async function createProductFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), 'the-record-bootstrap-product-'));
  await mkdir(join(tempRoot, 'products'), { recursive: true });
  await Promise.all([
    cp(join(ROOT, 'schemas'), join(tempRoot, 'schemas'), { recursive: true }),
    cp(join(ROOT, 'ecosystem'), join(tempRoot, 'ecosystem'), { recursive: true }),
    cp(join(ROOT, 'products', 'chatvaultai'), join(tempRoot, 'products', 'chatvaultai'), {
      recursive: true,
    }),
    cp(join(ROOT, 'CONSTITUTION.md'), join(tempRoot, 'CONSTITUTION.md')),
  ]);
  return tempRoot;
}

test('builds a ready packet from validated ecosystem and product state', async () => {
  const result = await buildAgentBootstrap({ root: ROOT, productIds: ['chatvaultai'] });

  assert.equal(result.receipt.contract, 'THE-RECORD-AGENT-BOOTSTRAP-1');
  assert.equal(result.receipt.status, 'ready');
  assert.deepEqual(result.receipt.scopes.map(scope => scope.id), ['ecosystem', 'chatvaultai']);
  assert.match(result.receipt.constitution.sha256, /^sha256:[0-9a-f]{64}$/);
  assert.match(result.packet, /BOOTSTRAP STATUS: READY/);
  assert.match(result.packet, /Next Chat Start — Ecosystem/);
  assert.match(result.packet, /Next Chat Start — chatvaultai/);
  assert.match(result.packet, /model memory do not supersede it/);
});

test('is deterministic for identical repository bytes and scope selection', async () => {
  const first = await buildAgentBootstrap({ root: ROOT, productIds: ['chatvaultai'] });
  const second = await buildAgentBootstrap({ root: ROOT, productIds: ['chatvaultai', 'chatvaultai'] });

  assert.deepEqual(first.receipt, second.receipt);
  assert.equal(first.packet, second.packet);
});

test('sorts product ids and rejects traversal or ambiguous identifiers', () => {
  assert.deepEqual(normalizeProductIds(['zeta', 'alpha', 'zeta']), ['alpha', 'zeta']);
  assert.throws(() => normalizeProductIds(['../chatvaultai']), /Invalid product id/);
  assert.throws(() => normalizeProductIds(['ChatVaultAI']), /Invalid product id/);
});

test('parses repeated products and fails closed on unknown arguments', () => {
  assert.deepEqual(
    parseArgs(['--product', 'chatvaultai', '--product', 'other-product', '--check']),
    { check: true, json: false, productIds: ['chatvaultai', 'other-product'] }
  );
  assert.throws(() => parseArgs(['--product']), /requires a product id/);
  assert.throws(() => parseArgs(['--scope', 'ecosystem']), /Unknown argument/);
});

test('refuses stale or manually altered generated context', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'the-record-bootstrap-'));
  try {
    await cp(join(ROOT, 'schemas'), join(tempRoot, 'schemas'), { recursive: true });
    await cp(join(ROOT, 'ecosystem'), join(tempRoot, 'ecosystem'), { recursive: true });
    await cp(join(ROOT, 'CONSTITUTION.md'), join(tempRoot, 'CONSTITUTION.md'));

    const contextPath = join(tempRoot, 'ecosystem', 'NEXT_CHAT_START.md');
    const context = await readFile(contextPath, 'utf8');
    await writeFile(contextPath, `${context}\nmanual drift\n`, 'utf8');

    await assert.rejects(
      buildAgentBootstrap({ root: tempRoot }),
      /bootstrap refused because generated context is stale or manually altered/
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('refuses a requested product scope that is absent', async () => {
  await assert.rejects(
    buildAgentBootstrap({ root: ROOT, productIds: ['not-recorded'] }),
    /Required bootstrap source products\/not-recorded\/PRODUCT_PROFILE.json could not be read/
  );
});

test('refuses a product profile whose identity does not match its directory', async () => {
  const tempRoot = await createProductFixture();
  try {
    const profilePath = join(tempRoot, 'products', 'chatvaultai', 'PRODUCT_PROFILE.json');
    const profile = JSON.parse(await readFile(profilePath, 'utf8'));
    profile.product_id = 'another-product';
    await writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');

    await assert.rejects(
      buildAgentBootstrap({ root: tempRoot, productIds: ['chatvaultai'] }),
      /PRODUCT_PROFILE\.json product_id "another-product" does not match requested product id "chatvaultai"/
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('refuses product state copied under a different product identity', async () => {
  const tempRoot = await createProductFixture();
  try {
    const statePath = join(tempRoot, 'products', 'chatvaultai', 'CURRENT_STATE.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    state.product_id = 'another-product';
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

    await assert.rejects(
      buildAgentBootstrap({ root: tempRoot, productIds: ['chatvaultai'] }),
      /CURRENT_STATE\.json product_id "another-product" does not match requested product id "chatvaultai"/
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('refuses stale or manually altered product context', async () => {
  const tempRoot = await createProductFixture();
  try {
    const contextPath = join(tempRoot, 'products', 'chatvaultai', 'NEXT_CHAT_START.md');
    const context = await readFile(contextPath, 'utf8');
    await writeFile(contextPath, `${context}\nmanual product drift\n`, 'utf8');

    await assert.rejects(
      buildAgentBootstrap({ root: tempRoot, productIds: ['chatvaultai'] }),
      /bootstrap refused because generated context is stale or manually altered/
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
