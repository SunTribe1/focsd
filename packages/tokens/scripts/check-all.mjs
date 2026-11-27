import { readFile } from 'node:fs/promises';
import { loadTokens } from '../lib/load.mjs';
import { src } from '../lib/paths.mjs';
import { BASE, DENSITIES, REF, THEMES, densityFile, fullSet, themeFile } from '../lib/passes.mjs';
import { checkGrades } from '../lib/checks/grades.mjs';
import { checkParity } from '../lib/checks/parity.mjs';
import { checkHygiene } from '../lib/checks/hygiene.mjs';
import { checkContrast, colorMap } from '../lib/checks/contrast.mjs';

const errors = [];
const ref = await loadTokens({ source: REF });

errors.push(...checkGrades(ref), ...checkHygiene(ref));

const byFile = async (file) => loadTokens({ include: REF, source: [file] });
const themes = Object.fromEntries(await Promise.all(THEMES.map(async (t) => [t, await byFile(themeFile(t))])));
const densities = Object.fromEntries(await Promise.all(DENSITIES.map(async (d) => [d, await byFile(densityFile(d))])));

errors.push(...checkParity(themes), ...checkParity(densities));

for (const tokens of [await byFile(BASE), ...Object.values(themes), ...Object.values(densities)]) {
  errors.push(...checkHygiene(tokens));
}

const spec = JSON.parse(await readFile(src('checks/contrast-pairs.json'), 'utf8'));

for (const theme of THEMES) {
  errors.push(...checkContrast(theme, colorMap(await loadTokens(fullSet(theme, 'comfortable'))), spec));
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} token check(s) failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}

console.log('✓ token checks passed (grades, parity, hygiene, contrast)');
