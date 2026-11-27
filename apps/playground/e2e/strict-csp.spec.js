import { readdirSync } from 'node:fs';
import { expect, test } from './fixtures/test.js';
import { mountInBody as mount, renderComplete } from './fixtures/pages.js';

// Focsd supports a strict style policy: `style-src 'self'`, with no 'unsafe-inline'. Such a policy
// blocks every `style="…"` attribute, so components set dynamic geometry through the CSSOM
// (the cssomStyle directive, el.style.setProperty), which a policy does not block.
//
// The dev server injects the page's own CSS (tokens, fonts) as <style> elements. Vite gives
// those elements the nonce from <meta property="csp-nonce">, so the policy allows them and still
// blocks every style attribute and every <style> element a component might add.

const NONCE = 'focsd-strict-csp';
const POLICY = `style-src 'self' 'nonce-${NONCE}' 'report-sample'`;

// The same style policy with Trusted Types enforced: no string may reach a script sink (innerHTML,
// eval, script src), so anything a component builds from text must go through DOM calls.
const TRUSTED_TYPES_POLICY = `${POLICY}; require-trusted-types-for 'script'`;

/** Inline `style="…"` attributes in the playground's own HTML: page content, not Focsd's. */
const PAGE_STYLE_ATTRIBUTE = /\sstyle="[^"]*"/g;

/**
 * Serve `path` under the strict policy and record every policy violation in
 * `window.__cspViolations` (with the violating element's tag, part and host), then wait for
 * `tags` to be defined. The page's own markup loses its style attributes and its <style> elements
 * get the nonce first, so every violation left comes from a component.
 */
async function openStrict(page, path, tags = [], policy = POLICY) {
  await page.addInitScript(() => {
    /** @type {Array<{ directive: string, sample: string, element: string }>} */
    const seen = [];
    window.__cspViolations = seen;
    document.addEventListener(
      'securitypolicyviolation',
      (event) => {
        const target = event.composedPath()[0];
        const host = target instanceof Element ? target.getRootNode().host : undefined;

        const name = (el) =>
          el instanceof Element
            ? `${el.localName}${el.id ? `#${el.id}` : ''}${el.getAttribute('part') ? `[part=${el.getAttribute('part')}]` : ''}`
            : String(el?.nodeName);

        seen.push({
          directive: event.effectiveDirective,
          sample: event.sample,
          element: host ? `${name(host)} > ${name(target)}` : name(target),
        });
      },
      true,
    );
  });
  await page.route(`**${path}`, async (route) => {
    const response = await route.fetch();

    const body = (await response.text())
      .replaceAll(PAGE_STYLE_ATTRIBUTE, '')
      .replaceAll('<style>', `<style nonce="${NONCE}">`)
      .replace('<head>', `<head><meta property="csp-nonce" nonce="${NONCE}" />`);

    const headers = { ...response.headers(), 'content-security-policy': policy };
    delete headers['content-length'];
    await route.fulfill({ response, body, headers });
  });
  await page.goto(path);
  await page.waitForFunction((names) => names.every((n) => customElements.get(n)), tags);
}

