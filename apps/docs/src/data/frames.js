/**
 * The pages behind framed examples (`/examples/<slug>/`): each component example, each of its
 * `more` examples and each patterns-guide example with `frame: true`. Their slugs match the ones
 * the Example component puts in the iframe's `src`.
 *
 * @param {{ slug: string, name: string }[]} components
 * @param {Record<string, { html: string, frame?: boolean, more?: { id: string, title: string, html: string, frame?: boolean }[] }>} examples
 * @param {{ id: string, title: string, html: string, frame?: boolean }[]} patterns
 * @returns {{ params: { slug: string }, props: { name: string, html: string } }[]}
 */
export function framePaths(components, examples, patterns) {
  return [
    ...components.flatMap((c) => {
      const ex = examples[c.slug];
      const main = ex?.frame ? [{ params: { slug: c.slug }, props: { name: c.name, html: ex.html } }] : [];

      const more = (ex?.more ?? [])
        .filter((m) => m.frame)
        .map((m) => ({ params: { slug: `${c.slug}-${m.id}` }, props: { name: `${c.name}: ${m.title}`, html: m.html } }));

      return [...main, ...more];
    }),
    ...patterns.filter((e) => e.frame).map((e) => ({ params: { slug: `guide-patterns-${e.id}` }, props: { name: e.title, html: e.html } })),
  ];
}

/**
 * The pages behind the Blocks guide's previews (`/blocks/<name>/`): one full page per block, read
 * from `packages/cli/blocks`, the same files `focsd add block` copies.
 *
 * @param {{ name: string, title: string }[]} blocks
 * @returns {{ params: { name: string }, props: { title: string } }[]}
 */
export function blockPaths(blocks) {
  return blocks.map((b) => ({ params: { name: b.name }, props: { title: b.title } }));
}
