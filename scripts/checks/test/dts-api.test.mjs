import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { typeAliases } from '../../lib/dts-api.mjs';

/** A package folder whose `types/index.d.ts` holds `source`. */
function packageWith(source) {
  const dir = mkdtempSync(join(tmpdir(), 'dts-api-'));

  mkdirSync(join(dir, 'types'));
  writeFileSync(join(dir, 'types', 'index.d.ts'), source);

  return dir;
}

describe('typeAliases', () => {
  it('reads a union alias', () => {
    assert.deepEqual(typeAliases(packageWith("export type Size = 's' | 'm';\n")), { Size: "'s' | 'm'" });
  });

  it('reads an object type past its first member', () => {
    const aliases = typeAliases(packageWith('export type Point = {\n  x: number;\n  y: number;\n};\nexport type Id = string;\n'));

    assert.deepEqual(aliases, { Point: '{ x: number; y: number; }', Id: 'string' });
  });

  it('reads a generic alias with nested members', () => {
    const aliases = typeAliases(packageWith('export type Box<T> = Array<{ value: T; label: string }>;\n'));

    assert.equal(aliases.Box, 'Array<{ value: T; label: string }>');
  });
});
