/**
 * Script CSP without 'unsafe-inline': after the build, every page gets a
 * <meta http-equiv="Content-Security-Policy"> whose script-src lists the SHA-256 of that page's own
 * inline scripts. Browsers enforce it together with the site-wide header (public/_headers), so only
 * those exact scripts can run: an injected <script> is refused.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const EXECUTABLE = new Set(['', 'module', 'text/javascript', 'application/javascript']);

/** Inline scripts the browser would run, with their exact text, in document order. */
export function inlineScripts(html) {
  const found = [];

  const walk = (node) => {
    if (node.nodeName === 'script') {
      const attrs = Object.fromEntries((node.attrs ?? []).map((a) => [a.name, a.value]));
      const text = (node.childNodes ?? []).map((c) => c.value ?? '').join('');

      if (!('src' in attrs) && EXECUTABLE.has((attrs.type ?? '').trim().toLowerCase()) && text) found.push(text);
    }

    for (const child of node.childNodes ?? []) walk(child);

    if (node.content) walk(node.content);
  };

  walk(parse(html));

  return found;
}

export const hashOf = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Cloudflare Web Analytics' beacon, which Cloudflare Pages adds to each page when analytics is on. */
export const ANALYTICS_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';

/** The page with a meta CSP for its inline scripts, inserted before the first script. */
export function withScriptPolicy(html) {
  const hashes = [...new Set(inlineScripts(html).map(hashOf))];
  const policy = ["script-src 'self' 'wasm-unsafe-eval'", ANALYTICS_SCRIPT_ORIGIN, ...hashes].join(' ');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  const at = html.search(/<meta charset[^>]*>/i);

  if (at < 0) return html.replace(/<head[^>]*>/i, (head) => `${head}${meta}`);
  const end = html.indexOf('>', at) + 1;

  return `${html.slice(0, end)}${meta}${html.slice(end)}`;
}

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return pages(path);

    return name.endsWith('.html') ? [path] : [];
  });
}

/** Astro integration: add the meta policy to every built page. */
export default function cspHashes() {
  return {
    name: 'focsd-csp-hashes',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const files = pages(fileURLToPath(dir));

        for (const file of files) writeFileSync(file, withScriptPolicy(readFileSync(file, 'utf8')));
        logger.info(`script CSP hashes added to ${files.length} pages`);
      },
    },
  };
}
