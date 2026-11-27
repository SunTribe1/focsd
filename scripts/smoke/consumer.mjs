/**
 * Consumer smoke test (wave 20, R5). Packs every public package into a tarball, unpacks the
 * tarballs into a throw-away Vite app in the system temp folder, builds it, and loads the result
 * in headless Chromium to check that `focsd-button` is defined and renders.
 *
 * `--offline` (the default): the tarballs are extracted into `node_modules` and each declared
 * third-party dependency and peer dependency (lit, react, ...) is linked from the monorepo's own
 * install, so nothing touches the network and an undeclared dependency still fails to resolve.
 * `--online` installs the tarballs with npm, third-party dependencies from the registry; `overrides`
 * map every `@focsd-dev/*` name to its local tarball, so a package's own `@focsd-dev/*` dependencies never
 * come from the registry. Pass both flags to pack once and run both installs (CI).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const VITE = '8.3.2';
const playground = join(root, 'apps/playground');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const fail = (message) => {
  throw new Error(`consumer smoke: ${message}`);
};

/** The public workspace packages: [directory, package.json]. */
function publicPackages() {
  return readdirSync(join(root, 'packages'))
    .filter((dir) => existsSync(join(root, 'packages', dir, 'package.json')))
    .map((dir) => [dir, readJson(join(root, 'packages', dir, 'package.json'))])
    .filter(([, manifest]) => !manifest.private);
}

/** Pack each package (pnpm rewrites `workspace:*` ranges); returns tarball paths by package name. */
function pack(packages, dest) {
  return Object.fromEntries(
    packages.map(([dir, manifest]) => {
      const file = join(dest, `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`);

      execFileSync('pnpm', ['pack', '--out', file], { cwd: join(root, 'packages', dir), stdio: 'pipe' });

      return [manifest.name, file];
    }),
  );
}

/**
 * The third-party dependencies and peer dependencies of a package that the offline install links:
 * never another `@focsd-dev` package (those are tarballs), and a peer only when the monorepo has it.
 * @param {{ dependencies?: Record<string, string>, peerDependencies?: Record<string, string> }} manifest
 * @param {(name: string) => boolean} available Whether the monorepo has the package installed.
 * @returns {string[]}
 */
export function linkedDependencies(manifest, available) {
  return [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {}).filter(available)].filter(
    (name) => !name.startsWith('@focsd-dev/'),
  );
}

/** Extract tarballs into `app/node_modules/<name>` and link their declared third-party deps. */
function installOffline(app, packages, tarballs) {
  const modules = join(app, 'node_modules');

  const link = (name, target) => {
    const at = join(modules, name);

    if (existsSync(at)) return;
    mkdirSync(dirname(at), { recursive: true });
    symlinkSync(realpathSync(target), at);
  };

  for (const [, manifest] of packages) {
    const at = join(modules, manifest.name);

    mkdirSync(at, { recursive: true });
    execFileSync('tar', ['-xzf', tarballs[manifest.name], '-C', at, '--strip-components=1']);
  }

  for (const [dir, manifest] of packages) {
    const from = (/** @type {string} */ dep) => join(root, 'packages', dir, 'node_modules', dep);

    for (const dep of linkedDependencies(manifest, (name) => existsSync(from(name)))) if (!tarballs[dep]) link(dep, from(dep));
  }

  link('vite', join(playground, 'node_modules/vite'));
}

/**
 * The online app's package.json: every tarball as a dependency, and `overrides` that pin every
 * `@focsd-dev/*` name (also where another tarball depends on it) to that same local tarball.
 * @param {Record<string, string>} tarballs Tarball paths by package name.
 */
export function onlineManifest(tarballs) {
  const names = Object.keys(tarballs);

  return {
    name: 'consumer-smoke',
    private: true,
    type: 'module',
    dependencies: { ...Object.fromEntries(names.map((name) => [name, `file:${tarballs[name]}`])), vite: VITE },
    overrides: Object.fromEntries(names.map((name) => [name, `$${name}`])),
  };
}

