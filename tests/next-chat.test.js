import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNextChatFromState } from '../scripts/generate-next-chat.js';

function makeState(overrides = {}) {
  return {
    schema_version: '1.0.0',
    generated_at: '2026-07-10T00:00:00.000Z',
    scope: 'ecosystem',
    constitution_version: '1.0.0',
    approved_canon: [],
    working_context: [],
    active_state: {},
    open_items: [],
    source_entry_ids: [],
    ...overrides,
  };
}

test('generates markdown from empty state', () => {
  const md = generateNextChatFromState(makeState());
  assert.ok(typeof md === 'string');
  assert.ok(md.includes('# Next Chat Start'));
  assert.ok(md.includes('**Constitution version:**') && md.includes('1.0.0'));
  assert.ok(md.includes('No Approved Canon'));
  assert.ok(md.includes('No Working Context'));
  assert.ok(md.includes('No active state'));
  assert.ok(md.includes('No open items'));
  assert.ok(md.includes('No active entries'));
});

test('includes constitution version in output', () => {
  const md = generateNextChatFromState(makeState({ constitution_version: '2.0.0' }));
  assert.ok(md.includes('2.0.0'));
});

test('includes approved canon entries', () => {
  const state = makeState({
    approved_canon: [
      { entry_id: 'ENTRY-CANON-001', summary: 'Canon summary.', decisions: ['Decision X.'] },
    ],
  });
  const md = generateNextChatFromState(state);
  assert.ok(md.includes('ENTRY-CANON-001'));
  assert.ok(md.includes('Canon summary.'));
  assert.ok(md.includes('Decision X.'));
});

test('labels working context separately from approved canon', () => {
  const state = makeState({
    approved_canon: [
      { entry_id: 'ENTRY-AC-001', summary: 'Approved summary.', decisions: [] },
    ],
    working_context: [
      { entry_id: 'ENTRY-WC-001', summary: 'Working summary.' },
    ],
  });
  const md = generateNextChatFromState(state);
  const canonPos = md.indexOf('## Approved Canon');
  const wcPos = md.indexOf('## Working Context');
  assert.ok(canonPos !== -1 && wcPos !== -1);
  assert.ok(canonPos < wcPos, 'Approved Canon section should appear before Working Context');
  assert.ok(md.includes('ENTRY-AC-001'));
  assert.ok(md.includes('ENTRY-WC-001'));
});

test('includes active state key-value pairs', () => {
  const md = generateNextChatFromState(
    makeState({ active_state: { phase: 'beta', status: 'active' } })
  );
  assert.ok(md.includes('phase'));
  assert.ok(md.includes('beta'));
  assert.ok(md.includes('status'));
  assert.ok(md.includes('active'));
});

test('includes open items', () => {
  const md = generateNextChatFromState(
    makeState({ open_items: ['Migrate DECISIONS.md', 'Configure branch protection'] })
  );
  assert.ok(md.includes('Migrate DECISIONS.md'));
  assert.ok(md.includes('Configure branch protection'));
});

test('includes source entry IDs', () => {
  const md = generateNextChatFromState(
    makeState({ source_entry_ids: ['ENTRY-ECO-001', 'ENTRY-ECO-002'] })
  );
  assert.ok(md.includes('ENTRY-ECO-001'));
  assert.ok(md.includes('ENTRY-ECO-002'));
});

test('output contains governance disclaimer', () => {
  const md = generateNextChatFromState(makeState());
  assert.ok(
    md.includes('governs') || md.includes('superseded'),
    'Output should state that it governs unless superseded'
  );
});

test('output is deterministic for identical input', () => {
  const state = makeState({
    working_context: [{ entry_id: 'ENTRY-WC-001', summary: 'A.' }],
    open_items: ['Item 1'],
  });
  const md1 = generateNextChatFromState(state);
  const md2 = generateNextChatFromState(state);
  assert.equal(md1, md2);
});
