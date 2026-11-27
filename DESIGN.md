---
# gstack: design-md-format=spec
name: Focsd
description: Calm, signage-clear and built for legibility, with accessibility as the visible identity.
colors:
  ground: "#F4F6F5"
  surface: "#FFFFFF"
  surface-sunk: "#EBEFED"
  surface-raised: "#FFFFFF"
  ink: "#141A18"
  ink-muted: "#4B5754"
  edge: "#7D8985"
  edge-quiet: "#D3DAD7"
  action: "#141A18"
  action-hover: "#2C3532"
  action-press: "#0C0F0E"
  on-action: "#FFFFFF"
  route: "#0A5E73"
  positive: "#1B6B3A"
  positive-tint: "#E3F1E8"
  caution: "#855400"
  caution-tint: "#FBF0D9"
  critical: "#B0302A"
  critical-tint: "#F9E6E4"
  focus-outer: "#141A18"
  focus-inner: "#F4F6F5"
  dark-ground: "#111113"
  dark-surface: "#1A1A1D"
  dark-surface-sunk: "#0B0B0C"
  dark-surface-raised: "#1A1A1D"
  dark-ink: "#ECECEE"
  dark-ink-muted: "#A1A1AA"
  dark-edge: "#71717A"
  dark-edge-quiet: "#2A2A2F"
  dark-action: "#ECECEE"
  dark-action-hover: "#FFFFFF"
  dark-action-press: "#D4D4D8"
  dark-on-action: "#111113"
  dark-route: "#78C6DE"
  dark-positive: "#6CC98A"
  dark-caution: "#EDB24E"
  dark-critical: "#F28B82"
  dark-focus-outer: "#ECECEE"
  dark-focus-inner: "#111113"
  contrast-ground: "#FFFFFF"
  contrast-ink: "#000000"
  contrast-route: "#00007A"
  contrast-positive: "#004D1F"
  contrast-caution: "#5C3A00"
  contrast-critical: "#8A0000"
typography:
  display:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 800
    fontSize: clamp(2.25rem, 1.6rem + 2.2vw, 3.25rem)
    lineHeight: 1.1
    letterSpacing: -0.02em
  heading:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 750
    fontSize: 1.875rem
    letterSpacing: -0.02em
  subheading:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 700
    fontSize: 1.375rem
    letterSpacing: -0.01em
  body:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 400
    fontSize: 0.9375rem
    lineHeight: 1.55
  small:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 0.9375rem
  label:
    fontFamily: Atkinson Hyperlegible Next
    fontWeight: 700
    fontSize: 0.875rem
  mono:
    fontFamily: Atkinson Hyperlegible Mono
    fontFeature: tnum
rounded:
  control: 4px
  surface: 6px
  tag: 3px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 24px
  "6": 32px
  "7": 48px
  "8": 64px
components:
  button-action:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    height: 36px
  button-action-hover:
    backgroundColor: "{colors.action-hover}"
  button-plain:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.control}"
  button-critical:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.critical}"
    borderColor: "{colors.critical}"
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.control}"
    height: 36px
  input-invalid:
    borderColor: "{colors.critical}"
    borderWidth: 1px
  surface-panel:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.surface}"
  link:
    textColor: "{colors.route}"
    textDecoration: underline
  focus-ring:
    innerColor: "{colors.focus-inner}"
    innerWidth: 1px
    outerColor: "{colors.focus-outer}"
    outerWidth: 1px
---

# Focsd

## Overview

**Creative North Star:** Wayfinding. Calm surfaces, letterforms built for legibility, and one crisp, quiet focus ring. The theme should feel like good public signage: you never wonder where to look or what something does.
**Product context:** Free, MIT-licensed, framework-agnostic web component design system (Lit). Users are developers and designers at agencies, open-source projects and enterprise teams that must meet WCAG 2.2 AA. Peers: GitHub Primer, IBM Carbon, GOV.UK Design System, Atlassian, shadcn/ui, Web Awesome.
**Mode per surface:**
- Default component theme: Operate (forms, tables, dialogs, navigation).
- Docs site: Read.
- Docs landing: Persuade, kept restrained.
**Reference sites:** primer.style, design-system.service.gov.uk, atlassian.design (observed 2026-10-03); carbondesignsystem.com (did not load; known from prior knowledge).
**Key characteristics:**
- "I can read all of this": high-legibility type at every density, with a 17px/44px comfortable density for touch and low-vision users.
- Ink-black primary actions instead of the category's default blue.
- Underlined teal links, so "go somewhere" is separate from "do something".
- The focus ring: a 1px gap in the ground color and a 1px ink ring. Crisp, neutral, visible on every preset.
- Solid, visible borders; shadows only on overlays.

