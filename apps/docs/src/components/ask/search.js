/**
 * The "Ask the docs" brain: a scored keyword search over /ask-index.json and the short markdown
 * reply built from the best matches. No network and no model: every answer comes from the index,
 * and the bot says so when nothing matches well. Pure functions (test/ask-search.test.mjs).
 */

/**
 * @typedef {import('../../lib/ask-index.js').AskEntry} AskEntry
 * @typedef {{ entry: AskEntry, score: number }} Match
 * @typedef {{ text: string, sources: { url: string, title: string }[], matches: Match[] }} Answer
 */

/** Words that carry no meaning for the search. */
const STOP = new Set(
  'a an and are as at be by can do does for from has have how i if in is it its me my of on or our the there this to use using we what when where which with would you your want need make get build add show tell about any some work works'.split(
    ' ',
  ),
);

/** Points a query word earns in each field. */
const SCORE = Object.freeze({ tag: 10, alias: 10, name: 8, keyword: 5, phrase: 7, summary: 1.5 });

/** Below this the bot says it is not sure instead of guessing. */
export const MIN_SCORE = 5;

/** A related match must reach this share of the best score to be mentioned. */
const RELATED_SHARE = 0.5;

/** Simple stem so "forms", "charts" and "themed" meet "form", "chart" and "theme". */
const stem = (/** @type {string} */ word) => word.replace(/(?:ing|ed|es|s)$/, '') || word;

/**
 * The meaningful, stemmed words of a query.
 * @param {string} query
 */
function queryTerms(query) {
  const words = query.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [];

  return [...new Set(words.filter((w) => !STOP.has(w) && w.length > 1).map(stem))];
}

/**
 * The words an entry is known by, stemmed: its name, its tag, its aliases and its one-word keywords.
 * @param {AskEntry} entry
 */
function vocabulary(entry) {
  const words = (/** @type {string[]} */ list) => new Set(list.map(stem));

  return {
    name: words([...(entry.name.toLowerCase().match(/[a-z0-9]+/g) ?? []), ...(entry.tag?.replace(/^focsd-/, '').split('-') ?? [])]),
    aliases: words(entry.aliases ?? []),
    keywords: words(entry.keywords.filter((k) => !k.includes(' '))),
  };
}

/**
 * Points for one query word: the strongest of alias, name and keyword, plus the summary.
 * @param {AskEntry} entry
 * @param {ReturnType<typeof vocabulary>} words
 * @param {string} term
 */
function termScore(entry, words, term) {
  const exactTag = entry.tag === term || entry.tag === `focsd-${term}` ? SCORE.tag : 0;

  const named = Math.max(
    words.aliases.has(term) ? SCORE.alias : 0,
    words.name.has(term) ? SCORE.name : 0,
    words.keywords.has(term) ? SCORE.keyword : 0,
  );

  return exactTag + named + (entry.summary.toLowerCase().includes(term) ? SCORE.summary : 0);
}

/**
 * Points for phrases in the query: keyword phrases, the whole name, and the tag in words.
 * @param {AskEntry} entry
 * @param {string} q The lower-cased query.
 */
function phraseScore(entry, q) {
  const name = entry.name.toLowerCase();
  const phrases = entry.keywords.filter((k) => k.includes(' ') && k !== name && q.includes(k)).length * SCORE.phrase;
  // The whole name in the query ("data grid", "date range picker") is the strongest signal.
  const whole = name.includes(' ') && q.includes(name) ? SCORE.phrase : 0;
  // The element's own name in words ("data grid" for focsd-data-grid) beats a guide of the same name.
  const tag = entry.tag && q.includes(entry.tag.replace(/^focsd-/, '').replaceAll('-', ' ')) ? SCORE.summary : 0;

  return phrases + whole + tag;
}

/**
 * How well one entry answers the query.
 * @param {AskEntry} entry
 * @param {string} q The lower-cased query.
 * @param {string[]} terms
 */
function scoreEntry(entry, q, terms) {
  const words = vocabulary(entry);

  return terms.reduce((sum, term) => sum + termScore(entry, words, term), 0) + phraseScore(entry, q);
}

/**
 * Entries ranked for a query, best first; only those with a positive score.
 * @param {AskEntry[]} entries
 * @param {string} query
 * @returns {Match[]}
 */
export function search(entries, query) {
  const q = query.toLowerCase();
  const terms = queryTerms(query);

  if (!terms.length) return [];
  // "How do I …" asks for a guide; "Is there a …" asks for a component.
  const wantsGuide = /\bhow (?:do|can|should|to)\b/.test(q);
  const wantsComponent = /\b(?:is there|do you have|have you got|component for)\b/.test(q);

  return entries
    .map((entry) => {
      let score = scoreEntry(entry, q, terms);

      if (score > 0 && wantsGuide && entry.kind === 'guide') score += 2;

      if (score > 0 && wantsComponent && entry.kind === 'component') score += 2;

      return { entry, score };
    })
    .filter((m) => m.score > 0)
    .toSorted((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
}

/** Guide names that are also component names. */
const GUIDE_TWINS = new Set(['Data grid', 'Charts', 'Chat UI (AI kit)', 'Patterns', 'Blocks']);

/** A guide that shares a component's name ("Data grid") is called "Data grid guide". */
const title = (/** @type {AskEntry} */ entry) =>
  entry.kind === 'guide' && GUIDE_TWINS.has(entry.name) ? `${entry.name} guide` : entry.name;

/** A site link the markdown renderer keeps (it allows `/…` paths). */
const link = (/** @type {AskEntry} */ entry) => `[${title(entry)}](${entry.url})`;

/**
 * The reply to a question: markdown text plus the pages it used as sources.
 * @param {AskEntry[]} entries
 * @param {string} query
 * @param {{ count?: number }} [options] `count` is the number of components, for the fallback.
 * @returns {Answer}
 */
export function answer(entries, query, { count } = {}) {
  const matches = search(entries, query);
  const [best] = matches;

  if (!best || best.score < MIN_SCORE) {
    const searchUrl = `/?search=${encodeURIComponent(query.trim().slice(0, 80))}`;
    const browse = count ? `browse [all ${count} components](/components/)` : 'browse [the components](/components/)';
    const guess = best ? ` The closest page I found is ${link(best.entry)}, but I am not sure it answers this.` : '';

    return {
      text: `I could not find a clear answer to that in the docs.${guess} Try [searching the docs](${searchUrl}) or ${browse}.`,
      sources: best ? [{ url: best.entry.url, title: title(best.entry) }] : [],
      matches,
    };
  }

  const related = matches.slice(1, 3).filter((m) => m.score >= best.score * RELATED_SHARE && m.entry.url !== best.entry.url);
  const { entry } = best;
  const isQuestion = /^\s*(?:is there|do you have|does it have|can i|does it|does focsd)\b/i.test(query);

  const lead =
    entry.kind === 'component'
      ? `${isQuestion ? 'Yes. ' : ''}**${entry.name}** (\`<${entry.tag}>\`): ${entry.summary}`
      : `${isQuestion ? 'Yes. ' : ''}The **${entry.name}** page covers this. ${entry.summary}`;

  const code = entry.example ? `\n\n\`\`\`${entry.lang ?? 'html'}\n${entry.example}\n\`\`\`` : '';
  const more = `\n\nRead more: ${link(entry)}.`;
  const also = related.length ? ` Related: ${related.map((m) => link(m.entry)).join(', ')}.` : '';

  return {
    text: `${lead}${code}${more}${also}`,
    sources: [entry, ...related.map((m) => m.entry)].map((e) => ({ url: e.url, title: title(e) })),
    matches,
  };
}
