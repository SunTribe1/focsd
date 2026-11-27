import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LUCIDE_NAMES, nodeToPath, generateLucidePaths } from '../scripts/build-icons.mjs';

describe('Lucide default icons', () => {
  it('converts every Lucide element kind to path data', () => {
    expect(nodeToPath(['path', { d: 'M18 6 6 18' }])).toBe('M18 6 6 18');
    expect(nodeToPath(['line', { x1: '12', y1: '5', x2: '12', y2: '19' }])).toBe('M12 5L12 19');
    expect(nodeToPath(['circle', { cx: '12', cy: '12', r: '10' }])).toBe('M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0');
    expect(nodeToPath(['rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' }])).toBe(
      'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z',
    );
    expect(nodeToPath(['rect', { x: '8', y: '8', width: '14', height: '14' }])).toBe('M8 8h14v14h-14z');
  });

  it('makes a leading relative moveto absolute so joined paths keep their place', () => {
    expect(nodeToPath(['path', { d: 'm6 6 12 12' }])).toBe('M6 6l12 12');
    expect(nodeToPath(['path', { d: 'm12.5 3-1 2' }])).toBe('M12.5 3l-1 2');
    expect(nodeToPath(['path', { d: 'm6 9 6 6 6-6' }])).toBe('M6 9l6 6 6-6');
  });

  it('covers every system icon name', async () => {
    const paths = await generateLucidePaths();
    expect(Object.keys(paths).toSorted()).toEqual(Object.keys(LUCIDE_NAMES).toSorted());
    expect(paths.x).toBe('M18 6 6 18M6 6l12 12');
  });

  it('the committed file matches the installed Lucide version and keeps its license notice', async () => {
    const committed = readFileSync(new URL('../src/internal/lucide-paths.js', import.meta.url), 'utf8');
    const paths = await generateLucidePaths();

    for (const [name, d] of Object.entries(paths)) expect(committed).toContain(`${JSON.stringify(name)}: ${JSON.stringify(d)}`);
    expect(committed).toContain('ISC License');
    expect(committed).toContain('Lucide');
  });

  it('is the default library', async () => {
    const { iconPaths } = await import('../src/internal/icons.js');
    const paths = await generateLucidePaths();
    expect(iconPaths).toEqual(paths);
  });
});