## Colors

**Strategy:** Restrained. Neutral surfaces, ink for action, one teal for navigation, and semantic colors used only for status. Color is never the only signal: status always carries an icon and words, links are underlined, and disabled states use a hatch pattern plus text.
**Light or dark:** Light is the default because the use scene is mixed daylight office work and docs reading. Dark and high-contrast themes are complete peers, not afterthoughts.

Token roles:
- `action` and `on-action` signal interaction. Primary action is ink, not a brand hue, so any brand can re-theme it with one token change.
- `route` is for links only.
- `ink-muted` is for secondary text.
- `edge` marks borders that identify a control and meets 3:1 against `ground` and `surface`.
- `edge-quiet` is for decorative dividers only, never the sole affordance.
- `info` and `info-tint` color the informational tone. In the default themes they copy `route` and `surface-sunk`.
- `accent-1` to `accent-8` (each with a `-tint`) are category colors for avatars, colored tags, navigation icons and chart series. In the default themes they copy `ink-muted` and `surface-sunk`, so nothing turns colorful; the Prismatic preset gives each a hue, and components read them only through hooks (`--focsd-hue-N`) that a preset opts into.
- Light neutrals carry a slight cool green-grey tint drawn from the `route` hue, so the page reads cool rather than cream. Dark neutrals are plain graphite with no tint (owner decision 2026-11-25), which sits cleanly next to the docs site's black.

Dark mode does not simply invert lightness. Elevation rises with lightness: `dark-surface-sunk` < `dark-ground` < `dark-surface`. Semantic colors shift to lighter, desaturated versions so they keep at least 7:1. High contrast uses pure black and white, a navy link color, 2px borders and no shadows, and draws the focus ring in pure black with a white gap.

Measured contrast (WCAG 2.x):
- Light: ink 16.3:1, muted 6.9:1, edge 3.3:1 on ground and 3.6:1 on surface, route 6.8:1, positive 6.0:1, caution 5.9:1, critical 5.9:1, white on action 17.6:1.
- Dark: ink 15.5:1, muted 8.1:1, edge 4.0:1 on ground and 3.6:1 on surface, route 8.8:1, positive 8.4:1, caution 8.9:1, critical 7.1:1.
- Focus: the ink ring is at least 3:1 against the ground and surface in every theme and preset (it is the ink color), and the gap keeps it readable on filled controls.

## Typography

Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono come from the Braille Institute and were designed for low-vision readers. They are SIL Open Font License, variable 200-800, with italics. They draw on the world of public signage and low-vision reading, which is the accessibility story told in letterforms: I/l/1, O/0 and rn/m stay distinct.

- One superfamily covers every role. Display uses ExtraBold (800) with -0.02em tracking; Atkinson's distinctive letterforms give the display voice its character instead of a separate headline face.
- Body text in components is 15px with 1.55 line height in the default density (17px comfortable, 14px compact). Button and label text is 14px, weight 600.
- The docs site uses a denser reading scale, matched in review against ui.shadcn.com and radix-ui.com:
  - prose 16px / 1.65 with a 68-character line;
  - page title 32px / 700;
  - section heading 20px; sub-heading 17px;
  - sidebar and tables 14px; table of contents 13px;
  - group labels 12px muted uppercase;
  - code 13px Atkinson Hyperlegible Mono;
  - a white reading surface.
- Mono is used for code, timestamps, IDs and numeric table columns, with tabular figures.
- Scale steps: 14 / 15 / 17 / 22 / 30 / 36-52px (fluid display). Headings stay at least two scale steps above body.
- Loading: self-host WOFF2 subsets in `@focsd/tokens` with `font-display: swap` and a metric-matched fallback via `size-adjust`. The Google Fonts CDN is for the docs preview only.

## Layout

