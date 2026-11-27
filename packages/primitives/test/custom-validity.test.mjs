// @vitest-environment happy-dom
// setCustomValidity('') clears a custom error even after checkValidity() showed it, like a native input.
import { afterEach, expect, it } from 'vitest';
import './helpers/element-internals.js';
import { FocsdTextFieldBase } from '../src/text-field/text-field-base.js';

customElements.define('x-cv-field', FocsdTextFieldBase);

afterEach(() => {
  document.body.innerHTML = '';
});

it('clears a custom error that checkValidity() showed', async () => {
  document.body.innerHTML = '<form><x-cv-field label="Name" name="name"></x-cv-field></form>';
  const el = /** @type {any} */ (document.querySelector('x-cv-field'));

  await el.updateComplete;
  el.setCustomValidity('Not allowed here.');
  expect(el.checkValidity()).toBe(false);
  expect(el.validationMessage).toBe('Not allowed here.');

  el.setCustomValidity('');
  expect(el.checkValidity()).toBe(true);
  expect(el.validationMessage).toBe('');
});

it('keeps an error the author set by hand', async () => {
  document.body.innerHTML = '<form><x-cv-field label="Name" name="name"></x-cv-field></form>';
  const el = /** @type {any} */ (document.querySelector('x-cv-field'));

  await el.updateComplete;
  el.error = 'Name is taken.';
  el.setCustomValidity('');
  expect(el.checkValidity()).toBe(false);
});
