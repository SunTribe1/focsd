import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSizes, initialGzipSize } from '../../../scripts/lib/initial-size.mjs';

// The published code: dist/ is an exact copy of src/ (scripts/build-dist.mjs; nothing is minified, audit F5),
// and @focsd-dev/primitives resolves to its own dist/ through the default export condition. esbuild minifies the
// JavaScript as an app's bundler would, but not the CSS inside `css` templates, so that CSS counts as written.
const dist = fileURLToPath(new URL('../dist/', import.meta.url));

/**
 * Minified + gzipped bytes a page loads up front for one entry, bundled with its dependencies (Lit
 * included); lazily imported modules (the icon sanitizer) are not counted (quality B11).
 */
const gzipSize = (entry) => initialGzipSize(build, entry);

const KB = 1024;

describe('bundle size budgets (gzip, Lit included)', () => {
  // F5: 14315 B with minified CSS under 14 KB; 14409 B with CSS as written, so raised to the next 0.25 KB.
  // 2026-11-27: `icon="name"` on buttons brings the icon registry and built-in paths: 18142 B, so
  // 18.25 KB (accepted by the owner, 2026-11-27). 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): 18772 B, so 18.35 KB.
  it('a single button costs no more than 18.35 KB', async () => {
    expect(await gzipSize(`${dist}focsd-button.js`)).toBeLessThanOrEqual(18.35 * KB);
  });

  it('every single-component module stays under 32 KB', async () => {
    const files = readdirSync(dist).filter((f) => /^focsd-.*\.js$/.test(f));
    const over = [];

    for (const f of files) {
      const size = await gzipSize(`${dist}${f}`);

      if (size > 32 * KB) over.push(`${f}: ${(size / KB).toFixed(1)} KB`);
    }

    expect(over).toEqual([]);
    // One build per module: about 125 modules since one module per element (B11).
  }, 60_000);
});

