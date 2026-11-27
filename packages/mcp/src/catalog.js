/** The catalog: the bundled data (a generated JS module, so it loads in Node and in Workers), bound to the lookups in core.js. */
import { createCatalog } from './core.js';
import data from '../data/focsd.js';

export { DEFAULT_SEARCH_LIMIT } from './core.js';

const catalog = createCatalog(data);

export const {
  version,
  normalizeTag,
  listComponents,
  categories,
  searchComponents,
  getComponent,
  suggestTags,
  getTokens,
  getSetup,
  FRAMEWORKS,
  validateMarkup,
  componentMarkdown,
} = catalog;
