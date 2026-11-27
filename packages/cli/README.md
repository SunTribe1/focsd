# focsd

Copy Focsd components into your project to own their look, and keep them up to date.

```sh
npx focsd init --install
npx focsd add button select
npx focsd diff button
npx focsd update --all
```

Blocks are whole pages (plain HTML plus one JS module) built from the public packages:

```sh
npx focsd list --blocks
npx focsd add block dashboard          # writes blocks/dashboard/
npx focsd add block dashboard --out src/pages/home
```

A block never overwrites: if any target file exists, nothing is written and the clashing files are listed (`--overwrite` is refused). It needs no `focsd.json`; install the packages it prints.

Import your copies before `@focsd/components` (or instead of it): a copy registers the same tag, and the first registration wins.

Only the styled layer is copied: the component module (its CSS, parts and variants) and the local modules it imports. Shared style rules (fields, listboxes, surfaces, motion) are not copied: they come from `@focsd/primitives/styles/*.js` (for example `@focsd/primitives/styles/field.js`). To change one, copy that module into your project and point the component's import at your copy. Keyboard, ARIA and form behavior stay in `@focsd/primitives`, an npm dependency, so accessibility fixes keep arriving with `npm update`. `update` merges your edits with new versions and never overwrites them silently.

Documentation: [focsd.dev](https://focsd.dev) · Part of [Focsd](https://github.com/SunTribe1/focsd), MIT licensed.
