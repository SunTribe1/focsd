# Releasing Focsd

How a change becomes an npm release, and the one-time setup the workflows need. Versions follow [Semantic Versioning](https://semver.org); what counts as a breaking change is in [VERSIONING.md](VERSIONING.md).

## How a release happens

1. Every pull request that changes a published package adds a changeset: `pnpm changeset`, pick the packages, pick `patch`, `minor` or `major`, and write one line for the changelog. All `@focsd-dev/*` packages and the `focsd` CLI share one version (a Changesets `fixed` group).
2. Pull requests merge into `main` with a [Conventional Commits](https://www.conventionalcommits.org) title (`feat: …`, `fix: …`, `docs: …`); commitlint checks it.
3. When CI passes on `main`, the Release workflow opens (or updates) a **"chore: version packages"** pull request that bumps the versions and writes the changelogs.
4. Merging that pull request publishes every package to npm, then creates one git tag and one GitHub release for the shared version (`v1.2.0`, notes merged from every package's changelog by `scripts/release-notes.mjs`), and opens a pull request with the API baseline in `api/`.
5. The Docs workflow deploys the site after CI passes on `main`; the [changelog page](https://focsd.dev/changelog/) is built from the packages' `CHANGELOG.md` files, so it updates with each release.

Before publishing, `pnpm check:packages` builds and packs every package and runs [publint](https://publint.dev) and [Are the Types Wrong?](https://arethetypeswrong.github.io) on the tarballs.

## One-time setup

### Accounts

- **npm:** the organization `focsd` (free for public packages).
- **Cloudflare:** a Pages project named `focsd` and the custom domain `focsd.dev` (Pages → Custom domains). HTTPS is automatic.
- **GitHub:** this repository, public before the first npm publish (npm provenance needs a public repository).

### Repository secrets (Settings → Secrets and variables → Actions)

| Secret | Used by | Notes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Docs | A token with **Cloudflare Pages: Edit**. |
| `CLOUDFLARE_ACCOUNT_ID` | Docs | Shown on the Cloudflare dashboard's overview. |
| `NPM_TOKEN` | Release | **First publish only.** A granular token with publish rights for `@focsd-dev/*` and `focsd`. Delete it once trusted publishing is set up. |
| `RELEASE_TOKEN` | Release | Optional. A fine-grained token with Contents and Pull requests (read and write), so CI runs on the "Version packages" pull request. |

### npm trusted publishing (no long-lived token)

npm lets a package trust this repository's Release workflow, which then publishes with a short-lived OIDC token. A package must exist on npm before it can trust a workflow, so:

1. Publish 1.0.0 once with `NPM_TOKEN` set.
2. For each of the 11 packages, open its page on the npm website, then Settings → **Trusted publishing**, choose GitHub Actions, and enter owner `SunTribe1`, repository `focsd`, workflow `release.yml`.
3. Delete the `NPM_TOKEN` secret. Later releases publish through OIDC, with provenance.

### Branch protection

Protect `main` (Settings → Rules): require a pull request and these checks: `Secret scan (full history)`, `Commit messages`, `Lint, types, unit tests and size budgets`, `End-to-end coverage of the packages (Chromium)`, `Components in Chromium, Firefox and WebKit` and `Docs site`. Add `Visual regression (Chromium, Linux baselines)` once the Linux baselines are on `main`.

Also turn on private vulnerability reporting (Security tab) and Discussions.

### Visual baselines

The CI visual job compares against Linux screenshots. To record them, run Actions → **Update visual baselines** on a pull request's branch (it refuses `main`). It commits `apps/playground/e2e/__screenshots__/linux/` to that branch. Run it again after any intended visual change. Both jobs use the `mcr.microsoft.com/playwright` image pinned by digest; keep its tag equal to the installed `@playwright/test`.

### Pins

Every workflow pins actions to a commit SHA (the tag is in a comment) and the Playwright image to a digest. Dependabot proposes action bumps monthly; read the release notes before merging one, because the release job can publish. Bump the Playwright image by hand in `ci.yml` and `visual-baselines.yml` whenever `@playwright/test` changes, then re-record the baselines.

## Smoke test after a release

```sh
npx -y @focsd-dev/mcp                      # starts and waits on stdio (Ctrl+C to quit)
claude mcp add focsd -- npx -y @focsd-dev/mcp
```

Then open https://focsd.dev, a component page, the theme builder, `/changelog/` and `/llms.txt`.
