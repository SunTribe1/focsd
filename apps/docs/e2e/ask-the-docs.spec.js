import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { components } from '../src/data/catalogue.js';

// "Ask the docs": the floating launcher and chat panel on the landing and on docs pages. Answers
// come from /ask-index.json, searched in the browser; nothing else goes over the network.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.use({ contextOptions: { reducedMotion: 'reduce' } });

/** The newest assistant reply's text, read through the chat elements' shadow roots. */
const lastReply = (page) => page.locator('focsd-chat-message[from="assistant"]').last();

const open = async (page) => {
  const launcher = page.getByRole('button', { name: 'Ask the docs', exact: true });
  await launcher.click();
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  const panel = page.getByRole('dialog', { name: 'Ask the docs' });
  await expect(panel).toBeVisible();

  return { launcher, panel };
};

test('the launcher opens the panel with suggestions and puts focus in the question field', async ({ page }) => {
  await page.goto('/');
  const { panel } = await open(page);
  await expect(panel.getByRole('textbox', { name: 'Ask a question' })).toBeFocused();
  const suggestions = panel.getByRole('list', { name: 'Try asking' }).getByRole('button');
  await expect(suggestions).toHaveText([
    'How do I build a form with validation?',
    'Is there a data grid?',
    'How do I theme it?',
    'Does it work with React?',
  ]);
});

test('a suggested question gets the component, a snippet and a link to its page', async ({ page }) => {
  await page.goto('/');
  const { panel } = await open(page);
  await panel.getByRole('button', { name: 'Is there a data grid?' }).click();
  const reply = lastReply(page);
  await expect(reply).toContainText('Yes. Data grid');
  await expect(reply.locator('pre code')).toContainText('<focsd-data-grid');
  await expect(reply.getByRole('link', { name: 'Data grid', exact: true }).first()).toHaveAttribute('href', '/components/data-grid/');
  await expect(page.locator('focsd-chat-message article[aria-busy="true"]')).toHaveCount(0);
});

test('a typed question is answered from the guides', async ({ page }) => {
  await page.goto('/');
  const { panel } = await open(page);
  await panel.getByRole('textbox', { name: 'Ask a question' }).fill('Does it work with React?');
  await page.keyboard.press('Enter');
  await expect(lastReply(page).getByRole('link', { name: 'Frameworks' }).first()).toHaveAttribute('href', '/getting-started/frameworks/');
});

test('an unknown question says so and links to search', async ({ page }) => {
  await page.goto('/');
  const { panel } = await open(page);
  await panel.getByRole('textbox', { name: 'Ask a question' }).fill('What is the airspeed of a swallow?');
  await page.keyboard.press('Enter');
  const reply = lastReply(page);
  await expect(reply).toContainText('I could not find a clear answer');
  await expect(reply.getByRole('link', { name: 'searching the docs' })).toHaveAttribute('href', /^\/\?search=What/);
  await expect(reply.getByRole('link', { name: `all ${components.length} components` })).toHaveAttribute('href', '/components/');
});

test('Escape and the close button close the panel and return focus to the launcher', async ({ page }) => {
  await page.goto('/');
  let { launcher, panel } = await open(page);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');

  ({ launcher, panel } = await open(page));
  await panel.getByRole('button', { name: 'Close Ask the docs' }).click();
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
});

test('the launcher is reachable with the keyboard', async ({ page }) => {
  await page.goto('/');
  const launcher = page.getByRole('button', { name: 'Ask the docs', exact: true });
  await launcher.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Ask the docs' })).toBeVisible();
});

test('only the index is fetched: no other request leaves the page', async ({ page, baseURL }) => {
  await page.goto('/');
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  const { panel } = await open(page);
  await panel.getByRole('button', { name: 'How do I theme it?' }).click();
  await expect(lastReply(page)).toContainText('Theming and tokens');
  expect(requests.filter((url) => !url.startsWith(baseURL))).toEqual([]);
  expect(requests.filter((url) => !url.includes('/_astro/'))).toEqual([`${baseURL}/ask-index.json`]);
});

for (const theme of ['light', 'dark']) {
  test(`the open panel with a reply has no accessibility violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    const { panel } = await open(page);
    await panel.getByRole('button', { name: 'How do I build a form with validation?' }).click();
    await expect(lastReply(page)).toContainText('Forms');
    await expect(page.locator('focsd-chat-message article[aria-busy="true"]')).toHaveCount(0);
    const results = await new AxeBuilder({ page }).include('.ask').withTags(TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('docs pages have the bot too, above the sidebars', async ({ page }) => {
  await page.goto('/components/button/');
  const { panel } = await open(page);
  await panel.getByRole('button', { name: 'Does it work with React?' }).click();
  await expect(lastReply(page)).toContainText('Frameworks');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Ask the docs', exact: true })).toBeFocused();
});

test('the index lists every documented component and the guide topics', async ({ request }) => {
  const index = await (await request.get('/ask-index.json')).json();
  expect(index.count).toBe(components.length);
  const tags = index.entries.filter((e) => e.kind === 'component').map((e) => e.tag);
  expect(tags.toSorted()).toEqual(components.map((c) => c.tag).toSorted());
  expect(index.entries.find((e) => e.url === '/getting-started/forms/')).toMatchObject({ kind: 'guide', name: 'Forms' });
});

test('the panel keeps its banner in view and the send button at the end of the field', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const { panel } = await open(page);
  const field = panel.getByRole('textbox', { name: 'Ask a question' });
  await expect(field).toBeFocused();

  const [banner, panelBox, send, fieldBox] = await Promise.all([
    panel.getByRole('heading', { name: 'Ask the docs' }).boundingBox(),
    panel.boundingBox(),
    panel.getByRole('button', { name: /send/i }).boundingBox(),
    field.boundingBox(),
  ]);

  // Focusing the field must not scroll the banner out of the panel.
  expect(banner.y).toBeGreaterThanOrEqual(panelBox.y);
  // The send button sits after the field, at the panel's end edge, inside its padding.
  expect(send.x).toBeGreaterThan(fieldBox.x + fieldBox.width - 1);
  expect(panelBox.x + panelBox.width - (send.x + send.width)).toBeLessThan(48);
  expect(panelBox.y + panelBox.height - (send.y + send.height)).toBeGreaterThanOrEqual(12);
});

test('minimize keeps the conversation; close ends it', async ({ page }) => {
  await page.goto('/');
  const opened = await open(page);
  const { launcher } = opened;
  let { panel } = opened;
  await panel.getByRole('button', { name: 'Is there a data grid?' }).click();
  await expect(lastReply(page)).toContainText('Data grid');

  await panel.getByRole('button', { name: 'Minimize Ask the docs' }).click();
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
  ({ panel } = await open(page));
  await expect(lastReply(page)).toContainText('Data grid');

  await panel.getByRole('button', { name: 'Close Ask the docs and end the conversation' }).click();
  await expect(panel).toBeHidden();
  ({ panel } = await open(page));
  await expect(page.locator('focsd-chat-message')).toHaveCount(0);
  await expect(panel.getByText('Hi, what are you building?')).toBeVisible();
});
