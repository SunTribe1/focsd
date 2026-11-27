import StyleDictionary from 'style-dictionary';

/**
 * Run one Style Dictionary pass. `include` files only resolve aliases; only `source` tokens are returned.
 * @param {{ include?: string[], source: string[] }} files
 * @returns {Promise<Array<{ path: string[], type: string | undefined, value: any, original: any, extensions: object }>>}
 */
export async function loadTokens({ include = [], source }) {
  const sd = new StyleDictionary({
    include,
    source,
    usesDtcg: true,
    log: { verbosity: 'silent', warnings: 'disabled' },
    platforms: { raw: {} },
  });

  const { allTokens } = await sd.getPlatformTokens('raw');

  return allTokens
    .filter((token) => token.isSource)
    .map((token) => ({
      path: token.path,
      type: token.$type,
      value: token.$value,
      original: token.original.$value,
      extensions: token.$extensions ?? {},
    }));
}
