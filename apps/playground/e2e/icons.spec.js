import { expect, settle, test } from './fixtures/test.js';
import { mountInBody as mount, openFromMinorsMisc } from './fixtures/pages.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/icons.html');
  await page.waitForFunction(() => Boolean(window.focsd && customElements.get('focsd-icon')));
});

const svgOf = (page, id) => page.locator(`#${id}`).locator('svg').first();

test('built-in icons are decorative by default and named by label', async ({ page }) => {
  await expect(svgOf(page, 'i-default').locator('path')).toHaveCount(1);
  await expect(page.locator('#i-default')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#i-labelled')).toHaveAttribute('role', 'img');
  await expect(page.locator('#i-labelled')).toHaveAccessibleName('Done');
});

test('Lucide and Font Awesome adapters render normalized SVG', async ({ page }) => {
  const lucide = svgOf(page, 'i-lucide');
  await expect(lucide.locator('path')).toHaveAttribute('d', 'm6 9 6 6 6-6');
  await expect(lucide).toHaveAttribute('stroke', 'currentColor');
  await expect(lucide).toHaveAttribute('width', '1em');
  await expect(lucide).toHaveAttribute('aria-hidden', 'true');

  for (const id of ['i-fa', 'i-fa-alias']) {
    await expect(svgOf(page, id)).toHaveAttribute('viewBox', '0 0 384 512');
    await expect(svgOf(page, id)).toHaveAttribute('fill', 'currentColor');
    await expect(svgOf(page, id).locator('path')).toHaveCount(1);
  }
});

test('a library registered after render updates the icons that use it', async ({ page }) => {
  const late = svgOf(page, 'i-late');
  await expect(late).toHaveAttribute('width', '1em');
  await expect(late.locator('circle')).toHaveCount(0);
  await page.evaluate(() =>
    window.focsd.registerIconLibrary('late', { resolve: () => '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>' }),
  );
  await expect(late.locator('circle')).toHaveCount(1);
});

test('fetched SVG (library URL and src) is sanitized', async ({ page }) => {
  for (const id of ['i-remote', 'i-src']) {
    const svg = svgOf(page, id);
    await expect(svg.locator('path')).toHaveCount(1);
    await expect(svg).toHaveAttribute('viewBox', '0 0 20 10');
    const html = await svg.evaluate((el) => el.outerHTML);
    expect(html).not.toMatch(/script|foreignObject|onload|onclick|javascript:/i);
  }

  expect(await page.evaluate(() => window.__pwned ?? false)).toBe(false);
});

test('a URL with a fragment renders a sprite reference', async ({ page }) => {
  await expect(svgOf(page, 'i-sprite').locator('use')).toHaveAttribute('href', '/icons/sprite.svg#dot');
});

test('unknown names keep a 1em box and warn once', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.reload();
  await page.waitForFunction(() => Boolean(customElements.get('focsd-icon')));
  await expect(svgOf(page, 'i-unknown-1')).toHaveAttribute('width', '1em');
  await expect.poll(() => warnings.filter((w) => w.includes('"nope"')).length).toBe(1);
  await settle(page);
  expect(warnings.filter((w) => w.includes('"nope"'))).toHaveLength(1);
});

test('mirror flips the icon in right-to-left text', async ({ page }) => {
  const transform = await svgOf(page, 'i-mirror').evaluate((el) => getComputedStyle(el).transform);
  expect(transform).toBe('matrix(-1, 0, 0, 1, 0, 0)');
});

test('slotted content replaces the icon in focsd-icon, icon button and disclosure', async ({ page }) => {
  await expect(page.locator('#i-slot svg[data-slotted]')).toBeVisible();
  expect(await page.locator('#i-slot').evaluate((el) => el.shadowRoot.querySelector('slot').assignedElements().length)).toBe(1);
  await expect(page.locator('#i-btn svg[data-own]')).toBeVisible();
  await expect(page.locator('#i-btn [part~="control"]')).toHaveAccessibleName('Settings');
  await expect(page.locator('#i-disc svg[data-disc]')).toBeVisible();
});

test('system icons can be overridden one at a time and reset', async ({ page }) => {
  // A system `x` drawn inside a component: the combobox's clear button.
  const close = page.locator('#i-combo [part~="clear"] svg');
  await expect(close.locator('path')).toHaveAttribute('d', 'M18 6 6 18M6 6l12 12');
  await page.evaluate(() => window.focsd.setSystemIcons({ x: '<svg data-custom viewBox="0 0 10 10"><path d="M1 1l8 8"/></svg>' }));
  await expect(close).toHaveAttribute('data-custom');
  await expect(close).toHaveAttribute('part', /icon/);
  await page.evaluate(() => window.focsd.setSystemIcons({ x: { library: 'lucide', name: 'x' } }));
  await expect(close).toHaveAttribute('stroke', 'currentColor');
  await expect(close.locator('path')).toHaveCount(2);
  await page.evaluate(() => window.focsd.resetSystemIcons());
  await expect(close.locator('path')).toHaveAttribute('d', 'M18 6 6 18M6 6l12 12');
  expect(await page.evaluate(() => window.focsd.systemIconNames.includes('x'))).toBe(true);
});

