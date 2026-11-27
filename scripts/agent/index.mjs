/**
 * Agent-facing files (wave 15): per-element Markdown contracts, per-element JSON Schemas and DTCG
 * token files, all generated from the manifests and the token build. Pure: pass `loadInputs()`.
 * The docs site serves them (apps/docs/src/pages/components/[tag].md.js and schema/**); the
 * fingerprints in contracts.lock.json make contract changes visible in review (drift test).
 */
import { createHash } from 'node:crypto';
import { componentContract } from './contracts.mjs';
import { componentSchema, contractPath, schemaPath } from './schemas.mjs';
import { THEMES, themeTokens, tokenPath, tokensIndex } from './tokens.mjs';

export { FOCSD_KEYWORDS, contractPath, schemaPath } from './schemas.mjs';

export { THEMES, tokenPath } from './tokens.mjs';

const DEFAULT_SITE = 'https://focsd.dev';

/**
 * @param {import('./inputs.mjs').AgentInputs} inputs
 */
export function agentOutputs({ version, components, cem, typedefs, tokenRows, site = DEFAULT_SITE }) {
  /** @type {Map<string, string>} */
  const contracts = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const schemas = new Map();

  for (const component of components) {
    const context = { decl: cem.get(component.tag), typedefs, site };
    contracts.set(component.tag, componentContract(component, context));
    schemas.set(component.tag, componentSchema(component, context));
  }

  const themes = Object.fromEntries(THEMES.map((theme) => [theme, themeTokens(tokenRows, theme)]));

  return { contracts, schemas, tokens: { themes, index: tokensIndex(version) } };
}

/** @param {string} text */
const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/**
 * A short hash of every generated file, by its path on the site (no leading slash).
 * @param {ReturnType<typeof agentOutputs>} outputs
 * @returns {Record<string, string>}
 */
export function fingerprints({ contracts, schemas, tokens }) {
  /** @type {[string, string][]} */
  const entries = [
    ...[...contracts].map(([tag, md]) => /** @type {[string, string]} */ ([contractPath(tag).slice(1), hash(md)])),
    ...[...schemas].map(([tag, schema]) => /** @type {[string, string]} */ ([schemaPath(tag).slice(1), hash(JSON.stringify(schema))])),
    ...Object.entries(tokens.themes).map(
      ([theme, file]) => /** @type {[string, string]} */ ([tokenPath(theme).slice(1), hash(JSON.stringify(file))]),
    ),
    [tokenPath('index').slice(1), hash(JSON.stringify(tokens.index))],
  ];

  return Object.fromEntries(entries.toSorted(([a], [b]) => a.localeCompare(b)));
}

/**
 * Paths whose fingerprint differs, or that exist on only one side.
 * @param {Record<string, string>} committed
 * @param {Record<string, string>} current
 */
export function staleEntries(committed, current) {
  const paths = new Set([...Object.keys(committed), ...Object.keys(current)]);

  return [...paths].filter((p) => committed[p] !== current[p]).toSorted();
}
