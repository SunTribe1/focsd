// Sign-in block: client-side checks only. There is no authentication here and nothing is sent:
// replace the marked line with a call to your own sign-in endpoint.
import '@focsd-dev/components/focsd-card.js';
import '@focsd-dev/components/focsd-text-field.js';
import '@focsd-dev/components/focsd-password-field.js';
import '@focsd-dev/components/focsd-checkbox.js';
import '@focsd-dev/components/focsd-link.js';
import '@focsd-dev/components/focsd-button.js';
import '@focsd-dev/components/focsd-error-summary.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = document.getElementById('sign-in-form');
const summary = form.querySelector('focsd-error-summary');
const status = document.getElementById('sign-in-status');

/** One message per rule, or '' when the value is fine. Edit the wording here. */
const rules = [
  {
    field: document.getElementById('email'),
    check: (value) => {
      if (!value.trim()) return 'Enter your email address';

      return EMAIL.test(value.trim()) ? '' : 'Enter an email address in the format name@example.com';
    },
  },
  {
    field: document.getElementById('password'),
    check: (value) => (value ? '' : 'Enter your password'),
  },
];

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

  if (rules.some(({ field }) => field.error)) {
    summary.collect(form); // takes focus

    return;
  }

  summary.errors = [];
  // Your sign-in call goes here, with the form values read from `new FormData(form)`.
  status.textContent = 'Sample page: nothing was sent.';
});
