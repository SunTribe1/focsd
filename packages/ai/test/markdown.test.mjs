// @vitest-environment happy-dom
// cspell:words avascript msgbox Njcmlwd intraword
// The vendored markdown renderer (R2): a small AST built to the DOM with createElement and
// textContent only. Raw HTML is text, links keep only safe schemes, and pathological input
// finishes quickly without recursion overflow.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { parse, plainText, render, renderMarkdown, safeHref } from '../src/markdown/index.js';

/** Render markdown into a fresh element and return it. */
function md(/** @type {string} */ text) {
  const box = document.createElement('div');
  box.append(render(parse(text)));

  return box;
}

/** The rendered HTML with whitespace kept, for structure assertions. */
const htmlOf = (/** @type {string} */ text) => md(text).innerHTML;

it.each([
  ['paragraph', 'Hello world', '<p>Hello world</p>'],
  ['two paragraphs', 'a\n\nb', '<p>a</p><p>b</p>'],
  ['emphasis with stars', '*a*', '<p><em>a</em></p>'],
  ['emphasis with underscores', '_a_', '<p><em>a</em></p>'],
  ['strong', '**a**', '<p><strong>a</strong></p>'],
  ['strong with underscores', '__a__', '<p><strong>a</strong></p>'],
  ['nested emphasis', '**a *b* c**', '<p><strong>a <em>b</em> c</strong></p>'],
  ['intraword underscores stay text', 'snake_case_name', '<p>snake_case_name</p>'],
  ['a lone star stays text', '2 * 3 = 6', '<p>2 * 3 = 6</p>'],
  ['inline code', 'run `npm i` now', '<p>run <code>npm i</code> now</p>'],
  ['inline code keeps markup as text', '`*a* <b>`', '<p><code>*a* &lt;b&gt;</code></p>'],
  ['double backtick code', '``a ` b``', '<p><code>a ` b</code></p>'],
  ['escaped star', String.raw`\*a\*`, '<p>*a*</p>'],
  ['hard break with two spaces', 'a  \nb', '<p>a<br>b</p>'],
  ['hard break with a backslash', 'a\\\nb', '<p>a<br>b</p>'],
  ['soft break stays a newline', 'a\nb', '<p>a\nb</p>'],
  ['heading 1 is h3', '# Title', '<h3>Title</h3>'],
  ['heading 2 is h4', '## Title ##', '<h4>Title</h4>'],
  ['heading 6 stays h6', '###### Deep', '<h6>Deep</h6>'],
  ['seven hashes are text', '####### x', '<p>####### x</p>'],
  ['a closing hash run needs a space before it', '# foo#', '<h3>foo#</h3>'],
  ['a heading of only a closing run is empty', '### ###', '<h5></h5>'],
  ['tabs around a heading and its closing run', '#\ta\t#\t', '<h3>a</h3>'],
  ['a long closing run', `# a ${'#'.repeat(50)}`, '<h3>a</h3>'],
  ['blockquote', '> quoted\n> more', '<blockquote><p>quoted\nmore</p></blockquote>'],
  ['unordered list', '- a\n- b', '<ul><li>a</li><li>b</li></ul>'],
  ['ordered list with start', '3. a\n4. b', '<ol start="3"><li>a</li><li>b</li></ol>'],
  ['nested list', '- a\n  - b\n- c', '<ul><li><p>a</p><ul><li>b</li></ul></li><li>c</li></ul>'],
  ['list interrupts a paragraph', 'Steps:\n1. one', '<p>Steps:</p><ol><li>one</li></ol>'],
])('%s', (_name, source, expected) => {
  expect(htmlOf(source)).toBe(expected);
});

it('renders a fenced code block with its language and keeps the code as text', () => {
  const box = md('```js\nconst a = "<b>";\n```');
  const pre = /** @type {HTMLElement} */ (box.querySelector('pre'));

  expect(pre.getAttribute('data-language')).toBe('js');
  expect(pre.getAttribute('part')).toBe('code');
  expect(pre.textContent).toBe('const a = "<b>";');
  expect(box.querySelector('b')).toBeNull();
});

