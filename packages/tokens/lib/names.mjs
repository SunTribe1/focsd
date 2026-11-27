const TIERS = new Set(['ref', 'sys', 'cmp']);

/**
 * Map a DTCG token path to its CSS custom property name.
 * ref.color.graphite.21 → --focsd-ref-graphite-21; sys.color.ink → --focsd-ink; cmp.button.background → --focsd-button-background
 * @param {string[]} path
 */
export function cssName(path) {
  const [tier, ...rest] = path;

  if (!TIERS.has(tier)) throw new Error(`Unknown token tier "${tier}" in ${path.join('.')}`);
  const parts = rest[0] === 'color' ? rest.slice(1) : rest;

  return `--focsd-${tier === 'ref' ? 'ref-' : ''}${parts.join('-')}`;
}
