# Personal Local Evidence Store

`THE-RECORD-EVIDENCE-INTAKE-1` lets Dan register exact source files before ChatVaultAI is complete. Raw source bytes remain outside this Git repository in a local content-addressed store. The repository receives only a deterministic JSON reference under `evidence/references/`.

## One-time Windows setup

Choose a folder outside the cloned `the-record` repository:

```powershell
$env:THE_RECORD_EVIDENCE_STORE = "C:\RecordEvidence"
```

To retain the setting for future PowerShell sessions:

```powershell
[Environment]::SetEnvironmentVariable(
    "THE_RECORD_EVIDENCE_STORE",
    "C:\RecordEvidence",
    "User"
)
```

Open a new PowerShell window after setting the persistent value.

The intake command refuses a store located inside The Record repository. Raw evidence must not enter Git.

## Intake one exact source file

Run from the root of the `the-record` checkout:

```powershell
npm run record:intake -- `
  --file "C:\Desktop\Chat Exports\ChatGPT Session.md" `
  --source "chat-export" `
  --label "ChatGPT ChatVaultAI build session"
```

Machine-readable receipt:

```powershell
npm run record:intake -- `
  --file "C:\Desktop\Chat Exports\ChatGPT Session.md" `
  --source "chat-export" `
  --label "ChatGPT ChatVaultAI build session" `
  --json
```

Dry run without writing an object or reference:

```powershell
npm run record:intake -- `
  --file "C:\Desktop\Chat Exports\ChatGPT Session.md" `
  --source "chat-export" `
  --label "ChatGPT ChatVaultAI build session" `
  --dry-run
```

## What intake does

1. Reads the exact source bytes without editing or normalizing them.
2. Computes SHA-256 over those exact bytes.
3. Stores the bytes at:

   ```text
   <store>\objects\sha256\<64-character-hash>
   ```

4. Re-reads and verifies the stored object.
5. Writes a deterministic repository reference at:

   ```text
   evidence\references\<64-character-hash>.json
   ```

6. Re-reads the source and refuses completion if its bytes changed during intake.

The reference records only:

- the `sha256:` artifact identifier;
- exact byte size;
- human label;
- source type;
- deterministic object-store relative path;
- reference schema version.

It does not record an absolute source path, wall-clock timestamp, or raw transcript content.

## Duplicate behavior

Repeating the same intake with the same source bytes and metadata is idempotent. The command returns `reused` for the object and reference.

The command refuses:

- different bytes already stored at the expected content-addressed path;
- different metadata already recorded for the same artifact reference;
- an evidence store inside The Record repository;
- invalid or missing source files;
- missing source type or label.

It never overwrites conflicting bytes or silently replaces reference metadata.

## Verify a stored artifact later

Use the artifact value returned by intake:

```powershell
npm run record:verify-evidence -- `
  --artifact "sha256:<64-character-hash>"
```

Machine-readable verification receipt:

```powershell
npm run record:verify-evidence -- `
  --artifact "sha256:<64-character-hash>" `
  --json
```

Verification requires both:

- the exact external object; and
- its repository reference.

A missing object, altered object, missing reference, invalid reference, or byte-size disagreement fails closed.

## Repository reference check

This command validates every committed JSON reference without requiring access to Dan's external evidence store:

```powershell
npm run check:evidence-references
```

CI runs this check. It verifies reference structure, artifact format, object-path binding, filename binding, and duplicate-artifact refusal. CI does not claim that Dan's external object is present; `record:verify-evidence` performs that local proof.

## Backup boundary

The Git repository and the local evidence store are separate recovery assets:

- Git preserves governance references and Record Entries.
- `C:\RecordEvidence` preserves exact source bytes.

Back up the evidence store separately. A repository reference without its external object remains an honest identifier, but local byte recovery is unavailable until that object is restored.
