// @vitest-environment happy-dom
// Built-in cell displays: enum options with a tone, color or icon show as status chips; display: 'avatar'
// shows a name with an avatar. The plain value still drives sorting, search, CSV and row names.
import { afterEach, describe, expect, it } from 'vitest';

await import('../src/index.js');

afterEach(() => document.body.replaceChildren());

const COLUMNS = [
  { id: 'owner', header: 'Owner', display: 'avatar' },
  {
    id: 'status',
    header: 'Status',
    type: 'enum',
    options: [
      { value: 'paid', label: 'Paid', tone: 'positive', icon: 'check' },
      { value: 'draft', label: 'Draft' },
    ],
  },
  { id: 'region', header: 'Region', type: 'enum', options: [{ value: 'eu', label: 'Europe' }] },
];

async function grid() {
  const el = /** @type {any} */ (document.createElement('focsd-data-grid'));

  el.label = 'Invoices';
  el.columns = COLUMNS;
  el.rows = [
    { id: 1, owner: 'Amara Okafor', status: 'paid', region: 'eu' },
    { id: 2, owner: 'Lukas Brandt', status: 'draft', region: 'eu' },
  ];
  document.body.append(el);
  await el.updateComplete;

  return el;
}

describe('built-in cells', () => {
  it('shows enum values with a tone as status chips, with the option label as text', async () => {
    const el = await grid();
    const chips = [...el.shadowRoot.querySelectorAll('focsd-tag[part~="chip"]')];

    expect(chips.map((c) => c.textContent.trim())).toEqual(['Paid', 'Draft']);
    expect(chips[0].getAttribute('tone')).toBe('positive');
    expect(chips[0].getAttribute('icon')).toBe('check');
    expect(chips[1].getAttribute('tone')).toBe('neutral');
  });

  it('leaves an enum column without tones, colors or icons as plain text', async () => {
    const el = await grid();

    expect(el.shadowRoot.innerHTML).toMatch(/Europe/);
    expect([...el.shadowRoot.querySelectorAll('focsd-tag')].some((t) => t.textContent.includes('Europe'))).toBe(false);
  });

  it('shows names with a decorative avatar, and keeps the plain name for row labels', async () => {
    const el = await grid();
    const avatars = [...el.shadowRoot.querySelectorAll('[part~="person"] focsd-avatar')];

    expect(avatars.map((a) => a.getAttribute('name'))).toEqual(['Amara Okafor', 'Lukas Brandt']);
    expect(avatars.every((a) => a.hasAttribute('decorative'))).toBe(true);
    expect(el.rowName(el.rows[0])).toBe('Amara Okafor');
  });
});
