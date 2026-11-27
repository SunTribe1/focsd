/** /components/<tag>.md: the element's contract for AI agents (scripts/agent/contracts.mjs). */
import { agentFiles } from '../../lib/agent-files.js';

export function getStaticPaths() {
  return [...agentFiles().contracts.keys()].map((tag) => ({ params: { tag } }));
}

/** @param {{ params: { tag: string } }} context */
export function GET({ params }) {
  return new Response(agentFiles().contracts.get(params.tag), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
