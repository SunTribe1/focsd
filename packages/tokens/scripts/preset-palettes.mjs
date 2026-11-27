/**
 * Theme preset palettes (wave 16, R1–R3). Each role is [family, L, C?] in OKLCH; the family sets the hue
 * and default chroma. gen-presets.mjs turns these into src/presets/<name>/{ref,light,dark,base}.json.
 * The focus ring's gap and ring follow each preset's ground and ink. Status colors, scrim and hatch are not set: they inherit the Wayfinding values, and the contrast
 * test proves they still pass on each preset's grounds.
 */

const SANS = ['ui-sans-serif', 'system-ui', 'sans-serif'];

/** Shared neutral ramp (lightness only); each preset tints it with its own neutral family. Light surfaces stay near-white. */
const neutrals = (n, surfaceC = 0.004) => ({
  light: {
    ground: [n, 0.97],
    'focus-inner': [n, 0.97],
    surface: [n, 0.995, surfaceC],
    'surface-sunk': [n, 0.952],
    'surface-raised': [n, 0.995, surfaceC],
    ink: [n, 0.22],
    'focus-outer': [n, 0.22],
    'ink-muted': [n, 0.47],
    edge: [n, 0.6],
    'edge-quiet': [n, 0.88],
  },
  dark: {
    ground: [n, 0.19],
    'focus-inner': [n, 0.19],
    surface: [n, 0.23],
    'surface-sunk': [n, 0.16],
    'surface-raised': [n, 0.23],
    ink: [n, 0.94],
    'focus-outer': [n, 0.94],
    'ink-muted': [n, 0.75],
    edge: [n, 0.57],
    'edge-quiet': [n, 0.32],
  },
});

/** A brand action trio with white text in light, dark text on a light tint in dark; chroma is [light, dark]. */
const action = (a, [l, hover, press], [darkL, darkHover, darkPress], [c, dc]) => ({
  light: { action: [a, l, c], 'action-hover': [a, hover, c], 'action-press': [a, press, c], 'on-action': [a, 0.995, 0.004] },
  dark: {
    action: [a, darkL, dc],
    'action-hover': [a, darkHover, dc * 0.8],
    'action-press': [a, darkPress, dc],
    'on-action': [a, 0.2, 0.03],
  },
});

const route = (r, l, darkL, c) => ({ light: { route: [r, l, c] }, dark: { route: [r, darkL, c * 0.7] } });

const merge = (...parts) => ({
  light: Object.assign({}, ...parts.map((p) => p.light)),
  dark: Object.assign({}, ...parts.map((p) => p.dark)),
});

/**
 * Prismatic's component hooks. Components read these with a fallback to their usual look, so only
 * this preset makes them colorful: avatars and colored tags (hue-N), navigation icons cycling
 * through the hues, gradient fills (progress, slider) and chart series.
 */
const PRISMATIC_HOOKS = {
  'fill-gradient': 'linear-gradient(90deg, var(--focsd-accent-1), var(--focsd-accent-2), var(--focsd-accent-3))',
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => [
      [`hue-${n}`, `var(--focsd-accent-${n})`],
      [`hue-${n}-tint`, `var(--focsd-accent-${n}-tint)`],
    ]),
  ),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`chart-${n}`, `var(--focsd-accent-${[1, 2, 7, 5, 3, 8][n - 1]})`])),
};

/** Light-theme lightness of the category colors that need to be darker than the rest (default 0.52). */
const LIGHT_ACCENT_L = { green: 0.47, teal: 0.47 };

/** The eight category hues, in order: accent-1 to accent-8. */
const ACCENTS = ['blue', 'violet', 'pink', 'red', 'orange', 'amber', 'green', 'teal'];

/** Prismatic's neutrals: the shared ramp in light; a deeper, cooler dark, the canvas the colors sit on. */
function prismaticNeutrals() {
  const base = neutrals('ink');

  Object.assign(base.dark, {
    ground: ['ink', 0.145],
    'focus-inner': ['ink', 0.145],
    surface: ['ink', 0.19],
    'surface-sunk': ['ink', 0.12],
    'surface-raised': ['ink', 0.215],
    ink: ['ink', 0.97],
    'ink-muted': ['ink', 0.74],
    edge: ['ink', 0.53],
    'edge-quiet': ['ink', 0.28],
  });

  return base;
}

