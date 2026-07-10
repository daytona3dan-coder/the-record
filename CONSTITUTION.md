# The Record — Constitution v1.0.0

This Constitution establishes the governing principles of The Record. These principles are non-negotiable and must be satisfied by every tool, script, and process operating within this system.

---

## Principles

**1. Source evidence outranks derived summaries.**
A captured artifact, commit, or other primary source always has higher authority than any summary or interpretation of it.

**2. Approved Canon outranks Working Context.**
Entries classified as `approved_canon` govern over entries classified as `working_context`. Working Context informs; it does not govern.

**3. Nothing becomes Approved Canon automatically.**
Promotion to `approved_canon` requires an explicit human approval act recorded in the entry's `approval` object. No elapsed time, merge event, or AI action can substitute.

**4. AI systems and Bolt may propose changes but cannot approve them.**
An AI actor may author Record Entries with authority class `working_context` or `derived_summary`. An AI actor must never satisfy the `approved_by_type: human` requirement in an approval object.

**5. Human approval records the actual human identity, not the MAXAI brand.**
The `approved_by_name` and `approved_by_account` fields must identify the individual human, not a team name, brand, or AI persona.

**6. Record Entries are immutable after merge.**
Once a Record Entry JSON file is merged into the repository's default branch, its content must never be modified or deleted. The CI immutability check enforces this.

**7. Corrections occur through new superseding entries.**
If a merged entry contains an error or becomes outdated, a new entry must be authored that declares the old entry in its `supersedes` array. The new entry replaces the old in active state derivation.

**8. Superseded entries remain preserved.**
Entries listed in another entry's `supersedes` array are excluded from active state but must never be deleted from the repository. The full history is part of the record.

**9. Git evidence outranks AI confidence about repository state.**
When there is a conflict between what a git diff, log, or status command reports and what an AI system believes about repository state, the git output governs.

**10. Raw evidence remains in its proper source system and is referenced by durable identifiers.**
The Record stores SHA-256 artifact hashes and span references, not raw file contents or chat transcripts. ChatVaultAI, GitHub, and other source systems hold the artifacts; The Record holds the governance chain.

**11. ChatVaultAI preserves evidence and receipts; The Record preserves governing continuity.**
These are separate concerns. ChatVaultAI is a source system. The Record references it by artifact hash. The Record does not duplicate ChatVaultAI's contents.

**12. The Record is not the TR-001 execution ledger. Replayable executions and governing decisions have separate semantics.**
A Record Entry captures a governing decision or state snapshot. It is not a task log, a replay ledger, or an execution receipt. Do not conflate these.

**13. Existing DECISIONS.md and STATE.md material is migrated through traceable entries, not silently abandoned.**
Historical governing material must enter The Record as explicitly authored entries with traceable `evidence` references. Silent import or copy-without-provenance is prohibited.

**14. The Record governs promotion and operational authority. It does not limit Dan's thinking, conversation, invention, naming, or exploration.**
The Record does not constrain ideation. It records what has been decided, not what may be considered.

**15. NEXT_CHAT_START must be generated only from validated CURRENT_STATE, never directly from chat history.**
The `generate-next-chat.js` script reads only a validated `CURRENT_STATE.json`. It must never read conversation logs, entry history, or any unvalidated source.

---

*Constitution version: 1.0.0*
*Effective: 2026-07-10*
