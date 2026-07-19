import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkEvidenceReferences,
  intakeEvidence,
  parseEvidenceArgs,
  sha256Bytes,
  validateEvidenceReferenceData,
  verifyEvidence,
} from '../scripts/evidence-store.js';

async function makeFixture() {
  const base = await mkdtemp(join(tmpdir(), 'the-record-evidence-'));
  const root = join(base, 'record repo');
  const store = join(base, 'local evidence store');
  const source = join(base, 'source folder with spaces', 'chat export.md');
  await mkdir(join(root, 'evidence', 'references'), { recursive: true });
  await mkdir(dirname(source), { recursive: true });
  return { base, root, source, store };
}

async function cleanup(base) {
  await rm(base, { recursive: true, force: true });
}

test('intakes exact source bytes without changing the source and writes a deterministic reference', async () => {
  const fixture = await makeFixture();
  try {
    const bytes = Buffer.from('line one\r\nline two\n\u0000binary-safe', 'utf8');
    await writeFile(fixture.source, bytes);

    const receipt = await intakeEvidence({
      filePath: fixture.source,
      sourceType: 'chat-export',
      label: 'ChatGPT build session',
      storePath: fixture.store,
      root: fixture.root,
    });

    const hash = sha256Bytes(bytes);
    assert.equal(receipt.artifact, `sha256:${hash}`);
    assert.equal(receipt.object_action, 'created');
    assert.equal(receipt.reference_action, 'created');
    assert.deepEqual(await readFile(fixture.source), bytes);
    assert.deepEqual(
      await readFile(join(fixture.store, 'objects', 'sha256', hash)),
      bytes
    );

    const reference = JSON.parse(
      await readFile(join(fixture.root, 'evidence', 'references', `${hash}.json`), 'utf8')
    );
    assert.deepEqual(reference, {
      artifact: `sha256:${hash}`,
      byte_size: bytes.length,
      label: 'ChatGPT build session',
      object_path: `objects/sha256/${hash}`,
      schema_version: '1.0.0',
      source_type: 'chat-export',
    });
  } finally {
    await cleanup(fixture.base);
  }
});

test('duplicate intake is idempotent and reuses the exact object and reference', async () => {
  const fixture = await makeFixture();
  try {
    await writeFile(fixture.source, 'same bytes');
    const options = {
      filePath: fixture.source,
      sourceType: 'markdown',
      label: 'Same source',
      storePath: fixture.store,
      root: fixture.root,
    };

    await intakeEvidence(options);
    const second = await intakeEvidence(options);
    assert.equal(second.object_action, 'reused');
    assert.equal(second.reference_action, 'reused');
  } finally {
    await cleanup(fixture.base);
  }
});

test('dry run computes the artifact but writes neither object nor reference', async () => {
  const fixture = await makeFixture();
  try {
    await writeFile(fixture.source, 'dry run source');
    const receipt = await intakeEvidence({
      filePath: fixture.source,
      sourceType: 'text',
      label: 'Dry run',
      storePath: fixture.store,
      root: fixture.root,
      dryRun: true,
    });

    assert.equal(receipt.status, 'dry-run');
    assert.equal(receipt.object_action, 'would-create');
    assert.equal(receipt.reference_action, 'would-create');
    await assert.rejects(readFile(receipt.object_path), /ENOENT/);
    await assert.rejects(readFile(receipt.reference_path), /ENOENT/);
  } finally {
    await cleanup(fixture.base);
  }
});

test('refuses an evidence store inside The Record repository', async () => {
  const fixture = await makeFixture();
  try {
    await writeFile(fixture.source, 'source');
    await assert.rejects(
      intakeEvidence({
        filePath: fixture.source,
        sourceType: 'text',
        label: 'Unsafe store',
        storePath: join(fixture.root, '.record-evidence'),
        root: fixture.root,
      }),
      /must be outside The Record repository/
    );
  } finally {
    await cleanup(fixture.base);
  }
});

test('refuses conflicting bytes already present at the content-addressed object path', async () => {
  const fixture = await makeFixture();
  try {
    const sourceBytes = Buffer.from('authoritative source');
    await writeFile(fixture.source, sourceBytes);
    const hash = sha256Bytes(sourceBytes);
    const objectPath = join(fixture.store, 'objects', 'sha256', hash);
    await mkdir(dirname(objectPath), { recursive: true });
    await writeFile(objectPath, 'wrong bytes');

    await assert.rejects(
      intakeEvidence({
        filePath: fixture.source,
        sourceType: 'text',
        label: 'Conflict',
        storePath: fixture.store,
        root: fixture.root,
      }),
      /does not match its content-addressed path/
    );
  } finally {
    await cleanup(fixture.base);
  }
});

