# The Record

**The Record** is a repository-backed continuity and governance system for the MAXAI ecosystem. It preserves governing decisions, current operational state, and historical context as structured, append-only JSON entries committed directly to this repository. The repository is the source of truth.

---

## What The Record Is

- A structured store of governing decisions and state snapshots
- An append-only history with explicit supersession
- A deterministic generator of current-state summaries and next-chat context
- A governed boundary between Working Context and Approved Canon
- A reference system for evidence artifacts stored in external source systems

## What The Record Is Not

- A website or user interface
- A database or query engine
- A task execution ledger or replay log
- A storage system for raw chat transcripts or vault contents
- An AI feature or autonomous agent
- A substitute for ChatVaultAI, GitHub, or other source systems

---

## Repository Boundaries

The Record does not connect to, read from, or modify any product repository. Product profiles contain repository references for human traceability only. Scripts that operate on product data work only within the `products/` directory of this repository.

---

## Authority Classes

| Class | Meaning |
|-------|---------|
| `source_evidence` | Captured primary artifact; highest authority |
| `derived_summary` | AI- or human-authored summary of source evidence |
| `working_context` | Operational context; valid but not governing |
| `approved_canon` | Explicitly human-approved governing record |
| `superseded` | Formerly active entry, preserved but excluded from current state |

**Approved Canon** requires an `approval` object with `approved_by_type: "human"`. AI actors may not satisfy this requirement.

---

## Append-Only and Supersession

Record Entries are immutable after merge. A newer entry supersedes older entries by listing their IDs in its `supersedes` array. Superseded entries remain in the repository and in history. The `check-supersession.js` script derives `superseded_by` relationships at runtime — it is never written back into entry files.

---

## Evidence References

Evidence is optional. When supplied, each evidence item must include an `artifact` field containing a SHA-256 hash of the form `sha256:<64 lowercase hex characters>`. Optional `spans` identify sub-ranges within the artifact using `unit` (message, line, or byte), `start`, and `end`.

Evidence artifacts remain in their source systems (ChatVaultAI, GitHub, etc.). The Record holds the hash references only.

---

## Deterministic Current-State Generation

`build-current-state.js` reads all entries in an `entries/` directory, applies the supersession graph to exclude superseded entries, separates Approved Canon from Working Context, and writes a stable, key-sorted `CURRENT_STATE.json` and a human-readable `CURRENT_STATE.md`. It uses no AI and reads no conversation history.

## Deterministic Next-Chat Generation

`generate-next-chat.js` reads only a validated `CURRENT_STATE.json` and produces `NEXT_CHAT_START.md`. It identifies the applicable Constitution version, presents Approved Canon and Working Context separately, lists active state and open items, and records the source Record Entry IDs. It reads no entries directly and reads no chat history.

---

## Local Commands

```sh
# Install dependencies
npm install

# Run the test suite
npm test

# Validate all schemas, entries, and state files
npm run validate:record

# Check supersession integrity
npm run check:supersession

# Check entry immutability against a base git ref
npm run check:immutability -- --base <ref>

# Build current state (ecosystem)
npm run build:state

# Build current state (product)
npm run build:state -- --product chatvaultai

# Generate next-chat context (ecosystem)
npm run generate:next-chat

# Generate next-chat context (product)
npm run generate:next-chat -- --product chatvaultai

# Create a new product record
npm run record:create-product -- <product_id> "<Display Name>"
```

---

## CI Behavior

CI runs on pull requests and pushes to `main` (see `.github/workflows/record-ci.yml`):

1. `npm ci` — install locked dependencies
2. `npm test` — run the full test suite
3. `npm run validate:record` — validate all schemas, entries, and state files
4. `npm run check:supersession` — validate supersession graph integrity

On pull requests, CI additionally runs the diff-aware immutability check against the PR base commit. This fails the build if any merged entry file was modified, deleted, or renamed.

Branch protection must be configured separately in GitHub repository settings after the workflow exists.

---

## Product Creation

To register a new product:

```sh
npm run record:create-product -- <product_id> "<Display Name>"
```

This creates `products/<product_id>/` with a `PRODUCT_PROFILE.json`, empty `CURRENT_STATE.json`, `CURRENT_STATE.md`, `NEXT_CHAT_START.md`, and `entries/` directory. Product IDs must be lowercase alphanumeric with hyphens. The command rejects duplicates, invalid IDs, and missing display names.

---

## Migration Posture

Existing `DECISIONS.md` and `STATE.md` content from other repositories or documents must be migrated through explicitly authored Record Entries with traceable `evidence` references. Silent import or copy-without-provenance is prohibited by the Constitution.

---

## Bolt's Role

Bolt is a proposer, not an approver. Bolt may author Record Entries with authority class `working_context` or `derived_summary`. Bolt may never satisfy the `approved_by_type: "human"` requirement. Every Approved Canon entry requires a human approval act recorded in its `approval` object.
