import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateNextChatFromState } from './generate-next-chat.js';
import {
  createEcosystemStateValidator,
  createProductProfileValidator,
  createProductStateValidator,
} from './validate-record.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PRODUCT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sha256(value) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

export function normalizeProductIds(productIds = []) {
  const normalized = [...new Set(productIds)].sort();
  for (const productId of normalized) {
    if (!PRODUCT_ID_PATTERN.test(productId)) {
      throw new Error(
        `Invalid product id "${productId}". Product ids must be lowercase alphanumeric with optional internal hyphens.`
      );
    }
  }
  return normalized;
}

async function readRequired(root, relativePath) {
  try {
    return await readFile(join(root, relativePath), 'utf8');
  } catch (error) {
    throw new Error(`Required bootstrap source ${relativePath} could not be read: ${error.message}`);
  }
}

function parseJson(raw, relativePath) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Required bootstrap source ${relativePath} is not valid JSON: ${error.message}`);
  }
}

function assertValid(validator, data, relativePath) {
  if (validator(data)) return;
  const messages = validator.errors.map(error =>
    `${error.instancePath || '(root)'} ${error.message}`
  );
  throw new Error(
    `Required bootstrap source ${relativePath} failed validation:\n  ${messages.join('\n  ')}`
  );
}

async function loadEcosystemScope(root) {
  const currentStatePath = 'ecosystem/CURRENT_STATE.json';
  const nextChatPath = 'ecosystem/NEXT_CHAT_START.md';
  const [currentStateRaw, nextChatRaw, validator] = await Promise.all([
    readRequired(root, currentStatePath),
    readRequired(root, nextChatPath),
    createEcosystemStateValidator(root),
  ]);
  const currentState = parseJson(currentStateRaw, currentStatePath);
  assertValid(validator, currentState, currentStatePath);

  const regenerated = generateNextChatFromState(currentState, 'Ecosystem');
  if (nextChatRaw !== regenerated) {
    throw new Error(
      `${nextChatPath} does not exactly match validated ${currentStatePath}; ` +
      'bootstrap refused because generated context is stale or manually altered.'
    );
  }

  return {
    id: 'ecosystem',
    scope: 'ecosystem',
    context: nextChatRaw,
    files: {
      current_state: { path: currentStatePath, sha256: sha256(currentStateRaw) },
      next_chat_start: { path: nextChatPath, sha256: sha256(nextChatRaw) },
    },
  };
}

async function loadProductScope(root, productId) {
  const prefix = `products/${productId}`;
  const profilePath = `${prefix}/PRODUCT_PROFILE.json`;
  const currentStatePath = `${prefix}/CURRENT_STATE.json`;
  const nextChatPath = `${prefix}/NEXT_CHAT_START.md`;
  const [profileRaw, currentStateRaw, nextChatRaw, profileValidator, stateValidator] =
    await Promise.all([
      readRequired(root, profilePath),
      readRequired(root, currentStatePath),
      readRequired(root, nextChatPath),
      createProductProfileValidator(root),
      createProductStateValidator(root),
    ]);

  const profile = parseJson(profileRaw, profilePath);
  const currentState = parseJson(currentStateRaw, currentStatePath);
  assertValid(profileValidator, profile, profilePath);
  assertValid(stateValidator, currentState, currentStatePath);

  const regenerated = generateNextChatFromState(currentState, productId);
  if (nextChatRaw !== regenerated) {
    throw new Error(
      `${nextChatPath} does not exactly match validated ${currentStatePath}; ` +
      'bootstrap refused because generated context is stale or manually altered.'
    );
  }

  return {
    id: productId,
    scope: 'product',
    profile: profileRaw,
    context: nextChatRaw,
    files: {
      current_state: { path: currentStatePath, sha256: sha256(currentStateRaw) },
      next_chat_start: { path: nextChatPath, sha256: sha256(nextChatRaw) },
      product_profile: { path: profilePath, sha256: sha256(profileRaw) },
    },
  };
}

export function renderBootstrapPacket({ constitution, receipt, scopes }) {
  const lines = [
    '# The Record — Deterministic Agent Bootstrap',
    '',
    '**BOOTSTRAP STATUS: READY**',
    '',
    '> This packet was built only from validated repository state. Ingest it before',
    '> substantive reasoning or action. Chat history and model memory do not supersede it.',
    '',
    '## Bootstrap Receipt',
    '',
    '```json',
    JSON.stringify(receipt, null, 2),
    '```',
    '',
    '## Constitution',
    '',
    `Source: \`${receipt.constitution.path}\` (${receipt.constitution.sha256})`,
    '',
    constitution.trimEnd(),
  ];

  for (const scope of scopes) {
    lines.push('', '---', '', `## Loaded Scope — ${scope.id}`, '');
    if (scope.profile) {
      lines.push(
        `Product profile: \`${scope.files.product_profile.path}\` (${scope.files.product_profile.sha256})`,
        '',
        '```json',
        scope.profile.trimEnd(),
        '```',
        ''
      );
    }
    lines.push(
      `Validated state: \`${scope.files.current_state.path}\` (${scope.files.current_state.sha256})`,
      `Generated context: \`${scope.files.next_chat_start.path}\` (${scope.files.next_chat_start.sha256})`,
      '',
      scope.context.trimEnd()
    );
  }

  lines.push(
    '',
    '---',
    '',
    '## Session Contract',
    '',
    '- Source evidence outranks derived summaries; Approved Canon governs Working Context.',
    '- Missing or incomplete Record state must be reported. It must not be filled from model memory.',
    '- New user statements may support a proposed Record Entry but do not become Approved Canon automatically.',
    '- This receipt proves file identity and generated-context integrity, not factual completeness or freshness.',
    '- AI review is advisory. Only Dan Demarest may approve or authorize a merge.',
    ''
  );

  return lines.join('\n');
}

export async function buildAgentBootstrap(options = {}) {
  const { root = ROOT, productIds = [] } = options;
  const normalizedProductIds = normalizeProductIds(productIds);
  const constitutionPath = 'CONSTITUTION.md';
  const constitution = await readRequired(root, constitutionPath);
  const ecosystem = await loadEcosystemScope(root);
  const products = [];
  for (const productId of normalizedProductIds) {
    products.push(await loadProductScope(root, productId));
  }
  const scopes = [ecosystem, ...products];
  const receipt = {
    contract: 'THE-RECORD-AGENT-BOOTSTRAP-1',
    schema_version: '1.0.0',
    status: 'ready',
    constitution: { path: constitutionPath, sha256: sha256(constitution) },
    scopes: scopes.map(scope => ({
      id: scope.id,
      scope: scope.scope,
      files: scope.files,
    })),
  };

  return {
    receipt,
    packet: renderBootstrapPacket({ constitution, receipt, scopes }),
  };
}

export function parseArgs(args) {
  const productIds = [];
  let check = false;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--product') {
      const productId = args[index + 1];
      if (!productId || productId.startsWith('--')) {
        throw new Error('--product requires a product id');
      }
      productIds.push(productId);
      index += 1;
    } else if (arg === '--check') {
      check = true;
    } else if (arg === '--json') {
      json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { check, json, productIds };
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await buildAgentBootstrap({ productIds: options.productIds });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result.receipt, null, 2)}\n`);
    } else if (options.check) {
      const scopeNames = result.receipt.scopes.map(scope => scope.id).join(', ');
      console.log(`Agent bootstrap verified for scopes: ${scopeNames}.`);
    } else {
      process.stdout.write(result.packet);
    }
  } catch (error) {
    console.error('Agent bootstrap refused:', error.message);
    process.exitCode = 1;
  }
}
