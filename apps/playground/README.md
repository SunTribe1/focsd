# Focsd test bench

`@focsd/playground` is the internal test bench for Focsd. Each page loads a group of components in known states
(every variant, disabled, invalid, long content, right-to-left) so the browser suites have something stable to
drive:

- `e2e/*.spec.js`: keyboard, ARIA, axe (light, dark and high contrast), forms, reduced motion and forced colors in
  Chromium, Firefox and WebKit;
- `e2e/visual.spec.js`: screenshot comparisons of every page in the three themes;
- coverage of the component code (`pnpm --filter @focsd/playground coverage`).

It is not the public demo. To try components and themes, use the playground on the docs site at
[focsd.dev/playground/](https://focsd.dev/playground/).

```sh
pnpm run playground                         # http://localhost:5174
pnpm --filter @focsd/playground test:e2e   # the browser suites
pnpm --filter @focsd/playground test:visual
```

Page markup is test fixture: element ids and text are selectors in the specs, so change them together.
