/**
 * Adapters that turn popular icon packages into `resolve` functions for `registerIconLibrary`.
 * They take the data you import, so only the icons you import end up in your bundle, and they
 * have no dependencies of their own.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A Lucide icon node: `[tag, attrs, children]`. @typedef {[string, Record<string, string | number>?, LucideNode[]?]} LucideNode */

/**
 * A Font Awesome icon definition: `icon` is `[width, height, aliases, unicode, path data]`.
 * @typedef {{ iconName: string, icon: [number, number, (string | number)[], string, string | string[]] }} FontAwesomeDefinition
 */

/**
 * `ChevronDown` → `chevron-down`, `ArrowUp01` → `arrow-up-0-1`.
 * @param {string} name
 */
const toKebab = (name) =>
  name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/([a-zA-Z])(\d)/g, '$1-$2')
    .replaceAll(/(\d)([a-zA-Z])/g, '$1-$2')
    .toLowerCase();

/**
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs]
 * @param {Node[]} [children]
 * @returns {SVGElement}
 */
function element(tag, attrs = {}, children = []) {
  const el = document.createElementNS(SVG_NS, tag);

  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));

  for (const child of children) el.append(child);

  return el;
}

const LUCIDE_DEFAULTS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

/**
 * Lucide `IconNode` data (`import { icons } from 'lucide'`, or single icons), by kebab or Pascal name.
 * @param {Record<string, LucideNode[] | LucideNode>} icons
 * @param {Record<string, string | number>} [attrs]
 * @returns {(name: string) => SVGElement | null}
 */
export function fromLucide(icons, attrs = {}) {
  /** @type {Map<string, LucideNode[] | LucideNode> | null} */
  let index = null;
  /** @type {(node: LucideNode) => SVGElement} */
  const build = ([tag, nodeAttrs = {}, children = []]) => element(tag, nodeAttrs, children.map(build));

  return (name) => {
    index ??= new Map(Object.entries(icons).map(([key, node]) => [toKebab(key), node]));
    /** @type {unknown} */
    let node = index.get(name) ?? icons[name];

    if (!Array.isArray(node)) return null;

    // Older Lucide releases wrap the children in ['svg', attrs, children].
    if (node[0] === 'svg') node = node[2] ?? [];
    const nodes = /** @type {LucideNode[]} */ (node);

    return element('svg', { ...LUCIDE_DEFAULTS, ...attrs }, nodes.map(build));
  };
}

/**
 * Font Awesome icon definitions (`import { fas } from '@fortawesome/free-solid-svg-icons'`, or an
 * array of single icons), by `iconName` or any of its aliases. Pro packages work the same way.
 * @param {Record<string, FontAwesomeDefinition> | FontAwesomeDefinition[]} definitions
 * @returns {(name: string) => SVGElement | null}
 */
export function fromFontAwesome(definitions) {
  /** @type {Map<string, FontAwesomeDefinition> | null} */
  let index = null;

  return (name) => {
    if (!index) {
      index = new Map();

      for (const def of Object.values(definitions)) {
        if (!Array.isArray(def?.icon)) continue;
        index.set(def.iconName, def);

        for (const alias of def.icon[2] ?? []) if (typeof alias === 'string' && !index.has(alias)) index.set(alias, def);
      }
    }

    const def = index.get(name);

    if (!def) return null;
    const [width, height] = def.icon;
    const pathData = def.icon[4];

    // Duotone icons carry [secondary, primary] paths.
    const paths = Array.isArray(pathData)
      ? pathData.map((d, i) => element('path', i === 0 && pathData.length > 1 ? { d, opacity: 0.4 } : { d }))
      : [element('path', { d: pathData })];

    return element('svg', { viewBox: `0 0 ${width} ${height}`, fill: 'currentColor' }, paths);
  };
}

/**
 * A plain record of SVG markup by name (Heroicons, Tabler, Phosphor, your own set).
 * @param {Record<string, string>} record
 * @returns {(name: string) => string | null}
 */
export function fromSvgStrings(record) {
  return (name) => (Object.hasOwn(record, name) ? /** @type {string} */ (record[name]) : null);
}
