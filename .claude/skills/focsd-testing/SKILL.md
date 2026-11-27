---
name: focsd-testing
description: How Focsd is tested and which command proves what - Playwright e2e in three engines with axe, visual baselines, Vitest unit tests, SSR smoke, size budgets, shared fixtures and engine quirks. Use when writing or fixing tests, before calling work done, or when a test fails only in Firefox or WebKit.
---

# Testing Focsd

Rule: a behaviour change comes with a test that failed before it. Components are tested in real browsers (Lit and
open-wc both say so); Node tests are for pure logic only.

## What runs where

| Command | Proves |
| --- | --- |
| `pnpm check` | Lint (ESLint with lit, wc, lit-a11y; Oxlint), Prettier, cspell, release config, counts, API compatibility, screen-reader checklist, visible strings, logical properties, `lit-analyzer`, type checks. |
| `pnpm test` | Vitest unit and type tests, size budgets (per package). |
| `pnpm --filter @focsd-dev/playground test:e2e` | Playwright: every component in Chromium, Firefox, WebKit, with axe in light, dark and contrast. |
| `pnpm --filter @focsd-dev/playground test:visual` | Screenshot baselines per platform. |
| `pnpm --filter @focsd-dev/docs test` / `test:e2e` | Docs unit tests and docs site e2e. |
| `pnpm test:smoke` | Packed-install consumer smoke and SSR hydration. |

Run e2e on a free port when another server is up: `FOCSD_PG_PORT=5191 npx playwright test ...`. Give each run its
own `--output` directory. Never run two full suites on one machine at once; load causes flakes.

## Shared fixtures (`apps/playground/e2e/fixtures/`)

- `test.js`: the `test`/`expect` every spec imports. It fails a test on Lit's `change-in-update` warning, and has
  `ready(page, ...tags)`, `host(page, id)`, `settle(page)`.
- `keys.js`: `pressTab(page, { shift })` presses Alt+Tab in WebKit, where plain Tab skips buttons and links.
- `focus-ring.js`: `expectFloorFocusRing(locator, { inset })` checks the two-tone ring in every engine.
- `announcements.js`: record and assert `announce()` output.
- `axe.js`: axe in the three themes.

## Engine quirks to remember

- **WebKit:** Tab skips buttons and links (use `pressTab`); no forced-colours emulation (skip those tests in WebKit);
  `:focus-visible` is not reflected in computed style for script focus (the ring fixture reads the rule instead).
- **Firefox:** `input.autocomplete` returns `''` (read the attribute); a constructed `ClipboardEvent` drops
  `clipboardData`; sub-pixel layout (allow 0.01 px); a script focus after a click is not `:focus-visible` unless
  `focus({ focusVisible: true })`.
- **Safari (real users):** a click does not focus a button; components that move focus after a button action must
  not rely on the button having focus.

## Writing a good spec

- Query by role and accessible name; assert what a person perceives (focus, announcements, visible text, ARIA
  state).
- Test the side effect (event fired, property set) rather than stubbing methods bound in templates (open-wc
  stubbing guide).
- No sleeps: wait on a condition (`expect.poll`, `waitForFunction`).
- Cover keyboard, pointer, RTL, reduced motion, forced colours (Chromium/Firefox), and form state restore where the
  element is form-associated.
