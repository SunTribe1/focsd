// Renders a sample form with @lit-labs/ssr and prints the HTML (declarative shadow DOM).
// Run in its own process so Lit's DOM shim never touches the test runner's globals.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';

await import('@focsd/components');

const page = html`
  <focsd-button id="s-button" variant="action">Save</focsd-button>
  <focsd-text-field id="s-name" label="Project name" value="Focsd"></focsd-text-field>
  <focsd-checkbox id="s-check" checked>Email me updates</focsd-checkbox>
  <focsd-select id="s-select" label="Region" value="eu">
    <focsd-option value="eu">Europe</focsd-option>
    <focsd-option value="us">United States</focsd-option>
  </focsd-select>
  <focsd-tabs id="s-tabs" label="Sections">
    <focsd-tab>One</focsd-tab>
    <focsd-tab>Two</focsd-tab>
    <focsd-tab-panel>First panel</focsd-tab-panel>
    <focsd-tab-panel>Second panel</focsd-tab-panel>
  </focsd-tabs>
`;

process.stdout.write(await collectResult(render(page)));
