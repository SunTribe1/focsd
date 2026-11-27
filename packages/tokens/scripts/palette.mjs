/** Graded families: step names are derived from OKLCH lightness by the generator. */
export const graded = {
  graphite: [
    '#0C0F0E',
    '#101413',
    '#141A18',
    '#181E1C',
    '#2A3330',
    '#2C3532',
    '#4B5754',
    '#6A7773',
    '#7D8985',
    '#A2AEAA',
    '#D3DAD7',
    '#E7ECEA',
    '#EBEFED',
    '#F4F6F5',
    '#FFFFFF',
  ],
  // Dark theme: neutral graphite (no green cast), chosen by the owner 2026-11-25.
  neutral: ['#0B0B0C', '#111113', '#1A1A1D', '#2A2A2F', '#71717A', '#A1A1AA', '#D4D4D8', '#ECECEE'],
  teal: ['#0A5E73', '#78C6DE'],
  green: ['#15291D', '#1B6B3A', '#6CC98A', '#E3F1E8'],
  amber: ['#2E2412', '#855400', '#EDB24E', '#FBF0D9'],
  red: ['#33191A', '#B0302A', '#F28B82', '#F9E6E4'],
  marigold: ['#F2B705', '#FFD23F'],
};

/** Translucent colors: name = base + alpha percent. Exempt from grade naming. */
export const overlay = {
  'ink-48': ['#141A18', 0.48],
  'ink-28': ['#141A18', 0.28],
  'ink-12': ['#141A18', 0.12],
  'ink-10': ['#141A18', 0.1],
  'paper-12': ['#E7ECEA', 0.12],
  'black-75': ['#000000', 0.75],
  'black-66': ['#000000', 0.66],
  'black-60': ['#000000', 0.6],
  'black-40': ['#000000', 0.4],
  'black-25': ['#000000', 0.25],
};

/** High-contrast theme colors. Exempt from grade naming. */
export const contrast = {
  black: '#000000',
  navy: '#00007A',
  green: '#004D1F',
  amber: '#5C3A00',
  red: '#8A0000',
};
