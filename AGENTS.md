# The Record Agent Contract

This repository governs continuity. Any AI or coding agent operating in this repository must load repository-backed state before substantive analysis, claims, planning, or writes.

## Mandatory session bootstrap

1. Install locked dependencies with `npm ci` if they are not already present.
2. For ecosystem-only work, run `npm run --silent bootstrap:agent`.
3. For product work, run `npm run --silent bootstrap:agent -- --product <product-id>`. Repeat `--product` for every product in scope.
4. Ingest the complete successful stdout as the opening session context. Do not rely on chat history or model memory as a substitute.
5. If bootstrap exits nonzero, stop. Report the exact error and do not proceed from stale, missing, invalid, or manually altered context.

The default scope always includes the ecosystem. A product is loaded only when named explicitly.

## Authority and write rules

- `CONSTITUTION.md` governs this repository.
- Source evidence outranks derived summaries. Approved Canon governs Working Context.
- A bootstrap receipt proves the identity and integrity of loaded repository files. It does not prove that the Record is complete or current.
- If a material fact is absent, report the gap. Do not fill it from model memory or silently reinterpret earlier chat.
- A new user statement may support a proposed Record Entry. It does not become Approved Canon automatically.
- Record entries already merged are immutable. Change active state through a new superseding entry.
- AI verdicts are limited to `RECOMMEND`, `RECOMMEND WITH ITEMS`, or `BLOCK`.
- Only Dan Demarest may approve, ratify, authorize a merge, or perform the merge.
- Bootstrap is a context-loading mechanism. It grants no implementation, signing, deployment, release, or ceremony authorization.
