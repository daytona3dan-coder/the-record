# Next Chat Start — Ecosystem

> This document governs the opening context of the next conversation for this scope.
> It is generated deterministically from `CURRENT_STATE.json` and must not be edited by hand.
> It governs unless explicitly superseded by a new Record Entry.

---

**Constitution version:** 1.0.0
**Generated from:** `CURRENT_STATE.json` (scope: ecosystem)
**Generated at:** 2026-07-12T14:34:00.000Z

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

### ENTRY-ECO-021

Dan required every envelope hash to have a preimage contained in or deterministically derivable from the envelope and directed removal of visible_text_sha256 as the immediate remedy.

**Decisions:**
- An envelope must not present a hash whose preimage is neither contained in the envelope nor derivable from an included source field through a named, versioned, deterministic transformation with fixed test vectors.
- The transformation identifier and version must be recorded beside any derived hash.
- Text normalization is a separate transformation class from CANON-1 JSON canonicalization.
- The immediate remedy is to remove visible_text_sha256. A later registered transformation may restore the capability if justified.

### ENTRY-ECO-028

Dan ratified TR-ORACLE-ENGINE-1 draft.5 as the governing WebAssembly engine-selection and version policy while preserving the ratified host and ABI, leaving five later gates mandatory, and authorizing no implementation.

**Decisions:**
- Evidence-producing Transformation Registry oracles must execute within a controlled isolation boundary admitting only versioned deterministic inputs and trusted cryptographic and runtime services.
- The canonical implementation posture remains Rust compiled to WebAssembly under an approved host profile; same-realm JavaScript is not an approved evidence-producing boundary.
- TR-ORACLE-HOST-1 version 1.0.0-draft.5, SHA-256 55b79d0c023e10e5457a4fc85ae44c2a0bedc34981152d6596bed02868406408, remains the governing architectural host profile.
- TR-ORACLE-ABI-1 version 1.0.0-draft.5, SHA-256 270f4be97676d21f3279c9e6bfc7aa8e22de684349259dc267a1598cfd092ae2, remains the governing ABI specification for Transformation Registry transformation and grading modules.
- TR-ORACLE-ENGINE-1 version 1.0.0-draft.5, SHA-256 71166d5bd7ffacc2bb267d51fe7e7cea65ed51a8eb2c135be22ee5ff68a7a740, is the governing WebAssembly engine-selection and version policy for Transformation Registry transformation and grading modules.
- The governing engine policy selects the official Rust embedding of Wasmtime 36.0.12 by exact version, upstream tag v36.0.12, upstream release commit 6c0a7fc9c387f34dddcf94ef41d7b3b0f9d18cb0, restricted Cargo feature identity, explicit non-budget configuration, finished-byte validation, approved API-path restrictions, and fail-closed update rules.
- Ratification closes only the WebAssembly engine-selection and version-policy gate.
- The five later gates remain mandatory: deterministic execution-budget policy; host-attestation and complete evidence-package schemas, including the exact core-receipt schema; reproducible-build release threshold; trust-anchor and key-custody mechanisms; and approved-verifier implementation and distribution.
- Deferral does not waive any requirement. No Rust/WASM implementation, reference-implementation status, approved-verifier implementation, deployment, or canonical-evidence production is authorized until the applicable later gates are separately resolved, reviewed, and approved.
- fieldmouth-standard PR #1 remains Draft and BLOCKED. Its JavaScript implementation remains a non-authoritative development and conformance-testing aid only.
- Ratification of the exact policy artifact does not merge fieldmouth-standard PR #2. Dan Demarest retains all implementation, approval, ratification, and merge authority.
- The Record remains a private repository on GitHub Free.
- GitHub does not enforce protected branches or repository rulesets for private repositories on the Free plan. The Record must not claim that branch protection is technically enforced.
- Until repository plan or visibility changes, all intended changes are proposed through branches and pull requests; Record CI must pass before merge; AI review remains advisory; Dan performs the human approval and merge act; direct pushes, force pushes, and deletion of main are prohibited by governance even though GitHub Free cannot technically block them; and Git evidence is checked after each merge.
- The repository will not be made public or moved to a paid GitHub plan solely to obtain branch protection.
- If repository plan or visibility changes later, technical protection of main must be configured and verified.


---

## Working Context

_Working Context informs but does not govern. It may be superseded without a new canon approval._