function installOnline(app, tarballs) {
  writeFileSync(join(app, 'package.json'), JSON.stringify(onlineManifest(tarballs), null, 2));
  execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: app, stdio: 'inherit' });
}

/** The string targets of an `exports` map, depth first. */
const exportTargets = (value) => (value instanceof Object ? Object.values(value).flatMap(exportTargets) : [value]);

/** Every plain `exports` target (no wildcard, no types, no source) must exist in the unpacked package. */
function checkExports(app, packages) {
  const wanted = (target) =>
    target?.startsWith('./') && !target.includes('*') && !target.includes('/types/') && !target.startsWith('./src/');

  const missing = packages.flatMap(([, manifest]) =>
    exportTargets(manifest.exports).flatMap((target) =>
      wanted(target) && !existsSync(join(app, 'node_modules', manifest.name, target)) ? [`${manifest.name} ${target}`] : [],
    ),
  );

  if (missing.length) fail(`exports point at files that are not in the tarball:\n  ${missing.join('\n  ')}`);
}

function writeApp(app) {
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'consumer-smoke', private: true, type: 'module' }));
  writeFileSync(
    join(app, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Consumer smoke</title></head><body><focsd-button id="b">Save</focsd-button><script type="module" src="/main.js"></script></body></html>',
  );
  writeFileSync(join(app, 'main.js'), "import '@focsd-dev/tokens/tokens.css';\nimport '@focsd-dev/components';\n");
}

function build(app) {
  const vite = join(realpathSync(join(app, 'node_modules/vite')), 'bin/vite.js');
  const output = execFileSync(process.execPath, [vite, 'build'], { cwd: app, encoding: 'utf8', stdio: 'pipe' });

  if (/unresolved|could not resolve/i.test(output)) fail(`vite reported unresolved imports:\n${output}`);

  if (!existsSync(join(app, 'dist/index.html'))) fail('vite build wrote no dist/index.html');
}

/** Serve `dist` on a free port; returns the server and its URL. */
async function serve(dist) {
  const server = createServer((request, response) => {
    const path = join(dist, request.url === '/' ? 'index.html' : decodeURIComponent(request.url.split('?')[0]));

    if (!path.startsWith(dist) || !existsSync(path)) response.writeHead(404).end();
    else response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

async function checkInBrowser(dist) {
  const { chromium } = createRequire(join(playground, 'package.json'))('@playwright/test');
  const { server, url } = await serve(dist);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const errors = [];

    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => customElements.get('focsd-button') !== undefined, null, { timeout: 10_000 });

    const rendered = await page.evaluate(() =>
      Boolean(document.querySelector('#b')?.shadowRoot?.querySelector('button, [part~="control"]')),
    );

    if (!rendered) fail('focsd-button is defined but did not render');

    if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);
  } finally {
    await browser.close();
    server.close();
  }
}

/** Install `tarballs` into a new app under `work` (`mode` is offline or online), build it and load it. */
async function smoke(work, mode, packages, tarballs) {
  const app = join(work, `app-${mode}`);

  mkdirSync(app);
  writeApp(app);

  if (mode === 'online') installOnline(app, tarballs);
  else installOffline(app, packages, tarballs);
  checkExports(app, packages);
  build(app);
  await checkInBrowser(join(app, 'dist'));
  console.log(`✓ consumer smoke (${mode}): packed install builds and focsd-button renders`);
}

async function main() {
  const flagged = ['offline', 'online'].filter((mode) => process.argv.includes(`--${mode}`));
  const modes = flagged.length ? flagged : ['offline'];
  const work = mkdtempSync(join(tmpdir(), 'focsd-consumer-'));

  try {
    const packages = publicPackages();
    const tars = join(work, 'tars');

    mkdirSync(tars);
    console.log(`consumer smoke: packing ${packages.length} packages once (${modes.join(' and ')} install) in ${work}`);
    const tarballs = pack(packages, tars);

    for (const mode of modes) await smoke(work, mode, packages, tarballs);
  } catch (error) {
    console.error(error.message ?? error);
    console.error(`(kept ${work} for inspection)`);
    process.exit(1);
  }

  rmSync(work, { recursive: true, force: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
