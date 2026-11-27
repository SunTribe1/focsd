import {
  brands,
  clearTheme,
  cssVar,
  noFlashHash,
  noFlashScript,
  presetSwatches,
  setBrand,
  type FocsdBrand,
  densities,
  setDensity,
  setTheme,
  themes,
  tokenNames,
  type Density,
  type FocsdDensity,
  type FocsdTheme,
  type FocsdToken,
  type Theme,
} from '../dist/index.js';

const name: FocsdToken = 'ink-muted';
const value: string = cssVar(name);
const first: FocsdToken | undefined = tokenNames[0];

// @ts-expect-error — not a token name
cssVar('not-a-token');

const density: Density = 'compact';
const sameDensity: FocsdDensity = density;
const theme: Theme = 'contrast';
const sameTheme: FocsdTheme = theme;
const allThemes: readonly FocsdTheme[] = themes;
const allDensities: readonly Density[] = densities;

setTheme('dark');

setDensity(density, document.body);

// @ts-expect-error — not a theme
setTheme('sepia');

// @ts-expect-error — grid's "comfortable" is a density, "cosy" is not
setDensity('cosy');

const brand: FocsdBrand = 'harbor';
const allBrands: readonly FocsdBrand[] = brands;

setBrand(brand);

setBrand(null, document.body);

clearTheme();

const swatch: string = presetSwatches.signal.dark['on-action'];
const snippet: string = noFlashScript + noFlashHash;

// @ts-expect-error — not a brand
setBrand('violet');

export { allBrands, swatch, snippet, value, first, sameDensity, sameTheme, allThemes, allDensities };