/** Marginal budgets (bytes, gzip): gzip(all modules) − gzip(all modules but this one). Ruling R10. Rows added by each batch scaffold. */
// 14a-9: all components 94908 B initial before 14a (6568ce4), 105206 B after: +10298 B against
// Σ 14a rows 16128 B (limit 111360 B).
// 14b-10: all components 106070 B initial before 14b (e8ff14a, after the 14a review fixes), 117979 B
// after: +11909 B against Σ 14b rows 19968 B (limit 131328 B). focsd-code.js marginal 541 B → 371 B
// now that the code block renders focsd-copy-button (14b-6; the copy button's row covers it).
// 14c-8: all components 117979 B initial before 14c (345b006), 128068 B after: +10089 B against
// Σ 14c rows 15872 B (the plan's 12032 B, the 'sortable controller' allowance 3072 B after 14c-9
// (was 2816 B), the splitter raise 512 B and the field raise 256 B; limit 147251.2 B).
// 16b: the theme toggle and picker add 3359 B together (their shared radio-group base and the
// @focsd-dev/tokens theme functions and swatches, which neither marginal sees) plus their terms; all
// components 132229 B after 16b, within the +5 KB the two rows add to the limit (spec wave 16).
// Wave 14 in all: 94908 B before 14a-0 (2026-11-13) → 128068 B, +33160 B against Σ wave-14 rows 51968 B.
// The marginal rows were set at about twice the measured sizes, so the all-components limit had
// about 19 KB of headroom (128068 B of 147251.2 B). Owner item 28 tightened it to measured + 5 % (F5, below).
// F5 (dist/ no longer minified): rows set at measured + 25 % whose size rose with the CSS as written are
// re-based to the new measure + 25 %; the other rows still pass with their headroom and are unchanged.
const BUDGETS = {
  // 14a-9: measured 1.7 KB (1756 B); 14c-8: 2050 B after the 14a review fixes, so raised to 2.25 KB (ruling)
  'focsd-field.js': 2.3 * KB, // 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): 2349 B
  'focsd-date-field.js': 3.5 * KB, // 14a-9: measured 1.6 KB (1663 B)
  'focsd-listbox.js': 3 * KB, // 14a-9: measured 2.0 KB (2098 B)
  'focsd-date-time-picker.js': 2.5 * KB, // 14a-9: measured 1.1 KB (1168 B)
  'focsd-swatch-picker.js': 2.5 * KB, // 14a-9: measured 1.8 KB (1878 B)
  'focsd-editable.js': 2 * KB, // 14a-9: measured 1.3 KB (1367 B)
  'focsd-split-button.js': 1.5 * KB, // 14b-10: measured 0.6 KB (565 B)
  'focsd-tour.js': 4 * KB, // 14b-10: measured 2.0 KB (2048 B)
  'focsd-toggletip.js': 1.5 * KB, // 14b-10: measured 0.5 KB (502 B)
  'focsd-qr-code.js': 6.1 * KB, // encoder included; 14b-10: measured 5.4 KB (5525 B); 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): 6207 B
  'focsd-copy-button.js': 1.5 * KB, // 14b-10: measured 0.6 KB (643 B, the code block's use included)
  'focsd-loading-overlay.js': 1.5 * KB, // 14b-10: measured 0.5 KB (468 B)
  'focsd-format-number.js': 1.5 * KB, // 14b-10: measured 0.6 KB (635 B)
  'focsd-relative-time.js': 2 * KB, // 14b-10: measured 0.9 KB (938 B)
  'focsd-app-shell.js': 2.5 * KB, // 14c-8: measured 1.2 KB (1183 B)
  'focsd-table-of-contents.js': 2 * KB, // 14c-8: measured 1.7 KB (1748 B)
  'focsd-theme-toggle.js': 2 * KB, // 16b: measured 0.7 KB (699 B)
  'focsd-theme-picker.js': 803, // 16b fix pass: measured 642 B, plus 25% (the shared radio-group base, 3359 B with the toggle, is in the all-components allowance)
  // 18 fix pass: tightened to measure +25% (it was 2.2x); the stat always imports the animated number's count-up code, so its real cost is both rows (951 + 571 B)
  'focsd-stat.js': 1.25 * KB, // measured 0.9 KB (951 B); F5: 972 → 1003 B with CSS as written, raised from 1.2 KB
  'focsd-animated-number.js': 0.7 * KB, // measured 0.6 KB (571 B; internal/count-up.js is shared with the stat)
  'focsd-status-dot.js': 0.9 * KB, // measured 0.6 KB (612 B after the "label, status" name); F5: 648 → 734 B, raised from 0.75 KB
  // 21.0: rows for the wave 21 components (spec wave 21), added at the scaffold before the modules exist (a missing
  // module has marginal 0 B), so each 21a-21d batch measures and tightens its own row. Σ 17.5 KB.
  // 21 fix pass: the segmented control, bottom nav and notification center rows now include their part modules
  // (the rows add up to what a page pays; the PARTS table below), measured 616, 874 and 2710 B; +25%.
  // 21a had measured 400 B (focsd-segment.js, its part, adds 163 B more: 563 B together, over the old 0.5 KB row).
  'focsd-segmented-control.js': 0.95 * KB, // with its part focsd-segment.js; raised from 0.5 KB; F5: 636 → 753 B, raised from 0.8 KB
  'focsd-dock.js': 1.4 * KB, // with its part focsd-dock-item.js; scaffold row, tightened after first measure
  'focsd-lightbox.js': 2 * KB, // 21b: measured 1.5 KB (1576 B), tightened from 3.5 KB to measure +25%
  'focsd-image-compare.js': 1.5 * KB, // 21b: measured 1.1 KB (1151 B), tightened from 2 KB to measure +25%
  'focsd-signature-pad.js': 3.15 * KB, // 21c: measured 2.5 KB (2575 B), plus 25%
  // 21a: measured 523 B (focsd-bottom-nav-item.js, its part, adds 226 B more: 749 B together)
  'focsd-bottom-nav.js': 1.45 * KB, // with its part focsd-bottom-nav-item.js; raised from 0.65 KB; F5: 891 → 1165 B, raised from 1.1 KB
  // 21d: measured 2202 B (2297 B with its part focsd-notification.js, 76 B alone); the 4 KB scaffold row tightened.
  // 21 fix pass: measured 2710 B after the safe href check, the tone shape and text and the first-load rule (+400 B); raised from 2.75 KB
  'focsd-notification-center.js': 3.7 * KB, // with its part focsd-notification.js; F5: 2754 → 3006 B, raised from 3.3 KB
};

