# Custom properties and API docs

Every Focsd element follows these rules for its CSS custom properties and its documented API. New
components follow them too: `packages/components/test/api-docs.test.mjs` checks the sources and
the manifests of `@focsd-dev/components`, `@focsd-dev/data-grid`, `@focsd-dev/charts` and `@focsd-dev/editor` on
every test run.

## Custom property names (owner decision OD3)

1. **A design token is `--focsd-<token>`.** Only the names `@focsd-dev/tokens` builds (`--focsd-ink`,
   `--focsd-space-3`, `--focsd-radius-control`). A component never invents a name that looks like a
   token.
2. **A public knob is `--focsd-<tag>-<name>`**, where `focsd-<tag>` is the element that reads it:
   `--focsd-button-background`, `--focsd-data-grid-max-block-size`, `--focsd-chart-1`. Document it
   with `@cssprop` in the class comment of that element. The check matches exactly: the name
   belongs to the longest tag it starts with (`--focsd-tabs-gap` to `focsd-tabs`, `--focsd-tab-indicator`
   to `focsd-tab`), and that element must document it.
3. **Anything private is `--_<name>`:** runtime geometry set through the CSSOM, values passed
   between rules, loop durations, CSS anchor names (`--_progress`, `--_tree-level`, `--_masonry-gap`,
   `--_menu-anchor`). Private names are not documented and may change.
4. **No aliases.** Nothing is published, so a rename has no fallback name.

A name built at runtime (`` `var(--focsd-chart-${i})` ``) must start with a token or knob prefix.

## Documented API (findings Q8, Q9, Q11)

- Every element, attribute and public property or method has a description. Put the JSDoc on the
  constructor assignment (`/** Shows the close button. */ this.dismissible = false;`) or use
  `@attr` / `@prop`. A styled element without a class comment inherits its base's description.
- A property that takes one of a fixed set of values has a union type:
  `/** @type {'neutral' | 'info' | 'positive'} */ this.tone = 'neutral';`. A keyword default typed
  as plain `string` fails the check.
- Every `--focsd-<tag>-*` knob an element reads has a `@cssprop --focsd-<tag>-<name> - …` line.

## The legacy list

`packages/components/test/api-docs.legacy.json` lists what did not follow these rules when the
check was added (quality batch B10). It only shrinks: quality batch B14 documents those members and
renames those properties, and removes each entry it fixes. The test fails when a new gap appears
and when a listed gap has been fixed but is still listed.
