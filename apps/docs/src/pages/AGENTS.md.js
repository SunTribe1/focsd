/** /AGENTS.md: the consumer AGENTS.md (scripts/agent/consumer.mjs), the same text `focsd init --agent` writes. */
import { consumerFiles } from '../../../../scripts/agent/consumer.mjs';
import { repoRoot } from '../../../../scripts/agent/inputs.mjs';

export function GET() {
  return new Response(consumerFiles(new URL('packages/components/', repoRoot)).agents, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
