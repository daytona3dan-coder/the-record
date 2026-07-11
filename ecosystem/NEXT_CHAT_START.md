# Next Chat Start — Ecosystem

> This document governs the opening context of the next conversation for this scope.
> It is generated deterministically from `CURRENT_STATE.json` and must not be edited by hand.
> It governs unless explicitly superseded by a new Record Entry.

---

**Constitution version:** 1.0.0
**Generated from:** `CURRENT_STATE.json` (scope: ecosystem)
**Generated at:** 2026-07-11T15:20:45.000Z

---

## Approved Canon

The following decisions are Approved Canon and govern this scope:

### ENTRY-ECO-003

Dan adopted the Maxai human-authority identity rule as ecosystem Approved Canon, effective July 10, 2026.

**Decisions:**
- Maxai may name the role and interface of human review; the ledger's authority field always records the actual human.
- Across MAXAI governance, brand names, product names, AI systems, and automation may describe roles or propose actions, but they cannot replace the identity of the human who approved an authoritative act.

### ENTRY-ECO-005

Dan adopted the FieldMouth domain split as ecosystem Approved Canon, effective July 10, 2026, while preserving the June 29 builder-registry framing within the standard and registry role.

**Decisions:**
- FieldMouth.com is the home of the standard: the Transformation Contract specification, invariant definitions, Evidence Interface, public transformation-contract registry, PROV-compatibility statement, and supporting developer-facing builder, registry, and versioning interfaces.
- FieldMouthAI.com is the home of the product: the governed runtime, tool catalog, pricing, and reference implementation, with its authority and claims pointing back to the standard at FieldMouth.com.
- The June 29 FieldMouth.com builder-registry framing is preserved within this structure. It describes interfaces serving the standard and registry; it does not convert FieldMouth.com into the commercial runtime product.

### ENTRY-ECO-010

Dan resolved the FieldMouth benchmark identity fork as an internal conformance suite first, with later public vendor-neutral promotion requiring an explicit decision and defined readiness conditions.

**Decisions:**
- The FieldMouth transformation benchmark begins as an internal conformance suite.
- The internal suite may use ChatVaultAI-specific artifact structures and test implementation details while proving transformation-contract compliance, invariant enforcement, evidence addressing, deterministic replay, and grading behavior.
- The evidence interface is designed so the suite can later become vendor-neutral without replacing its governing concepts.
- The benchmark is not represented as a public standard or broadly adoptable public benchmark until the internal conformance suite works end to end, the evidence interface is stable and vendor-neutral, reproducible fixtures and grader rules exist, adoption and implementation documentation exists, and independent implementations can participate without requiring ChatVaultAI.
- After those conditions are met, ChatVaultAI may serve as the reference implementation but is not a required dependency.
- Public vendor-neutral benchmark status requires a later explicit promotion decision.

### ENTRY-ECO-016

Dan adopted the private GitHub Free operating model for The Record, explicitly distinguishing procedural governance from unavailable technical branch protection.

**Decisions:**
- The Record remains a private repository on GitHub Free.
- GitHub does not enforce protected branches or repository rulesets for private repositories on the Free plan. The Record must not claim that branch protection is technically enforced.
- Until repository plan or visibility changes, all intended changes are proposed through branches and pull requests; Record CI must pass before merge; AI review remains advisory; Dan performs the human approval and merge act; direct pushes, force pushes, and deletion of main are prohibited by governance even though GitHub Free cannot technically block them; and Git evidence is checked after each merge.
- The repository will not be made public or moved to a paid GitHub plan solely to obtain branch protection.
- If repository plan or visibility changes later, technical protection of main must be configured and verified.

### ENTRY-ECO-018

Dan permanently reserved TR-000 as unavailable and without transformation, execution, evidentiary, or governance semantics.

**Decisions:**
- TR-000 is permanently reserved and will never be assigned.
- TR-000 is intentionally unavailable and carries no transformation, execution, evidentiary, or governance semantics.
- The FieldMouth Transformation Registry begins at TR-001. No TR entry advances past Draft unless this permanent reservation is present in Approved Canon.

### ENTRY-ECO-019

Dan reclassified the JavaScript implementation in fieldmouth-standard PR #1 as a non-authoritative development and conformance-testing aid.

**Decisions:**
- The JavaScript implementation in fieldmouth-standard PR #1 is a non-authoritative development and conformance-testing aid only.
- It is not the FieldMouthAI reference implementation, not a Transformation Registry oracle, and produces no canonical evidence.
- Any receipt emitted by the JavaScript implementation is illustrative and carries no evidentiary or governance weight.
- PR #1 remains Draft and BLOCKED. Repeated same-realm JavaScript intrinsic hardening is terminated.

### ENTRY-ECO-020

Dan required evidence-producing Transformation Registry oracles to operate within a controlled isolation boundary and selected Rust/WASM under an approved host profile as the canonical implementation posture.

**Decisions:**
- Evidence-producing Transformation Registry oracles must execute within a controlled isolation boundary admitting only versioned deterministic inputs and trusted cryptographic and runtime services.
- The canonical implementation posture is Rust compiled to WASM and executed under an approved host profile.
- The isolation boundary is defined by what may cross it, not by implementation language alone. Same-realm JavaScript is not an approved evidence-producing boundary.
- No Rust/WASM TR oracle implementation begins until the approved host profile is defined.

### ENTRY-ECO-021

Dan required every envelope hash to have a preimage contained in or deterministically derivable from the envelope and directed removal of visible_text_sha256 as the immediate remedy.

**Decisions:**
- An envelope must not present a hash whose preimage is neither contained in the envelope nor derivable from an included source field through a named, versioned, deterministic transformation with fixed test vectors.
- The transformation identifier and version must be recorded beside any derived hash.
- Text normalization is a separate transformation class from CANON-1 JSON canonicalization.
- The immediate remedy is to remove visible_text_sha256. A later registered transformation may restore the capability if justified.


