// The helper lives in @focsd-dev/primitives, which the playground does not depend on, so import its source.
import './base.js';
import '@focsd-dev/components';
import { listShortcuts, registerShortcut } from '../../../packages/primitives/src/utils.js';

const cmd = document.getElementById('cmd');
const dialog = document.getElementById('dlg');
const fired = document.getElementById('fired');
const count = document.getElementById('count');
const enabled = document.getElementById('enabled');
const board = document.getElementById('board');
let altN = 0;

/** @param {string} name */
const note = (name) => {
  fired.value = name;
};

registerShortcut('mod+k', () => cmd.show(), { description: 'Open the command palette' });

/** Alt + N has an off switch (WCAG 2.1.4): the switch unregisters it and registers it again. */
const bindAltN = () =>
  registerShortcut(
    'alt+n',
    () => {
      altN += 1;
      count.value = String(altN);
      note('alt+n');
    },
    { description: 'Count one new project' },
  );

let offAltN = bindAltN();

// A single-character shortcut is scoped to the board, so it only works while focus is inside (WCAG 2.1.4).
registerShortcut('j', () => note('j'), { scope: board, description: 'Next card (on the board)' });

document.getElementById('open-dialog').addEventListener('click', () => dialog.show());

document.getElementById('close-dialog').addEventListener('click', () => dialog.close());

enabled.addEventListener('change', () => {
  offAltN();
  offAltN = enabled.checked ? bindAltN() : () => {};

  renderList();
});

function renderList() {
  const tbody = document.querySelector('#shortcut-list tbody');

  tbody.replaceChildren(
    ...listShortcuts().map(({ keys, description }) => {
      const row = document.createElement('tr');

      row.append(
        Object.assign(document.createElement('td'), { textContent: keys }),
        Object.assign(document.createElement('td'), { textContent: description }),
      );

      return row;
    }),
  );
}

renderList();
