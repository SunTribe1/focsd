/**
 * WebMCP helpers: a recording `document.modelContext` for engines without WebMCP, and running a
 * tool through Chrome's own WebMCP the way an agent does. The docs e2e imports `executeTool` too.
 */

/** @typedef {import('@playwright/test').Page} Page */

/**
 * Before the page loads, install a `document.modelContext` that records registered tools in
 * `window.__tools` (a Map by name). Like the spec and Chrome, a name can only be registered once.
 * @param {Page} page
 */
export const recordModelContext = (page) =>
  page.addInitScript(() => {
    const tools = new Map();
    window.__tools = tools;
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        async registerTool(tool, { signal } = {}) {
          if (tools.has(tool.name)) throw new DOMException(`Duplicate tool ${tool.name}`, 'InvalidStateError');
          tools.set(tool.name, tool);
          signal?.addEventListener('abort', () => tools.delete(tool.name));
        },
      },
    });
  });

/**
 * Run a tool through the browser's WebMCP (not through our own object) and parse its JSON result.
 * @param {Page} page
 * @param {string} name
 * @param {unknown} input
 */
export const executeTool = (page, name, input) =>
  page.evaluate(
    async ([n, i]) => {
      const tool = (await document.modelContext.getTools()).find((t) => t.name === n);
      const result = await document.modelContext.executeTool(tool, i);

      // The boundary parse: Chrome returns the tool's JSON text, other implementations the object.
      return Object(result) === result ? result : JSON.parse(result);
    },
    [name, input],
  );
