/**
 * Diff-aware entry immutability checker. FAILS CLOSED.
 *
 * Usage:
 *   node scripts/check-entry-immutability.js --base <git-ref>
 *   node scripts/check-entry-immutability.js <git-ref>
 *
 * In CI (pull_request):
 *   node scripts/check-entry-immutability.js --base ${{ github.event.pull_request.base.sha }}
 *
 * Behavior:
 *   - Missing base ref → nonzero exit (fail closed)
 *   - Invalid/inaccessible ref → nonzero exit (fail closed)
 *   - Not a git repository → nonzero exit (fail closed)
 *   - Modified/deleted/renamed entry → nonzero exit
 *   - New entries (status A) → permitted
 *   - Clean diff → zero exit
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);

export function isEntryPath(filePath) {
  return /(?:^|\/)entries\/[^/]+\.json$/.test(filePath.replace(/\\/g, '/'));
}

export async function checkImmutability(baseRef) {
  // Fail closed: missing or empty base ref is an error
  if (!baseRef || baseRef.trim() === '') {
    return {
      ok: false,
      errors: ['No base ref provided. Immutability check requires a base git reference. Fail closed.'],
    };
  }

  let diffOutput;
  try {
    const { stdout } = await execAsync(`git diff --name-status ${baseRef} HEAD`);
    diffOutput = stdout;
  } catch (e) {
    const msg = [e.stderr || '', e.message || '', e.stdout || ''].join(' ');
    // Fail closed: any git error is a failure
    return {
      ok: false,
      errors: [`Git error (fail closed): ${msg.trim().split('\n')[0]}`],
    };
  }

  const errors = [];
  const lines = diffOutput.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    const parts = line.split('\t');
    const statusCode = parts[0];
    const status = statusCode[0];

    if (status === 'A') continue; // New entries are permitted

    if (status === 'M' || status === 'D') {
      const filePath = parts[1];
      if (isEntryPath(filePath)) {
        const verb = status === 'M' ? 'modified' : 'deleted';
        errors.push(`Immutable entry ${verb}: ${filePath}`);
      }
    } else if (status === 'R') {
      const oldPath = parts[1];
      const newPath = parts[2] || parts[1];
      if (isEntryPath(oldPath)) {
        errors.push(`Immutable entry renamed: ${oldPath} -> ${newPath}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf('--base');
  const baseRef = baseIndex !== -1 ? args[baseIndex + 1] : args[0];

  checkImmutability(baseRef).then(result => {
    if (result.ok) {
      console.log('Immutability check passed.');
      process.exit(0);
    } else {
      console.error(`Immutability check failed with ${result.errors.length} error(s):`);
      for (const e of result.errors) console.error('  -', e);
      process.exit(1);
    }
  }).catch(e => {
    console.error('Unexpected error during immutability check:', e);
    process.exit(1);
  });
}
