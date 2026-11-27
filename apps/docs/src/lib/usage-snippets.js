/**
 * The "Usage" tabs on a component page: the same element in HTML, React, Vue, Angular and Svelte.
 * Pure functions of the component and its primary element, so they are unit tested.
 */
import { SCRIPT_CLOSE, SCRIPT_OPEN } from '../data/markup.js';

/**
 * @typedef {object} UsageInput
 * @property {string} tag Custom element name, e.g. `focsd-select`.
 * @property {string} slug Page slug, e.g. `select`.
 * @property {string} module Import specifier that defines the element.
 * @property {string} element The element's markup with its children elided.
 * @property {string} [event] The first event worth listening to, if any.
 * @property {boolean} wrapped Whether `@focsd/react` ships a wrapper for the element.
 */

/**
 * @typedef {object} UsageSnippets
 * @property {string} html
 * @property {string} react
 * @property {string} vue
 * @property {string} angular
 * @property {string} svelte
 */

const camel = (/** @type {string} */ name) => name.replaceAll(/-(\w)/g, (_, l) => l.toUpperCase());

/** `text-field` → `TextField`. */
export const pascalCase = (/** @type {string} */ slug) =>
  slug
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');

/**
 * @param {UsageInput} input
 * @returns {UsageSnippets}
 */
export function usageSnippets({ tag, slug, module, element, event, wrapped }) {
  const pascal = pascalCase(slug);
  const withAttr = (/** @type {string} */ markup, /** @type {string} */ attr) => markup.replace(new RegExp(`^<${tag}`), `<${tag} ${attr}`);
  const bound = (/** @type {string} */ attr) => (event ? withAttr(element, attr) : element);

  const reactWrapped = () => {
    const jsx = element.replaceAll(`<${tag}`, `<${pascal}`).replaceAll(`</${tag}>`, `</${pascal}>`);
    const handler = event ? ` on${camel(`-${event}`)}={(e) => console.log(e.target)}` : '';

    return `import { ${pascal} } from '@focsd/react';\n\nexport function Example() {\n  return ${jsx.replace(`<${pascal}`, `<${pascal}${handler}`)};\n}`;
  };

  const reactPlain = () => {
    const listen = event
      ? `\n  useEffect(() => {\n    const el = ref.current;\n    const handle = (e) => console.log(e.target);\n    el.addEventListener('${event}', handle);\n    return () => el.removeEventListener('${event}', handle);\n  }, []);`
      : '';

    return `import { useEffect, useRef } from 'react';\nimport '${module}';\n\nexport function Example() {\n  const ref = useRef(null);${listen}\n  return ${withAttr(element, 'ref={ref}')};\n}`;
  };

  return {
    html: `${SCRIPT_OPEN} type="module">\n  import '${module}';\n${SCRIPT_CLOSE}\n\n${element}`,
    react: wrapped ? reactWrapped() : reactPlain(),
    vue: `${SCRIPT_OPEN} setup>\nimport '${module}';\n${SCRIPT_CLOSE}\n\n<template>\n  ${bound(`@${event}="onChange"`)}\n</template>`,
    angular: `// Add CUSTOM_ELEMENTS_SCHEMA to the component's schemas, then:\nimport '${module}';\n\n// template\n${bound(`(${event})="onChange($event)"`)}`,
    svelte: `${SCRIPT_OPEN}>\n  import '${module}';\n${SCRIPT_CLOSE}\n\n${bound(`on${event}={(e) => console.log(e.target)}`)}`,
  };
}
