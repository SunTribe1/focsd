/** Coverage of the published packages' source, as exercised by the end-to-end tests. */

/** A repository source path: `packages/<pkg>/src/...`. */
export const SOURCE_KEY = /^packages\/[^/]+\/src\//;

/** The repository path inside a served URL or a cache path, without the query string. */
const repoPath = (path) => decodeURIComponent(String(path).split('?')[0]).replace(/^(?:.*?\/)?(packages\/[^/]+\/src\/)/, '$1');

/**
 * Vite's source maps name a module's source by its basename (`index.js`), so files that share a name
 * in different packages would collapse into one key. The served module (`distFile`) has the full path
 * and sits in the same directory as its source, so the key is that directory plus the basename.
 * @param {string} filePath
 * @param {{ url?: string, distFile?: string }} [info]
 */
export const sourceKey = (filePath, info) => {
  const fromSource = repoPath(info?.url ?? filePath);

  if (SOURCE_KEY.test(fromSource)) return fromSource;

  const served = info?.distFile ? repoPath(info.distFile) : '';

  if (!SOURCE_KEY.test(served)) return filePath;

  return `${served.slice(0, served.lastIndexOf('/') + 1)}${fromSource.split('/').at(-1)}`;
};

export const coverageOptions = {
  name: 'Focsd end-to-end coverage',
  outputDir: './coverage',
  reports: ['v8', 'console-summary', 'json-summary'],
  entryFilter: (entry) => /\/packages\/[^/]+\/src\//.test(entry.url) && !/phone-data|lucide-paths/.test(entry.url),
  sourcePath: sourceKey,
  cleanCache: false,
};
