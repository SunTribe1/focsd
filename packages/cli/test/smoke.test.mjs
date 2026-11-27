import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { add, init } from '../src/project.js';

const templates = fileURLToPath(new URL('../templates/', import.meta.url));
const nodeModules = fileURLToPath(new URL('../node_modules/', import.meta.url));
let root;
let browser;

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'focsd-smoke-'));
  init(root, { templates });
  add(root, ['button'], { templates });
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('a copied component', () => {
  it('bundles against @focsd-dev/primitives and renders in a browser', async () => {
    const result = await build({
      entryPoints: [join(root, 'src/focsd/focsd-button.js')],
      bundle: true,
      write: false,
      format: 'esm',
      nodePaths: [nodeModules, fileURLToPath(new URL('../../components/node_modules/', import.meta.url))],
      logLevel: 'silent',
    });

    const page = await browser.newPage();
    await page.setContent('<focsd-button>Save draft</focsd-button>');
    await page.addScriptTag({ type: 'module', content: result.outputFiles[0].text });
    await page.waitForFunction(() => customElements.get('focsd-button'));
    await expect(page.getByRole('button', { name: 'Save draft' }).count()).resolves.toBe(1);
    await page.close();
  });
});
