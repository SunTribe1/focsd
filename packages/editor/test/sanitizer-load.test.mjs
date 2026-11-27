// The editor's toolbar icons are our own drawings: loading the editor must not load the icon
// sanitizer, which icons.js imports lazily only for untrusted icons (quality B11 fix round 1, I1).
import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const run = promisify(execFile);
const probe = new URL('./fixtures/sanitizer-probe.mjs', import.meta.url).pathname;
const toolbar = new URL('../src/toolbar.js', import.meta.url).href;

/** @param {string[]} args */
const sanitizerLoaded = async (...args) => JSON.parse((await run(process.execPath, [probe, toolbar, ...args])).stdout).loaded;

it('loading the editor registers its icons without loading the sanitizer', async () => {
  expect(await sanitizerLoaded()).toBe(false);
});

it('registering an app icon library does load it (the probe sees it)', async () => {
  expect(await sanitizerLoaded('register')).toBe(true);
});
