import { expect, test } from '@playwright/test';

// The agent-facing files (wave 15). Production sets the exact types in public/_headers (a unit test
// checks those rules); the local static server picks the type from the extension.

const FILES = [
  { path: '/llms.txt', type: /^text\/plain/, body: '(/components/focsd-button.md)' },
  { path: '/AGENTS.md', type: /^text\/markdown/, body: '# Using Focsd in this project' },
  { path: '/components/focsd-button.md', type: /^text\/markdown/, body: '# Button (`<focsd-button>`)' },
  { path: '/schema/components/focsd-button.json', type: /json/, body: '"$schema": "https://json-schema.org/draft/2020-12/schema"' },
  { path: '/schema/tokens/light.json', type: /json/, body: '"$type": "color"' },
  { path: '/schema/tokens/index.json', type: /json/, body: '/schema/tokens/contrast.json' },
];

for (const { path, type, body } of FILES) {
  test(`${path} is served with its content type`, async ({ request }) => {
    const response = await request.get(path);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(type);
    expect(await response.text()).toContain(body);
  });
}

test('the HTML component page still serves next to its contract', async ({ request }) => {
  const response = await request.get('/components/button/');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^text\/html/);
});
