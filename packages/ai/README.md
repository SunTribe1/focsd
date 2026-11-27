# @focsd-dev/ai

Accessible chat UI for any model server: eleven elements (`focsd-chat-thread`,
`focsd-chat-message`, `focsd-streaming-text`, `focsd-tool-call`, `focsd-reasoning`,
`focsd-prompt-suggestions`, `focsd-message-actions`, `focsd-composer`, `focsd-attachment-tile`,
`focsd-source-chip` and `focsd-file-changes`), a safe streaming markdown renderer, and a chat controller over a pluggable
transport (`fetchSseTransport` for our SSE format, `scriptedTransport` for demos without an API key).

```sh
npm install @focsd-dev/ai @focsd-dev/tokens
```

```html
<focsd-chat-thread></focsd-chat-thread>
<focsd-composer></focsd-composer>
```

```js
import '@focsd-dev/tokens/tokens.css';
import { createChat, fetchSseTransport } from '@focsd-dev/ai';

const chat = createChat({ transport: fetchSseTransport({ url: '/api/chat' }) });
const thread = document.querySelector('focsd-chat-thread');
const composer = document.querySelector('focsd-composer');

thread.chat = chat;
chat.subscribe(({ status }) => (composer.busy = status === 'streaming'));
composer.addEventListener('focsd-submit', (event) => chat.send(event.detail.text));
composer.addEventListener('focsd-stop', () => chat.stop());
```

Importing `@focsd-dev/ai` defines every element. To load one on its own, import its file, such as
`@focsd-dev/ai/composer.js`.

Markdown is parsed to a small tree and built with DOM calls only (no `innerHTML`), so it runs
under a strict CSP with Trusted Types. Raw HTML stays text and links keep only `https:`, `http:`,
`mailto:`, `/…` and `#…` URLs.

Documentation: [focsd.dev](https://focsd.dev) · Part of [Focsd](https://github.com/SunTribe1/focsd), MIT licensed.