- App UI is grid-disciplined. The docs site is hybrid: a strict grid for reference pages and more open composition on the landing page.
- Breakpoints: 480 / 768 / 1024 / 1280px. Container queries are preferred for component-level adaptation.
- Max content width is 1200px; prose is capped at 68ch.
- Side gutters are 16px on phones and 24px from tablet up.
- Density: three token sets, switched with `data-focsd-density` on any element.
  - default: 36px controls, 15px body, 14px labels, 16px control padding;
  - comfortable: 44px controls, 17px body (touch-first and legibility-first apps);
  - compact: 32px controls, 14px body (data-dense tools).
  - Never below the 24px target minimum (WCAG 2.5.8).
- Rhythm: 4px base. 12/16px inside components, 24/32px between groups, 48/64px between page sections.

## Elevation & Depth

Borders do the structural work. Shadows are reserved for floating layers: dialogs, popovers, menus and toasts. They use `0 12px 32px -8px` plus a tight `0 2px 6px` contact shadow, always offset, never a zero-offset glow. The dialog scrim is its own token (`rgb(20 26 24 / .48)` light, `rgb(0 0 0 / .66)` dark). High-contrast mode drops all shadows and relies on 2px borders.

## Shapes

- 4px radius on controls (buttons, inputs, switches).
- 6px on surfaces (panels, dialogs, tables).
- 3px on tags and small badges.
- Nothing is pill-shaped. The switch track is rectangular with a 4px radius.
- Nested elements use inner radius = outer radius - gap, with a floor of 2px.

## Components

Every component designs the full state set: default, hover, focus-visible, active, disabled, invalid, loading, empty and long content.

- **Focus-visible (all interactive elements):** 2px `focus-inner` ring plus 3px `focus-outer` ring, outside the element. Never removed, never hidden by sticky headers (WCAG 2.4.11 and 2.4.12).
- **Buttons:**
  - Variants: action (filled ink), plain (outlined), quiet (underlined text) and critical (outlined red, filled red tint on hover).
  - Labels name the outcome ("Save changes", "Remove Lukas"), never "OK" or "Submit".
  - Disabled uses `aria-disabled`, stays focusable, and shows a hatch background, muted text and a tooltip explaining why.
- **Inputs:**
  - The visible label sits above the field. The hint is linked via `aria-describedby`.
  - Invalid shows a 1px critical border (the weight of the focus ring), an icon and an error message stating the fix.
  - Placeholder text is never used as a label.
- **Switch:** rectangular track plus a visible ON/OFF text state; uses `role="switch"`.
- **Tables:**
  - Header row on `ground`, zebra rows mixed from ground and surface.
  - Mono, tabular numbers right-aligned in numeric columns.
  - Horizontal scroll is contained within the table wrapper.
- **Alerts:** tint background, 1px status border, a square status glyph and a bold title. `role="status"` for positive messages, `role="alert"` for critical ones.
- **Dialog:**
  - The title states the question; the body states the consequence.
  - The destructive action names its object.
  - Focus is trapped and returned to the trigger on close.

## Do's and Don'ts

- Do underline every inline link.
- Do pair every status color with an icon and words.
- Do keep `edge` borders on every control that has an affordance.
- Do use comfortable density (44px targets) for touch-first apps; never go below 24px in any density.
- Do verify every new color pair with the contrast check before merging.
- Don't use blue or purple as the default action color; action is ink, brands re-theme it.
- Don't use faint hairline borders as the only boundary of a control.
- Don't use shadows on in-flow content, nest cards, or add gradients or glass blur.
- Don't use pill shapes or a large radius on everything.
- Don't hide or restyle the focus ring per component.

## Motion

- **Approach:** minimal and functional. Motion confirms state changes; it never decorates.
- **Easing:** enter ease-out `cubic-bezier(.2,.7,.2,1)`, exit ease-in, move ease-in-out.
- **Duration:** quick 100ms (hover, press), base 160ms (switch, expand), slow 240ms (overlays, theme change).
- **Reduced motion:** all durations become 0ms under `prefers-reduced-motion: reduce`. The one exception is the spinner: its spin becomes a slow opacity pulse, so a busy state still shows.
- **Approved exception (hover feedback):** motion otherwise animates only `opacity` and `transform`. Hover and selection feedback (`hoverMotion`) also fades `background-color`, `border-color` and `color` over the quick duration. It is paint-only, short and tied to a state change. It never animates `box-shadow` or `outline`, so the focus ring still appears instantly.
- **The one authored moment:** the focus ring appears instantly (no transition) on the first keyboard Tab, so keyboard users feel the system respond immediately.

## Voice

Focsd sounds like good signage: plain, specific and calm. Accessibility is the default, never a favor.

