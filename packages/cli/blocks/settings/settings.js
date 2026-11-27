// Settings block: validation, a save event, and the "Settings saved" announcement. The announcement
// follows the save: it waits for every promise handed to event.detail.until(), and is skipped when a
// handler calls preventDefault() (you show your own result) or a promise rejects (an error is shown).
// The sample handler at the bottom sends nothing: replace it with your own save call.
import '@focsd-dev/components/focsd-app-shell.js';
import '@focsd-dev/components/focsd-header.js';
import '@focsd-dev/components/focsd-theme-toggle.js';
import '@focsd-dev/components/focsd-sidebar.js';
import '@focsd-dev/components/focsd-sidebar-item.js';
import '@focsd-dev/components/focsd-tabs.js';
import '@focsd-dev/components/focsd-tab.js';
import '@focsd-dev/components/focsd-tab-panel.js';
import '@focsd-dev/components/focsd-text-field.js';
import '@focsd-dev/components/focsd-select.js';
import '@focsd-dev/components/focsd-option.js';
import '@focsd-dev/components/focsd-fieldset.js';
import '@focsd-dev/components/focsd-switch.js';
import '@focsd-dev/components/focsd-button.js';
import '@focsd-dev/components/focsd-error-summary.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = document.getElementById('settings-form');
const summary = form.querySelector('focsd-error-summary');
const tabs = form.querySelector('focsd-tabs');
const status = document.getElementById('save-status');

/** One message per rule, or '' when the value is fine. Edit the wording here. */
const rules = [
  {
    field: document.getElementById('name'),
    check: (value) => (value.trim() ? '' : 'Enter your full name'),
  },
  {
    field: document.getElementById('email'),
    check: (value) => {
      if (!value.trim()) return 'Enter your email address';

      return EMAIL.test(value.trim()) ? '' : 'Enter an email address in the format name@example.com';
    },
  },
];

/** Show the panel that holds a field, so the summary's link can reach it. */
function revealPanelOf(field) {
  const panel = field.closest('focsd-tab-panel');
  const index = [...tabs.querySelectorAll(':scope > focsd-tab-panel')].indexOf(panel);

  if (index >= 0) tabs.selected = index;
}

/** Announce a message in the live region, even when the same text was announced before. */
function announce(message) {
  status.textContent = '';
  requestAnimationFrame(() => {
    status.textContent = message;
  });
}

for (const { field } of rules) {
  // Clear a field's own message as soon as the person edits it. Nothing is checked on blur: a message
  // appearing there can shift the page and swallow the click on Save. The summary refreshes on submit.
  field.addEventListener('input', () => {
    field.error = '';
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.textContent = '';

  for (const { field, check } of rules) field.error = check(field.value);

  const failed = rules.find(({ field }) => field.error);

  if (failed) {
    revealPanelOf(failed.field);
    summary.collect(form); // takes focus

    return;
  }

  summary.errors = [];
  save(Object.fromEntries(new FormData(form)));
});

/** Fire the cancelable save event, wait for what handlers register, then announce the result. */
async function save(values) {
  const pending = [];

  const event = new CustomEvent('settings:save', {
    cancelable: true,
    bubbles: true,
    detail: { values, until: (promise) => pending.push(promise) },
  });

  form.dispatchEvent(event);

  try {
    await Promise.all(pending);
  } catch {
    announce('Settings could not be saved. Try again.');

    return;
  }

  if (!event.defaultPrevented) announce('Settings saved');
}

// SAMPLE WIRING: this handler stands in for your server call and resolves at once, so nothing is
// sent. Replace it, for example with:
//   form.addEventListener('settings:save', (e) => e.detail.until(fetch('/api/settings', { method: 'POST', body: JSON.stringify(e.detail.values) })));
form.addEventListener('settings:save', (event) => event.detail.until(Promise.resolve()));
