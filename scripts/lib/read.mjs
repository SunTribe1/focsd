/**
 * File reads for the repo scripts. A missing file is reported as one plain sentence (what is
 * missing and how to make it) instead of a raw ENOENT stack.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Raised for a file the script needs but cannot find; the message is meant for the console. */
export class MissingFileError extends Error {}

/**
 * @param {string | URL} path
 * @param {string} [hint] How to create the file, for example "run `pnpm analyze` first".
 * @returns {string}
 */
export function readText(path, hint) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    const shown = path instanceof URL ? fileURLToPath(path) : path;

    throw new MissingFileError(`${shown} not found${hint ? `: ${hint}` : ''}.`, { cause: error });
  }
}

/**
 * @param {string | URL} path
 * @param {string} [hint]
 * @returns {any} The parsed JSON (callers narrow it).
 */
export function readJson(path, hint) {
  const text = readText(path, hint);

  try {
    return JSON.parse(text);
  } catch (error) {
    const shown = path instanceof URL ? fileURLToPath(path) : path;

    throw new Error(`${shown} is not valid JSON: ${/** @type {Error} */ (error).message}`, { cause: error });
  }
}

/**
 * Run a script body; a missing file prints its message and sets a failing exit code, other errors
 * keep their stack.
 * @param {() => void} main
 */
export function runScript(main) {
  try {
    main();
  } catch (error) {
    if (!(error instanceof MissingFileError)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  }
}
