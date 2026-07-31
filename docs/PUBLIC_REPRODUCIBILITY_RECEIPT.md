# Public Reproducibility Receipt

**System:** The Record  
**Repository:** `daytona3dan-coder/the-record`  
**Test date:** 2026-07-30  
**Verdict:** PASS  
**Test posture:** Credential-free public clone; disposable local changes only

## Claim Tested

Can a stranger, using only the public repository and its contents:

1. clone The Record;
2. install and run it;
3. validate committed state;
4. create a valid Record Entry;
5. supersede that entry through a second immutable file;
6. verify the resulting active state; and
7. understand why malformed or ambiguous work is rejected?

## Source Identity

| Field | Value |
|---|---|
| Repository | `https://github.com/daytona3dan-coder/the-record` |
| Default branch | `main` |
| Exact commit | `6145d2e7eb0176c406d1c2b63399e66b3d5e6414` |
| Repository visibility at test | Public |
| Node.js | `v24.14.0` |
| npm | `11.9.0` |

An unauthenticated `git ls-remote` resolved `HEAD` and `refs/heads/main` to the exact commit above. A credential-free clone then checked out the same commit.

## Clean-Checkout Results

| Gate | Result |
|---|---|
| Dependency installation | PASS — 6 packages installed |
| Behavioral test suite | PASS — 86 tests, 0 failures |
| Record validation | PASS — 34 committed entries |
| Supersession integrity | PASS — 34 committed entries |
| Immutability against `HEAD` | PASS |
| Ecosystem current-state build | PASS |
| ChatVaultAI current-state build | PASS |
| Ecosystem next-session generation | PASS |
| ChatVaultAI next-session generation | PASS |
| Agent bootstrap check | PASS — ecosystem and ChatVaultAI |
| Post-build working tree | Clean |

## Bootstrap Receipt Identity

The clean public checkout returned `status: ready` and bound the following inputs:

| Input | SHA-256 |
|---|---|
| `CONSTITUTION.md` | `d11132d4eba531b6f5fc889bf1969e538f2cf1c1d5def039e145e37e6fa27655` |
| `ecosystem/CURRENT_STATE.json` | `4db489e9f94a3f75a765fd58d9f0adb3ab83960a12c8149f3411aaf84a4e4dc7` |
| `ecosystem/NEXT_CHAT_START.md` | `644b160fe618617d30ea69e02ad82ba5fb793adc7bb9b1ae5ebdf2aff2928331` |
| `products/chatvaultai/PRODUCT_PROFILE.json` | `b5040826e650b2c74e58a30b90f9c540698183cbd16816100216e1f048885932` |
| `products/chatvaultai/CURRENT_STATE.json` | `3e7ee9ef46d280afd638ce14c89f041829f74cde497b2adfee46794bddd4462d` |
| `products/chatvaultai/NEXT_CHAT_START.md` | `30f33404f471a94bb6d3544f085724f7b9761212bb436a3f68f312018a06f28a` |

## Disposable Entry and Supersession Test

Two local Working Context entries were authored from the public template:

| Entry | Purpose |
|---|---|
| `ENTRY-ECO-STRANGER-001` | Established `public_stranger_test_status: first-entry-active` |
| `ENTRY-ECO-STRANGER-002` | Named the first entry in `supersedes` and set `public_stranger_test_status: supersession-proven` |

With both disposable files present:

- validation passed with 36 entries;
- supersession validation passed with 36 entries;
- current-state generation passed;
- the first entry was excluded from active `source_entry_ids`;
- the second entry remained active; and
- `public_stranger_test_status` resolved to `supersession-proven`.

Both source files remained present. The test proved replacement of active meaning without deletion of history.

## Negative Tests

### Missing required field

A disposable entry omitted `summary`.

Expected and observed result:

```text
Validation failed with 1 error(s):
...ENTRY-ECO-STRANGER-BAD.json: (root) must have required property 'summary'
```

The command exited nonzero.

### Ambiguous active state

A second active Working Context entry claimed the same `public_stranger_test_status` key without superseding the existing active entry.

Expected and observed result:

```text
Error building current state: Active-state collisions prevent building state:
active_state key "public_stranger_test_status" is claimed by multiple active working_context entries:
ENTRY-ECO-STRANGER-002, ENTRY-ECO-STRANGER-CONFLICT
Use namespaced keys or supersede the older same-authority entry.
```

The command exited nonzero and provided the corrective rule.

## Mutation Boundary

The test entries, regenerated state, logs, and installed dependencies existed only in a disposable local checkout. Nothing from the clean-room exercise was committed or pushed to the canonical repository.

## Conclusion

The tested public commit is an executable, deterministic Record implementation. A stranger can clone it, run its tests and validation, create and supersede a valid entry, verify the resulting active state, and receive actionable explanations when invalid work is rejected.
