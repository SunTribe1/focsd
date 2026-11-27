import { controlSchema, enableWebMCP, formSchema, modelContext } from '@focsd-dev/webmcp';
import type { JsonSchema, WebMCPHandle, WebMCPTool } from '@focsd-dev/webmcp';

const handle: WebMCPHandle = enableWebMCP({ root: document });
const supported: boolean = handle.supported;
const tool: WebMCPTool = {
  name: 'add_to_cart',
  description: 'Add a product to the cart.',
  inputSchema: { type: 'object', properties: { sku: { type: 'string' } }, required: ['sku'] },
  annotations: { readOnlyHint: false },
  execute: async (input) => ({ added: input.sku }),
};
void handle.defineTool(tool).then((unregister) => unregister());
handle.dispose();

const form = document.createElement('form');
const schema: JsonSchema = formSchema(form);
const field: JsonSchema | null = controlSchema(document.createElement('input'));
const context = modelContext();
if (context) void context.registerTool(tool);

// @ts-expect-error: a tool needs a description
const broken: WebMCPTool = { name: 'x', execute: () => null };
void [supported, schema, field, broken];