| Trait | Means | Do | Don't |
|---|---|---|---|
| Plain | Short sentences, everyday words, one idea each | "Inputs join native forms." | "Seamlessly integrates with form paradigms." |
| Specific | Every claim can be checked in the code, tests or docs | "Tested with axe in Chromium, Firefox and WebKit." | "Fully accessible." / "Blazing fast." |
| Calm | No hype, no exclamation marks, no urgency | "Nothing is held back for a Pro plan." | "The last component library you'll ever need!" |
| Respectful | Talks to the developer as a peer; never blames the reader | "Set `label` so screen readers can name it." | "Simply add a label, obviously." |

Rules:
- US English (`color`, `behavior`, `center`), matching the API and CSS.
- Name: **Focsd** in prose; `focsd` in code, packages (`@focsd/*`) and tags (`<focsd-*>`). Component names in sentence case ("Date picker"), tags in code font.
- Standards written exactly: WCAG 2.2 AA, WAI-ARIA, MIT license, high-contrast theme.
- Numbers come from the code: component counts, sizes and test counts must match the source (128 components; 152 custom elements: the components and their parts, plus the grid, chart, editor and AI kit).
- Banned: seamless, robust, powerful, effortless, blazing, cutting-edge, leverage, simply, just, easily, beautiful, stunning, unlock, elevate, supercharge; fake stats; exclamation marks.
- Headings and buttons in sentence case. Calls to action are verbs: "Get started", "Browse components".
- Examples use believable content (real-sounding names, dates, amounts), never "Lorem ipsum" or "foo".

### Writing for Focsd

The house style for docs, component summaries, the landing page and the messages components show.

**Terms**

| Use | Not | Why |
|---|---|---|
| component | widget, control (in prose) | The 128 catalog entries people choose from |
| custom element, element | component (for a single tag) | The 152 tags, counting parts such as `focsd-option` |
| attribute / property | prop | Web components have both; say which |
| high-contrast theme | contrast theme, HC | The theme's name |
| preset | brand theme, skin | `data-focsd-brand` picks a preset |
| color, gray, center, behavior, catalog, labeled, canceled | color, grey, centre, behavior, catalogue, labelled, cancelled | US English. Code identifiers keep their spelling (`aria-labelledby`) |
| tested against WCAG 2.2 AA | WCAG compliant, fully accessible, guaranteed | Say what was tested, never promise conformance: a page conforms, a library cannot |
| sign in, set up (verbs) | login, setup (as verbs) | Noun and verb differ |

**Component summaries** (gallery cards, component pages, search, the MCP data): one sentence, under about 25 words, that defines the component. Start with a noun phrase ("A modal panel that slides in from an edge.") or a verb in the third person ("Shows where the current page sits in the hierarchy."). Never an instruction to the reader ("Pick a date…"). Name the main option or behavior, not the obvious one.

**Numbers**: spell out zero to ten in prose ("five presets"), numerals from 11 ("128 components"), numerals always for units and code ("24 px", "3 rows"). Counts come from the source: the catalog, `custom-elements.json` or `presets.json`, rendered at build time where possible (`inWords()` in `apps/docs/src/data/landing.js`). Dates in US order ("January 1, 2027").

**Messages components show**: say what to do, not what went wrong ("Enter a valid value.", not "Invalid value."); never blame the person; no "please", no "oops"; sentence case with a period when it is a sentence. Announcements are short and stand alone ("3 results").

**Headings and links**: sentence case; link text says where it goes ("Theme builder", not "here"); one H1 per page.