it('drops an unsafe code language label', () => {
  expect(md('```"><img\nx\n```').querySelector('pre')?.hasAttribute('data-language')).toBe(false);
});

it('keeps an unterminated fence open to the end (streaming)', () => {
  expect(md('```py\nprint(1)\n# not a heading').querySelector('pre')?.textContent).toBe('print(1)\n# not a heading');
});

it('renders links with rel and without target', () => {
  const a = /** @type {HTMLAnchorElement} */ (md('[docs](https://focsd.dev/a?b=1)').querySelector('a'));

  expect(a.getAttribute('href')).toBe('https://focsd.dev/a?b=1');
  expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  expect(a.hasAttribute('target')).toBe(false);
  expect(a.textContent).toBe('docs');
});

it.each([
  ['https://a.example/', 'https://a.example/'],
  ['http://a.example', 'http://a.example'],
  ['HTTPS://A.EXAMPLE', 'HTTPS://A.EXAMPLE'],
  ['mailto:me@example.com', 'mailto:me@example.com'],
  ['/docs/x', '/docs/x'],
  ['#section', '#section'],
  [' https://a.example ', 'https://a.example'],
  ['javascript:alert(1)', null],
  ['JaVaScRiPt:alert(1)', null],
  ['  javascript:alert(1)', null],
  ['java\tscript:alert(1)', null],
  ['java\nscript:alert(1)', null],
  ['\u0001javascript:alert(1)', null],
  ['&#106;avascript:alert(1)', null],
  ['&#x6A;avascript:alert(1)', null],
  ['vbscript:msgbox(1)', null],
  ['data:text/html,<script>alert(1)</script>', null],
  ['DATA:text/html;base64,PHNjcmlwdD4=', null],
  ['//evil.example', null],
  ['/\\evil.example', null],
  ['\\\\evil.example', null],
  ['file:///etc/passwd', null],
  ['relative/path', null],
  ['', null],
])('safeHref(%j) is %j', (input, expected) => {
  expect(safeHref(input)).toBe(expected);
});

it.each([
  '[x](javascript:alert(1))',
  '[x](JaVaScRiPt:alert(1))',
  '[x](vbscript:msgbox(1))',
  '[x](data:text/html,hi)',
  '[x](//evil.example)',
  '[x](&#106;avascript:alert(1))',
])('an unsafe link %s becomes plain text', (source) => {
  const box = md(source);

  expect(box.querySelector('a')).toBeNull();
  expect(box.textContent).toBe(source);
});

it.each([
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<svg><style>@import "x"</style></svg>',
  '![img](https://a.example/x.png)',
  '| a | b |\n|---|---|',
])('raw markup %s stays text', (source) => {
  const box = md(source);

  expect(box.querySelectorAll('script, img, iframe, svg, style, a, table').length).toBe(0);
  expect(box.textContent?.replaceAll('\n', '')).toContain(source.replaceAll('\n', '').slice(0, 10));
});

it('never sets an event-handler attribute anywhere', () => {
  const box = md('<b onclick=x>*a*</b> [y](https://a.example "t" onclick=x) `<i onload=x>`');
  const attrs = [...box.querySelectorAll('*')].flatMap((el) => el.getAttributeNames());

  expect(attrs.filter((name) => name.startsWith('on'))).toEqual([]);
});

/** Milliseconds a call takes. */
function timed(/** @type {() => void} */ fn) {
  const start = performance.now();
  fn();

  return performance.now() - start;
}

// Wall-clock bounds are not stable under load, so the tests check how the time grows: ten times the
// input may take about ten times as long (20x leaves room for noise); quadratic would take 100x. The
// ceiling is far above any healthy run and only catches a hang.
const GROWTH = 20;
const NOISE_FLOOR_MS = 10;
const CEILING_MS = 5000;

/**
 * Times the small and the large call (best of several, taken in alternation so a busy machine slows
 * both alike) and checks the time grew about linearly. A pause makes one measurement look
 * worse than linear, so a miss is measured again; a really quadratic parse misses every time.
 */
