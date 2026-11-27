// Negative fixture for resolved.test.mjs (m69): each line must fail to type-check.
import { cssVar, setBrand, setDensity, setTheme } from '../../dist/index.js';

cssVar('not-a-token');

setTheme('sepia');

setDensity('cosy');

setBrand('violet');
