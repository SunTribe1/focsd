/**
 * Fingerprints of the agent files (scripts/agent/contracts.lock.json), so a change to any
 * contract, schema or token file shows in review. The docs build serves the files themselves.
 *
 *   node scripts/agent/build.mjs           write the lock file
 *   node scripts/agent/build.mjs --check   fail when it is out of date
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { agentOutputs, fingerprints, staleEntries } from './index.mjs';
import { loadInputs } from './inputs.mjs';

const target = new URL('contracts.lock.json', import.meta.url);
const current = fingerprints(agentOutputs(loadInputs()));

if (process.argv.includes('--check')) {
  const committed = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : {};
  const stale = staleEntries(committed, current);

  if (stale.length) {
    console.error(`Agent files changed: ${stale.join(', ')}. Run: node scripts/agent/build.mjs`);
    process.exit(1);
  }
} else {
  writeFileSync(target, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`✓ scripts/agent/contracts.lock.json: ${Object.keys(current).length} files`);
}
