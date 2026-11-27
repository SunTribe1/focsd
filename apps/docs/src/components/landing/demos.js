/**
 * Data and behavior for the live components on the landing page. Each function finds its own
 * elements and does nothing when they are missing, so a section can be removed without edits here.
 */

const customers = ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin', 'Wingtip', 'Adatum'];

/** The invoices grid: typed columns, sortable, with a quick search. */
export function setUpGrid() {
  const grid = /** @type {any} */ (document.getElementById('lp-grid'));

  if (!grid) return;
  grid.columns = [
    { id: 'id', header: 'Invoice', type: 'number', width: 120, formatOptions: { useGrouping: false } },
    { id: 'customer', header: 'Customer' },
    { id: 'amount', header: 'Amount', type: 'number', formatOptions: { style: 'currency', currency: 'EUR' } },
    { id: 'due', header: 'Due', type: 'date' },
    { id: 'paid', header: 'Paid', type: 'boolean' },
  ];
  grid.rows = Array.from({ length: 24 }, (_, i) => ({
    id: 1001 + i,
    customer: customers[i % customers.length],
    amount: ((i * 7919) % 9000) + 120,
    due: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    paid: i % 3 === 0,
  }));
}

/** Orders by channel, January to June. */
export function setUpChart() {
  const chart = /** @type {any} */ (document.getElementById('lp-chart'));

  if (!chart) return;
  chart.series = [
    { key: 'online', label: 'Online' },
    { key: 'stores', label: 'Stores' },
  ];
  chart.data = [
    { month: 'Jan', online: 2100, stores: 1400 },
    { month: 'Feb', online: 2400, stores: 1300 },
    { month: 'Mar', online: 3000, stores: 1500 },
    { month: 'Apr', online: 3600, stores: 1700 },
    { month: 'May', online: 3900, stores: 1600 },
    { month: 'Jun', online: 4100, stores: 1800 },
  ];
}

/** What each field says when it is wrong: the fix, not the rule. */
/**
 * The sign-up form. Validation is built in: the error summary checks every field on submit (each
 * field's `error-message`), lists the errors and stops the submit. This only reports a valid submit.
 */
export function setUpForm() {
  const form = /** @type {HTMLFormElement | null} */ (document.getElementById('lp-form'));
  const status = document.getElementById('lp-form-status');

  if (!form || !status) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = `Workspace “${new FormData(form).get('workspace')}” is ready.`;
  });
  form.addEventListener('reset', () => {
    status.textContent = '';
  });
}

/** The command palette opens from its button and reports the command that ran. */
export function setUpCommand() {
  const palette = /** @type {any} */ (document.getElementById('lp-command'));
  const opener = document.getElementById('lp-command-open');
  const status = document.getElementById('lp-command-status');

  if (!palette || !opener || !status) return;
  opener.addEventListener('click', () => palette.show());
  palette.addEventListener('focsd-select', (/** @type {CustomEvent<{ value: string, label?: string }>} */ event) => {
    const item = palette.querySelector(`focsd-command-item[value="${CSS.escape(event.detail.value)}"]`);
    status.textContent = `Ran “${item?.textContent?.trim() ?? event.detail.value}”.`;
  });
}

/** The notification center keeps its list here; the app answers its read and dismiss events. */
export function setUpNotifications() {
  const center = /** @type {any} */ (document.getElementById('lp-notify'));
  const add = document.getElementById('lp-notify-add');

  if (!center || !add) return;
  const ago = (/** @type {number} */ minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

  center.notifications = [
    { id: 'build', title: 'Build 482 passed', body: 'main is green again.', time: ago(2), tone: 'positive' },
    { id: 'comment', title: 'Ana commented on Pricing', body: 'Can we ship the annual plan first?', time: ago(45) },
    { id: 'payment', title: 'Payment failed', body: 'Card ending 4242 was declined.', time: ago(180), tone: 'critical' },
    { id: 'report', title: 'Weekly report ready', time: ago(1560), read: true },
  ];
  center.addEventListener('focsd-read', (/** @type {CustomEvent<{ ids: string[] }>} */ event) => {
    const ids = new Set(event.detail.ids);
    center.notifications = center.notifications.map((/** @type {any} */ n) => (ids.has(n.id) ? { ...n, read: true } : n));
  });
  center.addEventListener('focsd-dismiss', (/** @type {CustomEvent<{ id: string }>} */ event) => {
    center.notifications = center.notifications.filter((/** @type {any} */ n) => n.id !== event.detail.id);
  });
  let added = 0;
  add.addEventListener('click', () => {
    added += 1;
    center.notifications = [
      { id: `signup-${added}`, title: `New sign-up: team ${added}`, time: new Date().toISOString() },
      ...center.notifications,
    ];
  });
}

/** Keys worth echoing, with the name shown for them. */
const KEY_NAMES = /** @type {Record<string, string>} */ ({
  Tab: 'Tab',
  Enter: 'Enter',
  ' ': 'Space',
  Escape: 'Esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Home: 'Home',
  End: 'End',
});

const SHOWN_KEYS = 5;

/** The keyboard demo: echoes the last keys and names the focused control (visual only). */
export function setUpKeys() {
  const box = document.querySelector('[data-lp-keys]');
  const list = box?.querySelector('[data-lp-keys-list]');
  const focus = box?.querySelector('[data-lp-keys-focus]');

  if (!box || !list || !focus) return;
  /** @type {string[]} */
  let keys = [];

  box.addEventListener('keydown', (event) => {
    const { key, shiftKey } = /** @type {KeyboardEvent} */ (event);
    const name = KEY_NAMES[key];

    if (!name) return;
    keys = [...keys, shiftKey && key === 'Tab' ? 'Shift+Tab' : name].slice(-SHOWN_KEYS);
    list.replaceChildren(...keys.map((k) => Object.assign(document.createElement('kbd'), { textContent: k })));
  });

  // A click on empty space in the demo puts focus on its first control, so Tab and the arrows work at once.
  box.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    if (target.closest('focsd-segmented-control, focsd-select, focsd-switch, a, button')) return;

    const segment = /** @type {HTMLElement | null} */ (
      box.querySelector('focsd-segment[tabindex="0"]') ?? box.querySelector('focsd-segment')
    );

    segment?.focus();
  });

  box.addEventListener('focusin', (event) => {
    const control = /** @type {HTMLElement} */ (event.target).closest('focsd-segmented-control, focsd-select, focsd-switch');

    if (!control) return;
    const kind = { 'focsd-segmented-control': 'Segmented control', 'focsd-select': 'Select', 'focsd-switch': 'Switch' }[control.localName];
    const label = control.getAttribute('label') ?? control.textContent?.trim() ?? '';
    focus.textContent = `${kind}: ${label}`;
  });
}
