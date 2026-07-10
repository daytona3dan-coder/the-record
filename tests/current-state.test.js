import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStateFromEntries } from '../scripts/build-current-state.js';

function makeEntry(overrides) {
  return {
    schema_version: '1.0.0',
    entry_id: 'ENTRY-TEST-001',
    created_at: '2026-07-10T00:00:00.000Z',
    created_by: { actor_type: 'human', name: 'Dan' },
    scope: 'ecosystem',
    authority_class: 'working_context',
    summary: 'Test entry.',
    decisions: [],
    completed_work: [],
    active_state: {},
    open_items: [],
    supersedes: [],
    evidence: [],
    next_chat_starting_context: 'Test context.',
    ...overrides,
  };
}

test('empty entry list produces empty state', () => {
  const state = buildStateFromEntries([]);
  assert.equal(state.approved_canon.length, 0);
  assert.equal(state.working_context.length, 0);
  assert.equal(state.open_items.length, 0);
  assert.equal(state.source_entry_ids.length, 0);
  assert.deepEqual(state.active_state, {});
});

test('working_context entry appears in working_context output', () => {
  const entry = makeEntry({ authority_class: 'working_context', summary: 'WC summary.' });
  const state = buildStateFromEntries([entry]);
  assert.equal(state.working_context.length, 1);
  assert.equal(state.working_context[0].entry_id, 'ENTRY-TEST-001');
  assert.equal(state.working_context[0].summary, 'WC summary.');
  assert.equal(state.approved_canon.length, 0);
});

test('superseded entry is excluded from active state', () => {
  const older = makeEntry({ entry_id: 'ENTRY-OLD-001', summary: 'Old entry.' });
  const newer = makeEntry({
    entry_id: 'ENTRY-NEW-001',
    summary: 'New entry.',
    supersedes: ['ENTRY-OLD-001'],
  });
  const state = buildStateFromEntries([older, newer]);
  assert.equal(state.working_context.length, 1);
  assert.equal(state.working_context[0].entry_id, 'ENTRY-NEW-001');
  assert.equal(state.source_entry_ids.length, 1);
  assert.equal(state.source_entry_ids[0], 'ENTRY-NEW-001');
});

test('approved_canon entry appears in approved_canon output', () => {
  const entry = makeEntry({
    authority_class: 'approved_canon',
    decisions: ['Decision A.'],
    approval: {
      approved_by_type: 'human',
      approved_by_name: 'Dan',
      approved_at: '2026-07-10T00:00:00.000Z',
    },
  });
  const state = buildStateFromEntries([entry]);
  assert.equal(state.approved_canon.length, 1);
  assert.equal(state.approved_canon[0].entry_id, 'ENTRY-TEST-001');
  assert.equal(state.working_context.length, 0);
});

test('active_state is merged from all active entries', () => {
  const e1 = makeEntry({ entry_id: 'ENTRY-S-001', active_state: { phase: 'alpha', status: 'active' } });
  const e2 = makeEntry({ entry_id: 'ENTRY-S-002', active_state: { status: 'paused', track: 'main' } });
  const state = buildStateFromEntries([e1, e2]);
  assert.equal(state.active_state.phase, 'alpha');
  assert.equal(state.active_state.status, 'paused'); // e2 overwrites
  assert.equal(state.active_state.track, 'main');
});

test('open_items are aggregated from all active entries', () => {
  const e1 = makeEntry({ entry_id: 'ENTRY-OI-001', open_items: ['Item A', 'Item B'] });
  const e2 = makeEntry({ entry_id: 'ENTRY-OI-002', open_items: ['Item C'] });
  const state = buildStateFromEntries([e1, e2]);
  assert.equal(state.open_items.length, 3);
  assert.ok(state.open_items.includes('Item A'));
  assert.ok(state.open_items.includes('Item C'));
});

test('output keys are sorted deterministically', () => {
  const entry = makeEntry();
  const state = buildStateFromEntries([entry]);
  const keys = Object.keys(state);
  const sorted = [...keys].sort();
  assert.deepEqual(keys, sorted, 'Top-level keys should be sorted');
});

test('throws on supersession errors', () => {
  const cycleA = makeEntry({ entry_id: 'ENTRY-CA-001', supersedes: ['ENTRY-CB-001'] });
  const cycleB = makeEntry({ entry_id: 'ENTRY-CB-001', supersedes: ['ENTRY-CA-001'] });
  assert.throws(() => buildStateFromEntries([cycleA, cycleB]), /supersession/i);
});
