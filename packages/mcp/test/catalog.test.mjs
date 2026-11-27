import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH_LIMIT,
  FRAMEWORKS,
  getComponent,
  getSetup,
  getTokens,
  listComponents,
  searchComponents,
  validateMarkup,
} from '../src/catalog.js';

describe('catalog', () => {
  it('lists every component with its tag, category and summary', () => {
    const all = listComponents();
    expect(all.length).toBeGreaterThanOrEqual(79);
    const button = all.find((c) => c.tag === 'focsd-button');
    expect(button).toMatchObject({ name: 'Button', category: 'Actions', package: '@focsd-dev/components' });
    expect(button.summary).toBeTruthy();
    expect(listComponents({ category: 'Overlays' }).every((c) => c.category === 'Overlays')).toBe(true);
  });

  it('finds components by meaning, not only by name', () => {
    expect(searchComponents('dropdown')[0].tag).toMatch(/focsd-(select|menu|combobox)/);
    expect(searchComponents('draggable card').map((c) => c.tag)).toContain('focsd-floating-panel');
    expect(searchComponents('table with sorting and filters')[0].tag).toBe('focsd-data-grid');
  });

  it('returns a full component reference by tag, short name or class name', () => {
    const select = getComponent('select');
    expect(select.tag).toBe('focsd-select');
    expect(getComponent('FocsdSelect').tag).toBe('focsd-select');
    expect(select.attributes.map((a) => a.name)).toEqual(expect.arrayContaining(['label', 'multiple', 'searchable', 'max']));
    expect(select.events.map((e) => e.name)).toContain('change');
    expect(select.cssParts.map((p) => p.name)).toContain('trigger');
    expect(select.example).toContain('<focsd-select');
    expect(select.a11y.length).toBeGreaterThan(0);
    expect(select.import).toBe("import '@focsd-dev/components/focsd-select.js';");
    expect(getComponent('nope')).toBeNull();
  });

  it('an inherited key as theme falls back to light', () => {
    const light = getTokens({ filter: 'action', theme: 'light' });
    const odd = getTokens({ filter: 'action', theme: /** @type {any} */ ('constructor') });
    expect(odd).toEqual(light);
    expect(odd.length).toBeGreaterThan(0);
  });

  it('returns design tokens per theme, filtered by name', () => {
    const tokens = getTokens({ filter: 'action' });
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((t) => t.name.includes('action'))).toBe(true);
    expect(tokens[0]).toHaveProperty('css');
    expect(tokens[0].value).toBeTruthy();
    expect(getTokens({ filter: 'action', theme: 'dark' })[0].value).not.toBe(tokens[0].value);
  });

  it('explains setup for each framework', () => {
    for (const framework of ['html', 'react', 'vue', 'svelte', 'angular']) {
      const setup = getSetup(framework);
      expect(setup.install).toContain('@focsd-dev/components');
      expect(setup.usage.length).toBeGreaterThan(20);
    }
  });

  it('points React users at the per-element wrapper imports', () => {
    expect(getSetup('react').usage).toContain("from '@focsd-dev/react/button'");
  });

  it('validates markup: unknown tags, unknown attributes and missing accessible names', () => {
    const issues = validateMarkup(`
      <focsd-buton>Save</focsd-buton>
      <focsd-button variant="action" color="red">Save</focsd-button>
      <focsd-text-field></focsd-text-field>
      <focsd-icon-button icon="x"></focsd-icon-button>
      <focsd-select label="Region" aria-describedby="x" data-test="1" id="s" class="c"><focsd-option value="eu">EU</focsd-option></focsd-select>
    `);

    const codes = issues.map((i) => `${i.code}:${i.tag}`);
    expect(codes).toContain('unknown-element:focsd-buton');
    expect(issues.find((i) => i.code === 'unknown-element').message).toContain('focsd-button');
    expect(codes).toContain('unknown-attribute:focsd-button');
    expect(codes).toContain('missing-label:focsd-text-field');
    expect(codes).toContain('missing-label:focsd-icon-button');
    expect(codes.filter((c) => c.endsWith(':focsd-select'))).toEqual([]);
    expect(validateMarkup('<focsd-button>Ok</focsd-button>')).toEqual([]);
    expect(validateMarkup('<p>Hi</p>\n\n<focsd-text-field></focsd-text-field>')[0].line).toBe(3);
  });

  it('places every sub-element with its parent component', () => {
    expect(listComponents().filter((c) => c.category === 'Other')).toEqual([]);
    expect(getComponent('focsd-option')).toMatchObject({ partOf: 'focsd-select', category: 'Forms' });
    expect(getComponent('focsd-menu-item').partOf).toBe('focsd-menu');
    expect(getComponent('focsd-tab').partOf).toBe('focsd-tabs');
    expect(getComponent('focsd-radio').partOf).toBe('focsd-radio-group');
  });

  it('accepts JSX spellings of attributes', () => {
    expect(validateMarkup('<focsd-combobox label="City" className="wide" htmlFor="x" allowCustom></focsd-combobox>')).toEqual([]);
  });
});

describe('m54 / m61 constants', () => {
  it('searches return at most DEFAULT_SEARCH_LIMIT matches unless asked for more', () => {
    expect(DEFAULT_SEARCH_LIMIT).toBe(8);
    expect(searchComponents('button input select text').length).toBe(DEFAULT_SEARCH_LIMIT);
    expect(searchComponents('button input select text', { limit: 12 }).length).toBe(12);
  });

  it('getSetup falls back to html for a name that is not a framework, even an inherited one', () => {
    expect(getSetup('constructor').framework).toBe('html');
    expect(FRAMEWORKS).toEqual(['html', 'react', 'vue', 'svelte', 'angular']);
  });
});

describe('Worker compatibility', () => {
  it('the modules a Worker loads use no Node built-ins and read the data as a module', async () => {
    const { readFileSync } = await import('node:fs');

    for (const file of ['catalog', 'core', 'server', 'http', 'cap', 'rate-limit']) {
      const text = readFileSync(new URL(`../src/${file}.js`, import.meta.url), 'utf8');
      expect(text, file).not.toMatch(/from 'node:(fs|path|url|http)'/);
    }

    expect(readFileSync(new URL('../src/catalog.js', import.meta.url), 'utf8')).toContain("from '../data/focsd.js'");
  });

  it('the module graph of @focsd-dev/mcp/http imports no node: builtins', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const seen = new Set();
    const bare = new Set();

    // Walks this package's own modules; dependencies are bare specifiers and resolve per host condition.
    const walk = (url) => {
      if (seen.has(url.href)) return;
      seen.add(url.href);
      const text = readFileSync(url, 'utf8');

      for (const match of text.matchAll(
        /(?:^|\n)\s*(?:import|export)\s[^'";]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
      )) {
        const spec = match[1] ?? match[2];
        expect(spec.startsWith('node:'), `${fileURLToPath(url)} imports ${spec}`).toBe(false);

        if (spec.startsWith('.')) walk(new URL(spec, url));
        else bare.add(spec);
      }
    };

    walk(new URL('../src/http.js', import.meta.url));
    expect(seen.size).toBeGreaterThan(3);
    expect([...bare].every((s) => !s.startsWith('node:'))).toBe(true);
  });

  it('the generated data module equals the JSON data', async () => {
    const { readFileSync } = await import('node:fs');
    const module = await import('../data/focsd.js');
    expect(module.default).toEqual(JSON.parse(readFileSync(new URL('../data/focsd.json', import.meta.url), 'utf8')));
  });
});
