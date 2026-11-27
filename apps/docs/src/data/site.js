/**
 * Where the docs live and where the code is, read once from the published package metadata so no
 * config file repeats an address.
 */
import { readRepoJson } from '../lib/repo.js';

const { homepage, repository } = readRepoJson('packages/components/package.json');

/** The docs site, no trailing slash: `https://focsd.dev`. */
export const SITE = homepage.replace(/\/$/, '');

/** The GitHub repository as a browsable URL (npm stores it as `git+https://….git`). */
export const REPO_URL = repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

/** The social preview image every page shares. */
export const OG_IMAGE = `${SITE}/og.png`;
