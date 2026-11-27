import { describe, expect, it } from 'vitest';
import { PartType } from 'lit/directive.js';
import { cssomStyle } from '../src/internal/style.js';

// The client behavior (CSSOM writes, clearing on `nothing`, reconnect, binding checks) is tested
// in a real DOM: apps/playground/e2e/strict-csp.spec.js. Here only the server render, which is
// what Lit SSR calls: it reads the directive class from the result, as this helper does.
const serverRender = (props) => {
  const { _$litDirective$: Ctor, values } = cssomStyle(props);

  return new Ctor({ type: PartType.ATTRIBUTE, name: 'style', strings: undefined }).render(...values);
};

describe('cssomStyle server render', () => {
  it('writes the set properties as one style attribute value', () => {
    expect(serverRender({ left: 'calc(50% + 2px)', '--_progress': 0.4 })).toBe('left:calc(50% + 2px);--_progress:0.4');
  });

  it('drops unset values and values that could add declarations', () => {
    expect(serverRender({ 'aspect-ratio': '16 / 9', 'max-block-size': '4rem; color: red', top: undefined, gap: '', x: '}' })).toBe(
      'aspect-ratio:16 / 9',
    );
  });
});
