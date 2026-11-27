/**
 * Copy and code for the landing page (src/pages/index.astro). Every number is read from the repo:
 * the component count from the catalog, the preset names from @focsd-dev/tokens, the button budget
 * from packages/components/test/size.test.mjs.
 */
import { components } from './catalogue.js';
import vesperLight from '../vesper-light.json' with { type: 'json' };
import { readRepoJson, readRepoText } from '../lib/repo.js';

/** Built components in docs/components-catalogue.md (DESIGN.md: "128 components"). */
export const COMPONENT_COUNT = components.length;

/** The brand presets, in the order @focsd-dev/tokens lists them. */
export const PRESETS = Object.keys(readRepoJson('packages/tokens/dist/presets.json').presets);

if (PRESETS.length !== 4) throw new Error(`landing.js: expected four presets in @focsd-dev/tokens, found ${PRESETS.length}.`);

/** Every theme a site can pick: the default (Wayfinding) plus the named presets. */
export const THEME_COUNT = PRESETS.length + 1;

/** A small count in words, as the copy writes it ("five presets"); 11 and up stay numerals. */
export const inWords = (/** @type {number} */ n) =>
  ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);

/** The gzip budget of one button with Lit, in KB, as the size test enforces it. */
export const BUTTON_BUDGET_KB = Number(
  /a single button costs no more than ([\d.]+) KB/.exec(readRepoText('packages/components/test/size.test.mjs'))?.[1] ?? Number.NaN,
);

if (!Number.isFinite(BUTTON_BUDGET_KB)) throw new TypeError('landing.js: the button size budget moved; update the pattern.');

export const INSTALL = 'npm i @focsd-dev/components';

/** The same select in every framework (mirrors src/content/docs/getting-started/frameworks.mdx). */
export const FRAMEWORKS = /** @type {const} */ ([
  {
    id: 'html',
    label: 'HTML',
    lang: 'html',
    code: `<script type="module">
  import '@focsd-dev/tokens/tokens.css';
  import '@focsd-dev/components';
</script>

<focsd-select label="Data region" value="eu">
  <focsd-option value="eu">EU (Frankfurt)</focsd-option>
  <focsd-option value="us">US (Virginia)</focsd-option>
</focsd-select>`,
  },
  {
    id: 'react',
    label: 'React',
    lang: 'jsx',
    code: `import { Select, Option } from '@focsd-dev/react';

export function Region({ value, onChange }) {
  return (
    <Select label="Data region" value={value} onChange={(e) => onChange(e.target.value)}>
      <Option value="eu">EU (Frankfurt)</Option>
      <Option value="us">US (Virginia)</Option>
    </Select>
  );
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    lang: 'vue',
    code: `<script setup>
import '@focsd-dev/components';
import { ref } from 'vue';

const region = ref('eu');
</script>

<template>
  <focsd-select label="Data region" :value="region" @change="region = $event.target.value">
    <focsd-option value="eu">EU (Frankfurt)</focsd-option>
    <focsd-option value="us">US (Virginia)</focsd-option>
  </focsd-select>
</template>`,
  },
  {
    id: 'svelte',
    label: 'Svelte',
    lang: 'svelte',
    code: `<script>
  import '@focsd-dev/components';
  let region = $state('eu');
</script>

<focsd-select label="Data region" value={region} onchange={(e) => (region = e.target.value)}>
  <focsd-option value="eu">EU (Frankfurt)</focsd-option>
  <focsd-option value="us">US (Virginia)</focsd-option>
</focsd-select>`,
  },
  {
    id: 'angular',
    label: 'Angular',
    lang: 'angular-ts',
    code: `import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@focsd-dev/components';

@Component({
  selector: 'app-region',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: \`
    <focsd-select label="Data region" [value]="region" (change)="region = $any($event.target).value">
      <focsd-option value="eu">EU (Frankfurt)</focsd-option>
      <focsd-option value="us">US (Virginia)</focsd-option>
    </focsd-select>
  \`,
})
export class RegionComponent {
  region = 'eu';
}`,
  },
]);

export const MCP_CONFIG = `{
  "mcpServers": {
    "focsd": { "command": "npx", "args": ["-y", "@focsd-dev/mcp"] }
  }
}`;

/**
 * Syntax themes for the landing's code (Astro's Shiki, not Expressive Code, which would raise low
 * contrast by itself): the same Vesper Light and Vesper the docs use, every color at least 4.5:1.
 */
export const CODE_THEMES = {
  light: /** @type {import('shiki').ThemeRegistration} */ (/** @type {unknown} */ (vesperLight)),
  dark: /** @type {const} */ ('vesper'),
};
