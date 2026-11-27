/**
 * Shared analyzer config. Both packages run `cem analyze` from the repo root, so the default
 * `packagejson: true` would rewrite the root package.json `customElements` field on every build.
 */

/**
 * @typedef {{ name: string, fieldName?: string, attribute?: string, reflects?: boolean, inheritedFrom?: { name: string },
 *   type?: { text?: string } }} Member
 * @typedef {{ name?: string, description?: string, customElement?: boolean, superclass?: { name?: string },
 *   attributes?: Member[], members?: Member[] }} Declaration
 * @typedef {{ modules?: { declarations?: Declaration[] }[] }} Manifest
 * @typedef {typeof import('typescript')} TS
 */

import { readFileSync } from 'node:fs';

/** The text of an identifier or string-literal name. */
const nameOf = (/** @type {any} */ name) => String(name.text ?? name.escapedText ?? '');

/**
 * Names of the `static properties` entries declared `{ state: true }` in a class.
 * @param {TS} ts
 * @param {import('typescript').ClassLikeDeclaration} node
 * @returns {string[]}
 */
function stateProperties(ts, node) {
  const declaration = node.members.find(
    (m) => ts.isPropertyDeclaration(m) && nameOf(m.name) === 'properties' && m.initializer && ts.isObjectLiteralExpression(m.initializer),
  );

  const entries = /** @type {import('typescript').ObjectLiteralExpression | undefined} */ (
    /** @type {import('typescript').PropertyDeclaration | undefined} */ (declaration)?.initializer
  )?.properties;

  return (entries ?? []).flatMap((entry) => {
    if (!ts.isPropertyAssignment(entry) || !ts.isObjectLiteralExpression(entry.initializer)) return [];

    const isState = entry.initializer.properties.some(
      (p) => ts.isPropertyAssignment(p) && nameOf(p.name) === 'state' && p.initializer.kind === ts.SyntaxKind.TrueKeyword,
    );

    return isState ? [nameOf(entry.name)] : [];
  });
}

/**
 * Copy the nearest ancestor's description onto an element without one (quality Q8).
 * @param {Declaration[]} declarations
 */
function inheritDescriptions(declarations) {
  const byName = new Map(declarations.map((d) => [d.name, d]));

  /** @param {Declaration | undefined} decl @param {Set<Declaration>} seen @returns {string} */
  const describe = (decl, seen = new Set()) => {
    if (!decl || seen.has(decl)) return '';
    seen.add(decl);

    return decl.description || describe(byName.get(decl.superclass?.name), seen);
  };

  for (const decl of declarations) {
    if (decl.customElement && !decl.description) decl.description = describe(decl);
  }
}

/**
 * Lit reactive state (`{ state: true }`, by convention `_name`) has no attribute, but the Lit
 * analyzer records one. Drop those attributes, inherited copies included, so they never reach the
 * manifest, typings, editor data or React props.
 * @param {Declaration[]} declarations
 * @param {Set<string>} stateFields `Class.field`
 */
function dropStateAttributes(declarations, stateFields) {
  for (const decl of declarations) {
    const isState = (/** @type {Member} */ m, /** @type {string} */ field) =>
      field.startsWith('_') || stateFields.has(`${m.inheritedFrom?.name ?? decl.name}.${field}`);

    if (decl.attributes) decl.attributes = decl.attributes.filter((a) => !isState(a, a.fieldName ?? a.name));

    for (const member of decl.members ?? []) {
      if (member.attribute && isState(member, member.name)) {
        delete member.attribute;
        delete member.reflects;
      }
    }
  }
}

/**
 * The shared typedefs of primitives' `internal/types.js` (quality Q9, B14 m1), name to union.
 * @returns {Map<string, string>}
 */
function sharedTypes() {
  const source = readFileSync(new URL('packages/primitives/src/internal/types.js', import.meta.url), 'utf8');

  return new Map([...source.matchAll(/@typedef \{([^}]+)\} (\w+)/g)].map((m) => [String(m[2]), String(m[1])]));
}

