// Prints, as JSON, whether the icon sanitizer module was loaded while importing argv[2] (and, with
// argv[3] = "register", after registering an app icon library). Instruments module resolution;
// nothing is replaced.
import { registerHooks } from 'node:module';
import process from 'node:process';

let loaded = false;

registerHooks({
  resolve(specifier, context, next) {
    const resolved = next(specifier, context);

    if (resolved.url.endsWith('internal/icon-sources.js')) loaded = true;

    return resolved;
  },
});

await import(process.argv[2]);

if (process.argv[3] === 'register') {
  const { registerIconLibrary } = await import('@focsd/primitives/utils');
  registerIconLibrary('app', { resolve: () => null });
}

await new Promise((resolve) => setTimeout(resolve, 100));

process.stdout.write(JSON.stringify({ loaded }));
