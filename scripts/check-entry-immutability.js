/**
 * Diff-aware entry immutability checker.
 *
 * Usage:
 *   node scripts/check-entry-immutability.js --base <git-ref>
 *   node scripts/check-entry-immutability.js <git-ref>
 *
 * In CI (pull_request), pass the PR base commit:
 *   node scripts/check-entry-immutability.js --base ${{ github.event.pull_request.base.sha }}
 *
 * An entry path is any file matching: <anything>/entries/<filename>.json
 * Newly added entries (status A) are permitted.
 * Modified (M), deleted (D), or renamed-out (R) entries fail the check.
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);

export function isEntryPath(filePath) {
  return /(?:^|\/)entries\/[^/]+\.json$/.test(filePath.replace(/\\/g, '/'));
}

export async function checkImmutability(baseRef, options = {}) {
  if (!baseRef) {
    return {
      ok: true,
      errors: [],
      skipped: true,
      reason: 'No base ref provided; skipping immutability check.',
    };
  }

  let diffOutput;
  try {
    const { stdout } = await execAsync(`git diff --name-status ${baseRef} HEAD`);
    diffOutput = stdout;
  } catch (e) {
    const msg = (e.stderr || '') + (e.message || '') + (e.stdout || '');
    if (
      msg.includes('not a git repository') ||
      msg.includes('unknown revision') ||
      msg.includes('bad revision') ||
      msg.includes('Could not access') ||
      msg.includes('ambiguous argument') ||
      e.code === 128
    ) {
      return {
        ok: true,
        errors: [],
        skipped: true,
        reason: `git unavailable or bad ref: ${msg.trim()}`,
      };
    }
    throw e;
  }

  const errors = [];
  const lines = diffOutput.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    const parts = line.split('\t');
    const statusCode = parts[0];
    const status = statusCode[0];

    if (status === 'A') continue; // New entries are always permitted

    if (status === 'M' || status === 'D') {
      const filePath = parts[1];
      if (isEntryPath(filePath)) {
        const verb = status === 'M' ? 'modified' : 'deleted';
        errors.push(`Immutable entry ${verb}: ${filePath}`);
      }
    } else if (status === 'R') {
      // Rename: parts[1] = old path, parts[2] = new path
      const oldPath = parts[1];
      const newPath = parts[2];
      if (isEntryPath(oldPath)) {
        errors.push(`Immutable entry renamed: ${oldPath} -> ${newPath}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, skipped: false };
}

const isMain = process.argv[1] === __filename;
if (isMain) {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf('--base');
  const baseRef = baseIndex !== -1 ? args[baseIndex + 1] : args[0];

  checkImmutability(baseRef).then(result => {
    if (result.skipped) {
      console.log('Immutability check skipped:', result.reason);
      process.exit(0);
    } else if (result.ok) {
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