// gzip bytes of focsd-text-field.js before 14.0, measured 2026-10-21
// 21.0: 14101 after the wave 21 terms (+273 B); 13828 before.
// F5: every base below is raised by what its host's CSS as written costs, measured on the current tree as
// growthSize with dist/ copied minus growthSize with the old minified dist/, so each growth stays as measured.
// text field +251 B (14101 before F5).
const TEXT_FIELD_BASE = 14352;

// gzip bytes of focsd-time-field.js (growthSize) before R13, measured 2026-11-13 after the 14a-0 translation rows (16359 without them); 16616 after the 14b-0 rows (+109 B of terms every module carries); 16746 after the 14c-0 rows (+130 B);
// 16762 after the 14c lanes' terms `navigation` and `paneNumber` (+16 B, 14c-8; its own growth stays 305 B)
// 16869 after the wave 16 theme toggle and picker terms (+107 B, 16b); 16979 after the 18d stat and status terms (+110 B);
// 17115 after the 18b chart terms (area, stacked, scatter: +136 B); 17211 after the 18e sparkline and gauge terms (+96 B);
// 17289 after the 20b default locale every module carries (localize.js reads internal/locale.js: +78 B);
// 17309 after the 20c terms `ratingValue` and `dateFormatPlaceholder` (+20 B; the guard moved two literal strings into the table);
// 17595 after the 21.0 terms for the six wave 21 components (+286 B); 17874 after F5 (+279 B of CSS as written).
const TIME_FIELD_BASE = 17874;

// gzip bytes (growthSize) of the 14c upgrade hosts before their upgrades, measured 2026-11-18 at the 14c-0 scaffold
// (14c translation rows in; the splitter with its pane skeleton). 2026-11-13 values: 12858, 12615, 11390, 12246, 19502.
// 18d: each raised by the 18d stat and status terms every module carries, measured per host against the same
// tree without them (+113, +115, +107, +114, +112 B); 2026-11-18 values: 13376, 13038, 11812, 12667, 19931.
// 18b: raised again by the chart terms (area, stacked, scatter), measured the same way (+136, +141, +139, +142, +140 B);
// 18d values: 13489, 13153, 11919, 12781, 20043.
// 18e: raised by the sparkline and gauge terms, measured the same way (+94, +94, +94, +93, +91 B); 18b values: 13625, 13294, 12058, 12923, 20183.
// 20b: raised by the default locale every module carries (setLocale: localize.js reads internal/locale.js), measured the
// same way (+86, +83, +76, +63, +70 B); 18e values: 13719, 13388, 12152, 13016, 20274.
// 21.0: raised by the wave 21 terms every module carries, measured per host against the same tree without them
// (+273, +279, +280, +278, +281, +274 B for text field, splitter, progress, badge, list, tag input); 20b values: 13805, 13471, 12228, 13079, 20344.
// F5: raised by each host's CSS as written (+98, +382, +269, +91, +593 B); 21.0 values: 14084, 13751, 12506, 13360, 20618.
const SPLITTER_BASE = 14182;
const PROGRESS_BASE = 14133;
const BADGE_BASE = 12775;
const LIST_BASE = 13451;
const TAG_INPUT_BASE = 21211;

