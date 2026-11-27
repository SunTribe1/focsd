import { src } from './paths.mjs';

export const REF = [src('ref/*.json')];
export const BASE = src('sys/base.json');
export const THEMES = ['light', 'dark', 'contrast'];
export const DENSITIES = ['default', 'comfortable', 'compact'];

export const themeFile = (theme) => src(`sys/theme/${theme}.json`);
export const densityFile = (density) => src(`sys/density/${density}.json`);

/** Everything needed to fully resolve one theme × density combination. */
export const fullSet = (theme, density) => ({
  include: [],
  source: [...REF, BASE, themeFile(theme), densityFile(density)],
});

/** Theme presets (wave 16): `data-focsd-brand` values, in display order. */
export const PRESETS = ['harbor', 'signal', 'mineral', 'prismatic'];

/** One preset source file: `ref`, `light`, `dark` or `base`. */
export const presetFile = (name, part) => src(`presets/${name}/${part}.json`);

/** The default theme set with one preset layered on top (later sources win), for the contrast check. */
export const presetSet = (name, theme, density = 'comfortable') => ({
  include: [],
  source: [...fullSet(theme, density).source, presetFile(name, 'ref'), presetFile(name, 'base'), presetFile(name, theme)],
});
