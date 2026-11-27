const pages = import.meta.glob('../../../../packages/cli/blocks/*/index.html', { eager: true, query: '?raw', import: 'default' });

const styles = import.meta.glob('../../../../packages/cli/blocks/*/*.css', { eager: true, query: '?url', import: 'default' });

/** The index.html source of a block from the CLI's blocks folder. */
export function blockSource(name: string): string {
  // SAFETY: eager `?raw` + `import: 'default'` makes every glob value a string, and the page only asks for names from the
  // blocks catalog, each of which ships an index.html (block.json lists it; the CLI tests check that), so the key exists.
  return pages[`../../../../packages/cli/blocks/${name}/index.html`] as string;
}

/** The URL of a block's stylesheet, or undefined when the block has none. */
export function blockStylesheet(name: string): string | undefined {
  // SAFETY: eager `?url` + `import: 'default'` makes every glob value a string; a block without a stylesheet has no key.
  return styles[`../../../../packages/cli/blocks/${name}/${name}.css`] as string | undefined;
}
