// cspell:ignore Kare
/** Live examples for the patterns page (src/content/docs/guides/patterns.mdx). */

export const examples = [
  {
    id: 'sign-in',
    title: 'Sign in',
    lead: 'A native form: required fields, an email type and a password field are validated by the browser, and the first problem gets focus. No form library needed.',
    html: `<form id="pattern-sign-in" class="stack" novalidate>
  <focsd-text-field label="Email" name="email" type="email" autocomplete="email" required></focsd-text-field>
  <focsd-password-field label="Password" name="password" autocomplete="current-password" required></focsd-password-field>
  <focsd-checkbox name="remember">Keep me signed in</focsd-checkbox>
  <focsd-button type="submit" variant="action">Sign in</focsd-button>
  <p id="pattern-sign-in-status" role="status"></p>
</form>`,
    script: `const form = document.getElementById('pattern-sign-in');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const email = new FormData(form).get('email');
  document.getElementById('pattern-sign-in-status').textContent = 'Signed in as ' + email;
});`,
  },
  {
    id: 'settings',
    title: 'Account settings',
    lead: 'Tabs group related settings, labels sit beside their fields (they stack on narrow screens), and every control submits and resets with the surrounding form, including fields on the hidden tab.',
    html: `<form class="stack" style="inline-size: min(100%, 34rem)">
  <focsd-tabs label="Settings">
    <focsd-tab>Profile</focsd-tab>
    <focsd-tab>Notifications</focsd-tab>
    <focsd-tab-panel>
      <div style="display: grid; gap: 1rem; padding-block: 1rem">
        <focsd-text-field label="Display name" label-position="start" name="name" value="Ada Lovelace" required></focsd-text-field>
        <focsd-select label="Time zone" label-position="start" name="tz" value="Europe/London" searchable>
          <focsd-option-group label="Europe">
            <focsd-option value="Europe/London">London</focsd-option>
            <focsd-option value="Europe/Berlin">Berlin</focsd-option>
          </focsd-option-group>
          <focsd-option-group label="Americas">
            <focsd-option value="America/New_York">New York</focsd-option>
            <focsd-option value="America/Los_Angeles">Los Angeles</focsd-option>
          </focsd-option-group>
        </focsd-select>
        <focsd-textarea label="Bio" label-position="start" name="bio" maxlength="160" hint="Shown on your public profile."></focsd-textarea>
      </div>
    </focsd-tab-panel>
    <focsd-tab-panel>
      <div style="display: grid; gap: 1rem; padding-block: 1rem">
        <focsd-switch name="digest" checked>Weekly digest</focsd-switch>
        <focsd-switch name="mentions" checked>Mentions</focsd-switch>
        <focsd-radio-group label="Email frequency" label-position="start" name="frequency" value="daily">
          <focsd-radio value="instant">As it happens</focsd-radio>
          <focsd-radio value="daily">Daily summary</focsd-radio>
        </focsd-radio-group>
      </div>
    </focsd-tab-panel>
  </focsd-tabs>
  <div style="display: flex; gap: 0.75rem">
    <focsd-button type="submit" variant="action">Save changes</focsd-button>
    <focsd-button type="reset">Discard</focsd-button>
  </div>
</form>`,
  },
  {
    id: 'team',
    title: 'Team members',
    lead: 'A data grid with quick search, sorting and a status column; the toolbar handles columns, density and export.',
    html: `<div class="full"><focsd-data-grid id="pattern-team" label="Team members" toolbar quick-search></focsd-data-grid></div>`,
    script: `const grid = document.getElementById('pattern-team');
grid.columns = [
  { id: 'name', header: 'Name' },
  { id: 'team', header: 'Team', type: 'enum', options: ['Platform', 'Research', 'Design'].map((v) => ({ value: v, label: v })) },
  { id: 'role', header: 'Role' },
  { id: 'joined', header: 'Joined', type: 'date' },
  { id: 'active', header: 'Active', type: 'boolean' },
];
grid.rows = [
  { id: 1, name: 'Ada Lovelace', team: 'Research', role: 'Lead', joined: '2019-03-04', active: true },
  { id: 2, name: 'Grace Hopper', team: 'Platform', role: 'Engineer', joined: '2016-07-18', active: true },
  { id: 3, name: 'Alan Turing', team: 'Research', role: 'Scientist', joined: '2021-01-11', active: false },
  { id: 4, name: 'Linus Torvalds', team: 'Platform', role: 'Maintainer', joined: '2022-05-02', active: true },
  { id: 5, name: 'Susan Kare', team: 'Design', role: 'Designer', joined: '2020-08-17', active: true },
];`,
  },
  {
    id: 'delete',
    title: 'Delete confirmation',
    lead: 'An alert dialog for an action that cannot be undone: it names the consequence, focuses the safe choice first and returns focus to the button that opened it.',
    html: `<focsd-button id="pattern-delete-open" variant="critical">Delete project</focsd-button>
<focsd-alert-dialog id="pattern-delete" headline="Delete this project?">
  <p>Northwind Studio and its 42 files will be deleted for everyone. This cannot be undone.</p>
  <focsd-button slot="actions" data-dialog-close value="cancel">Cancel</focsd-button>
  <focsd-button slot="actions" variant="critical" data-dialog-close value="delete">Delete project</focsd-button>
</focsd-alert-dialog>`,
    script: `const opener = document.getElementById('pattern-delete-open');
const dialog = document.getElementById('pattern-delete');
opener.addEventListener('click', () => dialog.show(opener));`,
  },
  {
    id: 'kanban',
    title: 'Kanban board',
    lead: 'Three sortable lists. Drag a card by its handle, or press Space on the handle and use the arrow keys, to reorder a column. "Move to" moves a card to another column with the keyboard or a single click, and a status message says where it went.',
    html: `<div class="full" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem">
  <div>
    <p><strong>To do</strong></p>
    <focsd-list id="kanban-todo" label="To do" sortable>
      <focsd-list-item label="Draft the release notes">
        Draft the release notes
        <focsd-menu label="Move Draft the release notes to">
          <focsd-button slot="trigger">Move to</focsd-button>
          <focsd-menu-item value="kanban-todo" disabled>To do</focsd-menu-item>
          <focsd-menu-item value="kanban-doing">In progress</focsd-menu-item>
          <focsd-menu-item value="kanban-done">Done</focsd-menu-item>
        </focsd-menu>
      </focsd-list-item>
      <focsd-list-item label="Fix the login redirect">
        Fix the login redirect
        <focsd-menu label="Move Fix the login redirect to">
          <focsd-button slot="trigger">Move to</focsd-button>
          <focsd-menu-item value="kanban-todo" disabled>To do</focsd-menu-item>
          <focsd-menu-item value="kanban-doing">In progress</focsd-menu-item>
          <focsd-menu-item value="kanban-done">Done</focsd-menu-item>
        </focsd-menu>
      </focsd-list-item>
    </focsd-list>
  </div>
  <div>
    <p><strong>In progress</strong></p>
    <focsd-list id="kanban-doing" label="In progress" sortable>
      <focsd-list-item label="Update the pricing page">
        Update the pricing page
        <focsd-menu label="Move Update the pricing page to">
          <focsd-button slot="trigger">Move to</focsd-button>
          <focsd-menu-item value="kanban-todo">To do</focsd-menu-item>
          <focsd-menu-item value="kanban-doing" disabled>In progress</focsd-menu-item>
          <focsd-menu-item value="kanban-done">Done</focsd-menu-item>
        </focsd-menu>
      </focsd-list-item>
      <focsd-list-item label="Review the onboarding flow">
        Review the onboarding flow
        <focsd-menu label="Move Review the onboarding flow to">
          <focsd-button slot="trigger">Move to</focsd-button>
          <focsd-menu-item value="kanban-todo">To do</focsd-menu-item>
          <focsd-menu-item value="kanban-doing" disabled>In progress</focsd-menu-item>
          <focsd-menu-item value="kanban-done">Done</focsd-menu-item>
        </focsd-menu>
      </focsd-list-item>
    </focsd-list>
  </div>
  <div>
    <p><strong>Done</strong></p>
    <focsd-list id="kanban-done" label="Done" sortable>
      <focsd-list-item label="Book the venue">
        Book the venue
        <focsd-menu label="Move Book the venue to">
          <focsd-button slot="trigger">Move to</focsd-button>
          <focsd-menu-item value="kanban-todo">To do</focsd-menu-item>
          <focsd-menu-item value="kanban-doing">In progress</focsd-menu-item>
          <focsd-menu-item value="kanban-done" disabled>Done</focsd-menu-item>
        </focsd-menu>
      </focsd-list-item>
    </focsd-list>
  </div>
</div>
<p id="pattern-kanban-status" role="status"></p>`,
    script: `const status = document.getElementById('pattern-kanban-status');
const columns = [...document.querySelectorAll('#kanban-todo, #kanban-doing, #kanban-done')];
// Each card's menu offers the other two columns.
const sync = () => {
  for (const column of columns) {
    for (const item of column.querySelectorAll('focsd-menu-item')) item.disabled = item.value === column.id;
  }
};
for (const column of columns) {
  column.addEventListener('focsd-select', (event) => {
    const card = event.target.closest('focsd-list-item');
    const to = document.getElementById(event.detail.value);
    if (!card || !to || card.parentElement === to) return;
    to.append(card);
    sync();
    status.textContent = 'Moved ' + card.label + ' to ' + to.label;
    requestAnimationFrame(() => card.querySelector('[slot="trigger"]').focus());
  });
}`,
  },
  {
    id: 'app-shell',
    title: 'App shell',
    lead: 'A whole page on `focsd-app-shell`: header, navigation, one main landmark with a skip link to it, and a table of contents for the article. Make the window narrow and the navigation moves into a drawer.',
    frame: true,
    html: `<focsd-app-shell nav-label="Handbook">
  <focsd-header slot="header" collapse-below="0"><a href="#" slot="brand">Northwind handbook</a></focsd-header>
  <focsd-sidebar slot="sidebar" label="Handbook">
    <focsd-sidebar-item href="#" current>Onboarding</focsd-sidebar-item>
    <focsd-sidebar-item href="#">Time off</focsd-sidebar-item>
    <focsd-sidebar-item href="#">Expenses</focsd-sidebar-item>
  </focsd-sidebar>
  <h1>Onboarding</h1>
  <focsd-table-of-contents></focsd-table-of-contents>
  <h2>Your first day</h2>
  <p>Collect your laptop from the front desk at 9:00. Your manager meets you there.</p>
  <h3>Accounts</h3>
  <p>Sign in to email and chat with the temporary password in your welcome letter, then change it.</p>
  <h2>Your first week</h2>
  <p>Pair with a teammate on a small change and ship it by Friday.</p>
  <h2>Who to ask</h2>
  <p>Questions about pay go to people@northwind.example; everything else to your manager.</p>
  <focsd-footer slot="footer"><p>© 2026 Northwind</p></focsd-footer>
</focsd-app-shell>`,
  },
];
