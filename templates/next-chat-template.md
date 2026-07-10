# Next Chat Start — {{SCOPE_LABEL}}

> This document governs the opening context of the next conversation for this scope.
> It is generated deterministically from `CURRENT_STATE.json` and must not be edited by hand.
> It governs unless explicitly superseded by a new Record Entry.

---

**Constitution version:** {{CONSTITUTION_VERSION}}
**Generated from:** `CURRENT_STATE.json` (scope: {{SCOPE}})
**Generated at:** {{GENERATED_AT}}

---

## Approved Canon

{{#APPROVED_CANON}}
The following decisions are Approved Canon and govern this scope:

{{APPROVED_CANON_ENTRIES}}
{{/APPROVED_CANON}}
{{^APPROVED_CANON}}
_No Approved Canon entries. Nothing is yet governing canon for this scope._
{{/APPROVED_CANON}}

---

## Working Context

_Working Context informs but does not govern. It may be superseded without a new canon approval._

{{#WORKING_CONTEXT}}
{{WORKING_CONTEXT_ENTRIES}}
{{/WORKING_CONTEXT}}
{{^WORKING_CONTEXT}}
_No Working Context entries._
{{/WORKING_CONTEXT}}

---

## Active State

{{#ACTIVE_STATE}}
{{ACTIVE_STATE_ENTRIES}}
{{/ACTIVE_STATE}}
{{^ACTIVE_STATE}}
_No active state recorded._
{{/ACTIVE_STATE}}

---

## Open Items

{{#OPEN_ITEMS}}
{{OPEN_ITEMS_LIST}}
{{/OPEN_ITEMS}}
{{^OPEN_ITEMS}}
_No open items._
{{/OPEN_ITEMS}}

---

## Source Record Entry IDs

{{SOURCE_ENTRY_IDS}}

---

_End of Next Chat Start context._