/** Prismatic's status tones: saturated, with deeper tints than the other presets. */
const prismaticStatus = () => ({
  light: {
    positive: ['green', 0.47],
    'positive-tint': ['green', 0.95, 0.04],
    caution: ['amber', 0.48],
    'caution-tint': ['amber', 0.95, 0.04],
    critical: ['red', 0.52],
    'critical-tint': ['red', 0.95, 0.04],
    info: ['blue', 0.5],
    'info-tint': ['blue', 0.95, 0.04],
  },
  dark: {
    positive: ['green', 0.8],
    'positive-tint': ['green', 0.28, 0.06],
    caution: ['amber', 0.84],
    'caution-tint': ['amber', 0.29, 0.06],
    critical: ['red', 0.75],
    'critical-tint': ['red', 0.28, 0.06],
    info: ['blue', 0.76, 0.133],
    'info-tint': ['blue', 0.28, 0.06],
  },
});

/**
 * The eight category colors and their tints for one theme.
 * @param {(hue: string) => unknown[]} color
 * @param {unknown[]} tint
 */
const accentRoles = (color, tint) =>
  Object.fromEntries(
    ACCENTS.flatMap((hue, i) => [
      [`accent-${i + 1}`, color(hue)],
      [`accent-${i + 1}-tint`, [hue, ...tint]],
    ]),
  );

/**
 * Prismatic: a cool near-black (dark) or near-white (light) base where color carries meaning.
 * Blue action, links and focus ring; saturated status tones with deeper tints; eight category
 * hues, each with a tint, for avatars, colored tags, navigation icons and chart series.
 */
function prismaticRoles() {
  // Green and teal read lighter at the same lightness: a step darker keeps 4.5:1 on their tint.
  const accents = {
    light: accentRoles((hue) => [hue, LIGHT_ACCENT_L[hue] ?? 0.52], [0.95, 0.04]),
    dark: accentRoles((hue) => [hue, 0.79, 0.14], [0.28, 0.06]),
  };

  const ring = { light: { 'focus-outer': ['blue', 0.5] }, dark: { 'focus-outer': ['blue', 0.72, 0.16] } };

  return merge(
    prismaticNeutrals(),
    action('blue', [0.52, 0.47, 0.42], [0.72, 0.8, 0.66], [0.19, 0.16]),
    route('blue', 0.5, 0.76, 0.19),
    prismaticStatus(),
    accents,
    ring,
  );
}

export const PRESET_DATA = {
  harbor: {
    label: 'Harbor',
    mood: 'Institutional, steady',
    sans: ['IBM Plex Sans', ...SANS],
    radius: [2, 4, 2],
    families: { grey: [250, 0.008], navy: [258, 0.1], teal: [228, 0.09] },
    roles: merge(neutrals('grey'), action('navy', [0.36, 0.43, 0.3], [0.82, 0.88, 0.76], [0.11, 0.07]), route('teal', 0.48, 0.78, 0.1)),
  },
  signal: {
    label: 'Signal',
    mood: 'Bright, operational',
    sans: ['Lexend', ...SANS],
    radius: [8, 12, 6],
    families: { grey: [0, 0], amber: [72, 0.16], blue: [255, 0.15] },
    roles: merge(
      neutrals('grey', 0),
      {
        light: {
          action: ['amber', 0.64],
          'action-hover': ['amber', 0.6],
          'action-press': ['amber', 0.58],
          'on-action': ['amber', 0.13, 0.02],
        },
        dark: {
          action: ['amber', 0.82],
          'action-hover': ['amber', 0.87, 0.13],
          'action-press': ['amber', 0.76],
          'on-action': ['amber', 0.2, 0.03],
        },
      },
      route('blue', 0.5, 0.78, 0.15),
    ),
  },
  mineral: {
    label: 'Mineral',
    mood: 'Technical, cool',
    sans: ['Red Hat Text', ...SANS],
    radius: [4, 6, 3],
    families: { slate: [235, 0.012], petrol: [205, 0.08], blue: [250, 0.13] },
    roles: merge(neutrals('slate'), action('petrol', [0.42, 0.48, 0.36], [0.82, 0.88, 0.76], [0.08, 0.07]), route('blue', 0.5, 0.78, 0.13)),
  },
  prismatic: {
    label: 'Prismatic',
    mood: 'Dark-first, colorful',
    sans: ['Inter', ...SANS],
    radius: [8, 12, 6],
    families: {
      ink: [265, 0.008],
      blue: [255, 0.19],
      violet: [295, 0.18],
      pink: [350, 0.17],
      red: [25, 0.18],
      orange: [55, 0.16],
      amber: [85, 0.16],
      green: [150, 0.15],
      teal: [195, 0.12],
    },
    roles: prismaticRoles(),
    // Not color roles: fills and chart series the components read with fallbacks (see focsd-progress,
    // focsd-chart). Written as-is into each theme's rules, and reverted under high contrast.
    extras: {
      light: {
        ...PRISMATIC_HOOKS,
      },
      dark: {
        ...PRISMATIC_HOOKS,
      },
    },
  },
};
