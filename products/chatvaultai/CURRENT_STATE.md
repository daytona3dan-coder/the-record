# Current State — chatvaultai

Generated: 2026-07-10T18:54:58.000Z
Constitution: v1.0.0
Scope: product

## Approved Canon
- **ENTRY-PRD-CVA-001**: Dan adopted paired JSON sidecars, rather than embedded Markdown envelopes, as the governing ChatVaultAI Markdown export design effective July 10, 2026.

## Working Context
_No working context entries._

## Active State
- **markdown_capture_role**: derived-human-readable-working-context
- **markdown_envelope_embedding**: prohibited
- **paired_export_naming**: shared-capture-identifier-and-stem
- **structured_capture_role**: canonical-hash-verifiable-sidecar

## Open Items
- Implement the shared capture identifier and filename stem across new ChatVaultAI paired exports.
- Add tests proving paired naming, missing-sidecar handling, invalid-sidecar handling, and the prohibition on retroactive verification stamping.
- Document deliberate regeneration behavior without silently rewriting existing captures.

## Source Entry IDs
- ENTRY-PRD-CVA-001
