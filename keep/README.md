# Record Method Keep

Record Method Keep is an independent local custody and catalog product represented by **RecordMethodKeep.com**. It is built from the same public open core as The Record Method, but it can be used on its own.

It copies exact source bytes into a content-addressed local object store, records every new intake in one ordered SHA-256-linked receipt ledger, and verifies both the objects and the receipt chain. Intake remains unassigned and has no governance effect. A human must decide what the material means and whether it should inform a Record Entry.

It does not require TheRecordMethod.com, ChatVaultAI Desktop, a ChatVaultAI account, or a paid ChatVaultAI plan. ChatVaultAI Desktop may include a compatible private implementation in its free Starter tier, but that does not make Record Method Keep a ChatVaultAI-owned product or dependency.

It is not a hosted service, cloud vault, automatic canonizer, or automatic source of governing authority.

## Five-minute use

```sh
npm run keep:init -- --keep "C:\\My Record Method Keep"
npm run keep:intake -- --keep "C:\\My Record Method Keep" --file "C:\\Captures\\conversation.chatvault.json"
npm run keep:verify -- --keep "C:\\My Record Method Keep"
npm run keep:list -- --keep "C:\\My Record Method Keep" --json true
```

The Keep contains:

```text
KEEP.json
objects/sha256/<exact-byte-sha256>
receipts/000000000001-<receipt-hash-prefix>.json
```

`KEEP.json` is the current ledger pointer. Source objects and receipt files are append-only. `verify` recomputes every object hash, validates every receipt hash, checks the ordered chain, and confirms the current pointer.

## Authority boundary

- Capture is not custody: intake copies the bytes and verifies the copy.
- Custody is not approval: every intake begins `unassigned` with `governance_effect: none`.
- A Keep receipt proves what bytes were placed in that Keep and how the local ledger linked the event.
- It does not prove that the source statement is true or grant an AI authority to approve it.

The receipt schema is [`schemas/record-method-keep-receipt.schema.json`](../schemas/record-method-keep-receipt.schema.json).