test('verification succeeds, then fails closed when the stored object is changed', async () => {
  const fixture = await makeFixture();
  try {
    await writeFile(fixture.source, 'verify me');
    const intake = await intakeEvidence({
      filePath: fixture.source,
      sourceType: 'chat-export',
      label: 'Verification source',
      storePath: fixture.store,
      root: fixture.root,
    });

    const verified = await verifyEvidence({
      artifact: intake.artifact,
      storePath: fixture.store,
      root: fixture.root,
    });
    assert.equal(verified.status, 'verified');

    await writeFile(intake.object_path, 'tampered');
    await assert.rejects(
      verifyEvidence({
        artifact: intake.artifact,
        storePath: fixture.store,
        root: fixture.root,
      }),
      /Evidence object hash mismatch/
    );
  } finally {
    await cleanup(fixture.base);
  }
});

test('verification fails when the repository reference is missing or inconsistent', async () => {
  const fixture = await makeFixture();
  try {
    await writeFile(fixture.source, 'reference test');
    const intake = await intakeEvidence({
      filePath: fixture.source,
      sourceType: 'text',
      label: 'Reference test',
      storePath: fixture.store,
      root: fixture.root,
    });

    await rm(intake.reference_path);
    await assert.rejects(
      verifyEvidence({
        artifact: intake.artifact,
        storePath: fixture.store,
        root: fixture.root,
      }),
      /Evidence reference is missing/
    );

    const hash = intake.artifact.slice('sha256:'.length);
    await writeFile(
      intake.reference_path,
      `${JSON.stringify({
        artifact: intake.artifact,
        byte_size: 999,
        label: 'Wrong',
        object_path: `objects/sha256/${hash}`,
        schema_version: '1.0.0',
        source_type: 'text',
      }, null, 2)}\n`
    );
    await assert.rejects(
      verifyEvidence({
        artifact: intake.artifact,
        storePath: fixture.store,
        root: fixture.root,
      }),
      /byte_size mismatch/
    );
  } finally {
    await cleanup(fixture.base);
  }
});

test('argument parsing preserves quoted Windows paths with spaces and rejects invalid command mixes', () => {
  const windowsPath = 'C:\\Users\\Dan Demarest\\Desktop\\Chat Exports\\session.md';
  assert.deepEqual(
    parseEvidenceArgs([
      'intake',
      '--file', windowsPath,
      '--source', 'chat-export',
      '--label', 'Session one',
      '--store', 'C:\\Record Evidence',
      '--json',
    ]),
    {
      command: 'intake',
      dryRun: false,
      filePath: windowsPath,
      json: true,
      label: 'Session one',
      sourceType: 'chat-export',
      storePath: 'C:\\Record Evidence',
    }
  );
  assert.throws(
    () => parseEvidenceArgs(['verify', '--artifact', `sha256:${'a'.repeat(64)}`, '--dry-run']),
    /verify accepts only/
  );
});

test('reference validation rejects cross-field object path drift and unexpected fields', () => {
  const hash = 'a'.repeat(64);
  const errors = validateEvidenceReferenceData({
    artifact: `sha256:${hash}`,
    byte_size: 10,
    label: 'Label',
    object_path: `objects/sha256/${'b'.repeat(64)}`,
    schema_version: '1.0.0',
    source_type: 'text',
    unexpected: true,
  });
  assert(errors.some(error => error.includes('unexpected field')));
  assert(errors.some(error => error.includes('object_path must be')));
});

test('repository evidence reference check is deterministic and fails on filename drift', async () => {
  const fixture = await makeFixture();
  try {
    await writeFile(fixture.source, 'reference inventory');
    const intake = await intakeEvidence({
      filePath: fixture.source,
      sourceType: 'text',
      label: 'Inventory source',
      storePath: fixture.store,
      root: fixture.root,
    });

    const checked = await checkEvidenceReferences({ root: fixture.root });
    assert.equal(checked.reference_count, 1);
    assert.equal(checked.status, 'verified');

    const wrongPath = join(fixture.root, 'evidence', 'references', 'wrong-name.json');
    await writeFile(wrongPath, await readFile(intake.reference_path));
    await assert.rejects(
      checkEvidenceReferences({ root: fixture.root }),
      /filename must be|duplicate artifact reference/
    );
  } finally {
    await cleanup(fixture.base);
  }
});
