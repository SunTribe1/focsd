/** Every context must define exactly the same token paths. */
export function checkParity(groups) {
  const keys = Object.fromEntries(Object.entries(groups).map(([ctx, tokens]) => [ctx, new Set(tokens.map((t) => t.path.join('.')))]));
  const all = new Set(Object.values(keys).flatMap((set) => [...set]));
  const errors = [];

  for (const [ctx, set] of Object.entries(keys)) {
    for (const key of all) if (!set.has(key)) errors.push(`${ctx} is missing ${key}`);
  }

  return errors;
}
