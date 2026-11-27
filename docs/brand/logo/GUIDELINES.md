# Focsd logo guidelines

## 1. The logo

**Foc** is a component tile wearing the focus ring. The focus ring is the one state every Focsd control gets right, and the eyes give the mark a character that works as a mascot in docs, empty states and stickers.

| Version | File | Use it for |
| --- | --- | --- |
| Horizontal lockup (primary) | `svg/focsd-horizontal-*.svg` | Docs header, README, website, slides |
| Stacked lockup | `svg/focsd-stacked-*.svg` | Square spaces, title slides, stickers, merch |
| Symbol | `svg/focsd-symbol-*.svg` | Avatars, app icon, social, anywhere the name is nearby |
| Symbol, small cut | `svg/focsd-symbol-small-*.svg` | 16–31 px: favicons, tabs, toolbar icons |
| Wordmark | `svg/focsd-wordmark-*.svg` | Running text, footers, partner logos |
| Glow versions | `svg/*-light-glow.svg`, `svg/*-dark-glow.svg` | Screen-only hero areas (website hero, launch graphics, social) |

File suffixes: `-ink` and `-offwhite` are the brand colors on a transparent background. `-black` and `-white` are pure one-color versions for print and partners. `-light` and `-dark` include their background.

## 2. Clear space

Keep clear space on every side equal to **the width of the ring plus the gap inside it**: 30/256 of the symbol's height (about 12 % of the symbol). For the horizontal lockup, measure it from the symbol's height.

## 3. Minimum size

| Version | Minimum |
| --- | --- |
| Symbol (master) | 32 px / 8 mm |
| Symbol, small cut | 16 px / 4 mm (below 32 px always use the small cut) |
| Horizontal lockup | 96 px wide / 25 mm |
| Stacked lockup | 64 px wide / 18 mm |

The small cut is drawn on a 16 px grid: a 2 px ring, a 1 px gap and 2 × 4 px eyes, so it stays crisp in browser tabs.

## 4. Color

The logo is **one color**. There is no accent color in the mark.

| Name | HEX | RGB | Use |
| --- | --- | --- | --- |
| Ink | `#141A18` | 20, 26, 24 | Logo on light backgrounds (matches `--focsd-ink` / the light `focus-inner`) |
| Off-white | `#F4F4F2` | 244, 244, 242 | Logo on dark backgrounds |
| Night | `#111113` | 17, 17, 19 | Dark background, app-icon tile, `theme-color` |
| Black / White | `#000000` / `#FFFFFF` | | One-color print, embroidery, partner sheets |

Both pairings exceed 17:1 contrast. On photos or mid-tones, use whichever of ink or off-white has at least 4.5:1 against the area behind it, or place the logo on a solid tile.

**Glow.** A soft halo behind the ring (Gaussian blur 9 on a 256 canvas): off-white at 45 % on dark, ink at 28 % on light. It is for screens only. Never use it in favicons, below 64 px, in print, or on busy backgrounds. The flat logo is always correct; the glow is an option.

## 5. Typography

The wordmark is **Atkinson Hyperlegible Next ExtraBold (800)**, the Braille Institute's typeface for low-vision readers. It is licensed under the SIL Open Font License, which allows use in a logo. The letters are outlined in the SVG files, so the font is not needed to use the logo. The wordmark is set lowercase with −6 units of tracking. Never retype it; use the files.

Docs and UI text use the same family (see `DESIGN.md`), so the logo and the product share one voice.

## 6. Don'ts

- Don't recolor the mark in a brand or accent color, add a gradient or use two colors.
- Don't add the glow to small sizes, favicons or print.
- Don't remove the ring, the gap or the eyes, or change the eye position.
- Don't rotate, skew, stretch, outline or add a drop shadow.
- Don't use the master symbol below 32 px; switch to the small cut.
- Don't retype the wordmark or swap the typeface.
- Don't change the spacing or size relationship between the symbol and the wordmark.
- Don't place the logo on a background with less than 4.5:1 contrast.

## 7. Web icons

`web/` has the full set: `favicon.ico` (16/32/48), `favicon.svg` (switches between ink and off-white with `prefers-color-scheme`), PNG icons at 192 and 512, a maskable icon, `apple-touch-icon.png`, `site.webmanifest` and `head-snippet.html` to paste into `<head>`.

## 8. Source

`src/kit.py` regenerates every SVG from code (Python standard library only). `src/glyphs.json` holds the Atkinson outlines, made by `src/extract_fonts.py`. Trademark clearance has not been checked; run a professional search before registering the mark.
