# @focsd/tokens

Design tokens for Focsd: DTCG 2025.10 source compiled to CSS custom properties, per-theme CSS, resolved JSON and TypeScript types.

## Use

```css
@import "@focsd/tokens/fonts.css";
@import "@focsd/tokens/tokens.css";
```

- Light by default; follows `prefers-color-scheme: dark` and `prefers-contrast: more` automatically.
- Force a theme on any element: `data-focsd-theme="light" | "dark" | "contrast"`.
- Change density on any element: `data-focsd-density="comfortable" | "compact"` (`"default"` restores the standard size).
- All token CSS sits in `@layer focsd.tokens`, so your own CSS always wins.

```js
import { cssVar } from '@focsd/tokens';
element.style.background = cssVar('surface'); // "var(--focsd-surface)"
```

### Theme presets

Four presets re-brand color, type stack and radius in light and dark: `harbor`, `signal`, `mineral` and `prismatic` (colorful, with category colors). No attribute means the default (Wayfinding).

```css
@import "@focsd/tokens/tokens.css";
@import "@focsd/tokens/presets/harbor.css"; /* or presets.css for all four */
```

```html
<html data-focsd-brand="harbor">
```

- Put `data-focsd-brand` on `<html>`. A nested `data-focsd-theme` inside it uses the preset's colors for that theme. A branded subtree inside a page with another theme must set its own `data-focsd-theme`.
- The high-contrast theme always wins: under `data-focsd-theme="contrast"` or `prefers-contrast: more`, preset colors step aside (type and radius stay).
- Every preset passes the same WCAG contrast pairs as the default, in light and dark.
- Presets name their fonts (for example IBM Plex Sans) with system fallbacks but ship no font files. Self-host the WOFF2 with `font-display: swap` if you want the exact face.
- Layers: `@layer focsd.tokens, focsd.preset, focsd.brand;`. Theme-builder output (`focsd.brand`) beats a preset; your unlayered CSS beats both.

```js
import { setBrand, setTheme, clearTheme, noFlashScript, noFlashHash } from '@focsd/tokens';
setBrand('signal'); // setBrand(null) goes back to the default
clearTheme();     // follow the system light/dark again
```

`noFlashScript` is a small inline `<head>` script that applies the stored `focsd-theme` and `focsd-brand` (localStorage) before first paint (the default `focsd-` keys only: a custom `storage-key-prefix` needs its own snippet); add `noFlashHash` to your CSP `script-src`. Inline it with the `<script>` tags hugging the text exactly (`<script>…</script>`, no whitespace inside the tags), or the hash will not match. `presetSwatches` and `@focsd/tokens/presets.json` hold each preset's preview colors.

## Develop

| Command | Does |
|---|---|
| `pnpm --filter @focsd/tokens build` | Builds `dist/` |
| `pnpm --filter @focsd/tokens test` | Unit tests (run `build` first after changing tokens) |
| `pnpm --filter @focsd/tokens test:e2e` | Builds, then Chromium/Firefox/WebKit checks |
| `pnpm --filter @focsd/tokens check` | Grades, parity, hygiene and WCAG contrast gates |
| `node scripts/gen-ref-colors.mjs` | Regenerates `src/ref/color.json` from `scripts/palette.mjs` |
| `node scripts/gen-presets.mjs` | Regenerates `src/presets/*/*.json` from `scripts/preset-palettes.mjs` |

Change a color: edit `scripts/palette.mjs` **and** DESIGN.md, regenerate, then run `check` and `test`.

## Licenses

Code: MIT. Fonts: Atkinson Hyperlegible Next and Mono, SIL Open Font License 1.1 (`dist/fonts/*-OFL.txt`).