---

## Working Context

_Working Context informs but does not govern. It may be superseded without a new canon approval._

- **ENTRY-ECO-017**: Foundation maintenance is complete. The collision guard is enforced, stale manual CI work is closed, and the private-Free branch-protection limitation is governed procedurally. TR-001 Resolve Relative Date is the next substantive target.

---

## Active State

- **benchmark_current_identity**: internal-conformance-suite
- **benchmark_public_status**: not-promoted
- **benchmark_public_trajectory**: vendor-neutral-after-readiness-and-explicit-promotion
- **branch_protection_enforcement**: procedural-not-technical
- **envelope_hash_preimage_rule**: contained-or-versioned-deterministically-derivable
- **fieldmouth_com_role**: standard-registry-and-supporting-developer-interfaces
- **fieldmouth_public_registry_start**: TR-001
- **fieldmouth_standard_pr1_status**: draft-blocked
- **fieldmouthai_com_role**: commercial-governed-runtime-and-reference-implementation
- **foundation_maintenance_status**: complete
- **github_repository_plan**: free
- **github_repository_visibility**: private
- **human_authority_identity**: actual-human-required
- **manual_ci_enhancement_status**: closed-without-merge
- **maxai_role_naming**: permitted-with-human-authority-identity
- **next_substantive_target**: TR-001-Resolve-Relative-Date
- **state_collision_guard**: enforced-fail-closed
- **tr000_assignment**: permanently-reserved-unavailable
- **tr001_javascript_status**: non-authoritative-conformance-testing-aid
- **tr_oracle_canonical_implementation**: rust-wasm-approved-host-profile
- **tr_oracle_implementation_gate**: host-profile-required-before-start
- **tr_oracle_isolation_requirement**: controlled-boundary
- **visible_text_sha256_status**: remove-next-envelope-revision

---

## Open Items

- Audit other MAXAI ledgers and approval records for authority fields that identify a brand, product, AI system, or automation instead of the actual human.
- Audit FieldMouth.com and FieldMouthAI.com documentation and site content for conflicts with the approved domain split.
- Attach the June 29 builder-registry source artifact and exact spans when available.
- Implement the internal conformance suite end to end.
- Stabilize a vendor-neutral evidence interface.
- Produce reproducible fixtures, grader rules, and adoption and implementation documentation.
- Demonstrate independent participation without requiring ChatVaultAI before proposing public-benchmark promotion.
- Update fieldmouth-standard PR #1 documentation to reflect this approved classification without resuming intrinsic-hardening work.
- Define and ratify the approved oracle host profile, including the import allowlist and determinism requirements.
- Remove visible_text_sha256 in the next envelope revision.
- If normalized visible-text hashing is later justified, define and register the versioned deterministic transformation and fixed vectors before restoring the field.

---

## Carried Context

### From ENTRY-ECO-003

Approved Canon: Maxai may name the role and interface of human review, but every ledger and approval authority field records the actual human. Dan Demarest, account daytona3dan-coder, adopted this rule effective July 10, 2026.

### From ENTRY-ECO-005

Approved Canon: FieldMouth.com hosts the standard, public registry, and supporting developer interfaces; FieldMouthAI.com hosts the governed commercial runtime, tool catalog, pricing, and reference implementation. The June 29 builder-registry framing remains valid inside FieldMouth.com's standard-and-registry role.

### From ENTRY-ECO-010

Approved Canon: the FieldMouth transformation benchmark is currently an internal conformance suite. Design toward a vendor-neutral evidence interface, but do not claim public benchmark status until all five readiness conditions are met and Dan explicitly promotes it. ChatVaultAI may later be the reference implementation but never a required dependency.

### From ENTRY-ECO-016

The Record remains private on GitHub Free. Branch protection is procedural, not technically enforced: use pull requests, require green Record CI, preserve advisory AI review, and reserve approval and merge for Dan. Direct and force pushes and deletion of main are prohibited by governance. Foundation maintenance is complete; begin TR-001 Resolve Relative Date.

### From ENTRY-ECO-017

Foundation maintenance is complete. Begin the TR-001 Resolve Relative Date vertical slice: contract, registry entry, deterministic execution, append-only execution ledger, invariant checks, replay, and internal conformance fixtures. Keep The Record separate from the execution ledger and preserve Dan's approval authority.

### From ENTRY-ECO-018

Approved Canon: TR-000 is permanently reserved and unavailable. It has no transformation, execution, evidentiary, or governance semantics. The FieldMouth Transformation Registry begins at TR-001.

### From ENTRY-ECO-019

Approved Canon: fieldmouth-standard PR #1 remains Draft and BLOCKED. Its JavaScript implementation is only a non-authoritative development and conformance-testing aid; it is not an oracle or reference implementation and produces no canonical evidence.

### From ENTRY-ECO-020

Approved Canon: evidence-producing TR oracles require a controlled isolation boundary. The canonical posture is Rust/WASM under an approved host profile. Do not begin the Rust/WASM oracle until that host profile is defined and ratified.

### From ENTRY-ECO-021

Approved Canon: every envelope hash must be independently verifiable from included content or a named, versioned deterministic transformation with fixed vectors. Remove visible_text_sha256 in the next envelope revision; CANON-1 is unaffected.


---

## Source Record Entry IDs

- ENTRY-ECO-003
- ENTRY-ECO-005
- ENTRY-ECO-010
- ENTRY-ECO-016
- ENTRY-ECO-017
- ENTRY-ECO-018
- ENTRY-ECO-019
- ENTRY-ECO-020
- ENTRY-ECO-021

---

_End of Next Chat Start context._