/** Bounding box of a part inside `selector`'s shadow root. */
const partBox = (page, selector, part) =>
  page.locator(selector).evaluate((el, p) => {
    const r = el.shadowRoot.querySelector(`[part~="${p}"]`).getBoundingClientRect();

    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, part);

test('the policy is in force: style attributes are blocked, nonce styles and tokens load', async ({ page }) => {
  await openStrict(page, '/display.html', ['focsd-progress']);

  const probe = await page.evaluate(() => {
    const div = document.createElement('div');
    div.setAttribute('style', 'inline-size: 13px');
    document.body.append(div);
    const width = getComputedStyle(div).inlineSize;
    div.remove();

    return { width, token: getComputedStyle(document.documentElement).getPropertyValue('--focsd-space-4').trim() };
  });

  expect(probe.width).not.toBe('13px');
  expect(probe.token).toBe('16px');
});

test('progress and meter indicators show their value', async ({ page }) => {
  await openStrict(page, '/display.html', ['focsd-progress', 'focsd-meter']);
  await page.evaluate(() => Promise.all(['progress', 'meter'].map((id) => document.getElementById(id).updateComplete)));
  // Value 40 of 100.
  const track = await partBox(page, '#progress', 'track');
  await expect.poll(async () => (await partBox(page, '#progress', 'indicator')).width / track.width).toBeCloseTo(0.4, 1);
  // Value 9 of 0–10.
  const meterTrack = await partBox(page, '#meter', 'track');
  await expect.poll(async () => (await partBox(page, '#meter', 'indicator')).width / meterTrack.width).toBeCloseTo(0.9, 1);
});

test('splitter, tree, image and scroll area keep their geometry', async ({ page }) => {
  await openStrict(page, '/data.html', ['focsd-splitter', 'focsd-tree-item', 'focsd-image', 'focsd-scroll-area']);
  await mount(
    page,
    `<focsd-splitter id="csp-split" label="Panels" value="30"><p slot="start">Start</p><p slot="end">End</p></focsd-splitter>
     <focsd-image id="csp-img" alt="" ratio="2 / 1"></focsd-image>
     <focsd-scroll-area id="csp-sa" label="Notes" max-block-size="5rem"><p>1</p><p>2</p><p>3</p><p>4</p><p>5</p><p>6</p><p>7</p><p>8</p></focsd-scroll-area>`,
  );

  const split = await page.locator('#csp-split').boundingBox();
  const start = await partBox(page, '#csp-split', 'start');
  expect(start.width / split.width).toBeCloseTo(0.3, 1);

  // A nested item's label starts one indent (1.25rem) further in than its parent's.
  const indent = await page.evaluate(() => {
    const label = (value) =>
      document.querySelector(`focsd-tree-item[value="${value}"]`).shadowRoot.querySelector('[part~="label"]').getBoundingClientRect().left;

    return label('src/index.js') - label('src');
  });

  expect(indent).toBeCloseTo(20, 0);

  const frame = await partBox(page, '#csp-img', 'frame');
  expect(frame.width / frame.height).toBeCloseTo(2, 1);

  const max = await page
    .locator('#csp-sa')
    .evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="viewport"]')).maxBlockSize);

  expect(max).toBe('80px');
});

test('grid: column widths, pinned offsets, group indent and the drop indicator', async ({ page }) => {
  await openStrict(page, '/grid.html', ['focsd-data-grid']);
  const grid = page.locator('#invoices');
  await grid.evaluate((el) => el.updateComplete);

  const cells = await grid.evaluate((el) => {
    const header = (name) =>
      [...el.shadowRoot.querySelectorAll('[role="columnheader"]')].find((h) => h.textContent.trim().startsWith(name));

    const invoice = header('Invoice');

    return { width: invoice.getBoundingClientRect().width, start: getComputedStyle(invoice).insetInlineStart };
  });

  // The select column is 48px wide; the pinned Invoice column (112px) sticks right after it.
  expect(cells.width).toBeCloseTo(112, 0);
  expect(cells.start).toBe('48px');

  // Two levels of grouping: the inner group's label is indented one step (16px).
  const padding = await grid.evaluate(async (el) => {
    el.setGroupBy(['region', 'status']);
    await el.updateComplete;
    el.shadowRoot.querySelector('[role="row"][aria-level="1"] [part~="group-toggle"]').click();
    await el.updateComplete;
    const label = (level) => el.shadowRoot.querySelector(`[role="row"][aria-level="${level}"] [part~="group-label"]`);

    return [getComputedStyle(label(1)).paddingInlineStart, getComputedStyle(label(2)).paddingInlineStart];
  });

  expect(padding).toEqual(['0px', '16px']);

  const drop = await grid.evaluate(async (el) => {
    el._drop = 120;
    await el.updateComplete;

    return getComputedStyle(el.shadowRoot.querySelector('[part~="drop-indicator"]')).insetInlineStart;
  });

  expect(drop).toBe('120px');
});