/**
 * A field typed with a shared typedef (`Tone`) shows its union in the manifest, so the API docs and
 * editor data list the values instead of a name the reader cannot look up.
 * @param {Declaration[]} declarations
 */
function expandSharedTypes(declarations) {
  const types = sharedTypes();

  /** @param {{ type?: { text?: string } }} item */
  const expand = (item) => {
    const union = types.get(item.type?.text ?? '');

    // eslint-disable-next-line no-param-reassign -- the analyzer API: plugins edit the manifest in place
    if (union && item.type) item.type.text = union;
  };

  for (const decl of declarations) [...(decl.attributes ?? []), ...(decl.members ?? [])].forEach(expand);
}

/**
 * A `defineElement('focsd-x', FocsdX)` call (quality m34) as the analyzer's own
 * `customElements.define()` record: a custom-element-definition export of the module, pointing at
 * the class here or at the relative module it is imported from.
 * @param {TS} ts
 * @param {import('typescript').Node} node
 * @param {{ path: string, exports?: object[] }} moduleDoc
 */
function recordDefineElement(ts, node, moduleDoc) {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'defineElement') return;

  const [tag, element] = node.arguments;

  if (!tag || !element || !ts.isStringLiteral(tag) || !ts.isIdentifier(element)) return;

  const source = node.getSourceFile();

  const from = source.statements.flatMap((statement) =>
    ts.isImportDeclaration(statement) &&
    ts.isStringLiteral(statement.moduleSpecifier) &&
    statement.moduleSpecifier.text.startsWith('.') &&
    statement.importClause?.namedBindings &&
    ts.isNamedImports(statement.importClause.namedBindings) &&
    statement.importClause.namedBindings.elements.some((e) => e.name.text === element.text)
      ? [statement.moduleSpecifier.text]
      : [],
  )[0];

  const module = from ? new URL(from, `file:///${moduleDoc.path}`).pathname.slice(1) : moduleDoc.path;

  // eslint-disable-next-line no-param-reassign -- the analyzer API: plugins record what they find on the module doc
  moduleDoc.exports = [
    ...(moduleDoc.exports ?? []),
    { kind: 'custom-element-definition', name: tag.text, declaration: { name: element.text, module } },
  ];
}

/**
 * `const Base = SomeMixin(Other)` at module level: the analyzer only follows a mixin applied in the
 * `extends` clause itself, so a class extending `Base` would lose the mixin's attributes. Record the alias.
 * @param {TS} ts
 * @param {import('typescript').Node} node
 * @param {Map<string, string>} aliases Alias name → mixin name.
 */
function recordMixinAlias(ts, node, aliases) {
  if (!ts.isVariableStatement(node)) return;

  for (const decl of node.declarationList.declarations) {
    const init = decl.initializer;

    if (
      ts.isIdentifier(decl.name) &&
      init &&
      ts.isCallExpression(init) &&
      ts.isIdentifier(init.expression) &&
      init.expression.text.endsWith('Mixin')
    )
      aliases.set(decl.name.text, init.expression.text);
  }
}

/**
 * Give a class whose superclass is a recorded mixin alias the mixin's attributes and members, marked
 * as inherited, as the analyzer does for a mixin in the `extends` clause (the mixin module must be analyzed).
 * @param {Declaration[]} declarations
 * @param {Map<string, string>} aliases
 */
function applyMixinAliases(declarations, aliases) {
  const byName = new Map(declarations.map((d) => [d.name, d]));

  for (const decl of declarations) {
    const mixinName = aliases.get(decl.superclass?.name ?? '');
    const mixin = mixinName ? byName.get(mixinName) : undefined;

    if (!mixin) continue;

    const inherited = (/** @type {Member} */ item) => ({ ...item, inheritedFrom: item.inheritedFrom ?? { name: mixin.name ?? '' } });

    const merge = (/** @type {Member[]} */ own = [], /** @type {Member[]} */ extra = []) => [
      ...own,
      ...extra.filter((e) => !own.some((o) => o.name === e.name)).map(inherited),
    ];

    decl.attributes = merge(decl.attributes, mixin.attributes);
    decl.members = merge(decl.members, mixin.members);
  }
}