/** Collect console warnings that contain `text`. */
const warningsWith = (page, text) => {
  const found = [];
  page.on('console', (m) => m.type() === 'warning' && m.text().includes(text) && found.push(m.text()));

  return found;
};

/** Render `count` focsd-icons with the given attributes and wait for them. */
const addIcons = (page, attrs, count = 2) =>
  page.evaluate(
    async ([a, n]) => {
      const els = Array.from({ length: n }, () => Object.assign(document.createElement('focsd-icon'), { className: 'probe' }));

      for (const el of els) {
        for (const [k, v] of Object.entries(a)) el.setAttribute(k, v);
        document.body.append(el);
      }

      await Promise.all(els.map((el) => el.updateComplete));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
    [attrs, count],
  );

test('a throwing or rejecting resolver warns once per icon and renders the empty box', async ({ page }) => {
  const warnings = warningsWith(page, 'boom');
  await page.evaluate(() => {
    window.focsd.registerIconLibrary('throws', {
      resolve: () => {
        throw new Error('boom sync');
      },
    });
    window.focsd.registerIconLibrary('rejects', { resolve: () => Promise.reject(new Error('boom async')) });
  });
  await addIcons(page, { library: 'throws', name: 'a' });
  await addIcons(page, { library: 'rejects', name: 'b' });
  await expect(page.locator('focsd-icon.probe svg[width="1em"]')).toHaveCount(4);
  expect(warnings).toHaveLength(2);
  expect(warnings[0]).toMatch(/^Focsd: .*"a".*"throws".*boom sync/);
  expect(warnings[1]).toMatch(/^Focsd: .*"b".*"rejects".*boom async/);
});

test('a URL that fails to load is fetched once and warns once', async ({ page }) => {
  const warnings = warningsWith(page, '/icons/missing.svg');
  let requests = 0;
  page.on('request', (r) => r.url().endsWith('/icons/missing.svg') && requests++);
  await addIcons(page, { src: '/icons/missing.svg' });
  // The fetch starts once the lazily loaded sanitizer is in: wait for it and its warning, not a frame count.
  await expect.poll(() => requests).toBe(1);
  await expect.poll(() => warnings.length).toBe(1);
  await page.evaluate(async () => {
    for (const el of document.querySelectorAll('focsd-icon.probe')) el.requestUpdate();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await addIcons(page, { src: '/icons/missing.svg' }, 1);
  expect(requests).toBe(1);
  expect(warnings).toHaveLength(1);
});

test('only allowed SVG elements survive sanitizing (animateMotion and unknown tags go, a link is unwrapped)', async ({ page }) => {
  await page.evaluate(() =>
    window.focsd.registerIconLibrary('odd', {
      resolve: () =>
        '<svg viewBox="0 0 24 24"><g><a href="#x"><path d="M1 1h4"/></a><animateMotion dur="1s" path="M0 0h9"/><animateTransform attributeName="transform"/><discard/><x-thing/></g><title>t</title></svg>',
    }),
  );
  await addIcons(page, { library: 'odd', name: 'x' }, 1);

  const html = await page
    .locator('focsd-icon.probe svg')
    .first()
    .evaluate((el) => el.outerHTML);

  expect(html).toMatch(/<path/);
  expect(html).toMatch(/<g>/);
  expect(html).not.toMatch(/animateMotion|animateTransform|discard|x-thing|<a[\s>]/i);
});

const HOSTILE = [
  '<svg viewBox="0 0 24 24" transform="scale(30)" overflow="visible" x="-200" class="c" part="p" tabindex="0">',
  '<defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs>',
  '<path d="M0 0h9" fill="\\75rl(http://evil.test/a.svg#p)" mask="\\75rl(http://evil.test/b)"/>',
  '<path d="M0 0h9" mask="u\\rl(http://evil.test/c)" clip-path="\\75rl(http://evil.test/d)"/>',
  '<path d="M0 0h9" mask="image-set(\'http://evil.test/e.png\' 1x)" marker-end="\\75rl(http://evil.test/f)"/>',
  '<path d="M0 0h9" cursor="-webkit-image-set(\'http://evil.test/g.png\' 1x), auto" filter="url(http://evil.test/h)"/>',
  '<g tabindex="0" part="x" id="focsd-hint-1"><circle cx="5" cy="5" r="4" fill="url(#g)"/></g>',
  '</svg>',
].join('');

test('the sanitizer blocks every way an icon could load, escape its box, or take focus (m76)', async ({ page }) => {
  let evil = 0;
  await page.route('http://evil.test/**', (route) => {
    evil++;
    route.abort();
  });
  await page.evaluate((markup) => window.focsd.registerIconLibrary('hostile', { resolve: () => markup }), HOSTILE);
  await addIcons(page, { library: 'hostile', name: 'x' }, 1);
  await settle(page);
  const svg = page.locator('focsd-icon.probe svg').first();

  const info = await svg.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const host = el.getRootNode().host.getBoundingClientRect();

    return {
      html: el.outerHTML,
      inside: box.left >= host.left - 1 && box.right <= host.right + 1 && box.top >= host.top - 1 && box.bottom <= host.bottom + 1,
      focusable: el.querySelectorAll('[tabindex]').length + (el.hasAttribute('tabindex') ? 1 : 0),
      gradientRef: el.querySelector('circle').getAttribute('fill'),
      gradientId: el.querySelector('linearGradient').id,
    };
  });

  expect(evil).toBe(0);
  expect(info.inside).toBe(true);
  expect(info.focusable).toBe(0);
  expect(info.html).not.toMatch(/evil\.test|image-set|cursor=|part="[px]"|\bclass=|overflow=|transform="scale/);
  // Ids stay usable (gradients) but cannot collide with the component's own ids.
  expect(info.gradientId).not.toBe('g');
  expect(info.gradientRef).toBe(`url(#${info.gradientId})`);
  expect(info.html).not.toMatch(/id="focsd-hint-1"/);
});

test('two names that resolve to the same failing URL fetch it once and warn once per name, never as unknown (m41)', async ({ page }) => {
  const warnings = warningsWith(page, 'shared-missing');
  let requests = 0;
  page.on('request', (r) => r.url().endsWith('/icons/shared-missing.svg') && requests++);
  await page.evaluate(() => window.focsd.registerIconLibrary('shared', { resolve: () => '/icons/shared-missing.svg' }));
  await addIcons(page, { library: 'shared', name: 'one' }, 1);
  await addIcons(page, { library: 'shared', name: 'two' }, 1);
  // The warnings follow the failed fetch asynchronously: wait for both, then check nothing extra came.
  await expect.poll(() => warnings.length).toBe(2);
  expect(requests).toBe(1);
  expect(warnings.filter((w) => /unknown icon/.test(w))).toHaveLength(0);
});

test('an HTML page with an inline svg logo is not taken as the icon', async ({ page }) => {
  await page.route('**/icons/spa-fallback.svg', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body><svg width="9" height="9"><rect width="9" height="9"/></svg></body></html>',
    }),
  );
  await addIcons(page, { src: '/icons/spa-fallback.svg' }, 1);
  await expect(page.locator('focsd-icon.probe svg rect')).toHaveCount(0);
});

