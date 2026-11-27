/**
 * Icons the input elements draw (composer, attachment tile) that the system set lacks, as stroke
 * path data registered as the `ai-input` icon library. Path data only ever becomes a `d` attribute,
 * so it skips the icon sanitizer (quality B11). Apps can replace the set with
 * `registerIconLibrary('ai-input', …)`.
 *
 * Paths for paperclip, file, image and square. From Lucide icons, ISC License, Copyright (c) 2026
 * Lucide Icons and Contributors (square derives from Feather, MIT, Copyright (c) 2013-present Cole
 * Bemis); full text in LICENSE-lucide.txt in this package.
 */
import { icon } from '@focsd-dev/primitives';
import { registerPathIconLibrary } from '@focsd-dev/primitives/internal';

const LIBRARY = 'ai-input';

registerPathIconLibrary(
  LIBRARY,
  Object.freeze({
    attach: 'm16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551',
    file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4',
    image:
      'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21M9 7a2 2 0 1 0 0 4 2 2 0 1 0 0-4',
    stop: 'M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  }),
);

/**
 * A decorative icon from the input set.
 * @param {'attach' | 'file' | 'image' | 'stop'} name
 * @param {string} [part]
 * @returns {import('lit/directive.js').DirectiveResult}
 */
export const inputIcon = (name, part = 'icon') => icon({ library: LIBRARY, name }, part);
