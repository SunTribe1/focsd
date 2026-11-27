/** /schema/components/<tag>.json: JSON Schema 2020-12 of the element (scripts/agent/schemas.mjs). */
import { agentFiles } from '../../../lib/agent-files.js';

export function getStaticPaths() {
  return [...agentFiles().schemas.keys()].map((tag) => ({ params: { tag } }));
}

/** @param {{ params: { tag: string } }} context */
export function GET({ params }) {
  return new Response(`${JSON.stringify(agentFiles().schemas.get(params.tag), null, 2)}\n`, {
    headers: { 'Content-Type': 'application/schema+json' },
  });
}
