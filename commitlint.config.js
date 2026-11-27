/**
 * Conventional Commits (https://www.conventionalcommits.org): `type(scope)?: subject`.
 * Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
 * Checked by the commit-msg hook and, for pull requests, by CI (the title becomes the squash commit).
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subjects may start with a name (Focsd, Lit, React), so no case rule.
    'subject-case': [0],
    // Long URLs and generated release notes are fine in a body or footer.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
