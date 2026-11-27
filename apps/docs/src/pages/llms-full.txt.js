/** /llms-full.txt: every component's reference in one Markdown file, for AI tools. */
import { components } from '../data/catalogue.js';
import { createCatalog } from '@focsd/mcp/core';
import data from '@focsd/mcp/data';

const { componentMarkdown, getComponent } = createCatalog(data);

export function GET() {
  const sections = components
    .map((c) => getComponent(c.tag))
    .filter(Boolean)
    .map(componentMarkdown);

  return new Response(['# Focsd component reference', '', ...sections].join('\n\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