test('replacing a failing resolver re-enables the unknown-icon warning', async ({ page }) => {
  const warnings = warningsWith(page, '"later"');
  await page.evaluate(() =>
    window.focsd.registerIconLibrary('flaky', {
      resolve: () => {
        throw new Error('down');
      },
    }),
  );
  await addIcons(page, { library: 'flaky', name: 'later' }, 1);
  await page.evaluate(() => window.focsd.registerIconLibrary('flaky', { resolve: () => null }));
  await expect.poll(() => warnings.some((w) => /unknown icon "later"/.test(w))).toBe(true);
});

// Re-homed from review-fixes-10.spec.js (Q48).

const openIconsFromReviewFixes10 = async (page) => {
  await page.goto('/icons.html');
  await page.waitForFunction(() => Boolean(window.focsd));
};

test('style and url() paint references are stripped and never fetched', async ({ page }) => {
  await openIconsFromReviewFixes10(page);
  const requests = [];
  page.on('request', (r) => r.url().includes('tracker.example') && requests.push(r.url()));
  await page.evaluate(() => {
    window.focsd.registerIconLibrary('evil', {
      resolve: () =>
        '<svg viewBox="0 0 10 10" style="background:url(https://tracker.example/bg);position:fixed;inset:0;width:100vw;height:100vh"><path fill="url(https://tracker.example/p#x)" filter=" url( \'https://tracker.example/f\' )" d="M0 0h10v10z"/></svg>',
    });
    const el = document.createElement('focsd-icon');
    el.id = 'evil';
    Object.assign(el, { library: 'evil', name: 'x' });
    document.body.append(el);
  });
  const svg = page.locator('#evil svg');
  await expect(svg.locator('path')).toHaveCount(1);
  const html = await svg.evaluate((el) => el.outerHTML);
  expect(html).not.toMatch(/style=|tracker\.example/);
  const box = await svg.boundingBox();
  expect(box.width).toBeLessThan(100);
  await settle(page);
  expect(requests).toEqual([]);
});

