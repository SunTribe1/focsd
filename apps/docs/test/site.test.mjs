import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OG_IMAGE, REPO_URL, SITE } from '../src/data/site.js';

test('the site address and repository come from the published package metadata', () => {
  assert.equal(SITE, 'https://focsd.dev');
  assert.match(REPO_URL, /^https:\/\/github\.com\/[^/]+\/focsd$/);
  assert.equal(OG_IMAGE, `${SITE}/og.png`);
});
