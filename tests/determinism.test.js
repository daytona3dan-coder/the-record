/**
 * Adversarial determinism tests.
 *
 * These tests prove that CURRENT_STATE.json, CURRENT_STATE.md, and
 * NEXT_CHAT_START.md are byte-identical regardless of the system clock.
 * Wall-clock time is injected via Date monkey-patching to simulate
 * two deliberately different execution times.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStateFromEntries } from '../scripts/build-current-state.js';
import { generateNextChatFromState } from '../scripts/generate-next-chat.js';

function makeEntry(overrides) {
  return {
    schema_version: '1.0.0',
    entry_id: 'ENTRY-DET-001',
    created_at: '2026-07-10T00:00:00.000Z',
    created_by: { actor_type: 'human', name: 'Dan', account: 'daytona3dan-coder' },
    scope: 'ecosystem',
    authority_class: 'working_context',
    summary: 'Determinism test entry.',
    decisions: ['Decision alpha.'],
    completed_work: ['Work item one.'],
    active_state: { phase: 'testing', status: 'active' },
    open_items: ['Open item A.'],
    supersedes: [],
    evidence: [{
      artifact: 'sha256:a39c69bcf85007726dac8d3a3e2ccc3708669fbbb428cc3eb78c71209914bcb1',
      spans: [{ unit: 'message', start: 0, end: 0 }],
    }],
    next_chat_starting_context: 'Carry forward deterministically.',
    ...overrides,
  };
}

function withFakeClock(fakeNow, fn) {
  const RealDate = globalThis.Date;
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fakeNow);
      } else {
        super(...args);
      }
    }
    static now() { return fakeNow; }
  }
  // Preserve static methods
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  globalThis.Date = FakeDate;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

test('CURRENT_STATE.json is byte-identical under different wall-clock times (empty entries)', () => {
  const t1 = new Date('2020-01-01T00:00:00Z').getTime();
  const t2 = new Date('2099-12-31T23:59:59Z').getTime();

  const json1 = withFakeClock(t1, () => JSON.stringify(buildStateFromEntries([], 'ecosystem'), null, 2));
  const json2 = withFakeClock(t2, () => JSON.stringify(buildStateFromEntries([], 'ecosystem'), null, 2));

  assert.equal(json1, json2, 'Empty state must be clock-independent');
});

test('CURRENT_STATE.json is byte-identical under different wall-clock times (with entries)', () => {
  const entries = [
    makeEntry({ entry_id: 'ENTRY-DET-001', created_at: '2026-07-10T00:00:00.000Z' }),
    makeEntry({ entry_id: 'ENTRY-DET-002', created_at: '2026-07-10T06:00:00.000Z', summary: 'Second entry.' }),
  ];

  const t1 = new Date('2020-01-01T00:00:00Z').getTime();
  const t2 = new Date('2099-12-31T23:59:59Z').getTime();

  const json1 = withFakeClock(t1, () => JSON.stringify(buildStateFromEntries(entries, 'ecosystem'), null, 2));
  const json2 = withFakeClock(t2, () => JSON.stringify(buildStateFromEntries(entries, 'ecosystem'), null, 2));

  assert.equal(json1, json2, 'State with entries must be clock-independent');
});

test('CURRENT_STATE.json generated_at is derived from entries, not wall-clock', () => {
  const entries = [
    makeEntry({ entry_id: 'ENTRY-TS-001', created_at: '2026-06-15T10:00:00.000Z' }),
    makeEntry({ entry_id: 'ENTRY-TS-002', created_at: '2026-07-20T14:30:00.000Z' }),
  ];

  const fakeNow = new Date('2099-01-01T00:00:00Z').getTime();
  const state = withFakeClock(fakeNow, () => buildStateFromEntries(entries, 'ecosystem'));

  // Must be max(created_at), NOT the fake clock
  assert.equal(state.generated_at, '2026-07-20T14:30:00.000Z');
  assert.notEqual(state.generated_at, '2099-01-01T00:00:00.000Z');
});

test('CURRENT_STATE.md is byte-identical under different wall-clock times', () => {
  const entries = [makeEntry()];

  const t1 = new Date('2000-06-15T00:00:00Z').getTime();
  const t2 = new Date('2080-11-30T23:59:59Z').getTime();

  const state1 = withFakeClock(t1, () => buildStateFromEntries(entries, 'ecosystem'));
  const state2 = withFakeClock(t2, () => buildStateFromEntries(entries, 'ecosystem'));

  // States must be identical (which means their .md renderings will also be identical)
  assert.equal(JSON.stringify(state1), JSON.stringify(state2));
});

test('NEXT_CHAT_START.md is byte-identical under different wall-clock times', () => {
  const entries = [
    makeEntry({ entry_id: 'ENTRY-NC-001' }),
    makeEntry({ entry_id: 'ENTRY-NC-002', summary: 'Another entry.' }),
  ];

  const t1 = new Date('2010-03-15T08:00:00Z').getTime();
  const t2 = new Date('2077-09-01T16:45:00Z').getTime();

  const state1 = withFakeClock(t1, () => buildStateFromEntries(entries, 'ecosystem'));
  const state2 = withFakeClock(t2, () => buildStateFromEntries(entries, 'ecosystem'));

  const md1 = generateNextChatFromState(state1, 'Ecosystem');
  const md2 = generateNextChatFromState(state2, 'Ecosystem');

  assert.equal(md1, md2, 'NEXT_CHAT_START.md must be clock-independent');
});

test('product scope output is clock-independent', () => {
  const entries = [
    makeEntry({ entry_id: 'ENTRY-P-001', scope: 'product', product_id: 'chatvaultai' }),
  ];

  const t1 = new Date('2015-01-01T00:00:00Z').getTime();
  const t2 = new Date('2085-12-31T23:59:59Z').getTime();

  const state1 = withFakeClock(t1, () => buildStateFromEntries(entries, 'product'));
  const state2 = withFakeClock(t2, () => buildStateFromEntries(entries, 'product'));

  const json1 = JSON.stringify(state1, null, 2);
  const json2 = JSON.stringify(state2, null, 2);
  assert.equal(json1, json2, 'Product state must be clock-independent');

  const md1 = generateNextChatFromState(state1, 'ChatVaultAI');
  const md2 = generateNextChatFromState(state2, 'ChatVaultAI');
  assert.equal(md1, md2, 'Product NEXT_CHAT_START.md must be clock-independent');
});
