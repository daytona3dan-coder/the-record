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

test('empty entry list produces empty state with deterministic epoch timestamp', () => {
  const state = buildStateFromEntries([], 'ecosystem');
  assert.equal(state.scope, 'ecosystem');
  assert.equal(state.generated_at, '1970-01-01T00:00:00.000Z');
  assert.equal(state.approved_canon.length, 0);
  assert.equal(state.working_context.length, 0);
  assert.equal(state.open_items.length, 0);
  assert.equal(state.source_entry_ids.length, 0);
  assert.equal(state.next_chat_contexts.length, 0);
  assert.deepEqual(state.active_state, {});
});

test('working_context entry appears in working_context output', () => {
  const entry = makeEntry({ authority_class: 'working_context', summary: 'WC summary.' });
  const state = buildStateFromEntries([entry], 'ecosystem');
  assert.equal(state.working_context.length, 1);
  assert.equal(state.working_context[0].entry_id, 'ENTRY-TEST-001');
  assert.equal(state.working_context[0].summary, 'WC summary.');
  assert.equal(state.approved_canon.length, 0);
});

test('superseded entry is excluded from active state', () => {
  const older = makeEntry({ entry_id: 'ENTRY-OLD-001', summary: 'Old.' });
  const newer = makeEntry({ entry_id: 'ENTRY-NEW-001', summary: 'New.', supersedes: ['ENTRY-OLD-001'] });
  const state = buildStateFromEntries([older, newer], 'ecosystem');
  assert.equal(state.working_context.length, 1);
  assert.equal(state.working_context[0].entry_id, 'ENTRY-NEW-001');
  assert.equal(state.source_entry_ids.length, 1);
});

test('approved_canon entry appears in approved_canon output', () => {
  const entry = makeEntry({
    authority_class: 'approved_canon',
    decisions: ['Decision A.'],
    approval: { approved_by_type: 'human', approved_by_name: 'Dan', approved_at: '2026-07-10T00:00:00.000Z' },
  });
  const state = buildStateFromEntries([entry], 'ecosystem');
  assert.equal(state.approved_canon.length, 1);
  assert.equal(state.approved_canon[0].entry_id, 'ENTRY-TEST-001');
  assert.equal(state.working_context.length, 0);
});

test('authority separation: approved_canon active_state wins over working_context', () => {
  const wc = makeEntry({
    entry_id: 'ENTRY-WC-001',
    authority_class: 'working_context',
    active_state: { phase: 'alpha', status: 'draft' },
  });
  const canon = makeEntry({
    entry_id: 'ENTRY-AC-001',
    authority_class: 'approved_canon',
    active_state: { phase: 'beta' },
    approval: { approved_by_type: 'human', approved_by_name: 'Dan', approved_at: '2026-07-10T00:00:00.000Z' },
  });
  const state = buildStateFromEntries([wc, canon], 'ecosystem');
  // Approved Canon (rank 3) overwrites Working Context (rank 0) for 'phase'
  assert.equal(state.active_state.phase, 'beta');
  // 'status' only from WC, no conflict
  assert.equal(state.active_state.status, 'draft');
});

test('open_items are aggregated from all active entries', () => {
  const e1 = makeEntry({ entry_id: 'ENTRY-OI-001', open_items: ['Item A', 'Item B'] });
  const e2 = makeEntry({ entry_id: 'ENTRY-OI-002', open_items: ['Item C'] });
  const state = buildStateFromEntries([e1, e2], 'ecosystem');
  assert.equal(state.open_items.length, 3);
  assert.ok(state.open_items.includes('Item A'));
  assert.ok(state.open_items.includes('Item C'));
});

test('output keys are sorted deterministically', () => {
  const entry = makeEntry();
  const state = buildStateFromEntries([entry], 'ecosystem');
  const keys = Object.keys(state);
  const sorted = [...keys].sort();
  assert.deepEqual(keys, sorted);
});

test('throws on supersession errors', () => {
  const cycleA = makeEntry({ entry_id: 'ENTRY-CA-001', supersedes: ['ENTRY-CB-001'] });
  const cycleB = makeEntry({ entry_id: 'ENTRY-CB-001', supersedes: ['ENTRY-CA-001'] });
  assert.throws(() => buildStateFromEntries([cycleA, cycleB], 'ecosystem'), /supersession/i);
});

test('generated_at is derived from max created_at of entries, not wall-clock', () => {
  const e1 = makeEntry({ entry_id: 'ENTRY-TS-001', created_at: '2026-06-01T00:00:00.000Z' });
  const e2 = makeEntry({ entry_id: 'ENTRY-TS-002', created_at: '2026-07-15T12:00:00.000Z' });
  const state = buildStateFromEntries([e1, e2], 'ecosystem');
  assert.equal(state.generated_at, '2026-07-15T12:00:00.000Z');
});

test('deterministic: same inputs produce identical output', () => {
  const entries = [
    makeEntry({ entry_id: 'ENTRY-DET-001', created_at: '2026-07-10T00:00:00.000Z' }),
    makeEntry({ entry_id: 'ENTRY-DET-002', created_at: '2026-07-10T01:00:00.000Z' }),
  ];
  const state1 = buildStateFromEntries(entries, 'ecosystem');
  const state2 = buildStateFromEntries(entries, 'ecosystem');
  assert.equal(JSON.stringify(state1), JSON.stringify(state2));
});

test('preserves next_chat_starting_context in next_chat_contexts', () => {
  const entry = makeEntry({ next_chat_starting_context: 'Carry this forward.' });
  const state = buildStateFromEntries([entry], 'ecosystem');
  assert.equal(state.next_chat_contexts.length, 1);
  assert.equal(state.next_chat_contexts[0].entry_id, 'ENTRY-TEST-001');
  assert.equal(state.next_chat_contexts[0].context, 'Carry this forward.');
});

test('scope parameter is honored regardless of entry scope', () => {
  const entry = makeEntry({ scope: 'product', product_id: 'foo' });
  const state = buildStateFromEntries([entry], 'product');
  assert.equal(state.scope, 'product');
});