test('namespaced external hrefs and non-svg roots from resolvers are removed', async ({ page }) => {
  await openIconsFromReviewFixes10(page);

  const r = await page.evaluate(async () => {
    const NS = 'http://www.w3.org/2000/svg';
    window.focsd.registerIconLibrary('dom', {
      resolve: (name) => {
        if (name === 'script') return document.createElementNS(NS, 'script');
        const svg = document.createElementNS(NS, 'svg');
        const image = document.createElementNS(NS, 'image');
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'evil:href', 'https://tracker.example/img');
        svg.append(image);

        return svg;
      },
    });
    const a = Object.assign(document.createElement('focsd-icon'), { library: 'dom', name: 'img' });
    const b = Object.assign(document.createElement('focsd-icon'), { library: 'dom', name: 'script' });
    document.body.append(a, b);
    await a.updateComplete;
    await b.updateComplete;
    const image = a.shadowRoot.querySelector('image');

    return [
      image ? image.attributes.length : -1,
      Boolean(b.shadowRoot.querySelector('script')),
      b.shadowRoot.querySelector('svg')?.localName,
    ];
  });

  // <image> is not on the element allowlist (it loads raster files), so it goes entirely.
  expect(r).toEqual([-1, false, 'svg']);
});

test('a failed fetch is retried after the registry changes', async ({ page }) => {
  await openIconsFromReviewFixes10(page);
  let fail = true;
  await page.route('**/icons/flaky.svg', (route) =>
    fail
      ? route.fulfill({ status: 500, body: '' })
      : route.fulfill({ contentType: 'image/svg+xml', body: '<svg viewBox="0 0 4 4"><circle r="2"/></svg>' }),
  );
  // The icon reports the failed fetch once it has handled it.
  const failed = page.waitForEvent('console', (m) => m.type() === 'warning' && m.text().includes('answered HTTP 500'));
  await page.evaluate(() => {
    window.focsd.registerIconLibrary('flaky', { resolve: (n) => `/icons/${n}.svg` });
    document.body.append(Object.assign(document.createElement('focsd-icon'), { id: 'flaky', library: 'flaky', name: 'flaky' }));
  });
  await failed;
  await expect(page.locator('#flaky svg circle')).toHaveCount(0);
  fail = false;
  await page.evaluate(() => window.focsd.registerIconLibrary('flaky', { resolve: (n) => `/icons/${n}.svg` }));
  await expect(page.locator('#flaky svg circle')).toHaveCount(1);
});

test('markup icons render under Trusted Types enforcement', async ({ page, browserName }) => {
  await openIconsFromReviewFixes10(page);
  test.skip(browserName !== 'chromium', 'Trusted Types enforcement is tested in Chromium');
  await page.route('**/icons.html', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': "require-trusted-types-for 'script'" },
    });
  });
  await page.goto('/icons.html');
  await page.waitForFunction(() => Boolean(window.focsd));
  await page.evaluate(() => {
    window.focsd.registerIconLibrary('tt', { resolve: () => '<svg viewBox="0 0 4 4"><rect width="4" height="4"/></svg>' });
    document.body.append(Object.assign(document.createElement('focsd-icon'), { id: 'tt', library: 'tt', name: 'x' }));
  });
  await expect(page.locator('#tt svg rect')).toHaveCount(1);
});

// Re-homed from minors-misc.spec.js (Q48).

test('an icon with slotted SVG never fetches its src fallback', async ({ page }) => {
  await openFromMinorsMisc(page);
  const requests = [];
  page.on('request', (r) => r.url().includes('never-fetch-me') && requests.push(r.url()));
  await mount(page, '<focsd-icon src="/never-fetch-me.svg"><svg viewBox="0 0 24 24"><path d="M2 2h20"/></svg></focsd-icon>');
  await settle(page);
  expect(requests).toEqual([]);
});

test('a failed icon loader download warns once and is not an unhandled rejection (B14)', async ({ page }) => {
  const warnings = [];
  const errors = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/icon-sources.js*', (route) => route.abort());
  await page.goto('/icons.html');
  await page.waitForFunction(() => Boolean(window.focsd && customElements.get('focsd-icon')));
  await page.evaluate(() => {
    window.focsd.registerIconLibrary('early', { resolve: () => null });
    window.focsd.setSystemIcons({});
  });
  await expect.poll(() => warnings.filter((w) => w.includes('the icon loader could not be loaded')).length).toBe(1);
  // Browsers keep a failed module fetch in their module map, so a retry happens only where the
  // loader allows it (bundler chunk loaders); the cached promise is dropped either way.
  expect(errors).toEqual([]);
});
