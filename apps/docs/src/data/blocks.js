/** The blocks the CLI ships (packages/cli/blocks/<name>/block.json), read at build time for the Blocks guide. */
const manifests = import.meta.glob('../../../../packages/cli/blocks/*/block.json', { eager: true, import: 'default' });

/** @type {{ name: string, title: string, description: string, elements: string[], packages: string[] }[]} */
export const blocks = Object.values(manifests).toSorted((a, b) => a.name.localeCompare(b.name));