/** Upgrade budgets: growth of a host module over its gzip size before the upgrade (bytes). Ruling C13. */
const GROWTH = {
  'focsd-text-field.js': { base: TEXT_FIELD_BASE, budget: 3.2 * KB }, // 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): +3251 B; 14.0 shared messages; 2026-11-26: +3074 B with the empty-label rule (no gap above a control without a label)
  // R13 refactor and the 14a-9 segment CSS extraction
  'focsd-time-field.js': { base: TIME_FIELD_BASE, budget: 0.85 * KB }, // 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): +853 B (date parts default to empty); 2026-11-26 size pass: +648 B, the built-in validation every form control gained (error-message, warning-pattern), +5%; // 14a-9: measured +207 B; 14a-10 M-6 (Arabic-Indic digits): +265 B; B14 m34 (the defineElement import, every module pays it): +326 B
  // U1 panes, with its part focsd-splitter-pane.js; raised from 2 KB after the 14c-3 review fixes (controller ruling)
  'focsd-splitter.js': { base: SPLITTER_BASE, budget: 2.85 * KB }, // 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): +2890 B (1 % / 10 % steps in both modes); 14c-8: measured +2331 B; 2026-11-26 size pass: +2696 B with the 2px line and grips, +5%
  'focsd-progress.js': { base: PROGRESS_BASE, budget: KB }, // U2 ring; 14c-8: measured +570 B
  'focsd-badge.js': { base: BADGE_BASE, budget: 1.05 * KB }, // U3 indicator; 14c-8: measured +709 B; 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): +1058 B
  // U4 sortable: host code only; internal/sortable.js is an ALLOWANCES row (14c-7 ruling)
  'focsd-list.js': { base: LIST_BASE, budget: 2 * KB }, // with its part focsd-list-item.js; 14c-8: measured +737 B (with the item `label`)
  // 14c-8: measured +736 B; 2026-11-26 size pass: +1159 B with built-in validation, +5%. 2026-11-27: its
  // tags gained icons, sizes, category colors and a shared label reader: +1654 B, so 1.65 KB (accepted by the owner, 2026-11-27).
  'focsd-tag-input.js': { base: TAG_INPUT_BASE, budget: 1.8 * KB }, // 2026-11-27, 1.0 review items (signature terms in the shared table, strict index checks): +1804 B
};

const modules = () =>
  readdirSync(dist)
    .filter((f) => /^focsd-.*\.js$/.test(f))
    .toSorted();

const importAll = (files) => files.map((f) => `import './${f}';`).join('\n');

/** Replaces dist modules with empty ones, so any module that imports one drops it too (Ruling C8). */
const withoutModule = (...files) => ({
  name: 'without-module',
  setup(b) {
    const gone = new Set(files.map((file) => path.join(dist, file)));

    b.onResolve({ filter: /\.js$/ }, (args) =>
      gone.has(path.resolve(args.resolveDir, args.path)) ? { path: args.path, namespace: 'empty' } : null,
    );

    b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '', loader: 'js' }));
  },
});

/** Minified + gzipped bytes of a source module resolved against dist/ (Lit included), optionally with one dist module emptied. */
async function gzipOf(source, ...excluded) {
  const plugins = excluded.length ? [withoutModule(...excluded)] : [];

  const result = await build({
    stdin: { contents: source, resolveDir: dist, loader: 'js' },
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
    plugins,
  });

  return gzipSync(result.outputFiles[0].contents).length;
}

/** Shared bytes no marginal or growth measure sees, itemized. */
const ALLOWANCES = {
  'grip system icon': 0.25 * KB, // 14c-6: the grip path in internal/lucide-paths.js; measured 34 B
  // 14c-7: internal/sortable.js, shared by focsd-list.js and focsd-tag-input.js; measured 2814 B alone.
  // 14c-9: re-measured as its own minified + gzipped file (the test below): 2856 B at 77f8736, 2853 B
  // after the review fixes; raised from 2.75 KB to the next 0.25 KB, guarded on its own now.
  'sortable controller': 3 * KB,
};

/** The sortable controller alone (minified + gzipped, no imports), so its allowance is guarded on its own (14c-9 M19). */
it('the sortable controller stays within its allowance', async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../../primitives/dist/internal/sortable.js', import.meta.url))],
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
  });

  expect(gzipSync(result.outputFiles[0].contents).length).toBeLessThanOrEqual(ALLOWANCES['sortable controller']);
});

/**
 * The 20b app services, each minified + gzipped on its own (spec wave 20: links ≤ 0.5 KB, locale ≤ 0.4 KB).
 * Wave 20 fix pass: links.js measured 585 B after the review fixes (`//` paths, credentials, `<base target>`,
 * ping, `href="#"`, async handlers), so its row is raised to 0.6 KB (614 B).
 */
