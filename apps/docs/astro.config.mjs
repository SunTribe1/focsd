import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeBlack from 'starlight-theme-black';
import { byCategory } from './src/data/catalogue.js';
import { FORM_GROUPS, GUIDE_GROUPS } from './src/data/sidebar.js';
import { OG_IMAGE, REPO_URL, SITE } from './src/data/site.js';
import ecStylesInHead from './src/integrations/ec-styles-in-head.mjs';
import cspHashes from './src/integrations/csp-hashes.mjs';

/** `astro dev` (not build or preview): load workspace packages from source, as Vite's development condition does. */
const DEV = process.argv.includes('dev');

/**
 * The entry of a workspace package for the alias below: its source in dev, so a change shows without
 * rebuilding the package; its built copy otherwise, as an app installing it from npm would get.
 * @param {string} name
 */
function packageEntry(name) {
  const built = fileURLToPath(import.meta.resolve(name));

  return DEV ? built.replace(/[\\/]dist[\\/]index\.js$/, '/src/index.js') : built;
}

/** @param {{ name: string, slug: string }} c */
const componentLink = (c) => ({ label: c.name, link: `/components/${c.slug}/` });

/** Forms split into its subgroups; a Forms component missing from them is a mistake, so say which. */
const formSubgroups = (/** @type {{ name: string, slug: string }[]} */ items) => {
  const grouped = new Set(FORM_GROUPS.flatMap((g) => g.slugs));
  const missing = items.filter((c) => !grouped.has(c.slug)).map((c) => c.slug);

  if (missing.length) throw new Error(`astro.config.mjs: add these Forms components to FORM_GROUPS: ${missing.join(', ')}.`);

  return FORM_GROUPS.map(({ label, slugs }) => ({
    label,
    collapsed: false,
    items: slugs.flatMap((slug) => items.filter((c) => c.slug === slug)).map(componentLink),
  }));
};

export default defineConfig({
  site: SITE,
  // The site playground became the components gallery; old links land there (public/_redirects in production).
  redirects: { '/playground': '/components/' },
  integrations: [
    starlight({
      plugins: [
        starlightThemeBlack({
          navLinks: [
            { label: 'Docs', link: '/getting-started/installation/' },
            { label: 'Components', link: '/components/' },
          ],
        }),
      ],
      title: 'Focsd',
      description: 'Free, accessible web components that work in any framework.',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        alt: 'Focsd home',
        replacesTitle: true,
      },
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: OG_IMAGE } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Focsd: free, accessible web components that work everywhere.' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: OG_IMAGE } },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
      customCss: [
        '@focsd-dev/tokens/fonts.css',
        '@focsd-dev/tokens/tokens.css',
        '@focsd-dev/components/upgrade.css',
        './src/styles/docs.css',
      ],
      components: {
        Head: './src/components/Head.astro',
        Footer: './src/components/Footer.astro',
        Sidebar: './src/components/Sidebar.astro',
      },
      lastUpdated: false,
      sidebar: [
        ...GUIDE_GROUPS,
        { label: 'All components', link: '/components/' },
        ...byCategory.map(({ category, items }) => ({
          label: category,
          collapsed: false,
          items: category === 'Forms' ? formSubgroups(items) : items.map(componentLink),
        })),
      ],
    }),
    ecStylesInHead(),
    // Last: hashes the final HTML's inline scripts.
    cspHashes(),
  ],
  vite: {
    // One copy of Lit for every component import.
    // The block sources in packages/cli/blocks do not depend on the charts and grid packages (a user's
    // project does), so resolve those two imports from this site's own dependencies.
    resolve: {
      dedupe: ['lit'],
      alias: ['@focsd-dev/charts', '@focsd-dev/data-grid'].map((name) => ({
        find: new RegExp(`^${name}$`),
        replacement: packageEntry(name),
      })),
    },
  },
});