test('grid popups open next to their trigger', async ({ page }) => {
  await openStrict(page, '/grid.html', ['focsd-data-grid']);
  const grid = page.locator('#invoices');
  const header = grid.getByRole('columnheader', { name: /^Region/ });
  const trigger = header.getByRole('button', { name: 'Column options for Region' });

  const near = async (popup, button) => {
    const [p, b] = [await popup.boundingBox(), await button.boundingBox()];
    expect(Math.abs(p.y - (b.y + b.height))).toBeLessThan(24);
  };

  await trigger.click();
  const menu = grid.getByRole('menu', { name: 'Column options for Region' });
  await expect(menu).toBeVisible();
  await near(menu, trigger);

  await grid.getByRole('menuitem', { name: 'Filter…' }).click();
  const filter = grid.getByRole('dialog', { name: 'Filter Region' });
  await expect(filter).toBeVisible();
  await near(filter, trigger);
  await page.keyboard.press('Escape');

  const columns = grid.getByRole('button', { name: 'Columns' });
  await columns.click();
  const panel = grid.getByRole('dialog', { name: 'Columns' });
  await expect(panel).toBeVisible();
  await near(panel, columns);
});

test('windowed grid pads the rows it does not render', async ({ page }) => {
  await openStrict(page, '/grid.html', ['focsd-data-grid']);

  const pad = await page.locator('#big').evaluate(async (el) => {
    const scroller = el.shadowRoot.querySelector('[part~="grid"]');
    scroller.scrollTop = 4000;
    scroller.dispatchEvent(new Event('scroll'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await el.updateComplete;

    return Number.parseFloat(getComputedStyle(el.shadowRoot.querySelector('[part~="body"]')).paddingBlockStart);
  });

  expect(pad).toBeGreaterThan(1000);
});

test('the chart tooltip sits over the focused point', async ({ page }) => {
  await openStrict(page, '/charts.html', ['focsd-chart']);
  const chart = page.locator('#bar');
  await chart.evaluate((el) => el.updateComplete);
  await chart.getByRole('img', { name: 'Online, Q4: $2,100' }).focus();

  const [point, tip] = await chart.evaluate((el) => {
    const r = (n) => n.getBoundingClientRect();

    return [r(el.shadowRoot.querySelector('[part~="point-active"]')), r(el.shadowRoot.querySelector('[part~="tooltip"]'))];
  });

  const centre = tip.left + tip.width / 2;
  expect(centre).toBeGreaterThanOrEqual(point.left - 2);
  expect(centre).toBeLessThanOrEqual(point.right + 2);
  expect(tip.bottom).toBeLessThanOrEqual(point.top + 2);
});

test('sparklines and gauges draw under the policy with no violations', async ({ page }) => {
  await openStrict(page, '/charts-small.html', ['focsd-sparkline', 'focsd-gauge']);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('focsd-sparkline, focsd-gauge')].map((el) => el.updateComplete)));

  const drawn = await page.evaluate(() => ({
    lines: document.getElementById('line').shadowRoot.querySelectorAll('[part="line"]').length,
    needle: Boolean(document.getElementById('cpu').shadowRoot.querySelector('[part="needle"]')),
  }));

  expect(drawn).toEqual({ lines: 1, needle: true });
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

test('stat tiles, animated numbers and status dots render under the policy with no violations', async ({ page }) => {
  await openStrict(page, '/stat.html', ['focsd-stat', 'focsd-animated-number', 'focsd-status-dot']);
  await page.waitForFunction(() => window.__ready);
  await page.evaluate(() =>
    Promise.all([...document.querySelectorAll('focsd-stat, focsd-animated-number, focsd-status-dot')].map((el) => el.updateComplete)),
  );

  const rendered = await page.evaluate(() => ({
    stats: [...document.querySelectorAll('focsd-stat')].filter((el) => el.shadowRoot.querySelector('[part~="value"]')).length,
    dots: [...document.querySelectorAll('focsd-status-dot')].filter((el) => el.shadowRoot.querySelector('[part~="dot"] path')).length,
  }));

  expect(rendered.stats).toBeGreaterThan(0);
  expect(rendered.dots).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

test('image compare moves its clip by CSSOM under the policy, and the lightbox opens with no violations', async ({ page }) => {
  await openStrict(page, '/image-compare.html', ['focsd-image-compare']);
  await page.waitForFunction(() => window.__ready);

  const clip = () =>
    page.evaluate(() => getComputedStyle(document.getElementById('bridge').shadowRoot.querySelector('[part~="before"]')).clipPath);

  expect(await clip()).toBe('inset(0px 50% 0px 0px)');
  await page.getByRole('slider', { name: 'Bridge, 1990 and today' }).focus();
  await page.keyboard.press('PageUp');
  await expect.poll(clip).toBe('inset(0px 40% 0px 0px)');
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);

  await openStrict(page, '/lightbox.html', ['focsd-lightbox']);
  await page.waitForFunction(() => window.__ready);
  await page.getByRole('link', { name: 'A lake under a pale sky' }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog', { name: 'Landscapes' })).toContainText('Image 2 of 4');
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

test('the tour places its panel and spotlight by CSSOM under the policy', async ({ page }) => {
  await openStrict(page, '/tour.html', ['focsd-tour']);
  await page.locator('#start').click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Search');

  const placed = await page.locator('#tour').evaluate((el) => {
    const part = (p) => el.shadowRoot.querySelector(`[part~="${p}"]`);
    const panel = part('panel');
    const spotlight = part('spotlight');
    const target = document.getElementById('search').getBoundingClientRect();
    const box = panel.getBoundingClientRect();

    return {
      top: Number.parseFloat(panel.style.top),
      left: Number.parseFloat(panel.style.left),
      transform: spotlight.style.transform,
      gap: box.top - target.bottom,
      spot: spotlight.getBoundingClientRect().left - target.left,
    };
  });

  expect(placed.top).toBeGreaterThan(0);
  expect(placed.left).toBeGreaterThan(0);
  expect(placed.transform).toMatch(/^translate\(/);
  expect(placed.gap).toBeGreaterThanOrEqual(0);
  expect(placed.gap).toBeLessThanOrEqual(24);
  expect(Math.abs(placed.spot)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

test('a ratio or max-block-size value cannot add declarations', async ({ page }) => {
  // Without a policy: the value must stay inside its one declaration.
  await page.goto('/data.html');
  await page.waitForFunction(() => customElements.get('focsd-image') && customElements.get('focsd-scroll-area'));
  await mount(
    page,
    `<focsd-image id="inj-img" alt="" ratio="1; background-color: rgb(255, 0, 0)"></focsd-image>
     <focsd-scroll-area id="inj-sa" label="Notes" max-block-size="4rem; background-color: rgb(255, 0, 0)"><p>Text</p></focsd-scroll-area>`,
  );

  const colors = await page.evaluate(() =>
    ['#inj-img [part~="frame"]', '#inj-sa [part~="viewport"]'].map((sel) => {
      const [host, part] = sel.split(' ');

      return getComputedStyle(document.querySelector(host).shadowRoot.querySelector(part)).backgroundColor;
    }),
  );

  expect(colors).not.toContain('rgb(255, 0, 0)');
});

test('slider thumb and fill keep their position', async ({ page }) => {
  await openStrict(page, '/display.html', ['focsd-slider']);
  await mount(
    page,
    `<focsd-slider id="csp-slider" label="Volume" value="75"></focsd-slider>
     <focsd-slider id="csp-range" label="Price" range value-low="20" value-high="60"></focsd-slider>`,
  );

  const geometry = (id) =>
    page.locator(id).evaluate((el) =>
      Object.fromEntries(
        ['track', 'fill', 'thumb'].map((p) => {
          const r = el.shadowRoot.querySelector(`[part~="${p}"]`).getBoundingClientRect();

          return [p, { left: r.left, width: r.width }];
        }),
      ),
    );

  const single = await geometry('#csp-slider');
  const centre = (box, track) => (box.left + box.width / 2 - track.left) / track.width;
  expect(centre(single.thumb, single.track)).toBeCloseTo(0.75, 1);
  expect(single.fill.width / single.track.width).toBeCloseTo(0.75, 1);

  const range = await geometry('#csp-range');
  expect((range.fill.left - range.track.left) / range.track.width).toBeCloseTo(0.2, 1);
  expect(range.fill.width / range.track.width).toBeCloseTo(0.4, 1);
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

// A geometry binding that stops applying (the value becomes `nothing`, or the property is dropped)
// must not leave its last inline value behind.
test('unpinning a column clears its sticky offset', async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => customElements.get('focsd-data-grid'));

  const start = await page.locator('#invoices').evaluate(async (el) => {
    await el.updateComplete;
    el.pinColumn('id', null);
    await el.updateComplete;
    const cell = [...el.shadowRoot.querySelectorAll('[role="columnheader"]')].find((h) => h.textContent.trim().startsWith('Invoice'));

    return { inline: cell.style.getPropertyValue('inset-inline-start'), parts: cell.getAttribute('part') };
  });

  expect(start.parts).not.toContain('pinned');
  expect(start.inline).toBe('');
});

test('a grid that stops windowing drops the padding of unrendered rows', async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => customElements.get('focsd-data-grid'));

  const padding = await page.locator('#big').evaluate(async (el) => {
    const scroller = el.shadowRoot.querySelector('[part~="grid"]');
    scroller.scrollTop = 4000;
    scroller.dispatchEvent(new Event('scroll'));
    await el.updateComplete;
    el.rows = el.rows.slice(0, 50);
    await el.updateComplete;

    return el.shadowRoot.querySelector('[part~="body"]').style.getPropertyValue('padding-block');
  });

  expect(padding).toBe('');
});

const STYLE_MODULE = `/@fs${new URL('../../../packages/primitives/src/internal/style.js', import.meta.url).pathname}`;

/**
 * Run `body(lit, cssomStyle)` in the page with the directive and the page's own Lit instance (the
 * import Vite wrote into the transformed directive module).
 */
const withDirective = (page, body) =>
  page.evaluate(
    async ([url, source]) => {
      const text = await (await fetch(url)).text();
      const litUrl = /from\s*["']([^"']*\/lit\.js[^"']*)["']/.exec(text)[1];
      const [lit, { cssomStyle }] = await Promise.all([import(litUrl), import(url)]);

      return new Function('lit', 'cssomStyle', `return (${source})(lit, cssomStyle);`)(lit, cssomStyle);
    },
    [STYLE_MODULE, body.toString()],
  );

test('cssomStyle: real DOM — CSSOM writes, nothing clears, invalid values clear, reconnect restores', async ({ page }) => {
  await page.goto('/display.html');

  const result = await withDirective(page, ({ html, render, nothing }, cssomStyle) => {
    const box = document.createElement('div');
    document.body.append(box);
    const view = (style) => render(html`<p style=${style}></p>`, box);
    const p = () => box.querySelector('p');
    const out = {};

    view(cssomStyle({ 'inset-inline-start': '48px', '--_level': 2 }));
    out.first = [p().style.getPropertyValue('inset-inline-start'), p().style.getPropertyValue('--_level')];
    view(nothing);
    out.afterNothing = p().getAttribute('style') ?? '';
    view(cssomStyle({ 'aspect-ratio': '2 / 1' }));
    view(cssomStyle({ 'aspect-ratio': '1; color: red' }));
    out.afterInvalid = p().style.getPropertyValue('aspect-ratio');
    view(cssomStyle({ 'max-block-size': '4rem' }));
    const part = render(html`<p style=${cssomStyle({ 'max-block-size': '4rem' })}></p>`, box);
    part.setConnected(false);
    out.disconnected = p().style.getPropertyValue('max-block-size');
    part.setConnected(true);
    out.reconnected = p().style.getPropertyValue('max-block-size');
    box.remove();

    return out;
  });

  expect(result).toEqual({ first: ['48px', '2'], afterNothing: '', afterInvalid: '', disconnected: '', reconnected: '4rem' });
});

test('cssomStyle only binds as the whole style attribute', async ({ page }) => {
  await page.goto('/display.html');

  const errors = await withDirective(page, ({ html, render }, cssomStyle) =>
    [
      () => render(html`<p class=${cssomStyle({})}></p>`, document.createElement('div')),
      () => render(html`<p style="color: red; ${cssomStyle({})}"></p>`, document.createElement('div')),
      () => render(html`<p style="${cssomStyle({})} "></p>`, document.createElement('div')),
    ].map((run) => {
      try {
        run();

        return 'no error';
      } catch (error) {
        return /style attribute/.test(error.message) ? 'refused' : error.message;
      }
    }),
  );

  expect(errors).toEqual(['refused', 'refused', 'refused']);
});

test('the AI chat streams markdown under style-src and Trusted Types with no violations', async ({ page }) => {
  await openStrict(page, '/ai.html?delay=2', ['focsd-chat-thread', 'focsd-composer'], TRUSTED_TYPES_POLICY);
  await page.waitForFunction(() => window.__ready);

  // The policy is in force: a string cannot reach innerHTML. (The probe's own violation is cleared.)
  expect(
    await page.evaluate(async () => {
      // The violation event is queued: listen for it (after the recorder, which is first), then forget it.
      const reported = new Promise((resolve) => document.addEventListener('securitypolicyviolation', resolve, { once: true }));
      let result = 'blocked';

      try {
        document.createElement('div').innerHTML = '<b>x</b>';
        result = 'allowed';
      } catch {
        // Trusted Types refused the string.
      }

      if (result === 'blocked') await reported;
      window.__cspViolations.length = 0;

      return result;
    }),
  ).toBe('blocked');

  const textbox = page.getByRole('textbox', { name: 'Message' });

  // A reply with a list, a code block (with its copy button) and a link, built while it streams.
  await textbox.fill('Explain streaming markdown');
  await textbox.press('Enter');
  await expect(page.locator('focsd-chat-message[from="assistant"] article[aria-busy="true"]')).toHaveCount(1);
  await expect(page.locator('focsd-chat-message[from="assistant"] article[aria-busy="true"]')).toHaveCount(0);

  const reply = page.locator('focsd-chat-message[from="assistant"]').first();

  await expect(reply.getByRole('listitem')).toHaveCount(3);
  await expect(reply.locator('pre code')).toContainText('createChat');
  await expect(reply.getByRole('link', { name: 'A link' })).toBeVisible();

  // A tool call and its disclosure, and the composer's states, run under the same policy.
  await page.getByRole('button', { name: 'Show a tool call' }).click();
  await expect(page.getByRole('button', { name: 'search_docs, done' })).toBeVisible();
  await page.getByRole('button', { name: 'search_docs, done' }).click();
  await textbox.fill('Write a long answer');
  await textbox.press('Enter');
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await expect(page.locator('focsd-chat-message article[aria-busy="true"]')).toHaveCount(0);

  // The streaming caret and the composer's auto-grow set their geometry by CSSOM, not style attributes.
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

test('a hostile markdown reply stays inert under the strict policy', async ({ page }) => {
  await openStrict(page, '/ai.html?delay=2', ['focsd-chat-thread', 'focsd-composer'], TRUSTED_TYPES_POLICY);
  await page.waitForFunction(() => window.__ready);

  const textbox = page.getByRole('textbox', { name: 'Message' });

  // Script tags, javascript:/data:/entity-encoded links, onerror and onclick attributes.
  await textbox.fill('Send a hostile reply');
  await textbox.press('Enter');
  await expect(page.locator('focsd-chat-message[from="assistant"] article[aria-busy="true"]')).toHaveCount(0);

  const reply = page.locator('focsd-chat-message[from="assistant"]').first();

  await expect(reply).toContainText('<script>window.__pwned = true</script>');
  await expect(reply.getByRole('link')).toHaveCount(1);
  await expect(reply.getByRole('link')).toHaveAttribute('href', 'https://focsd.dev');

  const inert = await reply.evaluate((host) => {
    const all = [];

    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        all.push(el);

        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };

    walk(host.shadowRoot);

    return {
      scripts: all.filter((el) => el.localName === 'script' || el.localName === 'img').length,
      handlers: all.flatMap((el) => el.getAttributeNames()).filter((name) => name.startsWith('on')).length,
      unsafe: all.filter((el) => /^\s*(javascript|data|vbscript):/i.test(el.getAttribute('href') ?? '')).length,
    };
  });

  expect(inert).toEqual({ scripts: 0, handlers: 0, unsafe: 0 });
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

const PAGES = readdirSync(new URL('..', import.meta.url))
  .filter((f) => f.endsWith('.html'))
  .toSorted();

for (const file of PAGES) {
  test(`${file}: no style policy violations`, async ({ page }) => {
    await openStrict(page, `/${file}`);
    await renderComplete(page);
    const violations = await page.evaluate(() => window.__cspViolations);
    expect(violations).toEqual([]);
  });
}