- **ENTRY-ECO-029**: TR-ORACLE-ENGINE-1 is ratified as the governing WebAssembly engine-selection and version policy; implementation remains unauthorized and the next active gate is deterministic execution-budget policy specification and independent review.

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
- **next_substantive_target**: specify-and-review-deterministic-execution-budget-policy
- **state_collision_guard**: enforced-fail-closed
- **tr000_assignment**: permanently-reserved-unavailable
- **tr001_javascript_status**: non-authoritative-conformance-testing-aid
- **tr_oracle_abi_identifier**: TR-ORACLE-ABI-1
- **tr_oracle_abi_sha256**: sha256:270f4be97676d21f3279c9e6bfc7aa8e22de684349259dc267a1598cfd092ae2
- **tr_oracle_abi_status**: ratified-governing-specification
- **tr_oracle_abi_version**: 1.0.0-draft.5
- **tr_oracle_canonical_implementation**: rust-wasm-approved-host-profile
- **tr_oracle_engine_identifier**: wasmtime
- **tr_oracle_engine_policy_identifier**: TR-ORACLE-ENGINE-1
- **tr_oracle_engine_policy_sha256**: sha256:71166d5bd7ffacc2bb267d51fe7e7cea65ed51a8eb2c135be22ee5ff68a7a740
- **tr_oracle_engine_policy_status**: ratified-governing-policy
- **tr_oracle_engine_policy_version**: 1.0.0-draft.5
- **tr_oracle_engine_version**: 36.0.12
- **tr_oracle_host_profile_identifier**: TR-ORACLE-HOST-1
- **tr_oracle_host_profile_sha256**: sha256:55b79d0c023e10e5457a4fc85ae44c2a0bedc34981152d6596bed02868406408
- **tr_oracle_host_profile_status**: ratified-governing-architecture
- **tr_oracle_host_profile_version**: 1.0.0-draft.5
- **tr_oracle_implementation_gate**: five-later-gates-required-before-implementation
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
- Remove visible_text_sha256 in the next envelope revision.
- If normalized visible-text hashing is later justified, define and register the versioned deterministic transformation and fixed vectors before restoring the field.
- Define and review the deterministic execution-budget mechanism and value.
- Define and review host-attestation and complete evidence-package formats, including the exact core-receipt schema.
- Define and review the reproducible-build release threshold.
- Define and review concrete trust-anchor and key-custody mechanisms.
- Define and review the approved-verifier implementation and distribution.

---

## Carried Context

### From ENTRY-ECO-003

Approved Canon: Maxai may name the role and interface of human review, but every ledger and approval authority field records the actual human. Dan Demarest, account daytona3dan-coder, adopted this rule effective July 10, 2026.

### From ENTRY-ECO-005

Approved Canon: FieldMouth.com hosts the standard, public registry, and supporting developer interfaces; FieldMouthAI.com hosts the governed commercial runtime, tool catalog, pricing, and reference implementation. The June 29 builder-registry framing remains valid inside FieldMouth.com's standard-and-registry role.

### From ENTRY-ECO-010

Approved Canon: the FieldMouth transformation benchmark is currently an internal conformance suite. Design toward a vendor-neutral evidence interface, but do not claim public benchmark status until all five readiness conditions are met and Dan explicitly promotes it. ChatVaultAI may later be the reference implementation but never a required dependency.

### From ENTRY-ECO-018

Approved Canon: TR-000 is permanently reserved and unavailable. It has no transformation, execution, evidentiary, or governance semantics. The FieldMouth Transformation Registry begins at TR-001.

### From ENTRY-ECO-019

Approved Canon: fieldmouth-standard PR #1 remains Draft and BLOCKED. Its JavaScript implementation is only a non-authoritative development and conformance-testing aid; it is not an oracle or reference implementation and produces no canonical evidence.

### From ENTRY-ECO-021

Approved Canon: every envelope hash must be independently verifiable from included content or a named, versioned deterministic transformation with fixed vectors. Remove visible_text_sha256 in the next envelope revision; CANON-1 is unaffected.

### From ENTRY-ECO-028

Approved Canon: TR-ORACLE-HOST-1, TR-ORACLE-ABI-1, and TR-ORACLE-ENGINE-1 version 1.0.0-draft.5 are ratified by exact SHA-256 as the governing oracle architecture, ABI, and WebAssembly engine policy. Five later gates remain mandatory. Next specify and independently review the deterministic execution-budget policy only. Do not implement Rust/WASM, grant reference or verifier status, deploy an oracle, or produce canonical evidence.

### From ENTRY-ECO-029

TR-ORACLE-HOST-1, TR-ORACLE-ABI-1, and TR-ORACLE-ENGINE-1 are ratified. Begin specification and independent review of the deterministic execution-budget policy only. Rust/WASM implementation, approved-verifier implementation, reference-implementation status, deployment, and canonical-evidence production remain unauthorized until all applicable later gates are resolved and approved.


---

## Source Record Entry IDs

- ENTRY-ECO-003
- ENTRY-ECO-005
- ENTRY-ECO-010
- ENTRY-ECO-018
- ENTRY-ECO-019
- ENTRY-ECO-021
- ENTRY-ECO-028
- ENTRY-ECO-029

---

_End of Next Chat Start context._
