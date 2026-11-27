import { defineEcConfig } from '@astrojs/starlight/expressive-code';
import vesperLight from './src/vesper-light.json' with { type: 'json' };

export default defineEcConfig({
  // Dark first, light second: the order Starlight's theme switch expects. Dark is the Vesper theme
  // (owner's choice 2026-11-25); light is Vesper Light, the same color roles darkened to pass WCAG AA
  // on a light background (src/vesper-light.json, derived from the MIT-licensed Vesper theme).
  themes: ['vesper', vesperLight],
  // Wrap long lines: horizontally scrolling code blocks are not keyboard-scrollable (WCAG 2.1.1).
  defaultProps: { wrap: true },
  // One cached stylesheet; src/integrations/ec-styles-in-head.mjs moves its link into <head> so it
  // blocks rendering (Expressive Code links it in <body>, after blocks that may already paint).
  emitExternalStylesheet: true,
});