/**
 * `@omit a, b` in a class's JSDoc: inherited attributes (and their properties) the class does not
 * support, left out of its manifest entry and its subclasses' (an inherited API it never renders).
 * `slot:name` and `part:name` drop an inherited slot or CSS part the same way.
 * @param {TS} ts
 * @param {import('typescript').Node} node
 * @param {Map<string, string[]>} omissions Class name → attribute names.
 */
function recordOmissions(ts, node, omissions) {
  if (!ts.isClassDeclaration(node) || !node.name) return;

  for (const tag of ts.getJSDocTags(node)) {
    if (tag.tagName.text !== 'omit') continue;

    omissions.set(node.name.text, (ts.getTextOfJSDocComment(tag.comment) ?? '').split(/[\s,]+/).filter(Boolean));
  }
}

/**
 * Drop each class's omitted attributes, and those of its ancestors, with their properties.
 * @param {Declaration[]} declarations
 * @param {Map<string, string[]>} omissions
 */
function applyOmissions(declarations, omissions) {
  const byName = new Map(declarations.map((d) => [d.name, d]));

  for (const decl of declarations) {
    const omitted = new Set();

    for (let d = decl, depth = 0; d && depth < 20; d = byName.get(d.superclass?.name), depth += 1)
      for (const name of omissions.get(d.name ?? '') ?? []) omitted.add(name);

    if (!omitted.size) continue;

    decl.slots = decl.slots?.filter((slot) => !omitted.has(`slot:${slot.name}`));
    decl.cssParts = decl.cssParts?.filter((part) => !omitted.has(`part:${part.name}`));

    const fields = new Set((decl.attributes ?? []).filter((a) => omitted.has(a.name)).map((a) => a.fieldName));

    decl.attributes = (decl.attributes ?? []).filter((a) => !omitted.has(a.name));
    decl.members = (decl.members ?? []).filter((m) => !fields.has(m.name) && !omitted.has(m.attribute ?? ''));
  }
}

/**
 * The Focsd analyzer plugin: `defineElement()` calls, element descriptions from the base class,
 * and no state attributes.
 * @returns {{ name: string, stateFields: Set<string>,
 *   analyzePhase: (ctx: { ts: TS, node: import('typescript').Node, moduleDoc: { path: string, exports?: object[] } }) => void,
 *   packageLinkPhase: (ctx: { customElementsManifest: Manifest }) => void }}
 */
export function focsdManifest() {
  /** @type {Set<string>} */
  const stateFields = new Set();
  /** @type {Map<string, string>} */
  const mixinAliases = new Map();
  /** @type {Map<string, string[]>} */
  const omissions = new Map();

  return {
    name: 'focsd-manifest',
    stateFields,
    analyzePhase({ ts, node, moduleDoc }) {
      recordDefineElement(ts, node, moduleDoc);
      recordMixinAlias(ts, node, mixinAliases);
      recordOmissions(ts, node, omissions);

      if (!ts.isClassDeclaration(node) || !node.name) return;

      for (const field of stateProperties(ts, node)) stateFields.add(`${node.name.text}.${field}`);
    },
    packageLinkPhase({ customElementsManifest }) {
      const declarations = (customElementsManifest.modules ?? []).flatMap((m) => m.declarations ?? []);

      applyMixinAliases(declarations, mixinAliases);
      inheritDescriptions(declarations);
      applyOmissions(declarations, omissions);
      dropStateAttributes(declarations, stateFields);
      expandSharedTypes(declarations);
    },
  };
}

export default {
  packagejson: false,
  plugins: [focsdManifest()],
};
