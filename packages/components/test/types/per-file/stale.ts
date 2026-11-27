// Typings of modules that no longer exist (the pre-rename opn-* and ub-* files) are not published,
// so the `./*.js` export cannot resolve them (types I3).
// @ts-expect-error: no such module
import type {} from '@focsd-dev/components/opn-button.js';
// @ts-expect-error: no such module
import type {} from '@focsd-dev/components/ub-button.js';
