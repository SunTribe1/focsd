/**
 * The event naming rule (docs/events.md). An element fires a native event name only when the
 * meaning matches the native event; every other event is `focsd-<name>`.
 */

/** Native names a Focsd element may fire, with the native meaning. */
export const NATIVE_EVENTS = Object.freeze(['input', 'change', 'toggle', 'close', 'cancel']);

const CUSTOM_EVENT = /^focsd-[a-z]+(-[a-z]+)*$/;

/** @param {string | undefined} name A manifest event name (the analyzer leaves it out for a computed name). */
export const isAllowedEventName = (name) => name !== undefined && (NATIVE_EVENTS.includes(name) || CUSTOM_EVENT.test(name));

/** @typedef {{ name?: string, type?: { text?: string } }} ManifestEvent */
/** @typedef {{ modules?: { declarations?: { name?: string, events?: ManifestEvent[] }[] }[] }} Manifest */

/**
 * Why an event breaks the rule, or null. A native name must stay a plain `Event`: a payload makes
 * it a different event (`change` with `detail.page` is `focsd-page-change`).
 * @param {ManifestEvent} event
 */
function problem(event) {
  if (!isAllowedEventName(event.name)) return String(event.name);

  const native = NATIVE_EVENTS.includes(String(event.name));

  return native && event.type?.text?.startsWith('CustomEvent') ? `${event.name} (native name with a detail)` : null;
}

/**
 * Every declaration event in a custom elements manifest that breaks the rule, as `Class: name`.
 * @param {Manifest} manifest
 * @returns {string[]}
 */
export function eventNameViolations(manifest) {
  return (manifest.modules ?? []).flatMap((mod) =>
    (mod.declarations ?? []).flatMap((decl) =>
      (decl.events ?? []).flatMap((event) => {
        const why = problem(event);

        return why ? [`${decl.name}: ${why}`] : [];
      }),
    ),
  );
}

/**
 * A `CustomEvent` that carries a detail must say what the detail is: `CustomEvent<Detail>`.
 * @param {Manifest} manifest
 * @returns {string[]}
 */
export function untypedCustomEvents(manifest) {
  return (manifest.modules ?? []).flatMap((mod) =>
    (mod.declarations ?? []).flatMap((decl) =>
      (decl.events ?? []).filter((event) => event.type?.text === 'CustomEvent').map((event) => `${decl.name}: ${String(event.name)}`),
    ),
  );
}
