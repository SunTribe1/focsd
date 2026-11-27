import { createServer } from '@focsd/mcp';
import { createHttpHandler } from '@focsd/mcp/http';
import type { HttpHandlerOptions } from '@focsd/mcp/http';
import { startHttpServer } from '@focsd/mcp/http/node';
import { createCatalog } from '@focsd/mcp/core';
import { searchComponents } from '@focsd/mcp/catalog';
// The bundled catalogue is typed (types M8).
import data from '@focsd/mcp/data' with { type: 'json' };
import type { CatalogData } from '@focsd/mcp/core';

const server = createServer();
void server;
const catalog = createCatalog({ components: [], tokens: [] } as never);
const found: unknown = catalog.searchComponents('button');
void found;
void searchComponents;

const catalogue: CatalogData = data;
const tags: string[] = data.components.map((component) => component.tag);
void catalogue;
void tags;

// m61: FRAMEWORKS is a literal union, so a typo is a compile error.
const first: 'html' | 'react' | 'vue' | 'svelte' | 'angular' = catalog.FRAMEWORKS[0];
void first;
// @ts-expect-error not a framework
catalog.getSetup('solid');

// Wave 15: the HTTP handler is a Fetch API handler with typed options.
const httpOptions: HttpHandlerOptions = { rateLimit: { perMinute: 30, burst: 5 }, cors: false, maxBodyBytes: 65_536 };
const handle: (request: Request) => Promise<Response> = createHttpHandler(httpOptions);
void handle;
void startHttpServer;
void createServer({ maxResultBytes: 32_768 });
// @ts-expect-error cors takes an origin object or false
createHttpHandler({ cors: true });
