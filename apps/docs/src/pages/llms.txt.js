/** /llms.txt (https://llmstxt.org): an index of the docs for AI tools. */
import { components, CATEGORIES } from '../data/catalogue.js';
import { llmsIndex } from '../lib/llms.js';
import { createCatalog } from '@focsd/mcp/core';
import data from '@focsd/mcp/data';
import { agentFiles } from '../lib/agent-files.js';

const { getComponent } = createCatalog(data);

export function GET() {
  const body = llmsIndex({
    categories: CATEGORIES,
    components,
    summaryOf: (tag) => getComponent(tag)?.summary ?? '',
    contracts: [...agentFiles().contracts.keys()],
  });

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
