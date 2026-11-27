/**
 * The stat tile's change ("delta"): its direction, whether that is good news, and the words read
 * for it (private: the stat base imports it by relative path).
 */

/** @typedef {'up' | 'down' | 'flat'} StatTrend */

/** @typedef {'good' | 'bad' | 'neutral'} StatJudgement */

/** @typedef {{ trend: StatTrend, judgement: StatJudgement }} DeltaState */

/** @typedef {(key: string, ...args: unknown[]) => string} Term */

const TRENDS = new Set(['up', 'down', 'flat']);

/**
 * The direction of a change and whether it is good news, or null when there is no change to show.
 * @param {number | undefined} delta The change; its sign gives the trend.
 * @param {string} [trend] An explicit `up`, `down` or `flat` that wins over the sign.
 * @param {string} [good] The direction that is good news: `up` (default) or `down`.
 * @returns {DeltaState | null}
 */
export function deltaState(delta, trend = '', good = 'up') {
  if (delta === undefined || delta === null || !Number.isFinite(Number(delta))) return null;
  const n = Number(delta);
  /** @type {StatTrend} */
  const direction = TRENDS.has(trend) ? /** @type {StatTrend} */ (trend) : n > 0 ? 'up' : n < 0 ? 'down' : 'flat';

  if (direction === 'flat') return { trend: direction, judgement: 'neutral' };

  return { trend: direction, judgement: direction === (good === 'down' ? 'down' : 'up') ? 'good' : 'bad' };
}

/**
 * The words for a change: "Up 12% from last period, good", or "No change from last period".
 * @param {Term} term The element's translation lookup.
 * @param {DeltaState} state
 * @param {string} amount The formatted size of the change, without its sign.
 * @param {string} period What the change is measured against; "last period" when empty.
 * @returns {string}
 */
export function deltaText(term, state, amount, period) {
  const against = period || term('lastPeriod');

  if (state.trend === 'flat') return term('deltaFlat', against);
  const words = term(state.trend === 'up' ? 'deltaUp' : 'deltaDown', amount, against);

  return `${words}${term('listSeparator')}${term(state.judgement === 'good' ? 'deltaGood' : 'deltaBad')}`;
}
