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

**Approved Canon** requires an `approval` object with `approved_by_type: "human"`, a non-empty `approved_by_name`, and a non-empty `approved_by_account` identifying the individual human (Constitution principle 5). AI actors may not satisfy this requirement.

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

### Active-State Key Safety

Active entries in the same authority class must not claim the same `active_state` key. A same-authority collision is ambiguous and causes state generation to fail closed, even when both entries supply the same value. Resolve it by superseding the older entry or by using descriptive namespaced keys such as `benchmark_public_status` and `tr000_status` instead of a generic key such as `status`.

Cross-authority reuse is intentional and remains supported: Approved Canon may override a lower-authority Working Context value. This is an authority rule, not filename or input-order precedence.

## Deterministic Next-Chat Generation

`generate-next-chat.js` reads only a validated `CURRENT_STATE.json` and produces `NEXT_CHAT_START.md`. It identifies the applicable Constitution version, presents Approved Canon and Working Context separately, lists active state and open items, and records the source Record Entry IDs. It reads no entries directly and reads no chat history.

## Deterministic Agent Bootstrap

`agent-bootstrap.js` turns the validated repository state into a fail-closed session preflight. It always loads ecosystem context and optionally loads one or more explicitly named products. Before emitting a ready packet, it validates each state and profile, regenerates each `NEXT_CHAT_START.md` in memory, rejects any byte-level drift, and binds every loaded source by SHA-256.

The complete stdout packet is designed to be prepended to an AI task before the first substantive model turn. Root `AGENTS.md` makes this preflight mandatory for repository-aware agents. A host that does not execute repository instructions must integrate the command explicitly; The Record alone cannot force an unrelated AI client to ingest a file. See `docs/AGENT_BOOTSTRAP.md` for the host contract and boundaries.

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

# Check entry immutability against a base git ref (fail-closed: requires valid ref)
npm run check:immutability -- --base <ref>

# Build current state (ecosystem)
npm run build:state

# Build current state (product)
npm run build:state -- --product chatvaultai

# Generate next-chat context (ecosystem, validates CURRENT_STATE.json first)
npm run generate:next-chat

# Generate next-chat context (product, validates CURRENT_STATE.json first)
npm run generate:next-chat -- --product chatvaultai

# Emit a complete verified context packet for an agent session
npm run --silent bootstrap:agent -- --product chatvaultai

# Emit only the machine-readable bootstrap receipt
npm run --silent bootstrap:agent -- --product chatvaultai --json

# Fail-closed bootstrap integrity check used by CI
npm run check:agent-bootstrap

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
5. `npm run check:agent-bootstrap` — verify validated state can produce an exact, ready agent packet
6. Rebuild all derived files (`CURRENT_STATE.json`, `CURRENT_STATE.md`, `NEXT_CHAT_START.md`)
7. Detect generated-file drift — fail if committed derived files are stale or manually altered

On pull requests, CI additionally runs the fail-closed immutability check against the PR base commit. This fails the build if any merged entry file was modified, deleted, or renamed. **Missing or invalid base references also fail** (fail-closed design).

Branch protection must be configured separately in GitHub repository settings after the workflow exists (see "Required GitHub Branch Protection Settings" below).

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

---

## Review Vocabulary

### AI Verdicts

An AI reviewer (Bolt, Claude, or any other AI system) may return exactly one of these verdicts:

| Verdict | Meaning |
|---------|---------|
| **RECOMMEND** | AI finds no issues. Recommends human approval. |
| **RECOMMEND WITH ITEMS** | AI finds non-blocking observations. Recommends approval after human review of listed items. |
| **BLOCK** | AI identifies a defect, inconsistency, or Constitution violation. Requests correction before further review. |

APPROVE is not an AI verdict. AI systems must never use the word APPROVE as a verdict or status.

### Human Authority

- Only Dan may APPROVE.
- Only Dan may authorize a merge.

An AI verdict of RECOMMEND is a non-binding assessment. It does not constitute approval and does not authorize any merge action.

### Inventory Verification

File counts, changed-path counts, and content inventories reported by an AI builder or reviewer are claims, not evidence. Per Constitution principle 9, git evidence outranks AI confidence: any inventory claim must be verified against `git diff --stat`, the GitHub changed-files view, or a direct file-system count of the actual artifact before it is relied upon in a review or recorded in an entry. A discrepancy between a builder's reported inventory and git's reported inventory is resolved in git's favor and noted in the review.

---

## Required GitHub Branch Protection Settings

After the CI workflow exists and tests pass, configure the following branch protection rules on `main` in GitHub repository settings. These must be configured by a repository administrator (Dan).

### Branch protection for `main`:

| Setting | Value | Rationale |
|---------|-------|-----------|
| Require a pull request before merging | Enabled | No direct pushes to main |
| Required number of approving reviews | 0 in the current single-account setup | GitHub does not allow a pull-request author to approve their own pull request; Dan's deliberate merge is the human approval act |
| Dismiss stale pull request approvals | Enable only after a separate authorized reviewer account exists | Re-review is meaningful only when author and reviewer are different accounts |
| Require review from code owners | Disable in the current single-account setup | Requiring Dan to review a pull request authored by Dan would deadlock the merge |
| Require status checks to pass before merging | Enabled | CI must pass |
| Required status checks | `Validate Record` job | Ensures schemas, tests, supersession, and immutability checks pass |
| Require branches to be up to date before merging | Enabled | Prevents stale-branch merge conflicts |
| Include administrators | Enabled | Even admins must follow the process |
| Restrict who can push to matching branches | Only Dan's account | No automated merge tools |
| Allow force pushes | Disabled | Immutability guarantee |
| Allow deletions | Disabled | Immutability guarantee |

### CODEOWNERS (future multi-account configuration):

Create `.github/CODEOWNERS`:
```
* @daytona3dan-coder
```

Enable this only when pull requests are authored through a separate authorized human or service account. GitHub does not permit pull-request authors to approve their own pull requests. In the current single-account configuration, Dan's deliberate merge after successful CI and recorded independent review is the approval act.

### Enforcement caveat — repository visibility:

GitHub documents protected branches as available for public repositories on GitHub Free and for public or private repositories on GitHub Pro, Team, and Enterprise plans. Before relying on these settings for this private repository, verify that the account plan supports enforcement. Do not make the repository public automatically; visibility or plan changes belong to Dan.

### Why these settings matter:

- **Constitution Principle 3**: Nothing becomes Approved Canon automatically. Branch protection ensures every merge is a deliberate human action.
- **Constitution Principle 4**: AI systems cannot approve. Branch protection restricts approval to human GitHub accounts.
- **Constitution Principle 6**: Entries are immutable after merge. Force-push and deletion protections enforce this at the repository level.
- **CI immutability check**: The diff-aware `check-entry-immutability.js` enforces immutability at the file level within PRs.

---

## Deterministic Output Guarantee

All derived files (`CURRENT_STATE.json`, `CURRENT_STATE.md`, `NEXT_CHAT_START.md`) are generated deterministically:

- `generated_at` is derived from the maximum `created_at` timestamp of active entries (epoch `1970-01-01T00:00:00.000Z` when no entries exist)
- JSON keys are sorted alphabetically at every depth
- Arrays maintain stable ordering (by entry_id or insertion order from sorted filenames)
- No wall-clock time, randomness, or environment-dependent values

CI verifies this: it regenerates all derived files and fails if committed versions differ.
