# Third-party notices

Focsd is MIT licensed (see `LICENSE`). This file lists everything in the repository and the published
packages that we did not write ourselves, with its license. Each copied file also keeps its own
notice next to it. Audited 2026-11-26, updated 2026-11-27: a repository-wide search for copied, vendored, ported and
generated code, every file carrying a copyright line, and the full runtime dependency tree of each
published package.

## Copied into the published npm packages

| Work | Where | License and copyright | Notice kept at |
| --- | --- | --- | --- |
| [Lucide](https://lucide.dev) icons 1.52.0, some derived from [Feather](https://feathericons.com) | `@focsd-dev/primitives`: `src/internal/lucide-paths.js` (36 built-in icons), plus inline copies in `display/stat-base.js` (arrows), `overlays/notification-center-base.js` (bell) and `display/theme-toggle-base.js` (sun, moon, monitor). `@focsd-dev/ai`: `src/input-icons.js` (paperclip, file, image, square) and `src/message-actions.js` (rotate-ccw, thumbs-up, thumbs-down). `@focsd-dev/editor`: `src/toolbar.js` (toolbar icons) | ISC, Copyright (c) 2026 Lucide Icons and Contributors; Feather-derived icons also MIT, Copyright (c) 2013-present Cole Bemis | Full text in `LICENSE-lucide.txt` in each of the three packages, and at the top of `lucide-paths.js`; each copy names it |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 2.0.4, trimmed to the matrix encoder | `@focsd-dev/primitives` `src/internal/qr-upstream.js` (used by `focsd-qr-code`) | MIT, Copyright (c) 2009 Kazuhiko Arase. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED | Original header in `qr-upstream.js`; provenance and hashes in `src/internal/UPSTREAM.md` |
| [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) 1.13.15 metadata (dial codes, number lengths, example numbers) | `@focsd-dev/primitives` `src/internal/phone-data.js` (used by `focsd-phone-field`) | MIT, Copyright (c) 2016 @catamphetamine; the metadata derives from [Google libphonenumber](https://github.com/google/libphonenumber), Apache License 2.0, Copyright (C) The Libphonenumber Authors | Both full texts in `LICENSE-libphonenumber.txt` in `@focsd-dev/primitives`; header of `phone-data.js` |
| [Atkinson Hyperlegible Next and Mono](https://www.brailleinstitute.org/freefont/) fonts, via Fontsource 5.3.0 | `@focsd-dev/tokens` `dist/fonts/*.woff2` | SIL Open Font License 1.1, Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors and The Atkinson Hyperlegible Mono Project Authors (commissioned by the Braille Institute of America) | `dist/fonts/*-OFL.txt` |

## Installed with the published packages (npm dependencies, not copied)

| Package | Brings in | Licenses |
| --- | --- | --- |
| Every element package | [Lit](https://lit.dev) (`lit`, `lit-html`, `lit-element`, `@lit/reactive-element`, `@lit-labs/ssr-dom-shim`) | BSD-3-Clause |
| `@focsd-dev/react` | `@lit/react` | BSD-3-Clause |
| `@focsd-dev/editor` | [Tiptap](https://tiptap.dev) 3 and its [ProseMirror](https://prosemirror.net) bundle, `linkifyjs` | MIT |
| `@focsd-dev/mcp` | `@modelcontextprotocol/server` and `/core` | Apache-2.0 |
| `@focsd-dev/mcp` | `zod`, `parse5` | MIT |
| `@focsd-dev/mcp` | `entities` | BSD-2-Clause |

All are permissive licenses that allow use in commercial and closed-source work. `@focsd-dev/tokens`,
`@focsd-dev/webmcp` and the `focsd` CLI install no third-party packages.

## In the repository only (docs site, tests and tooling; not published to npm)

| Work | Where | License and copyright | Notice kept at |
| --- | --- | --- | --- |
| [Vesper](https://github.com/raunofreiberg/vesper) code theme | Docs dark code blocks (through Shiki); `apps/docs/src/vesper-light.json` is our light variant of it | MIT, Copyright (c) 2023 Rauno Freiberg | `apps/docs/src/vesper-light.LICENSE.md` |
| Atkinson Hyperlegible outlines | `docs/brand/logo/src/glyphs.json`, extracted to draw the Focsd wordmark | SIL Open Font License 1.1, as above | This file. The OFL allows using the glyphs in a logo |
| WebMCP polyfill | `apps/playground/e2e/fixtures/webmcp-polyfill.js` (test fixture) | Apache License 2.0, Copyright 2026 Google LLC | SPDX header; full text in `apps/playground/e2e/fixtures/LICENSE-APACHE-2.0.txt` |
| [anti-slop](https://github.com/dmmulroy/anti-slop) lint rules | `tools/oxlint/anti-slop/` | MIT, Copyright (c) 2026 Dillon Mulroy | `tools/oxlint/anti-slop/LICENSE`, `UPSTREAM.md` |
| [ESLint Stylistic](https://eslint.style) padding rule | `tools/oxlint/anti-slop/vendor/eslint-stylistic/` | MIT, Copyright OpenJS Foundation and other contributors | `vendor/eslint-stylistic/LICENSE` |

The docs site's own build tools (Astro, Starlight, Shiki, Pagefind and others) are dependencies of
`apps/docs` only. They are permissive (mostly MIT, some Apache-2.0, BSD and ISC); `sharp`'s optional
`libvips` binary is LGPL-3.0, used at build time only and never shipped in a package.

## Our own work

Everything else is written for Focsd: every component, the AI kit's markdown parser and renderer,
the charts, the data grid, the design tokens and presets, the demo pictures in `public/media`
(hand-made SVG) and the Focsd logo. Preset fonts such as IBM Plex Sans, Lexend and Red Hat Text are
only named in `font-family` stacks; no font files ship for them.
