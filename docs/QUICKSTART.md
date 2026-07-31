# The Record Quickstart

This guide proves the complete local lifecycle without changing the canonical repository:

1. clone the public repository;
2. validate its committed state;
3. create a Working Context entry;
4. supersede it with a second entry;
5. rebuild deterministic state; and
6. observe a readable fail-closed rejection.

Perform the exercise on a local branch. Do not commit the disposable example entries.

## 1. Clone and Install

Requirements:

- Git
- Node.js 22 or newer
- npm

```sh
git clone https://github.com/daytona3dan-coder/the-record.git
cd the-record
git switch -c local/record-quickstart
npm ci
```

## 2. Verify the Public Record

```sh
npm test
npm run validate:record
npm run check:supersession
npm run check:agent-bootstrap
```

Every command should exit successfully. A bootstrap check must end with:

```text
Agent bootstrap verified for scopes: ecosystem, chatvaultai.
```

## 3. Create a Working Context Entry

Copy `templates/record-entry-template.json` to:

```text
ecosystem/entries/ENTRY-ECO-EXAMPLE-001.json
```

Replace the template contents with:

```json
{
  "schema_version": "1.0.0",
  "entry_id": "ENTRY-ECO-EXAMPLE-001",
  "created_at": "2026-01-01T00:00:00.000Z",
  "created_by": {
    "actor_type": "human",
    "name": "Local Quickstart",
    "account": "local-example"
  },
  "scope": "ecosystem",
  "authority_class": "working_context",
  "summary": "First disposable Quickstart entry.",
  "decisions": [],
  "completed_work": [
    "Created a schema-valid Working Context entry."
  ],
  "active_state": {
    "quickstart_example_status": "first-entry-active"
  },
  "open_items": [
    "Supersede this entry."
  ],
  "supersedes": [],
  "evidence": [],
  "next_chat_starting_context": "Continue by superseding ENTRY-ECO-EXAMPLE-001."
}
```

Use a unique entry ID and a descriptive, namespaced `active_state` key in real work. Generic keys such as `status` are more likely to collide with another active entry.

Validate the entry:

```sh
npm run validate:record
npm run check:supersession
npm run build:state
npm run generate:next-chat
```

The new entry ID and `quickstart_example_status` should now appear in `ecosystem/CURRENT_STATE.json`.

## 4. Supersede the Entry

Do not edit or delete the first entry. Create:

```text
ecosystem/entries/ENTRY-ECO-EXAMPLE-002.json
```

with:

```json
{
  "schema_version": "1.0.0",
  "entry_id": "ENTRY-ECO-EXAMPLE-002",
  "created_at": "2026-01-01T00:01:00.000Z",
  "created_by": {
    "actor_type": "human",
    "name": "Local Quickstart",
    "account": "local-example"
  },
  "scope": "ecosystem",
  "authority_class": "working_context",
  "summary": "Second disposable Quickstart entry, superseding the first.",
  "decisions": [],
  "completed_work": [
    "Superseded the first Quickstart entry."
  ],
  "active_state": {
    "quickstart_example_status": "supersession-proven"
  },
  "open_items": [],
  "supersedes": [
    "ENTRY-ECO-EXAMPLE-001"
  ],
  "evidence": [],
  "next_chat_starting_context": "The local Quickstart supersession exercise is complete."
}
```

Run:

```sh
npm run validate:record
npm run check:supersession
npm run build:state
npm run generate:next-chat
```

The derived ecosystem state should now show:

- `ENTRY-ECO-EXAMPLE-001` absent from `source_entry_ids`;
- `ENTRY-ECO-EXAMPLE-002` present in `source_entry_ids`; and
- `quickstart_example_status` equal to `supersession-proven`.

Both entry files remain present. Supersession changes active meaning without erasing history.

## 5. Observe Fail-Closed Behavior

On the local branch, temporarily remove the `summary` property from the second entry and run:

```sh
npm run validate:record
```

Validation must exit nonzero and identify the file and missing required property. Restore `summary` before continuing.

To exercise active-state ambiguity, temporarily remove the second entry's `supersedes` target and run:

```sh
npm run build:state
```

State generation must exit nonzero, identify both entries claiming `quickstart_example_status`, and instruct you to use a namespaced key or supersede the older entry. Restore the `supersedes` target.

## 6. Return to the Committed Record

Because the example also regenerated derived files, preserve the disposable work in a recoverable stash before returning to the clean public branch:

```sh
git stash push --include-untracked -m "Disposable Record Quickstart"
git switch main
git branch -D local/record-quickstart
git status --short
```

The final status output should be empty. The canonical repository remains unchanged, and the disposable exercise remains recoverable through `git stash list`.

## Register a Real Product

To create a new product scaffold:

```sh
npm run record:create-product -- example-product "Example Product"
```

This creates a product profile, empty entries directory, deterministic state files, and next-session context under `products/example-product/`.

Product IDs must be lowercase alphanumeric text with optional internal hyphens. Product-scoped entries must include the matching `product_id`.

## Before Proposing Real Work

Run the complete local gate:

```sh
npm test
npm run validate:record
npm run check:supersession
npm run check:evidence-references
npm run check:agent-bootstrap
npm run check:immutability -- --base origin/main
```

Then rebuild all affected derived files and inspect `git diff`. Never modify, rename, or delete a merged Record Entry; correct it through a new superseding entry.