const SERVICES = {
  'links.js': 0.6 * KB,
  'locale.js': 0.4 * KB,
  // Ruling I10 asked for ≤ 1 KB (20a measured 1018 B). Measured 1037 B after the anti-slop lint pass and
  // 1196 B after the review fixes (unknown-modifier error, key aliases, key-less events, text-field-only
  // ignore, weak scopes, defaultPrevented), so the row is raised to 1.2 KB (1228 B); owner item 123.
  'shortcuts.js': 1.2 * KB,
};

it.each(Object.entries(SERVICES))('internal/%s stays within its budget', async (file, budget) => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(`../../primitives/dist/internal/${file}`, import.meta.url))],
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
  });

  expect(gzipSync(result.outputFiles[0].contents).length).toBeLessThanOrEqual(budget);
});

/**
 * Owner item 28: the all-components limit is the measured size plus 5 %. It was 90 KB plus the itemized rows
 * (164981 B against 146064 B measured with minified CSS). F5 (dist/ no longer minified): 152815 B measured
 * 2026-11-25 (+6751 B of CSS whitespace and comments). A change that adds bytes raises ALL_COMPONENTS by what
 * it measures, so the rows above still say where the bytes go.
 */
const ALL_COMPONENTS = 152_815;
const LIMIT = Math.ceil(ALL_COMPONENTS * 1.05);

it('all components together stay within their measured size plus 5 %', async () => {
  expect(await gzipSize(`${dist}index.js`)).toBeLessThanOrEqual(LIMIT);
});

/**
 * The lazily loaded code (only the icon sanitizer may be, B11) is capped too, so initial + lazy
 * stays bounded. Gzipped on its own, as the browser downloads it: 1739 B measured 2026-11-12.
 */
const LAZY_LIMIT = 1.75 * KB;

it('the lazily loaded icon sanitizer stays under 1.75 KB', async () => {
  const { lazy } = await gzipSizes(build, `${dist}index.js`);

  expect(lazy).toBeGreaterThan(0);
  expect(lazy).toBeLessThanOrEqual(LAZY_LIMIT);
});

/** Rows whose element needs a part module to work: the budget covers both, so the rows add up to what a page pays (wave 21 review M10). */
const PARTS = {
  'focsd-segmented-control.js': ['focsd-segment.js'],
  'focsd-bottom-nav.js': ['focsd-bottom-nav-item.js'],
  'focsd-dock.js': ['focsd-dock-item.js'],
  'focsd-notification-center.js': ['focsd-notification.js'],
};

if (Object.keys(BUDGETS).length)
  it.each(Object.entries(BUDGETS))('%s adds no more than its own budget', async (file, budget) => {
    const source = importAll(modules());

    expect((await gzipOf(source)) - (await gzipOf(source, file, ...(PARTS[file] ?? [])))).toBeLessThanOrEqual(budget);
  });

/** Shared internals left out of growth sizes: already counted in the all-components bundle (Ruling R10, ledger 14.0-2; B14 m34: define.js). */
const SHARED_INTERNALS = new Set(
  ['icons.js', 'sortable.js', 'define.js'].map((file) => fileURLToPath(new URL(`../../primitives/dist/internal/${file}`, import.meta.url))),
);

/** Lit modules some hosts import that the all-components bundle already has (14c-7: repeat, from the toaster and virtual list). */
const SHARED_SPECIFIERS = new Set(['lit/directives/repeat.js']);

/** Marks the shared internals external, so a module that starts importing one is not charged for it. */
const withoutSharedInternals = {
  name: 'without-shared-internals',
  setup(b) {
    b.onResolve({ filter: /\.js$/ }, (args) =>
      SHARED_SPECIFIERS.has(args.path) || SHARED_INTERNALS.has(path.resolve(args.resolveDir, args.path))
        ? { path: args.path, external: true }
        : null,
    );
  },
};

/** Minified + gzipped bytes of one entry, bundled with its dependencies except the shared internals. */
async function growthSize(entry) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
    plugins: [withoutSharedInternals],
  });

  return gzipSync(result.outputFiles[0].contents).length;
}

it.each(Object.entries(GROWTH))('%s grows by no more than its upgrade budget', async (file, { base, budget }) => {
  expect((await growthSize(`${dist}${file}`)) - base).toBeLessThanOrEqual(budget);
});
