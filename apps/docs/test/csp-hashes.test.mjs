import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ANALYTICS_SCRIPT_ORIGIN, hashOf, inlineScripts, withScriptPolicy } from '../src/integrations/csp-hashes.mjs';

const page = `<!doctype html><html><head><meta charset="utf-8"><script>theme()</script></head><body>
<pre><code>&lt;script&gt;not code&lt;/script&gt;</code></pre>
<script type="application/json">{"data":1}</script>
<script type="module">run()</script>
<script src="/a.js"></script>
</body></html>`;

test('finds only the inline scripts a browser would run', () => {
  assert.deepEqual(inlineScripts(page), ['theme()', 'run()']);
});

test('hashes the exact text as CSP expects', () => {
  const expected = `'sha256-${createHash('sha256').update('theme()').digest('base64')}'`;
  assert.equal(hashOf('theme()'), expected);
});

test('adds a meta policy before the first script, listing each inline script once', () => {
  const out = withScriptPolicy(page);
  const meta = out.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(meta);
  assert.ok(out.indexOf(meta[0]) < out.indexOf('<script'));
  assert.equal(meta[1], `script-src 'self' 'wasm-unsafe-eval' ${ANALYTICS_SCRIPT_ORIGIN} ${hashOf('theme()')} ${hashOf('run()')}`);
  assert.ok(!meta[1].includes('unsafe-inline'));
});