function expectLinear(/** @type {() => unknown} */ small, /** @type {() => unknown} */ large, measure = timed, attempts = 4) {
  let last = { smallMs: 0, largeMs: 0 };

  for (let attempt = 0; attempt < attempts; attempt++) {
    last = { smallMs: Infinity, largeMs: Infinity };

    for (let run = 0; run < 5; run++) {
      last.smallMs = Math.min(last.smallMs, measure(small));
      last.largeMs = Math.min(last.largeMs, measure(large));
    }

    if (last.largeMs < Math.max(last.smallMs, NOISE_FLOOR_MS) * GROWTH) break;
  }

  expect(last.largeMs).toBeLessThan(Math.max(last.smallMs, NOISE_FLOOR_MS) * GROWTH);
  expect(last.largeMs).toBeLessThan(CEILING_MS);
}

/** [name, source for n units]. Full size (10 x) is about 1 MB or 1,000 nesting levels. */
const ADVERSARIAL = [
  ['1,000-level blockquote', (n) => `${'>'.repeat(n * 100)} deep`],
  // Indentation grows with depth, so the text is quadratic in the levels: levels go with sqrt(n) to keep the text linear in n.
  ['deeply nested list', (n) => Array.from({ length: Math.round(100 * Math.sqrt(n)) }, (_, i) => `${'  '.repeat(i)}- x`).join('\n')],
  ['1,000-level emphasis', (n) => `${'*_'.repeat(n * 100)}x${'_*'.repeat(n * 100)}`],
  ['1,000-level links', (n) => `${'['.repeat(n * 100)}x${'](https://a.example)'.repeat(n * 100)}`],
  ['1 MB of stars', (n) => '*a '.repeat(n * 35_000)],
  ['1 MB of underscores', (n) => '_'.repeat(n * 100_000)],
  ['1 MB of open brackets', (n) => '[a]('.repeat(n * 25_000)],
  ['1 MB of backticks', (n) => '`a``'.repeat(n * 25_000)],
  ['1 MB line of text', (n) => 'word '.repeat(n * 20_000)],
  ['1 MB of mixed delimiters', (n) => '*_`[a](\\'.repeat(n * 12_500)],
  ['many short lines', (n) => 'a\n'.repeat(n * 50_000)],
  ['1 MB heading line of spaces', (n) => `# a${' '.repeat(n * 100_000)}x`],
  ['1 MB heading line of tabs', (n) => `# a${'\t'.repeat(n * 100_000)}x`],
  ['1 MB heading of closing hashes', (n) => `# ${'#'.repeat(n * 100_000)}`],
  ['1 MB line of hashes', (n) => '#'.repeat(n * 100_000)],
  ['a paragraph then a 1 MB heading line', (n) => `text\n# a${' '.repeat(n * 100_000)}x`],
];

it.each(ADVERSARIAL)(
  '%s parses in linear time and renders without overflowing the stack',
  (_name, make) => {
    // The time bound is on parsing, which this package owns; building hundreds of thousands of
    // elements is the DOM's cost (happy-dom is far slower at it than a browser).
    const small = make(1);
    const large = make(10);
    expectLinear(
      () => parse(small),
      () => parse(large),
    );
    const box = md(large);

    expect(box.childNodes.length).toBeGreaterThan(0);
  },
  60_000,
);

it('caps nesting: deep quotes and lists fall back to text', () => {
  expect(md(`${'>'.repeat(50)} x`).querySelectorAll('blockquote').length).toBeLessThanOrEqual(3);
  expect(md('- a\n  - b\n    - c\n      - d').querySelectorAll('ul').length).toBe(2);
});

it('gives plain text for announcements', () => {
  expect(plainText('# Hi\n\n**bold** and [link](https://a.example)\n\n- one\n- two')).toBe('Hi\nbold and link\none\ntwo');
});

