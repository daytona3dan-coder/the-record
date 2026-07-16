# Deterministic Agent Bootstrap

`THE-RECORD-AGENT-BOOTSTRAP-1` is the repository-native handoff contract between The Record and an AI session.

## Purpose

The existing `NEXT_CHAT_START.md` files are deterministic, but a generated file cannot make an AI client read it. The bootstrap command closes the repository side of that gap: it validates the requested state, proves that each `NEXT_CHAT_START.md` exactly matches its validated `CURRENT_STATE.json`, binds every loaded file by SHA-256, and emits the complete context packet to standard output.

## Commands

```sh
# Ecosystem context
npm run --silent bootstrap:agent

# Ecosystem plus ChatVaultAI context
npm run --silent bootstrap:agent -- --product chatvaultai

# Load more than one product, in deterministic product-id order
npm run --silent bootstrap:agent -- --product chatvaultai --product another-product

# Machine-readable receipt only
npm run --silent bootstrap:agent -- --product chatvaultai --json

# Integrity check for CI or a host preflight
npm run check:agent-bootstrap
```

Every run loads the ecosystem. Requested product IDs are deduplicated, validated against the repository naming rule, and sorted.

## Fail-closed checks

Bootstrap refuses to emit a ready packet when:

- the Constitution, a profile, current state, or next-chat file is missing;
- a JSON source cannot be parsed or fails its governing schema;
- a product identifier is unsafe or ambiguous;
- a requested product is not registered;
- a requested product's directory, profile product ID, and current-state product ID do not agree; or
- committed next-chat content differs by even one byte from deterministic regeneration of its current state.

The receipt contains no wall-clock timestamp or random value. Identical repository bytes and scope selection produce identical output.

## Host integration contract

An AI host integrates The Record by performing these steps before its first substantive model turn:

1. Check out the intended repository commit.
2. Run `npm ci` when dependencies are not installed.
3. Execute `npm run --silent bootstrap:agent -- [requested products]`.
4. Stop if the command exits nonzero.
5. Prepend the complete stdout packet to the user's task before requesting model reasoning.
6. Preserve the bootstrap receipt with the session evidence.

Repository-aware coding agents are also directed by the root `AGENTS.md` contract.

## Boundary

This implementation makes the repository source deterministic and enforceable by a cooperating host. It does not alter ChatVaultAI or any other product repository, connect a third-party model, create platform memory, or claim that every AI client automatically executes repository instructions. A separate, explicitly authorized host or product integration is required to invoke the command and inject its stdout automatically.

The receipt establishes loaded-file identity and generated-context integrity. It does not establish that the underlying Record is factually complete or up to date; gaps must be handled through new governed Record Entries.
