import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { waitForServer } from '../scripts/lib/wait-for-server.mjs';

test('waitForServer fails with a clear message when nothing answers', async () => {
  await assert.rejects(
    waitForServer('http://127.0.0.1:1', { attempts: 3, delayMs: 1 }),
    /preview server did not start at http:\/\/127\.0\.0\.1:1/i,
  );
});

test('waitForServer resolves once the server answers', async () => {
  const server = createServer((_, res) => res.end('ok'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    await waitForServer(`http://127.0.0.1:${server.address().port}`, { attempts: 5, delayMs: 1 });
  } finally {
    server.close();
  }
});