**Checks**: `pnpm check` runs the counts check (`scripts/check-counts.mjs`) and cspell (US dictionary). Run the banned-word list above before publishing landing copy.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-03 | Initial design system created | Created by /design-consultation from the Focsd brief ("effortlessly clear"), visual research of Primer, GOV.UK and Atlassian, and an independent Claude subagent proposal that converged on the same core. |
| 2026-10-03 | Ink primary action instead of blue or pine | Escapes the category's blue default, avoids echoing GOV.UK's green buttons, and is the most neutral base for re-branding. |
| 2026-10-03 | Atkinson Hyperlegible Next and Mono as the only typeface family | Puts the accessibility story in the letterforms; SIL OFL, self-hostable. |
| 2026-10-03 | Two-tone marigold and ink focus ring as the signature | At least 3:1 on any background; makes accessibility the visible identity. |
| 2026-10-03 | 17px body, 44px controls by default; compact density is opt-in | Legibility first; dense UIs choose compact explicitly. |
| 2026-10-03 | Adopted from subagent: separate action and route tokens, hatch-plus-text disabled state, 17px body | Each makes meaning clear without relying on color alone. |
| 2026-10-03 | Token architecture: three tiers (ref/sys/cmp), `--focsd-*` names, Style Dictionary v5 per-mode passes | Added `action-press` and `surface-raised` states. |
| 2026-10-05 | Docs site uses a denser type scale (h1 32, h2 20, body 16, nav 14) on a white surface | The owner found the docs too big and spaced out next to shadcn/ui and Radix; measured both and matched their hierarchy while keeping Atkinson and the Wayfinding colors. Components keep 17px/44px. |
| 2026-10-05 | Default density is now 36px controls, 15px body, 14px/600 labels; 44px/17px becomes the opt-in `comfortable` density; `compact` is 32px | The owner found buttons and groups bulky next to shadcn/ui (36px, 14px). Matches shadcn, Radix (32px) and Carbon (40px) defaults; WCAG 2.5.8 needs 24px, so 36px keeps a margin. Touch and low-vision products keep 44px with one attribute. |
| 2026-10-06 | Default icons are Lucide (ISC), generated into `lucide-paths.js` under our system icon names | Owner's call. Matches the stroke style teams already use (shadcn/ui ships Lucide); permissive license kept in the file; no runtime dependency, names unchanged. |
| 2026-10-06 | Docs keep the Black Starlight theme | Owner's call, replacing the Wayfinding chrome. |
| 2026-10-08 | Renamed after a naming and availability search (the library is now Focsd: packages `@focsd/*`, tags `focsd-*`, tokens `--focsd-*`, layers `focsd.*`, classes `Focsd*`); the mark becomes an open "O" | Owner's call. The open ring keeps the ink tile and marigold underline. |
| 2026-10-15 | Renamed to Focsd: packages `@focsd/*`, CLI `focsd`, tags `focsd-*`, tokens `--focsd-*`, layers `focsd.*`, classes `Focsd*`; site focsd.dev, repo SunTribe1/focsd | Owner's call after finding a similarly named project; focsd.dev, npm `focsd` and `@focsd` were free. The open-"O" mark is unchanged until a new mark is chosen. |
| 2026-11-24 | Theme presets (harbor, signal, mineral; fern, clay, ledger, lagoon and ember removed 2026-11-26 as too close to each other) set by `data-focsd-brand`; layer order `focsd.tokens`, `focsd.preset`, `focsd.brand` | Owner's call (wave 16). A preset sets only the neutrals, the action trio, on-action, route, fonts and radii, in light and dark; status colors, tints and scrim inherit Wayfinding. Every preset passes the WCAG contrast pairs, no preset is purple, and high contrast always wins (colors revert, type and radii stay). Presets sit between the tokens and the app's own brand so a `focsd.brand` rule beats them. Added `focsd-theme-toggle` and `focsd-theme-picker`. Sources are generated from `scripts/preset-palettes.mjs`. |
| 2026-11-24 | `@focsd/ai`: ten chat elements over a small controller and a pluggable transport; markdown is vendored and DOM-only (no HTML sink); the thread is a feed that announces once per completed message, never per token | Wave 17 (owner asleep, rulings in owner review section J). Added the chat thread, message, streaming text, tool call, reasoning, prompt suggestions, message actions, composer, attachment tile and source chip (the catalogue counted 115 after wave 17). No server handlers ship; the docs show a recipe. |
| 2026-11-26 | Focus ring becomes a 1px gap and a 1px ink ring, replacing the 5px marigold and ink ring | Owner's call: the yellow box read as heavy. The gap and ring use the ground and ink colors, and each preset sets both from its own neutrals; it keeps at least 3:1 (WCAG 1.4.11, AA). The 1px ring is the owner's call: it meets AA (2.4.7, 1.4.11) but not the AAA 2px guidance of 2.4.13; the gap keeps it readable on filled controls. Marigold stays a brand accent (landing, logo), not the focus color. |
| 2026-11-26 | Invalid fields show a 1px critical border, replacing the 2px one | Owner's call, to match the 1px focus ring. Every field now uses the same weight (text-like fields were 2px, composite fields 1px). The icon and the message carry the error, so it does not rely on color alone (WCAG 1.4.1). |
