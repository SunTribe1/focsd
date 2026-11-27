/** /schema/tokens/index.json: the DTCG token files, one per theme. */
import { agentFiles } from '../../../lib/agent-files.js';

export function GET() {
  return new Response(`${JSON.stringify(agentFiles().tokens.index, null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } });
}
