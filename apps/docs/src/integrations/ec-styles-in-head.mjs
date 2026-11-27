import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EC_LINK = /<link rel="stylesheet" href="\/_astro\/ec\.[\w-]+\.css">/;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

/**
 * Expressive Code links its stylesheet where it renders its first code block, and Astro renders
 * components out of document order, so the link can land after code blocks that are already
 * painting (unstyled, then restyled: layout shift). Move the link into <head>, where it blocks
 * rendering like every other stylesheet.
 */
export default function ecStylesInHead() {
  return {
    name: 'focsd:ec-styles-in-head',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let moved = 0;
        const missing = [];

        for await (const file of htmlFiles(fileURLToPath(dir))) {
          const html = await readFile(file, 'utf8');
          const link = html.match(EC_LINK)?.[0];

          // Code blocks but no recognizable stylesheet link: Expressive Code changed its output.
          if (!link && html.includes('class="expressive-code')) missing.push(file);

          if (!link || html.indexOf(link) < html.indexOf('</head>')) continue;
          await writeFile(file, html.replace(link, '').replace('</head>', `${link}</head>`));
          moved += 1;
        }

        if (missing.length)
          throw new Error(
            `ec-styles-in-head: ${missing.length} page(s) have code blocks but no Expressive Code stylesheet link matching ${EC_LINK}; update the pattern. First: ${missing[0]}`,
          );
        logger.info(`Moved the code-block stylesheet into <head> on ${moved} pages.`);
      },
    },
  };
}
