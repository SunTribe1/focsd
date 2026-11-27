import { fileURLToPath } from 'node:url';

export const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

/** Absolute path to a file or glob under packages/tokens/src. */
export const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
