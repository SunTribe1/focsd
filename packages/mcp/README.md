# @focsd-dev/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for Focsd. Connect it to your AI coding assistant so it can look up components, design tokens and setup, and check the markup it writes.

```sh
# Claude Code
claude mcp add focsd -- npx -y @focsd-dev/mcp
```

Claude Desktop (`claude_desktop_config.json`), Cursor (`.cursor/mcp.json`) and Windsurf:

```json
{ "mcpServers": { "focsd": { "command": "npx", "args": ["-y", "@focsd-dev/mcp"] } } }
```

VS Code and GitHub Copilot (`.vscode/mcp.json`; note the `servers` key):

```json
{ "servers": { "focsd": { "type": "stdio", "command": "npx", "args": ["-y", "@focsd-dev/mcp"] } } }
```

## Tools

- `search_components`: components for a need in plain words.
- `list_components`: every component, optionally by category.
- `get_component`: import, attributes, properties, methods, events, slots, CSS parts, example, accessibility notes and keyboard support.
- `get_tokens`: design tokens and their values per theme.
- `get_setup`: install and usage for HTML, React, Vue, Svelte or Angular.
- `validate_markup`: unknown `focsd-` elements and attributes, and controls without an accessible name.

Resources: `focsd://components/{tag}` and `focsd://tokens`.

Runs locally over stdio and answers from data bundled in the package; it makes no network requests.

## HTTP

```sh
npx -y @focsd-dev/mcp --http --port 3333   # http://127.0.0.1:3333/mcp
claude mcp add --transport http focsd http://127.0.0.1:3333/mcp
```

`createHttpHandler(options)` from `@focsd-dev/mcp/http` is the same server as a Fetch API handler (`(request) => Promise<Response>`) for serverless functions and Workers. It is stateless and read-only, and comes with these defaults:

- rate limit: 60 requests a minute per client with a burst of 20, answered with `429` and `Retry-After`;
- request body cap: 64 KB (`413`);
- result cap: 64 KB, with longer results marked `truncated: true`;
- CORS off;
- `X-Forwarded-For` ignored unless `trustProxy: true`.

The rate limit is in memory and per instance, so a hosted deployment must also put the platform's rate limiter in front. See [Hosted MCP](https://focsd.dev/getting-started/hosted-mcp/).

Documentation: [focsd.dev](https://focsd.dev) · Part of [Focsd](https://github.com/SunTribe1/focsd), MIT licensed.
