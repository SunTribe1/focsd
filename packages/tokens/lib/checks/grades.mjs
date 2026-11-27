const EXEMPT = new Set(['overlay', 'contrast']);

/** Reference color step names must equal round(OKLCH L × 100) ± 1. */
export function checkGrades(tokens) {
  const errors = [];

  for (const t of tokens) {
    const [tier, group, family, step] = t.path;

    if (tier !== 'ref' || group !== 'color' || EXEMPT.has(family)) continue;
    const grade = Math.round(t.value.components[0] * 100);

    if (!Number.isFinite(Number(step)) || Math.abs(Number(step) - grade) > 1) {
      errors.push(`${t.path.join('.')}: name says ${step} but OKLCH lightness is ${grade}`);
    }
  }

  return errors;
}
