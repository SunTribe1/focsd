// Usage: node scripts/gzip-size.mjs dist/focsd-text-field.js → gzip bytes, bundled with its imports (Lit included).
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import process from 'node:process';

const result = await build({ entryPoints: [process.argv[2]], bundle: true, minify: true, write: false, format: 'esm', logLevel: 'silent' });

console.log(gzipSync(result.outputFiles[0].contents).length);
