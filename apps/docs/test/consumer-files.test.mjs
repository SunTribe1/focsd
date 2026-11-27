import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agentsMd, consumerFiles, skillMd } from '../../../scripts/agent/consumer.mjs';

const components = new URL('../../../packages/components/', import.meta.url);

test('AGENTS.md is deterministic and fills the counts from the manifest', () => {
  const input = { version: '1.2.3', site: 'https://focsd.dev', elements: 7, events: 4 };

  assert.equal(agentsMd(input), agentsMd(input));
  assert.match(agentsMd(input), /7 custom elements/);
  assert.match(agentsMd(input), /4 `focsd-\*` events/);
});

test('AGENTS.md names the contract URLs, the MCP connect lines and the event rule', () => {
  const text = agentsMd({ version: '1.2.3', site: 'https://focsd.dev', elements: 7, events: 4 });

  for (const needle of [
    'https://focsd.dev/components/<tag>.md',
    'https://focsd.dev/schema/components/<tag>.json',
    'https://focsd.dev/llms.txt',
    'npx -y @focsd-dev/mcp',
    'npx -y @focsd-dev/mcp --http --port 3333',
    'claude mcp add --transport http focsd http://127.0.0.1:3333/mcp',
    '"mcpServers"',
    '"servers"',
    'enableWebMCP',
    '@focsd-dev/tokens/tokens.css',
  ])
    assert.ok(text.includes(needle), needle);
});

test('SKILL.md has frontmatter with a name and a when-to-use description', () => {
  const text = skillMd({ site: 'https://focsd.dev' });

  assert.match(text, /^---\nname: focsd\ndescription: .{40,}\n---\n/);
  assert.ok(text.includes('https://focsd.dev/components/<tag>.md'));
  assert.ok(text.includes('claude mcp add'));
});

test('consumerFiles reads the counts from the components manifest', () => {
  const { agents } = consumerFiles(components);
  const cem = JSON.parse(readFileSync(new URL('custom-elements.json', components), 'utf8'));
  const tags = new Set(cem.modules.flatMap((m) => (m.declarations ?? []).map((d) => d.tagName).filter(Boolean)));

  assert.ok(tags.size > 50);
  assert.ok(agents.includes(`${tags.size} custom elements`));
});
