/**
 * Scrollable content blocks (code, tool input and output) that take keyboard focus only when they
 * scroll. A block that overflows becomes a focusable named region (`role="region"`, `tabindex="0"`),
 * so it scrolls by keyboard (WCAG 2.1.1); one that fits is plain content, so a reply with many short
 * code blocks does not add a tab stop and a landmark for each.
 */

const NAMES = ['aria-label', 'aria-labelledby'];

/**
 * Updates `el` for its current size: a region in the tab order while it overflows, plain otherwise.
 * Call it again when the content changes without the box resizing (streamed text).
 * @param {Element} el
 */
export function syncOverflowRegion(el) {
  const overflows = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;

  // A name is allowed on a region but not on plain content (ARIA prohibits naming a generic
  // element), so the name is set aside while the block fits.
  for (const name of NAMES) {
    const [from, to] = overflows ? [`data-${name}`, name] : [name, `data-${name}`];
    const value = el.getAttribute(from);

    if (value !== null) {
      el.setAttribute(to, value);
      el.removeAttribute(from);
    }
  }

  if (overflows) {
    el.setAttribute('role', 'region');
    el.setAttribute('tabindex', '0');
  } else {
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
  }
}

/**
 * Keeps blocks in sync as they resize. One per component: call `disconnect()` when the component
 * leaves the page so the observer lets go of its blocks. Without ResizeObserver (server rendering),
 * watched blocks stay focusable regions, the safe default.
 * @returns {{ watch(el: Element): void, disconnect(): void }}
 */
export function overflowRegions() {
  const observer =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver((entries) => {
          for (const entry of entries) syncOverflowRegion(entry.target);
        });

  return {
    watch(el) {
      if (observer) {
        observer.observe(el);
        syncOverflowRegion(el);
      } else {
        el.setAttribute('role', 'region');
        el.setAttribute('tabindex', '0');
      }
    },
    disconnect: () => observer?.disconnect(),
  };
}
