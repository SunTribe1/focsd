const WHOLE_ALIAS = /^\{([^}]+)\}$/;
const ALLOWED = { ref: null, sys: 'ref', cmp: 'sys' };

const aliasesIn = (value) => {
  if (typeof value === 'string') return [...value.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);

  if (Array.isArray(value)) return value.flatMap(aliasesIn);

  if (value && typeof value === 'object') return Object.values(value).flatMap(aliasesIn);

  return [];
};

/** ref references nothing; sys references only ref; cmp references only sys; sys colors must be aliases. */
export function checkHygiene(tokens) {
  const errors = [];

  for (const t of tokens) {
    const tier = t.path[0];
    const allowed = ALLOWED[tier];

    for (const target of aliasesIn(t.original)) {
      if (target.split('.')[0] !== allowed) {
        errors.push(`${t.path.join('.')} references ${target}; ${tier} tokens may only reference ${allowed ?? 'nothing'}`);
      }
    }

    if (tier === 'sys' && t.type === 'color' && !(typeof t.original === 'string' && WHOLE_ALIAS.test(t.original))) {
      errors.push(`${t.path.join('.')} must alias a ref color, not a raw value`);
    }
  }

  return errors;
}
