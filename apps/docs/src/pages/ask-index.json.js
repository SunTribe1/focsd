/** /ask-index.json: what the "Ask the docs" bot searches in the browser (src/lib/ask-index.js). */
import { getCollection } from 'astro:content';
import data from '@focsd/mcp/data';
import { components } from '../data/catalogue.js';
import { GUIDE_GROUPS } from '../data/sidebar.js';
import { buildAskIndex } from '../lib/ask-index.js';

export async function GET() {
  const docs = await getCollection('docs');
  const descriptions = new Map(docs.map((entry) => [entry.id, entry.data.description ?? '']));

  const guides = GUIDE_GROUPS.flatMap((group) => group.items).map((page) => ({
    slug: page.slug,
    label: page.label,
    description: descriptions.get(page.slug) ?? '',
  }));

  const entries = buildAskIndex({ components: data.components, pages: new Set(components.map((c) => c.slug)), guides });

  return new Response(JSON.stringify({ count: components.length, entries }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