it('renderMarkdown keeps finished blocks and rebuilds only the tail while streaming', () => {
  const box = document.createElement('div');
  let state = renderMarkdown(box, 'First para.\n\nSecond');
  const first = box.firstChild;

  state = renderMarkdown(box, 'First para.\n\nSecond grows', state);
  expect(box.firstChild).toBe(first);
  expect(box.lastChild?.textContent).toBe('Second grows');

  state = renderMarkdown(box, 'First para.\n\nSecond grows\n\n- item', state);
  expect(box.firstChild).toBe(first);
  expect(box.children.length).toBe(3);

  renderMarkdown(box, 'Replaced', state);
  expect(box.firstChild).not.toBe(first);
  expect(box.innerHTML).toBe('<p>Replaced</p>');
});

// happy-dom replaces the global URL, so resolve the source folder with node:path instead.
const SRC = join(dirname(fileURLToPath(import.meta.url)), '../src/markdown');

/** Comments, which name the banned sinks to explain the rule. */
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;

it('the renderer source never uses an HTML-parsing sink (R2)', () => {
  const sinks = /innerHTML|outerHTML|insertAdjacentHTML|DOMParser|unsafeHTML|createContextualFragment|document\.write|srcdoc/;

  for (const file of ['inline.js', 'parse.js', 'render.js', 'index.js']) {
    const code = readFileSync(join(SRC, file), 'utf8').replaceAll(COMMENTS, '');

    expect(code).not.toMatch(sinks);
  }
});

/** A realistic mixed reply: headings, paragraphs with inline markup, nested lists, quotes, fences. */
const MIXED_UNIT = [
  '## Section heading',
  '',
  'Some *emphasis* and **strong** text with `code` and a [link](https://a.example/x).',
  'A second line of the paragraph.',
  '',
  '- item one',
  '- item **two**',
  '  - nested item',
  '',
  '> a quote line',
  '> more quote',
  '',
  '1. first',
  '2. second',
  '',
  '```js',
  'const a = 1;',
  '```',
  '',
  '',
].join('\n');

/** Streams `text` through renderMarkdown in pieces of `size` and returns the box and state. */
function streamed(/** @type {string} */ text, /** @type {number} */ size) {
  const box = document.createElement('div');
  let state;

  for (let at = size; at < text.length + size; at += size) state = renderMarkdown(box, text.slice(0, at), state);

  return { box, state };
}

it.each([
  ['a mixed reply', MIXED_UNIT.repeat(3)],
  ['an ordered item after a blank line', '1. a\n\n2. b\n\n3. c'],
  ['an unordered item after a blank line', '- a\n\n- b\n\nafter'],
  ['a paragraph that becomes a list item', 'intro\n\n1. a\n\n2'],
  ['a loose item continued after a blank line', '- a\n\n  more of a\n- b'],
  ['a fence that opens and closes', 'p\n\n```\ncode\n```\n\nq'],
  ['a quote then a heading', '> q\n# h\n> r'],
])('streaming %s one character at a time renders the same as rendering it whole', (_name, text) => {
  const whole = document.createElement('div');

  renderMarkdown(whole, text);
  expect(streamed(text, 1).box.innerHTML).toBe(whole.innerHTML);
});

it('a 1 MB mixed reply: the full parse and each streaming frame grow linearly', () => {
  const doc = MIXED_UNIT.repeat(Math.ceil(1_000_000 / MIXED_UNIT.length));
  const tenth = doc.slice(0, Math.ceil(doc.length / 10));

  expectLinear(
    () => parse(tenth),
    () => parse(doc),
  );

  // Near the 1 MB cap, a frame re-parses only from the last unfinished block, not the whole text:
  // a frame on the full document costs about what a frame on a tenth of it does, not ten times.
  const frameMs = (/** @type {string} */ whole) => {
    const frameBox = document.createElement('div');
    let state = renderMarkdown(frameBox, whole.slice(0, -50));
    const frames = [];

    for (let at = whole.length - 49; at <= whole.length; at += 7) {
      const text = whole.slice(0, at);

      frames.push(timed(() => (state = renderMarkdown(frameBox, text, state))));
    }

    return Math.max(...frames);
  };

  expectLinear(
    () => tenth,
    () => doc,
    (whole) => frameMs(whole()),
  );
}, 60_000);
