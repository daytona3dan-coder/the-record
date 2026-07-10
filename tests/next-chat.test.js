import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNextChatFromState } from '../scripts/generate-next-chat.js';

function makeState(overrides = {}) {
  return {
    schema_version: '1.0.0',
    generated_at: '1970-01-01T00:00:00.000Z',
    scope: 'ecosystem',
    constitution_version: '1.0.0',
    approved_canon: [],
    working_context: [],
    active_state: {},
    open_items: [],
    source_entry_ids: [],
    next_chat_contexts: [],
    ...overrides,
  };
}

test('generates markdown from empty state', () => {
  const md = generateNextChatFromState(makeState(), 'Ecosystem');
  assert.ok(typeof md === 'string');
  assert.ok(md.includes('# Next Chat Start'));
  assert.ok(md.includes('**Constitution version:**') && md.includes('1.0.0'));
  assert.ok(md.includes('No Approved Canon'));
  assert.ok(md.includes('No Working Context'));
  assert.ok(md.includes('No active state'));
  assert.ok(md.includes('No open items'));
  assert.ok(md.includes('No active entries'));
});

test('uses provided label for product scope', () => {
  const md = generateNextChatFromState(makeState({ scope: 'product' }), 'ChatVaultAI');
  assert.ok(md.includes('# Next Chat Start — ChatVaultAI'));
  assert.ok(md.includes('scope: product'));
});

test('includes constitution version in output', () => {
  const md = generateNextChatFromState(makeState({ constitution_version: '2.0.0' }), 'Ecosystem');
  assert.ok(md.includes('2.0.0'));
});

test('includes approved canon entries', () => {
  const state = makeState({
    approved_canon: [{ entry_id: 'ENTRY-CANON-001', summary: 'Canon summary.', decisions: ['Decision X.'] }],
  });
  const md = generateNextChatFromState(state, 'Ecosystem');
  assert.ok(md.includes('ENTRY-CANON-001'));
  assert.ok(md.includes('Canon summary.'));
  assert.ok(md.includes('Decision X.'));
});

test('labels working context separately from approved canon', () => {
  const state = makeState({
    approved_canon: [{ entry_id: 'ENTRY-AC-001', summary: 'Approved.', decisions: [] }],
    working_context: [{ entry_id: 'ENTRY-WC-001', summary: 'Working.' }],
  });
  const md = generateNextChatFromState(state, 'Ecosystem');
  const canonPos = md.indexOf('## Approved Canon');
  const wcPos = md.indexOf('## Working Context');
  assert.ok(canonPos < wcPos);
  assert.ok(md.includes('ENTRY-AC-001'));
  assert.ok(md.includes('ENTRY-WC-001'));
});

test('includes active state key-value pairs', () => {
  const md = generateNextChatFromState(makeState({ active_state: { phase: 'beta', status: 'active' } }), 'Ecosystem');
  assert.ok(md.includes('phase'));
  assert.ok(md.includes('beta'));
});

test('includes open items', () => {
  const md = generateNextChatFromState(makeState({ open_items: ['Migrate DECISIONS.md'] }), 'Ecosystem');
  assert.ok(md.includes('Migrate DECISIONS.md'));
});

test('includes source entry IDs', () => {
  const md = generateNextChatFromState(makeState({ source_entry_ids: ['ENTRY-ECO-001'] }), 'Ecosystem');
  assert.ok(md.includes('ENTRY-ECO-001'));
});

test('includes next_chat_contexts as carried context', () => {
  const state = makeState({
    next_chat_contexts: [{ entry_id: 'ENTRY-CTX-001', context: 'Carry this forward.' }],
  });
  const md = generateNextChatFromState(state, 'Ecosystem');
  assert.ok(md.includes('Carried Context'));
  assert.ok(md.includes('ENTRY-CTX-001'));
  assert.ok(md.includes('Carry this forward.'));
});

test('output contains governance disclaimer', () => {
  const md = generateNextChatFromState(makeState(), 'Ecosystem');
  assert.ok(md.includes('governs'));
});

test('output is deterministic for identical input', () => {
  const state = makeState({ working_context: [{ entry_id: 'ENTRY-WC-001', summary: 'A.' }] });
  const md1 = generateNextChatFromState(state, 'Ecosystem');
  const md2 = generateNextChatFromState(state, 'Ecosystem');
  assert.equal(md1, md2);
});
