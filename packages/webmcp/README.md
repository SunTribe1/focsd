# @focsd-dev/webmcp

Make your site usable by AI agents in the browser through [WebMCP](https://github.com/webmachinelearning/webmcp) tools, instead of agents guessing at clicks.

```html
<form toolname="book-table" tooldescription="Book a table at the restaurant.">
  <focsd-text-field label="Name" name="name" required toolparamdescription="Name for the booking"></focsd-text-field>
  <focsd-number-field label="Guests" name="guests" min="1" max="12" required></focsd-number-field>
  <focsd-select label="Area" name="area">
    <focsd-option value="inside">Dining room</focsd-option>
    <focsd-option value="terrace">Terrace</focsd-option>
  </focsd-select>
  <focsd-button type="submit">Book</focsd-button>
</form>

<script type="module">
  import { enableWebMCP } from '@focsd-dev/webmcp';
  enableWebMCP();
</script>
```

- Uses the standard declarative attributes (`toolname`, `tooldescription`, `toolautosubmit`, `toolparamdescription`). Browsers build tools only from native inputs today; Focsd adds precise schemas for its own controls (option lists, numbers with limits, dates, ranges, multi-selects, booleans).
- Passwords (including `type="password"` text fields), file uploads, hidden, disabled and read-only fields are never exposed, and placeholder or disabled options are never offered.
- Input is checked against the schema first; problems come back to the agent as `{ ok: false, errors }` and nothing is filled in.
- People stay in the loop: the form fills in visibly (`form[data-focsd-tool-active]` while it runs) and, without `toolautosubmit`, waits for the person to submit.
- Answer the agent from your normal submit handler, synchronously: `if (event.agentInvoked) event.respondWith(savePromise)`.
- `defineTool({ name, description, inputSchema, execute })` registers app actions that are not forms.
- Without WebMCP in the browser, everything is a no-op.

WebMCP is in origin trial in Chrome 149+ and Edge 150+ (`chrome://flags/#enable-webmcp-testing` for local development).

Documentation: [focsd.dev](https://focsd.dev) · Part of [Focsd](https://github.com/SunTribe1/focsd), MIT licensed.
