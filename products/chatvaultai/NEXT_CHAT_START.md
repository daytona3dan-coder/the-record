# Next Chat Start — chatvaultai

> This document governs the opening context of the next conversation for this scope.
> It is generated deterministically from `CURRENT_STATE.json` and must not be edited by hand.
> It governs unless explicitly superseded by a new Record Entry.

---

**Constitution version:** 1.0.0
**Generated from:** `CURRENT_STATE.json` (scope: product)
**Generated at:** 2026-07-10T18:54:58.000Z

---

## Approved Canon

The following decisions are Approved Canon and govern this scope:

### ENTRY-PRD-CVA-001

Dan adopted paired JSON sidecars, rather than embedded Markdown envelopes, as the governing ChatVaultAI Markdown export design effective July 10, 2026.

**Decisions:**
- ChatVaultAI Markdown exports use a paired JSON sidecar rather than embedding the evidence envelope inside the Markdown file.
- A single capture event produces <capture-stem>.md and <capture-stem>.chatvault.json using one shared capture identifier and filename stem.
- The Markdown file is derived, human-readable Working Context and is not a self-verifying source-proof object.
- The .chatvault.json sidecar is the canonical structured, hash-verifiable capture artifact; verification applies to that JSON artifact and its governed envelope.
- A Markdown file without a corresponding valid sidecar remains unverifiable or pre-v1 and must never be retroactively stamped as verified.
- The envelope is not embedded in a Markdown fenced block, avoiding edit drift, duplicated serialization rules, and decorative verification claims.
- Existing captures are not silently rewritten; the shared-stem requirement governs new or deliberately regenerated paired exports.


---

## Working Context

_Working Context informs but does not govern. It may be superseded without a new canon approval._

_No Working Context entries._

---

## Active State

- **markdown_capture_role**: derived-human-readable-working-context
- **markdown_envelope_embedding**: prohibited
- **paired_export_naming**: shared-capture-identifier-and-stem
- **structured_capture_role**: canonical-hash-verifiable-sidecar

---

## Open Items

- Implement the shared capture identifier and filename stem across new ChatVaultAI paired exports.
- Add tests proving paired naming, missing-sidecar handling, invalid-sidecar handling, and the prohibition on retroactive verification stamping.
- Document deliberate regeneration behavior without silently rewriting existing captures.

---

## Carried Context

### From ENTRY-PRD-CVA-001

Approved ChatVaultAI canon: paired exports use one shared capture identifier and stem for <capture-stem>.md and <capture-stem>.chatvault.json. Markdown is derived Working Context, JSON is the canonical hash-verifiable artifact, envelopes are not embedded in Markdown, missing sidecars remain unverifiable, and existing captures are not silently rewritten.


---

## Source Record Entry IDs

- ENTRY-PRD-CVA-001

---

_End of Next Chat Start context._
