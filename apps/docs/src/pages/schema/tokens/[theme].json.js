/** /schema/tokens/<theme>.json: the theme's design tokens as DTCG (scripts/agent/tokens.mjs). */
import { agentFiles } from '../../../lib/agent-files.js';

export function getStaticPaths() {
  return Object.keys(agentFiles().tokens.themes).map((theme) => ({ params: { theme } }));
}

/** @param {{ params: { theme: string } }} context */
export function GET({ params }) {
  const themes = /** @type {Record<string, unknown>} */ (agentFiles().tokens.themes);

  return new Response(`${JSON.stringify(themes[params.theme], null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } });
}
