// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalizeController } from '../src/internal/localize.js';

/** A minimal controller host: an element that counts update requests. */
class Host extends HTMLElement {
  /** @type {import('lit').ReactiveController[]} */
  controllers = [];

  requestUpdate = vi.fn();

  /** @param {import('lit').ReactiveController} controller */
  addController(controller) {
    this.controllers.push(controller);
  }
}

customElements.define('x-localize-host', Host);

/** A host inside its own section, connected to the controller. */
function hostIn(/** @type {HTMLElement} */ section) {
  const host = /** @type {Host} */ (document.createElement('x-localize-host'));

  section.append(host);
  new LocalizeController(/** @type {any} */ (host));
  host.controllers.forEach((c) => c.hostConnected?.());

  return host;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('LocalizeController re-renders only hosts whose lang or dir changed (B14 m4)', () => {
  afterEach(() => document.body.replaceChildren());

  it('a lang or dir change refreshes the hosts under it, not the rest', async () => {
    const a = document.createElement('section');
    const b = document.createElement('section');

    document.body.append(a, b);
    const inA = hostIn(a);
    const inB = hostIn(b);

    a.setAttribute('lang', 'de');
    await flush();
    expect(inA.requestUpdate).toHaveBeenCalledTimes(1);
    expect(inB.requestUpdate).not.toHaveBeenCalled();

    a.setAttribute('dir', 'rtl');
    await flush();
    expect(inA.requestUpdate).toHaveBeenCalledTimes(2);
    expect(inB.requestUpdate).not.toHaveBeenCalled();
  });

  it('a change that leaves the resolved lang and dir the same refreshes nothing', async () => {
    document.documentElement.setAttribute('lang', 'en');
    const section = document.createElement('section');

    document.body.append(section);
    const host = hostIn(section);

    section.setAttribute('lang', 'en');
    await flush();
    expect(host.requestUpdate).not.toHaveBeenCalled();
  });

  it('a change on <html> reaches every host whose resolved lang follows it', async () => {
    document.documentElement.setAttribute('lang', 'en');
    const a = document.createElement('section');
    const b = document.createElement('section');

    b.setAttribute('lang', 'fr');
    document.body.append(a, b);
    const inA = hostIn(a);
    const inB = hostIn(b);

    document.documentElement.setAttribute('lang', 'es');
    await flush();
    expect(inA.requestUpdate).toHaveBeenCalledTimes(1);
    expect(inB.requestUpdate).not.toHaveBeenCalled();
  });
});
